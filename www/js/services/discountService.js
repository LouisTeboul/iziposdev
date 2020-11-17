app.service('discountService', function ($rootScope, $q, $uibModal, $translate, $mdMedia, posUserService, taxesService, loyaltyService, paymentService, productService) {
    const self = this;

    let cachedDiscounts = [];

    const checkDiscountValidity = (discount, shoppingCart) => {
        let isValid = true;
        if (discount.DiscountRequirements) {
            // On boucle tant que les Requirement sont valide
            // Si un seul requirement n'est pas validé, pas besoin de boucler plus
            for (i = 0; i < discount.DiscountRequirements.length && isValid; i++) {
                let requirement = discount.DiscountRequirements[i];

                switch (requirement.DiscountRequirementRuleSystemName) {
                    case "DiscountRequirement.MustBeAssignedToCustomerRole":
                        isValid = shoppingCart.customerLoyalty && shoppingCart.customerLoyalty && shoppingCart.customerLoyalty.CustomerRoles &&
                            shoppingCart.customerLoyalty.CustomerRoles && shoppingCart.customerLoyalty.CustomerRoles.includes(requirement.RestrictedToCustomerRoleId) ||
                            shoppingCart.customerInfo && shoppingCart.customerInfo && shoppingCart.customerInfo.CustomerRoles &&
                            shoppingCart.customerInfo.CustomerRoles && shoppingCart.customerInfo.CustomerRoles.includes(requirement.RestrictedToCustomerRoleId);
                        discount.isLimitedToThisCustomer = isValid;
                        break;
                }
            }
        }

        return isValid;
    };

    // Get all discounts
    this.getAllDiscountsAsync = () => {
        let getAllDefer = $q.defer();

        $rootScope.dbInstance.rel.find('Discount').then((results) => {
            if (results.Discounts && results.Discounts.length > 0) {

                cachedDiscounts = results.Discounts;

                getAllDefer.resolve(results.Discounts);

            } else {
                getAllDefer.reject("No discounts for shoppingCart !");
            }
        }, (err) => {
            getAllDefer.reject(err);
        });

        return getAllDefer.promise;
    };

    //Get discounts for shoppingCart
    this.getValidDiscountsForShoppingCartAsync = (shoppingCart) => {
        let getValidDefer = $q.defer();

        self.getAllDiscountsAsync().then((discounts) => {

            let validDiscounts = discounts.filter((d) => {
                let discountIsValid = checkDiscountValidity(d, shoppingCart);
                return discountIsValid &&
                    !d.RequiresCouponCode &&
                    (d.DiscountTypeId !== DiscountType.FREEINPUT && d.DiscountTypeId !== DiscountType.PRESET && d.DiscountTypeId !== DiscountType.SPLIT) &&
                    (!d.AppliedToCategories || d.AppliedToCategories.length === 0) &&
                    (!d.AppliedToProducts || d.AppliedToProducts.length === 0);
            });

            if (validDiscounts) {
                getValidDefer.resolve(validDiscounts);
            } else {
                getValidDefer.reject("No discounts for shoppingCart !");
            }
        });

        return getValidDefer.promise;
    };

    $rootScope.tryApplyDiscountsShoppingCart = (shoppingCart) => {
        if (!$rootScope.discountLoading) {
            $rootScope.discountLoading = true;
            if (shoppingCart.Discounts && shoppingCart.Discounts.length === 0) {
                self.getValidDiscountsForShoppingCartAsync(shoppingCart).then((discounts) => {
                    // Lorsque plusieurs promo sont configuré, prendre la plus avantageuse

                    if (discounts && discounts.length > 0) {
                        // Dans un premier temps, on conserve le plus haut discount %, et le plus haut discount amount
                        let highestDiscountPercent = discounts.reduce((acc, cur) => {
                            if (cur.UsePercentage) {
                                if (acc) {
                                    if (cur.DiscountPercentage > acc.DiscountPercentage) {
                                        acc = cur;
                                    }
                                } else {
                                    acc = cur;
                                }
                            }
                            return acc;
                        }, null);

                        let highestDiscountFlat = discounts.reduce((acc, cur) => {
                            if (!cur.UsePercentage) {
                                if (acc) {
                                    if (cur.DiscountAmount > acc.DiscountAmount) {
                                        acc = cur;
                                    }
                                } else {
                                    acc = cur;
                                }
                            }
                            return acc;
                        }, null);

                        // Ensuite on compare le gain de ces deux discounts et on selectionne celui qui a le plus haut
                        let gainWithDiscountPercent = 0;
                        let gainWithDiscountFlat = 0;
                        if (highestDiscountPercent) {
                            shoppingCart.Total * (gainWithDiscountPercent = highestDiscountPercent.DiscountPercentage / 100);
                        }

                        if (highestDiscountFlat) {
                            gainWithDiscountFlat = highestDiscountFlat.DiscountAmount;
                        }

                        let selectedDiscount = gainWithDiscountPercent > gainWithDiscountFlat ? highestDiscountPercent : highestDiscountFlat;

                        if (selectedDiscount && gainWithDiscountFlat <= shoppingCart.Total) {
                            switch (selectedDiscount.DiscountType) {
                                case "AssignedToOrderTotal":
                                    if (shoppingCart && shoppingCart.Items.length > 0) {
                                        let value = selectedDiscount.UsePercentage ? selectedDiscount.DiscountPercentage : selectedDiscount.DiscountAmount;

                                        let discountObj = new ShoppingCartDiscount(selectedDiscount.DiscountId, selectedDiscount.Name, value, selectedDiscount.UsePercentage, false)

                                        self.addShoppingCartDiscount(discountObj);
                                    }
                                    $rootScope.discountLoading = false;
                                    break;
                                default:
                                    self.discountWaitingQueueProcessing();
                                    break;
                            }
                        } else {
                            self.discountWaitingQueueProcessing();
                        }
                    } else {
                        self.discountWaitingQueueProcessing();
                    }
                });
            } else {
                self.discountWaitingQueueProcessing();
            }
        } else {
            if (!$rootScope.discountWaitingQueue) {
                $rootScope.discountWaitingQueue = [];
            }
            $rootScope.discountWaitingQueue.push(shoppingCart);
        }
    };

    this.discountWaitingQueueProcessing = () => {
        $rootScope.discountLoading = false;

        if ($rootScope.discountWaitingQueue && $rootScope.discountWaitingQueue.length > 0) {
            let currentSCDiscount = $rootScope.discountWaitingQueue[0];
            let currentSCDiscountIndex = $rootScope.discountWaitingQueue.indexOf(currentSCDiscount);
            $rootScope.discountWaitingQueue.splice(currentSCDiscountIndex, 1);
            $rootScope.tryApplyDiscountsShoppingCart(currentSCDiscount);
        }
    };

    //Add a discount to a single cart item
    this.addCartItemDiscount = (cartItem, discountAmount, isPercent) => {
        let cacheTaxProvider = null;
        let cacheIsPricesIncludedTax = null;

        // User privilege
        if (posUserService.isEnable('OFFI')) {
            if (!isNaN(discountAmount)) {
                // Since we only apply the discount on 1 item of the line
                // We create a clone and apply the discount on it
                let cartItemDiscounted = cartItem;
                if (cartItem.Quantity > 1) {
                    //decrement original item quantity if the line contain more than one
                    cartItem.Quantity--;

                    //fetch the item index inside the shopping cart
                    const idx = $rootScope.currentShoppingCart.Items.indexOf(cartItem);
                    cartItemDiscounted = clone(cartItem);
                    cartItemDiscounted.Quantity = 1;

                    //Add the new soon-to-be discounted item to the shopping cart
                    $rootScope.currentShoppingCart.Items.splice(idx + 1, 0, cartItemDiscounted);
                }

                taxesService.getTaxProviderAsync().then((ctp) => {
                    cacheTaxProvider = ctp;
                    const taxRate = getTaxRateFromProvider(cartItemDiscounted.TaxCategory, cacheTaxProvider, cartItemDiscounted.DeliveryType);

                    if (isPercent) {
                        //If this is a % discount
                        if (discountAmount <= 100) {
                            // The discount has to be less than 100%
                            // Set the discount property
                            taxesService.getPricesIncludedTaxAsync().then((cpit) => {
                                cacheIsPricesIncludedTax = cpit;

                                switch (cacheTaxProvider) {
                                    case "Tax.FixedRate":
                                        cartItemDiscounted.DiscountIT = roundValue(cartItemDiscounted.Product.Price * (discountAmount / 100));
                                        cartItemDiscounted.DiscountET = roundValue(ITtoET(cartItemDiscounted.DiscountIT, taxRate));
                                        break;
                                    case "Tax.Quebec":
                                        if (cacheIsPricesIncludedTax) {
                                            cartItemDiscounted.DiscountIT = roundValue(cartItemDiscounted.Product.Price * (discountAmount / 100));
                                            cartItemDiscounted.DiscountET = roundValue(ITtoET(cartItemDiscounted.DiscountIT, taxRate));
                                        } else {
                                            cartItemDiscounted.DiscountIT = roundValue(cartItemDiscounted.PriceIT * (discountAmount / 100));
                                            cartItemDiscounted.DiscountET = roundValue(ITtoET(cartItemDiscounted.DiscountIT, taxRate));
                                        }
                                        break;
                                }
                                $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                paymentService.calculateTotal();
                                loyaltyService.calculateLoyalty();
                            });
                        } else {
                            swal({
                                title: $translate.instant("Impossible de faire une remise de plus de 100% !")
                            });
                        }
                    } else if (!isPercent) {
                        //If this is a flat discount
                        if (discountAmount <= cartItemDiscounted.Product.Price) {
                            //The discount has to be less than the product price

                            cartItemDiscounted.DiscountIT = roundValue(discountAmount);
                            cartItemDiscounted.DiscountET = roundValue(ITtoET(cartItemDiscounted.DiscountIT, taxRate));
                        } else {
                            swal({
                                title: $translate.instant("Impossible de faire une remise superieur au prix du produit !")
                            });
                        }
                        $rootScope.$emit("shoppingCartItemChanged", cartItem);
                        $rootScope.$emit("shoppingCartItemChanged", cartItemDiscounted);
                        paymentService.calculateTotal();
                        loyaltyService.calculateLoyalty();
                    }
                });
            } else {
                swal({
                    title: $translate.instant("Valeur de remise invalide")
                });
            }
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    //Description add a discount to a cart line
    this.addCartLineDiscount = (cartItem, discountAmount, isPercent) => {
        let cacheTaxProvider = null;
        let cacheIsPricesIncludedTax = null;

        if (posUserService.isEnable('OFFI')) {
            if (!isNaN(discountAmount)) {
                taxesService.getTaxProviderAsync().then((result) => {
                    cacheTaxProvider = result;
                    const taxRate = getTaxRateFromProvider(cartItem.TaxCategory, cacheTaxProvider, cartItem.DeliveryType);

                    if (isPercent) {
                        //Remise en pourcentage
                        if (discountAmount <= 100) {
                            taxesService.getPricesIncludedTaxAsync().then((cpit) => {
                                cacheIsPricesIncludedTax = cpit;

                                switch (cacheTaxProvider) {
                                    case "Tax.FixedRate":
                                        cartItem.DiscountIT = roundValue(cartItem.Product.Price * (discountAmount / 100) * cartItem.Quantity);
                                        cartItem.DiscountET = roundValue(ITtoET(cartItem.DiscountIT, taxRate));
                                        break;
                                    case "Tax.Quebec":
                                        if (cacheIsPricesIncludedTax) {
                                            cartItem.DiscountIT = roundValue(cartItem.Product.Price * (discountAmount / 100) * cartItem.Quantity);
                                            cartItem.DiscountET = roundValue(ITtoET(cartItem.DiscountIT, taxRate));
                                        } else {
                                            cartItem.DiscountIT = roundValue(cartItem.PriceIT * (discountAmount / 100) * cartItem.Quantity);
                                            cartItem.DiscountET = roundValue(ITtoET(cartItem.DiscountIT, taxRate));
                                        }
                                        break;
                                }
                                $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                paymentService.calculateTotal();
                                loyaltyService.calculateLoyalty();
                            });
                        } else {
                            swal({
                                title: $translate.instant("Impossible de faire une remise de plus de 100% !")
                            });
                        }
                    } else if (!isPercent) {
                        if (discountAmount <= cartItem.Product.Price * cartItem.Quantity) {
                            //Remise flat
                            cartItem.DiscountIT = roundValue(discountAmount);
                            cartItem.DiscountET = roundValue(ITtoET(cartItem.DiscountIT, taxRate));
                        } else {
                            swal($translate.instant("Impossible de faire une remise superieur au prix de la ligne !"));
                        }
                        $rootScope.$emit("shoppingCartItemChanged", cartItem);
                        $rootScope.$emit("shoppingCartItemChanged", cartItem);
                        paymentService.calculateTotal();
                        loyaltyService.calculateLoyalty();
                    }
                });
            } else {
                swal({
                    title: $translate.instant("Valeur de remise invalide")
                });
            }
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    this.offerItem = (cartItem, toLine = false) => {
        if (posUserService.isEnable('OFFI')) {
            if (cartItem.Quantity > 1 && !toLine) {
                //on décrémente la ligne de 1
                cartItem.Quantity--;
                if (cartItem.stockQuantity) {
                    cartItem.stockQuantity--;
                }

                //index de la ligne
                const idx = $rootScope.currentShoppingCart.Items.indexOf(cartItem);

                //on la duplique pour rendre un item gratuit
                cartItem = clone(cartItem);
                cartItem.Quantity = 1;
                if (cartItem.stockQuantity) {
                    cartItem.stockQuantity = 1;
                }

                //on ajoute la nouvelle ligne au panier
                $rootScope.currentShoppingCart.Items.splice(idx + 1, 0, cartItem);
            }

            cartItem.IsFree = true;
            cartItem.DiscountIT = 0;
            cartItem.DiscountET = 0;

            paymentService.calculateTotal();
            loyaltyService.calculateLoyalty();
            $rootScope.$emit("shoppingCartItemChanged", cartItem);
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    this.chooseRelevantOffer = () => {
        let modal = "modals/modalOffers.html";
        let size = "bigModal";

        if ($rootScope.borne) {
            modal = "modals/modalOffersBorne.html";
        }
        if (!$rootScope.borneVertical) {
            size = "smallModal";
        }
        if (!$mdMedia('min-width: 800px')) {
            size = "smallModalH";
        }

        //Apply relevant offers
        //If loyalty contains offers : open popup
        let modalInstance = $uibModal.open({
            templateUrl: modal,
            controller: 'ModalOffersController',
            windowClass: 'centeredModals ' + size,
            resolve: {
                offers: () => {
                    return $rootScope.currentShoppingCart.customerLoyalty.Offers;
                },
                relevantOffers: () => {
                    return $rootScope.currentShoppingCart.customerLoyalty.RelevantOffers;
                }
            }
        });
        modalInstance.result.then((selectedOffer) => {
            console.log(selectedOffer);
            loyaltyService.applyOffer(selectedOffer);
        }, () => {});
    };

    this.removeOffers = (offersToRemove) => {
        for (let i = 0; i < offersToRemove.length; i++) {
            let offer = offersToRemove[i];
            const cartItemToRemove = $rootScope.currentShoppingCart.Items.find(i => i.Offer === offer);

            if (cartItemToRemove) {
                offer.isApplied = false;
                productService.removeItem(cartItemToRemove);
            }
        }
    };

    this.useOfferText = (offerText) => {
        //console.log(offerText);
        let passageObj = loyaltyService.createEmptyPassageObj();
        passageObj.Offer = offerText;

        loyaltyService.addPassageAsync(passageObj).then(() => {
            swal({
                title: $translate.instant("L'offre a été utilisée")
            });
            loyaltyService.calculateLoyalty();
        });
    };

    this.addShoppingCartDiscount = (discountObj) => {
        let cartDiscount = null;
        console.log("Add cart discount : " + discountObj.Value + (discountObj.IsPercent ? "%" : "€"));

        $rootScope.createShoppingCart();

        if ($rootScope.currentShoppingCart && !$rootScope.currentShoppingCart.IsAccountConsignorPayment && !$rootScope.currentShoppingCart.IsEmployeeMeal &&
            !$rootScope.currentShoppingCart.IsLoss && !$rootScope.currentShoppingCart.ParentTicket) {
            if (!$rootScope.currentShoppingCart.Discounts) {
                $rootScope.currentShoppingCart.Discounts = [];
            }
            if ($rootScope.currentShoppingCart.Discounts.length > 0) {
                self.discountWaitingQueueProcessing();
                swal({
                    title: $translate.instant("Le ticket a déjà une remise")
                });
            } else {
                // cartDiscount = new ShoppingCartDiscount();
                // cartDiscount.Value = value;
                // cartDiscount.IsPercent = percent;
                // cartDiscount.Total = 0;
                // cartDiscount.DiscountId = discountId;
                // cartDiscount.Name = discountName;

                // cartDiscount.IsLimitedToThisCustomer = isLimitedToThisCustomer;


                //$rootScope.currentShoppingCart.Discounts.push(cartDiscount);
                $rootScope.currentShoppingCart.Discounts.push(discountObj);

                paymentService.calculateTotal();
                loyaltyService.calculateLoyalty();
                self.discountWaitingQueueProcessing();
                $rootScope.$evalAsync();
            }
        } else {
            self.discountWaitingQueueProcessing();
        }

        return cartDiscount;
    };

    this.removeShoppingCartDiscount = (item) => {
        console.log("Remove cart discount");
        let idxToRemove = $rootScope.currentShoppingCart.Discounts.indexOf(item);

        if (idxToRemove > -1) {
            $rootScope.currentShoppingCart.Discounts.splice(idxToRemove, 1);
            // TODO check previous version of this function
            //In case the discount has been removed the discount has been removed
            for (let i of $rootScope.currentShoppingCart.Items) {
                i.DiscountIT = 0;
                i.DiscountET = 0;
            }
            paymentService.calculateTotal();
            loyaltyService.calculateLoyalty();
            $rootScope.$emit("shoppingCartDiscountRemoved");
        }
    };
});