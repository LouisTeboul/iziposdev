app.service('shoppingCartModel', ['$rootScope', '$q', '$state', '$timeout', '$uibModal', 'shoppingCartService', 'productService', 'loyaltyService', 'settingService', 'posUserService', '$translate', 'storeMapService', 'taxesService', 'posPeriodService','posService',
    function ($rootScope, $q, $state, $timeout, $uibModal, shoppingCartService, productService, loyaltyService, settingService, posUserService, $translate, storeMapService, taxesService, posPeriodService, posService) {
        var current = this;

        var lastShoppingCart = undefined;
        var currentShoppingCart = undefined;
        //For splitting ticket
        var currentShoppingCartIn = undefined;
        var currentShoppingCartOut = undefined;
        var paymentModesAvailable = undefined;
        var deliveryType = DeliveryTypes.FORHERE;
        var currentBarcode = { barcodeValue: '' };

        //#region Actions on item
        this.incrementQuantity = function (cartItem) {
            cartItem.DiscountIT += cartItem.DiscountIT / cartItem.Quantity;
            cartItem.DiscountET += cartItem.DiscountET / cartItem.Quantity;
            cartItem.Quantity += 1;
            this.calculateTotal();
            this.calculateLoyalty();
            $rootScope.$emit("shoppingCartItemChanged", cartItem);
        };

        this.decrementQuantity = function (cartItem) {
            if (posUserService.isEnable('DELI')) {
                cartItem.DiscountIT -= cartItem.DiscountIT / cartItem.Quantity;
                cartItem.DiscountET -= cartItem.DiscountET / cartItem.Quantity;
                cartItem.Quantity -= 1;

                this.calculateTotal();
                this.calculateLoyalty();
                $rootScope.$emit("shoppingCartItemChanged", cartItem);

            }
        };

        this.editComment = function (cartItem) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalComment.html',
                controller: 'ModalCommentController',
                resolve: {
                    obj: function () {
                        return cartItem;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then(function (comment) {
                if (comment.length > 0) {
                    //on coupe la ligne si elle n'a pas de commentaire et que la quantité est supérieure à 1
                    if ((!cartItem.Comment || cartItem.Comment.length == 0) && cartItem.Quantity > 1) {
                        cartItem.Quantity--;
                        var newCartItem = clone(cartItem);
                        newCartItem.Quantity = 1;
                        newCartItem.Comment = comment;
                        current.addCartItem(newCartItem);
                    } else {
                        cartItem.Comment = comment;
                    }
                } else {
                    cartItem.Comment = undefined;
                }
            }, function () { });
        };

        this.editMenu = function (cartItem) {
            this.addToCart(cartItem.Product, false, cartItem.Offer, cartItem.IsFree);

            if (cartItem.Quantity > 1) {
                this.decrementQuantity(cartItem);
            } else {
                this.removeItem(cartItem);
            }
        };

        //Remove a line from the ticket
        this.removeItem = function (cartItem) {
            if (posUserService.isEnable('DELI')) //??
            {
                var idxToRemove = currentShoppingCart.Items.indexOf(cartItem);

                if (idxToRemove > -1) {
                    //If already printed in step mode we're setting the quantity to zero
                    if ($rootScope.IziBoxConfiguration.StepEnabled && cartItem.Printed) {
                        cartItem.Quantity = 0;
                        $rootScope.$emit("shoppingCartItemChanged", cartItem);
                    } else {
                        currentShoppingCart.Items.splice(idxToRemove, 1);
                        if (currentShoppingCart.Items.length == 0) {
                            this.clearShoppingCart();
                        }
                        $rootScope.$emit("shoppingCartItemRemoved", cartItem);
                    }
                    this.calculateTotal();
                    this.calculateLoyalty();
                }
            }
        };
        // Remove a line from the ticket
        this.removeItemFrom = function (shoppingCart, cartItem) {
            var idxToRemove = shoppingCart.Items.indexOf(cartItem);

            if (idxToRemove > -1) {
                shoppingCart.Items.splice(idxToRemove, 1);
                this.calculateTotalFor(shoppingCart);
            }
        };

        // Add a product to the ticket
        this.addCartItem = function (cartItem) {
            currentShoppingCart.Items.push(cartItem);
            $timeout(function () {
                current.calculateTotal();

                if (!$rootScope.$$phase) {
                    $rootScope.$apply();
                }
                $rootScope.$emit("shoppingCartItemAdded", cartItem);
            });
        };

        // Used to transfer item from a ticket to another when splitting ticket
        this.splitItemTo = function (shoppingCartTo, shoppingCartFrom, cartItem, amount) {
            var itemExist = undefined;

            //Ticket from an online order doesn't have empty product attributes
            if (!cartItem.Offer && !cartItem.Isfree && cartItem.Product.ProductAttributes && !cartItem.Product.ProductAttributes.length > 0) {
                itemExist = Enumerable.from(shoppingCartTo.Items).firstOrDefault(function (x) {
                    return !x.Comment && !x.Offer && !x.IsFree && x.ProductId == cartItem.ProductId && x.Step == cartItem.Step && x.hashkey == cartItem.hashkey;
                });
            }

            // If the item is already in the shopping cart, increase its price
            // A revoir
            if (itemExist) {
                itemExist.splittedAmount += amount;
                cartItem.splittedAmount -= amount;
            }
            else {
                //Clone l'item
                var item = clone(cartItem);
                item.DiscountET = 0;
                item.DiscountIT = 0;
                item.splittedAmount = 0;

                //Faire le cas ou les taxe ne sont pas incluse dans le prix  ?
                //la fonction taxeService à un bug
				/**
                taxesService.getPricesIncludedTaxAsync().then(function(result){
                	if(result) {
                        item.splittedAmount += amount - item.Product.PriceIT;
					}
					else {
                        item.splittedAmount += amount - item.Product.PriceET;
					}

                    item.Quantity = 1;

                    //On l'ajoute au ticket de destination
                    shoppingCartTo.Items.push(item);
				});

				 */

                item.splittedAmount += amount - item.Product.Price;
                item.isPartSplitItem = true;

                item.Quantity = 1;

                //On l'ajoute au ticket de destination
                shoppingCartTo.Items.push(item);

                //Dans le cas ou l'item d'origine est en plusieurs exemplaire
                if (cartItem.Quantity > 1) {
                    var newCartItem = clone(cartItem);
                    newCartItem.Quantity--;
                    //On regenere un hash
                    newCartItem.hashkey = objectHash(newCartItem);
                    shoppingCartFrom.Items.push(newCartItem);
                }

                cartItem.Quantity = 1;
                cartItem.isPartSplitItem = true; cartItem.splittedAmount -= amount;

            }
            if (cartItem.Product.Price + cartItem.splittedAmount <= 0 && shoppingCartFrom) {

                //Si on a passer l'integralité du produit vers le In,
                //Le produit dans le in n'est plus un produit split
                if (item) {
                    item.isPartSplitItem = false;
                }
                if (itemExist) {
                    itemExist.isPartSplitItem = false;
                }
                this.removeItemFrom(shoppingCartFrom, cartItem);
            }
        };


        // Used to transfer item from a ticket to another when splitting ticket
        this.addItemTo = function (shoppingCartTo, shoppingCartFrom, cartItem, qty) {
            if (!qty) {
                qty = 1;
            }

            var itemExist = undefined;

            //Ticket from an online order doesn't have empty product attributes
            if (!cartItem.Offer && !cartItem.Isfree && cartItem.Product.ProductAttributes && !cartItem.Product.ProductAttributes.length > 0) {
                itemExist = Enumerable.from(shoppingCartTo.Items).firstOrDefault(function (x) {
                    return !x.Comment && !x.Offer && !x.IsFree && x.ProductId == cartItem.ProductId && x.Step == cartItem.Step && x.DiscountET == cartItem.DiscountET && (x.PriceIT == cartItem.PriceIT);
                });
            }

            //If the item is already in the shopping cart, increase its quantity
            //Except if it's a comment product
            if (itemExist || cartItem.Product.ProductComments.length > 0) {
                itemExist.Quantity += qty;
                cartItem.Quantity -= qty;
            }
            else {

                var item = clone(cartItem);
                item.Quantity = qty;
                shoppingCartTo.Items.push(item);
                cartItem.Quantity -= qty;
            }
            if (cartItem.Quantity <= 0 && shoppingCartFrom) {
                this.removeItemFrom(shoppingCartFrom, cartItem);
            }

            if (shoppingCartFrom) this.calculateTotalFor(shoppingCartFrom);
            this.calculateTotalFor(shoppingCartTo);
        };


        /**
		 * @description add a discount to a single cart item
         * @param cartItem, a cart item
         * @param discountAmount, the amount of the discount, provided by the user
         * @param isPercent, % or flat ?
         */
        this.addCartItemDiscount = function (cartItem, discountAmount, isPercent) {
            // User privilege
            if (posUserService.isEnable('OFFI')) {
                if (!isNaN(discountAmount)) {
                    // Since we only apply the discount on 1 item of the line
                    // We create a clone and apply the discount on it
                    var cartItemDiscounted = cartItem;
                    if (cartItem.Quantity > 1) {
                        //decrement original item quantity if the line contain more than one
                        cartItem.Quantity--;

                        //fetch the item index inside the shopping cart
                        var idx = currentShoppingCart.Items.indexOf(cartItem);
                        cartItemDiscounted = clone(cartItem);
                        cartItemDiscounted.Quantity = 1;

                        //Add the new soon-to-be discounted item to the shopping cart
                        currentShoppingCart.Items.splice(idx + 1, 0, cartItemDiscounted);
                    }

                    if (isPercent) {
                        //If this is a % discount
                        if (discountAmount <= 100) {
                            // The discount has to be less than 100%
                            // Set the discount property
                            cartItemDiscounted.DiscountIT = cartItemDiscounted.Product.Price * (discountAmount / 100);
                            cartItemDiscounted.DiscountET = cartItemDiscounted.Product.Price / (1 + (Number(cartItemDiscounted.TaxDetails[0].TaxRate) / 100)) * (discountAmount / 100);
                            //Can use ETtoIT function ?
                        } else
                            sweetAlert($translate.instant("Impossible de faire une remise de plus de 100% !"));

                    } else if (!isPercent) {
                        //If this is a flat discount
                        if (discountAmount <= cartItemDiscounted.Product.Price) {
                            //The discount has to be less than the product price
                            cartItemDiscounted.DiscountET = discountAmount / (1 + (Number(cartItemDiscounted.TaxDetails[0].TaxRate) / 100));
                            cartItemDiscounted.DiscountIT = discountAmount;
                        } else
                            sweetAlert($translate.instant("Impossible de faire une remise superieur au prix du produit !"));

                    }

                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                    $rootScope.$emit("shoppingCartItemChanged", cartItemDiscounted);
                    this.calculateTotal();
                    this.calculateLoyalty();

                } else {
                    sweetAlert($translate.instant("Valeur de remise invalide"));
                }
            } else {
                sweetAlert($translate.instant("Pas les droits"));
            }

        };


        /**
		 * @description add a discount to a cart line
         * @param cartItem, a cart Item
         * @param discountAmount, the amount of the discount, provided by the user
         * @param isPercent, % or flat ?
         */
        this.addCartLineDiscount = function (cartItem, discountAmount, isPercent) {

            if (posUserService.isEnable('OFFI')) {
                if (!isNaN(discountAmount)) {

                    if (isPercent) {
                        //Remise en pourcentage
                        if (discountAmount <= 100) {
                            cartItem.DiscountIT = (cartItem.Product.Price * (discountAmount / 100)) * cartItem.Quantity;
                            cartItem.DiscountET = (cartItem.Product.Price / (1 + (Number(cartItem.TaxDetails[0].TaxRate) / 100)) * (discountAmount / 100)) * cartItem.Quantity;
                        } else
                            sweetAlert($translate.instant("Impossible de faire une remise de plus de 100% !"));

                    } else if (!isPercent) {
                        if (discountAmount <= cartItem.Product.Price * cartItem.Quantity) {
                            //Remise flat

                            cartItem.DiscountET = (discountAmount / (1 + (Number(cartItem.TaxDetails[0].TaxRate) / 100)));
                            cartItem.DiscountIT = discountAmount;
                        } else
                            sweetAlert($translate.instant("Impossible de faire une remise superieur au prix de la ligne !"));

                    }

                    this.calculateTotal();
                    this.calculateLoyalty();
                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                } else {
                    sweetAlert($translate.instant("Valeur de remise invalide"));
                }
            } else {
                sweetAlert($translate.instant("Pas les droits"));
            }

        };




        this.offerItem = function (cartItem) {
            if (posUserService.isEnable('OFFI')) {
                if (cartItem.Quantity > 1) {
                    //on décrémente la ligne de 1
                    cartItem.Quantity--;

                    //index de la ligne
                    var idx = currentShoppingCart.Items.indexOf(cartItem);

                    //on la duplique pour rendre un item gratuit
                    cartItem = clone(cartItem);
                    cartItem.Quantity = 1;

                    //on ajoute la nouvelle ligne au panier
                    currentShoppingCart.Items.splice(idx + 1, 0, cartItem);
                }


                cartItem.IsFree = true;
                cartItem.DiscountIT = 0;
                cartItem.DiscountET = 0;

                this.calculateTotal();
                this.calculateLoyalty();
                $rootScope.$emit("shoppingCartItemChanged", cartItem);
            }
        };

        //#endregion

        //#region Actions on ShoppingCart

        // Creates an empty ticket
        this.createShoppingCart = function () {
            if (currentShoppingCart == undefined) {

                var timestamp = new Date().getTime();
                currentShoppingCart = new ShoppingCart();
                currentShoppingCart.dailyTicketId = undefined;
                currentShoppingCart.TableNumber = undefined;
                currentShoppingCart.Items = new Array();
                currentShoppingCart.Discounts = new Array();
                currentShoppingCart.Timestamp = timestamp;
                currentShoppingCart.id = timestamp;
                currentShoppingCart.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                currentShoppingCart.HardwareId = $rootScope.PosLog.HardwareId;
                currentShoppingCart.PosUserId = $rootScope.PosUserId;
                currentShoppingCart.PosUserName = $rootScope.PosUserName;
                currentShoppingCart.DeliveryType = deliveryType;
                currentShoppingCart.CurrentStep = 0;
                currentShoppingCart.StoreId = $rootScope.IziBoxConfiguration.StoreId;
                currentShoppingCart.CompanyInformation = settingService.getCompanyInfo();
                currentShoppingCart.addCreditToBalance = false;
                currentShoppingCart.isDiscountConsumed = false;

                $rootScope.$emit("shoppingCartChanged", currentShoppingCart);

                var hdid = $rootScope.modelPos.hardwareId;

                //association period / shoppingCart


                posPeriodService.getYPeriodAsync($rootScope.PosLog.HardwareId, $rootScope.PosUserId).then(function (yPeriod) {
                    //Associate period on validate
                    //currentShoppingCart.zPeriodId = yPeriod.zPeriodId;
                    //currentShoppingCart.yPeriodId = yPeriod.id;
                }, function () {
                    if ($rootScope.modelPos.iziboxConnected) {
                        //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                        current.cancelShoppingCart();
                    }
                });

                posService.getUpdDailyTicketValueAsync(hdid, 1).then(function (cashRegisterTicketId) {
                    currentShoppingCart.dailyTicketId = cashRegisterTicketId;
                }).then(function () {
                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                });
            }
        };

        // Creates an empty ticket for the splitting features
        this.createShoppingCartIn = function () {
            var timestamp = new Date().getTime();
            var currentShoppingCartIn = new ShoppingCart();
            currentShoppingCartIn.TableNumber = undefined;
            currentShoppingCartIn.Items = new Array();
            currentShoppingCartIn.Timestamp = timestamp;
            currentShoppingCartIn.id = timestamp;
            currentShoppingCartIn.AliasCaisse = $rootScope.modelPos.aliasCaisse;
            currentShoppingCartIn.yPeriodId = currentShoppingCart.yPeriodId;
            currentShoppingCartIn.zPeriodId = currentShoppingCart.zPeriodId;
            currentShoppingCartIn.HardwareId = $rootScope.PosLog.HardwareId;
            currentShoppingCartIn.PosUserId = $rootScope.PosUserId;
            currentShoppingCartIn.PosUserName = $rootScope.PosUserName;
            currentShoppingCartIn.Discounts = clone(currentShoppingCart.Discounts);
            currentShoppingCartIn.DeliveryType = deliveryType;
            currentShoppingCartIn.CurrentStep = 0;
            currentShoppingCartIn.StoreId = $rootScope.IziBoxConfiguration.StoreId;
            currentShoppingCartIn.CompanyInformation = settingService.getCompanyInfo();
            currentShoppingCartIn.addCreditToBalance = false;
            currentShoppingCartIn.isDiscountConsumed = false;

            Enumerable.from(currentShoppingCartIn.Discounts).forEach(function (item) {
                item.Total = 0;
            });

            var hdid = $rootScope.modelPos.hardwareId;

            //association period / shoppingCart


            // Pb asyncronisme pour les deux promesses

            posPeriodService.getYPeriodAsync($rootScope.PosLog.HardwareId, $rootScope.PosUserId).then(function (yPeriod) {
                //Asociate periods on validate
                //currentShoppingCartIn.zPeriodId = yPeriod.zPeriodId;
                //currentShoppingCartIn.yPeriodId = yPeriod.id;
            }, function () {
                if ($rootScope.modelPos.iziboxConnected) {
                    //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                    current.cancelShoppingCart();
                }
            });

            posService.getUpdDailyTicketValueAsync(hdid, 1).then(function (cashRegisterTicketId) {
                currentShoppingCart.dailyTicketId = cashRegisterTicketId;
            }).then(function () {
                $rootScope.$emit("shoppingCartChanged", currentShoppingCartIn);
            });

            return currentShoppingCartIn;

        };

        // Set the receiving ticket for the split
        this.setCurrentShoppingCartIn = function (shoppingCart) {
            currentShoppingCartIn = shoppingCart;
        };

        //Get the receiving ticket from the split
        this.getCurrentShoppingCartIn = function () {
            return currentShoppingCartIn;
        };

        //Créer le ticket emetteur du split (à partir du ticket courant)
        this.createShoppingCartOut = function () {
            if (currentShoppingCart == undefined) {
                var timestamp = new Date().getTime();
                var currentShoppingCartOut = new ShoppingCart();
                currentShoppingCartOut.dailyTicketId = undefined;
                currentShoppingCartOut.TableNumber = undefined;
                currentShoppingCartOut.Items = new Array();
                currentShoppingCartOut.Discounts = new Array();
                currentShoppingCartOut.Timestamp = timestamp;
                currentShoppingCartOut.id = timestamp;
                currentShoppingCartOut.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                currentShoppingCartOut.HardwareId = $rootScope.PosLog.HardwareId;
                currentShoppingCartOut.PosUserId = $rootScope.PosUserId;
                currentShoppingCartOut.PosUserName = $rootScope.PosUserName;
                currentShoppingCartOut.DeliveryType = deliveryType;
                currentShoppingCartOut.CurrentStep = 0;
                currentShoppingCartOut.StoreId = $rootScope.IziBoxConfiguration.StoreId;
                currentShoppingCartOut.CompanyInformation = settingService.getCompanyInfo();
                currentShoppingCartOut.addCreditToBalance = false;
                currentShoppingCartOut.isDiscountConsumed = false;

                var hdid = $rootScope.modelPos.hardwareId;

                //association period / shoppingCart


                posPeriodService.getYPeriodAsync($rootScope.PosLog.HardwareId, $rootScope.PosUserId).then(function (yPeriod) {
                    //Associate periods on validate
                    //currentShoppingCartOut.zPeriodId = yPeriod.zPeriodId;
                    //currentShoppingCartOut.yPeriodId = yPeriod.id;
                }, function () {
                    if ($rootScope.modelPos.iziboxConnected) {
                        //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                        current.cancelShoppingCart();
                    }
                });

                posService.getUpdDailyTicketValueAsync(hdid, 1).then(function (value) {
                    currentShoppingCartOut.dailyTicketId = value;
                }).then(function () {
                    $rootScope.$emit("shoppingCartChanged", currentShoppingCartOut);
                });
            }
            else {
                currentShoppingCartOut = clone(currentShoppingCart);

                var hdid = currentShoppingCartOut.HardwareId;

                posService.getUpdDailyTicketValueAsync(hdid, 1).then(function (value) {
                    currentShoppingCartOut.dailyTicketId = value;
                }).then(function () {
                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                });

                var cloneItemsArray = [];

                Enumerable.from(currentShoppingCart.Items).forEach(function (item) {
                    if (item.Quantity > 0) {
                        cloneItemsArray.push(clone(item));
                    }
                });

                currentShoppingCartOut.Items = cloneItemsArray;
            }
            return currentShoppingCartOut;
        };

        //Définie le ticket emetteur du split
        this.setCurrentShoppingCartOut = function (shoppingCart) {
            currentShoppingCartOut = shoppingCart;
        };

        //Obtenir le ticket emetteur du split
        this.getCurrentShoppingCartOut = function () {
            return currentShoppingCartOut;
        };

        //NextStep
        this.nextStep = function () {
            if (currentShoppingCart) {
                //Récupération de la derniere étape du ticket
                var lastStep = Enumerable.from(currentShoppingCart.Items).select("x=>x.Step").orderByDescending().firstOrDefault();

                //Si il n'y a pas d'items ou si l'étape est < à l'étape courante, on utilise l'étape courante du ticket
                if (!lastStep || lastStep < currentShoppingCart.CurrentStep) {
                    lastStep = currentShoppingCart.CurrentStep;
                }

                //On vérifie que la dernière étape contient des items
                //var itemsInCurrentStep = Enumerable.from(currentShoppingCart.Items).any(function (item) {
                //	return item.Step == lastStep;
                //});
                var itemsInCurrentStep = true;

                //Si la dernière étape contient des items alors on peut passer à la suivante
                if (itemsInCurrentStep) {
                    currentShoppingCart.CurrentStep = lastStep + 1;
                    $rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
                }
            } else {
                this.createShoppingCart();
            }
        }

        this.previousStep = function () {
            currentShoppingCart.CurrentStep -= 1;

            if (currentShoppingCart.CurrentStep < 0) {
                currentShoppingCart.CurrentStep = 0;
            }

            $rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        }

        this.setStep = function (step) {
            currentShoppingCart.CurrentStep = step;
            $rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        }

        this.addToCartBySku = function (sku) {
            var self = this;
            productService.getProductBySKUAsync(sku).then(function (product) {
                if (product) {
                    self.addToCart(product);
                } else {
                    sweetAlert($translate.instant("Produit introuvable"));
                }
            });;
        }

        //Add a product to the cart
        //TODO : refactor
        this.addToCart = function (product, forceinbasket, offer, isfree, formuleOfferte = false) {
            // The product is payed
            if (this.getCurrentShoppingCart() && this.getCurrentShoppingCart().isPayed) {
                return;
            }

            if (!product.DisableBuyButton) { //Product is not available
                if (isfree == undefined) {
                    isfree = false;
                }
                var qty = 1;
                var b = parseInt(currentBarcode.barcodeValue);
                if (b) {
                    // Hardcoded limit for the quantity
                    if (b > 0 && b < 99) {
                        qty = b;
                        currentBarcode.barcodeValue = "";
                    }
                }

                //Test for a product with attributes
                // POUR LES BURGERS / MENU
                if (!forceinbasket && product.ProductTemplate.ViewPath != 'ProductTemplate.Simple') {
                    $rootScope.currentConfigurableProduct = product;
                    $rootScope.isConfigurableProductOffer = formuleOfferte;
                    $state.go('catalog.' + product.ProductTemplate.ViewPath, { id: product.Id });

                }
                else if (!forceinbasket && product.EmployeeTypePrice) {								//Product with a posuser defined price
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalTypePrice.html',
                        controller: 'ModalTypePriceController',
                        size: 'sm',
                        resolve: {
                            currentPrice: function () {
                                return product.Price;
                            },
                            minPrice: function () {
                                return product.EmployeeTypePriceMin;
                            },
                            maxPrice: function () {
                                return product.EmployeeTypePriceMax;
                            }
                        },
                        backdrop: 'static'
                    });

                    modalInstance.result.then(function (priceValue) {
                        var newProduct = jQuery.extend(true, {}, product);
                        newProduct.Price = priceValue;
                        current.addToCart(newProduct, true)
                    }, function () {
                    });
                } else {
                    this.createShoppingCart();

                    var cartItem = undefined;


                    if (!offer && !isfree && !product.ProductAttributes.length > 0) {
                        cartItem = Enumerable.from(currentShoppingCart.Items).firstOrDefault(function (x) {
                            return !x.Comment && !x.Offer && !x.IsFree && x.ProductId == product.Id && x.Step == currentShoppingCart.CurrentStep && x.DiscountET == 0;
                        });
                    }

                    if (!cartItem || product.ProductAttributes.length > 0 || product.EmployeeTypePrice || product.ProductComments.length > 0) {
                        cartItem = new ShoppingCartItem();
                        cartItem.ProductId = product.Id;
                        cartItem.Product = product;
                        cartItem.Quantity = qty;
                        cartItem.Printer_Id = product.Printer_Id;
                        cartItem.Step = currentShoppingCart.CurrentStep;
                        cartItem.IsFree = isfree;
                        var pStep = Enumerable.from(currentShoppingCart.Items).where("x=>x.Step==" + currentShoppingCart.CurrentStep + " && x.StepPrintCount && x.StepPrintCount>0").firstOrDefault();
                        if (pStep) cartItem.StepPrintCount = pStep.StepPrintCount;
                        cartItem.TaxCategory = product.TaxCategory;
                        cartItem.TaxCategoryId = product.TaxCategoryId;
                        cartItem.Offer = offer;
                        if (product.ProductAttributes.length > 0) {
                            var stepMainProduct = Enumerable.from(product.ProductAttributes).min("attr=>attr.Step");
                            cartItem.Step = stepMainProduct != undefined ? stepMainProduct : cartItem.Step;
                            cartItem.Attributes = [];
                            for (var i = 0; i < product.ProductAttributes.length; i++) {
                                var attribute = product.ProductAttributes[i];
                                for (j = 0; j < attribute.ProductAttributeValues.length; j++) {
                                    var value = attribute.ProductAttributeValues[j];
                                    if (value.Selected) {
                                        var elem = {
                                            ProductAttributeId: attribute.Id,
                                            ProductAttributeValueId: value.Id,
                                            PriceAdjustment: value.PriceAdjustment
                                        };

                                        if (value.LinkedProduct) {
                                            elem.Name = value.LinkedProduct.Name;
                                            elem.Comment = value.Comment;
                                            if (value.LinkedProduct.StoreInfosObject) elem.Printer_Id = value.LinkedProduct.StoreInfosObject.Printer_Id;
                                        } else {
                                            elem.Name = value.Name;
                                        }
                                        elem.Step = attribute.Step;
                                        cartItem.Attributes.push(elem);
                                    }

                                }
                            }

                        }
                        cartItem.hashkey = objectHash(cartItem);

                        currentShoppingCart.Items.push(cartItem);
                        if (cartItem.Product.ProductComments && cartItem.Product.ProductComments.length > 0) {
                            this.editComment(cartItem);
                        }
                    } else {
                        cartItem.Quantity = cartItem.Quantity + qty;
                        $rootScope.$emit("shoppingCartItemChanged", cartItem);
                    }

                    $timeout(function () {
                        current.calculateTotal();
                        current.calculateLoyalty();
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                        $rootScope.$emit("shoppingCartItemAdded", cartItem);
                    });
                }
            }
        };

		/**
		* Modal for the loyalty 'custom action' choice      
		*/
        this.openCustomActionModal = function () {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalCustomAction.html',
                controller: 'ModalCustomActionController',
                backdrop: 'static',
                size: 'lg',
            });
        };
		/**
		* Modal for the loyalty 'custom action' choice    
		*/
        this.openModalDelivery = function (boolValue) {

            // Force the choice delivery on ticket validation
            if ($rootScope.IziBoxConfiguration.ForceDeliveryChoice) {

                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalDeliveryChoice.html',
                    controller: 'ModalDeliveryChoiceController',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        parameter: boolValue
                    }
                });
            }
        };

        function periodValidation(ignorePrintTicket){

            // On recupere les periodes courantes et on les affecte au ticket
            // Si besoin est, on demande a l'utilisateur de renseigner le fond de caisse
            // Pour la nouvelle periode
            posPeriodService.getYPeriodAsync(currentShoppingCart.HardwareId, currentShoppingCart.PosUserId, true, false).then(function(yp){

                currentShoppingCart.yPeriodId = yp.id;
                currentShoppingCart.zPeriodId = yp.zPeriodId;
                var currentDate = new Date();
                currentShoppingCart.Date = currentDate.toString('dd/MM/yyyy H:mm:ss');
                if (!currentShoppingCart.DateProd) {
                    currentShoppingCart.DateProd = currentShoppingCart.Date;
                }
                var toSave = clone(currentShoppingCart);


                //TODO : Add the posuser to create a ticket from an online order
                // Suppressing line with zero for quantity
                toSave.Items = Enumerable.from(currentShoppingCart.Items).where("item => item.Quantity > 0").toArray();

                lastShoppingCart = toSave;

                //shoppingCartService.updatePaymentShoppingCartAsync(toSave).then(function (result) {
                $rootScope.hideLoading();

                // Once the ticket saved we delete the splitting ticket
                currentShoppingCartIn = undefined;

                if (currentShoppingCartOut) {
                    currentShoppingCart = clone(currentShoppingCartOut);
                    deliveryType = currentShoppingCart.DeliveryType;
                    currentShoppingCartOut = undefined;
                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);

                }
                else {
                    current.clearShoppingCart();
                }

                // Print Ticket
                current.printPOSShoppingCart(toSave, ignorePrintTicket);

            }, function(){
                //Dans le cas ou le fetch / creation yPeriod echoue, on supprime le panier
                $rootScope.hideLoading();
                current.clearShoppingCart();
            });
        };

		/**
		*@ngdoc method
		*@name validShoppingCart
		*@methodOf shoppingCartModel
		*@description 
		*	Ticket validation
		*@param {boolean} ignorePrintTicket printing is ignored
		*@return {void}
		*/
        this.validShoppingCart = function (ignorePrintTicket) {
            if (currentShoppingCart != undefined && currentShoppingCart.Items.length > 0) {
                $rootScope.showLoading();
                console.log(currentShoppingCart);

                if (!currentShoppingCart.Residue == 0) {																	//The ticket must be paid
                    $rootScope.hideLoading();
                    sweetAlert($translate.instant("Le ticket n'est pas soldé"));
                    return;
                }

                // Si le ticket est associé à un client
                if(currentShoppingCart.customerLoyalty){
                    //Si le client possède au moins une balance UseToPay
                    var hasBalanceUseToPay = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).firstOrDefault(function(balance){
                        return balance.UseToPay == true;
                    });

                    if (hasBalanceUseToPay && currentShoppingCart.Credit > 0) {

                        currentShoppingCart.utpId = hasBalanceUseToPay.Id;

                        // Propose à l'utilisateur de crediter son compte fidélité
                        swal({
                                title: "Cagnotter l'avoir sur le compte fidélité ?",
                                text: currentShoppingCart.Credit + "€ d'avoir",
                                type: "warning",
                                showCancelButton: true,
                                confirmButtonColor: '#DD6B55',
                                confirmButtonText: 'Oui',
                                cancelButtonText: "Non",
                                closeOnConfirm: true,
                                closeOnCancel: true
                            },
                            function (isConfirm) {
                                if (isConfirm) {
                                    currentShoppingCart.addCreditToBalance = true;
                                }
                                periodValidation(ignorePrintTicket);
                            });

                    } else {
                        periodValidation(ignorePrintTicket);
                    }

                } else {
                    periodValidation(ignorePrintTicket);
                }
            }

        };

		/**
		 *  Print the last ticket
		 */
        this.printLastShoppingCart = function () {
            if (lastShoppingCart) {
                shoppingCartService.reprintShoppingCartAsync(lastShoppingCart).then(function () { },
                    function () {
                        sweetAlert($translate.instant("Erreur d'impression du dernier ticket !"));
                    });
            }
        };

        this.getLastShoppingCart = function () {
            return lastShoppingCart;
        };

		/***
		 * Print a note for the customer - The note doesn't include the shopping cart details
		 * @param shoppingCart
		 */
        this.printShoppingCartNote = function (shoppingCart) {

            // Print the last transaction or not
            if (!shoppingCart) {
                shoppingCart = lastShoppingCart;
            }

            // Print the current shopping cart
            if (shoppingCart) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalShoppingCartNote.html',
                    controller: 'ModalShoppingCartNoteController',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (nbNote) {
                    shoppingCartService.printShoppingCartAsync(shoppingCart, $rootScope.PrinterConfiguration.POSPrinter, false, 1, false, nbNote).then(function () { },
                        function () {
                            sweetAlert($translate.instant("Erreur d'impression de la note !"));
                        });

                }, function () {
                });
            }
        };

		/**
		 * Print the ticket
		 * @param shoppingCart
		 * @param ignorePrintTicket
		 */
        this.printPOSShoppingCart = function (shoppingCart, ignorePrintTicket) {

            //The ticket is sent for printing
            shoppingCartService.printShoppingCartAsync(shoppingCart, $rootScope.PrinterConfiguration.POSPrinter,
                true, $rootScope.PrinterConfiguration.POSPrinterCount, ignorePrintTicket).then(function (obj) {

                    if ($rootScope.IziBoxConfiguration.ForcePrintProdTicket) {
                        //Print the Prod Ticket (Bleu button)
                        if ($rootScope.IziBoxConfiguration.StepEnabled) {
                            current.printStepProdShoppingCart(lastShoppingCart);
                        }
                        //Print the Prod Ticket (green button, toque)
                        else {
                            current.printProdShoppingCart(lastShoppingCart);
                        }
                    }

                }, function (err) {

                    // Possible value in err.result :
                    //  - Le service n'a pas répondu. Veuillez essayer de nouveau
                    //  - Le ticket est vide, impossible de le valider
                    //  - Aucun article n'a été ajouté au ticket, impossible de le valider
                    //  - Les moyens de payment ne sont pas renseignés, impossible de valider le ticket
                    if (!ignorePrintTicket) {
                        if (err.error == undefined) {
                            err.error = "Erreur d'impression caisse !";
                        }
                        sweetAlert($translate.instant(err.error));
                        //sweetAlert($translate.instant("Erreur d'impression caisse !"));
                    }

                    //Sauvegarde de la requete dans PouchDb pour stockage ultérieur
                    if (err.request) {
                        err.request._id = err.request.ShoppingCart.id.toString();
                        $rootScope.dbValidatePool.put(err.request);
                    }
                });
        };

		/**
		 * Delete the current ticket
		 * @deprecated
		 */
        this.cancelShoppingCart = function () {
            this.clearShoppingCart();
        };

		/**
		 * Cancel the shopping cart - The event should be logged
		 */
        this.cancelShoppingCartAndSend = function () {
            if (currentShoppingCart != undefined) {
                console.log(currentShoppingCart);

                var hdid = currentShoppingCart.HardwareId;

                posService.getUpdDailyTicketAsync(hdid, -1);

                $rootScope.showLoading();

                var currentDate = new Date();
                currentShoppingCart.Date = currentDate.toString('dd/MM/yyyy H:mm:ss');
                currentShoppingCart.Canceled = true;

                var cancelContinue = function () {
                    $rootScope.hideLoading();

                    //Si la sauvegarde du ticket validé est ok, on supprime éventuellement les tickets splittés.
                    currentShoppingCartIn = undefined;

                    if (currentShoppingCartOut) {
                        currentShoppingCart = clone(currentShoppingCartOut);
                        deliveryType = currentShoppingCart.DeliveryType;
                        currentShoppingCartOut = undefined;
                        $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                    }
                    else {
                        current.clearShoppingCart();
                    }
                };

                shoppingCartService.printShoppingCartAsync(currentShoppingCart, $rootScope.PrinterConfiguration.POSPrinter,
                    true, $rootScope.PrinterConfiguration.POSPrinterCount, true).then(function (result) {
                        cancelContinue();
                    }, function (err) {
                        //Sauvegarde de la requete dans PouchDb pour stockage ultérieur
                        if (err.request) {
                            err.request._id = err.request.ShoppingCart.id.toString();
                            $rootScope.dbValidatePool.put(err.request);
                        }
                        cancelContinue();
                    });
            }

        };

		/**
		 * Send a ticket for production
		 */
        this.printProdShoppingCart = function (forceShoppingCart) {

            var shoppingCart = currentShoppingCart;

            if (forceShoppingCart != undefined && forceShoppingCart.Items.length > 0) {
                shoppingCart = forceShoppingCart;
            }
            if (shoppingCart != undefined && shoppingCart.Items.length > 0) {

                shoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

                // No line with quantity 0
                var toPrint = clone(shoppingCart);
                toPrint.Items = Enumerable.from(shoppingCart.Items).where("item => item.Quantity > 0").toArray();

                shoppingCartService.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.ProdPrinter, false, $rootScope.PrinterConfiguration.ProdPrinterCount, false, 0).then(function (msg) {
                }, function (err) {
                    sweetAlert($translate.instant("Erreur d'impression production !"));
                });
            }
        };

        //Send the ticket to the production printer
        //The printing is managing the 'steps'
        this.printStepProdShoppingCart = function (forceShoppingCart) {

            var shoppingCart = currentShoppingCart;

            if (forceShoppingCart != undefined && forceShoppingCart.Items.length > 0) {
                shoppingCart = forceShoppingCart;
            }
            if (shoppingCart != undefined && shoppingCart.Items.length > 0) {

                shoppingCart.DateProd = new Date().toString('dd/MM/yyyy H:mm:ss');

                var shoppingCartProd = clone(shoppingCart);

                shoppingCartService.printProdAsync(shoppingCartProd, shoppingCart.CurrentStep).then(function (req) {
                    Enumerable.from(shoppingCart.Items).forEach(function (item) {
                        if (item.Step == req.Step) {
                            item.Printed = true;
                            item.PrintCount = item.StepPrintCount ? item.StepPrintCount + 1 : 1;
                            item.StepPrintCount = item.StepPrintCount ? item.StepPrintCount + 1 : 1;
                            item.PrintedQuantity = item.Quantity;
                        }
                        if (item.Attributes) {
                            Enumerable.from(item.Attributes).forEach(function (attr) {
                                if (attr.Step == req.Step) {
                                    attr.Printed = true;
                                    attr.PrintCount = attr.PrintCount ? attr.PrintCount + 1 : 1;
                                }
                            });
                            item.PartialPrinted = false
                            if (Enumerable.from(item.Attributes).any("x => x.Printed")) {
                                if (Enumerable.from(item.Attributes).any("x => !x.Printed")) {
                                    item.PartialPrinted = true;
                                }
                            }
                        }
                    });
                }, function (err) {
                    sweetAlert($translate.instant("Erreur d'impression production !"));
                });
            }
        };

        //Put a ticket in a stand-by
        //When a ticket is 'unfreezed' other POs can't access it
        this.freezeShoppingCart = function () {
            if (currentShoppingCart != undefined) {
                shoppingCartService.freezeShoppingCartAsync(currentShoppingCart).then(function (result) {
                    if (currentShoppingCartOut) {
                        current.setCurrentShoppingCart(currentShoppingCartOut);
                        currentShoppingCartOut = undefined;
                        currentShoppingCartIn = undefined;
                    } else {
                        current.clearShoppingCart();
                    }
                }, function (err) {
                    sweetAlert($translate.instant("Erreur de mise en attente !"));
                });
            }
        };

        this.setCurrentShoppingCart = function (shoppingCart) {
            currentShoppingCart = shoppingCart;
            deliveryType = currentShoppingCart.DeliveryType;
            current.calculateTotal();
            current.calculateLoyalty();
            $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
        };

        this.unfreezeShoppingCartById = function (id) {
            if (currentShoppingCart == undefined) {
                shoppingCartService.getFreezedShoppingCartByIdAsync(id).then(function (shoppingCart) {
                    shoppingCartService.unfreezeShoppingCartAsync(shoppingCart);
                    currentShoppingCart = shoppingCart;
                    deliveryType = currentShoppingCart.DeliveryType;
                    current.calculateTotal();
                    current.calculateLoyalty();

                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                }, function () {
                    sweetAlert($translate.instant("Ticket introuvable") + "...");
                });
            } else {
                sweetAlert($translate.instant("Vous avez déjà un ticket en cours") + "...");
            }
        };

        this.unfreezeShoppingCartByBarcode = function (barcode) {
            if (currentShoppingCart == undefined) {
                shoppingCartService.getFreezedShoppingCartByBarcodeAsync(barcode).then(function (shoppingCart) {
                    shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function () {

                    }, function (err) {
                        console.log(err)
                    });
                    currentShoppingCart = shoppingCart;
                    deliveryType = currentShoppingCart.DeliveryType;
                    current.calculateTotal();
                    current.calculateLoyalty();

                    console.log("on a recup le ticket suivant : ");
                    console.log(currentShoppingCart);

                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                }, function () {
                    console.log("pas de ticket dans le freeze pour le barcode ", barcode);
                });
            } else {
                sweetAlert($translate.instant("Vous avez déjà un ticket en cours") + "...");
            }
        };

        this.unfreezeShoppingCart = function () {
            if (currentShoppingCart == undefined) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalUnfreezeShoppingCart.html',
                    controller: 'ModalUnfreezeShoppingCartController',
                    size: 'lg',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (shoppingCart) {
                    currentShoppingCart = shoppingCart;
                    deliveryType = currentShoppingCart.DeliveryType;
                    current.calculateTotal();
                    current.calculateLoyalty();

                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                }, function () {
                });
            } else {
                sweetAlert($translate.instant("Vous avez déjà un ticket en cours") + "...");
            }
        };

        this.clearShoppingCart = function () {
            if (currentShoppingCart != undefined) {
                currentShoppingCart = undefined;
                currentShoppingCartIn = undefined;
                currentShoppingCartOut = undefined;
                $rootScope.$emit("shoppingCartCleared");
            }

            this.updatePaymentModes();
        };


        this.selectTableNumber = function () {
            var currentTableNumber;

            if (currentShoppingCart != undefined && currentShoppingCart.TableNumber != undefined) {
                currentTableNumber = currentShoppingCart.TableNumber;
            }

            var currentTableCutleries;

            if (currentShoppingCart != undefined && currentShoppingCart.TableCutleries != undefined) {
                currentTableCutleries = currentShoppingCart.TableCutleries;
            }


            var modalInstance;

            var resultSelectTable = function () {
                modalInstance.result.then(function (tableValues) {
                    var updateSelectedTable = function (tableValues, isUnfreeze) {
                        var setValues = function (tableValues) {
                            currentShoppingCart.TableNumber = tableValues.tableNumber;
                            currentShoppingCart.TableCutleries = tableValues.tableCutleries;
                            $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                        };

                        if (isUnfreeze) {
                            setValues(tableValues);
                        } else {
                            shoppingCartService.getFreezedShoppingCartByTableNumberAsync(tableValues.tableNumber).then(function (sc) {
                                sweetAlert($translate.instant("Cette table existe déjà") + "...");
                                $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                            }, function () {
                                setValues(tableValues);
                            });
                        }
                    };

                    if (currentShoppingCart == undefined) {
                        shoppingCartService.getFreezedShoppingCartByTableNumberAsync(tableValues.tableNumber).then(function (sc) {
                            current.setCurrentShoppingCart(sc);
                            shoppingCartService.unfreezeShoppingCartAsync(sc);
                            updateSelectedTable(tableValues, true);
                        }, function () {
                            current.createShoppingCart();
                            updateSelectedTable(tableValues);
                        });
                    } else {
                        updateSelectedTable(tableValues);
                    }
                }, function () {
                });
            };

            var showTable = function () {
                modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalTable.html',
                    controller: 'ModalTableController',
                    resolve: {
                        currentTableNumber: function () {
                            return currentTableNumber;
                        },
                        currentTableCutleries: function () {
                            return currentTableCutleries;
                        }
                    },
                    size: 'sm',
                    backdrop: 'static'
                });

                resultSelectTable();
            };

            var showTablePlan = function (storeMap) {
                modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalTablePlan.html',
                    controller: 'ModalTablePlanController',
                    resolve: {
                        currentStoreMap: function () {
                            return storeMap;
                        },
                        currentTableNumber: function () {
                            return currentTableNumber;
                        },
                        currentTableCutleries: function () {
                            return currentTableCutleries;
                        }
                    },
                    size: 'full',
                    backdrop: 'static'
                });

                resultSelectTable();
            };

            storeMapService.getStoreMapAsync().then(function (storeMap) {

                if (storeMap && storeMap.data && storeMap.data.length > 0) {
                    showTablePlan(storeMap);
                } else {
                    showTable();
                }

            }, function () {
                showTable();
            });
        };
        //#endregion

        //#region Fid
        this.scanFidBarcode = function () {
            var barcode = undefined;

            try {
                cordova.plugins.barcodeScanner.scan(
                    function (result) {
                        barcode = result.text;
                        current.getLoyalty(barcode);
                    },
                    function (error) {
                    }
                );
            } catch (err) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalBarcodeReader.html',
                    controller: 'ModalBarcodeReaderController',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (value) {
                    barcode = value;
                    current.getLoyalty(barcode);
                }, function () {
                });
            }
        };

        this.enterFidBarcode = function () {
            var barcode = undefined;

            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalManualBarcode.html',
                controller: 'ModalManualBarcodeController',
                backdrop: 'static'
            });

            modalInstance.result.then(function (value) {
                barcode = value;
                current.getLoyalty(barcode);
            }, function () {
            });
        };

        this.chooseRelevantOffer = function () {
            //Apply relevant offers
            //If loyalty contains offers : open popup
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalOffers.html',
                controller: 'ModalOffersController',
                resolve: {
                    offers: function () {
                        return currentShoppingCart.customerLoyalty.Offers;
                    },
                    relevantOffers: function () {
                        return currentShoppingCart.customerLoyalty.RelevantOffers;
                    }
                }
            });

            modalInstance.result.then(function (selectedOffer) {
                console.log(selectedOffer);
                current.applyOffer(selectedOffer);
            }, function () {

            });
        };

        this.getLoyalty = function (barcode) {
            barcode = barcode.trim();

            if (barcode) {

                loyaltyService.getLoyaltyObjectAsync(barcode).then(function (loyalty) {
                    if (loyalty && loyalty.CustomerId != 0) {
                        current.createShoppingCart();
                        current.removeAllLoyalties();

                        currentShoppingCart.Barcode = barcode;
                        currentShoppingCart.customerLoyalty = loyalty;
                        current.calculateLoyalty();
                        $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    } else {
                        sweetAlert($translate.instant("Carte de fidélité introuvable !"));
                    }
                }, function (err) {
                    console.log(err);
                    sweetAlert($translate.instant("Le serveur de fidélité n'a pas répondu !"));
                });
            }
        };

		/**
		 * Delete balance and offer in the customer loyalty
		 */
        this.removeAllLoyalties = function () {
            if (currentShoppingCart.customerLoyalty) {

                var offersToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Offers).where(function (o) {
                    return o.isApplied;
                }).toArray();

                if (offersToRemove.length > 0) {
                    this.removeOffers(offersToRemove);
                }

                var balancesToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).toArray();

                if (balancesToRemove.length > 0) {
                    this.removeBalances(balancesToRemove);
                }
            }
        };

		/**
		 * Empty Obj for loyalty operation
		 * @returns {{Login: null, Password: null, Key: null, Barcode: (*|string), CustomerFirstName: *, CustomerLastName: *, CustomerEmail: *, OrderTotalIncludeTaxes: number, OrderTotalExcludeTaxes: number, CurrencyCode: string, Items: Array, BalanceUpdate: {}, OrderSpecificInfo: string}}
		 */
        this.createEmptyPassageObj = function () {
            if (currentShoppingCart != null && currentShoppingCart.customerLoyalty != null && currentShoppingCart.customerLoyalty.Barcodes.length > 0) {
                return {
                    "Login": null,
                    "Password": null,
                    "Key": null,
                    "Barcode": currentShoppingCart.customerLoyalty.Barcodes[0].Barcode,
                    "CustomerFirstName": currentShoppingCart.customerLoyalty.CustomerFirstName,
                    "CustomerLastName": currentShoppingCart.customerLoyalty.CustomerLastName,
                    "CustomerEmail": currentShoppingCart.customerLoyalty.CustomerEmail,
                    "OrderTotalIncludeTaxes": 0,
                    "OrderTotalExcludeTaxes": 0,
                    "CurrencyCode": "EUR", // TODO: This is hardcoded and should be changed
                    "Items": [],
                    "BalanceUpdate": {},
                    "OrderSpecificInfo": "2",
                    "Offer": {}
                };
            }
            else {
                return {};
            }
        };

		/**
		 * Apply offers - text offers are not available to use
		 */
        this.calculateLoyalty = function () {
            if (currentShoppingCart != undefined && currentShoppingCart.customerLoyalty != undefined && currentShoppingCart.customerLoyalty.Offers != undefined) {
                var totalCart = currentShoppingCart != undefined && currentShoppingCart.Total != undefined ? currentShoppingCart.Total : 0;

                //Remove offers that no longer apply
                var offersToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Offers).where(function (o) {
                    return o.OfferParam != null && o.isValid && (o.OfferParam.MinOrderIncTax != undefined && o.OfferParam.MinOrderIncTax > totalCart) && o.isApplied;
                }).toArray();

                if (offersToRemove.length > 0) {
                    this.removeOffers(offersToRemove);
                }
                if (!(Enumerable.from(currentShoppingCart.customerLoyalty.Offers).any("o=>o.isApplied"))) {
                    // Obtains relevant offers
                    currentShoppingCart.customerLoyalty.RelevantOffers = Enumerable.from(currentShoppingCart.customerLoyalty.Offers).where(function (o) {
                        //return o.OfferParam != null && o.isValid && (o.OfferParam.MinOrderIncTax == undefined || (o.OfferParam.MinOrderIncTax != undefined && o.OfferParam.MinOrderIncTax <= totalCart)) && !o.isApplied;
                        return o.isValid && (o.OfferTypeName == "PromoText" || (o.OfferParam != null && (o.OfferParam.MinOrderIncTax == undefined || (o.OfferParam.MinOrderIncTax != undefined && o.OfferParam.MinOrderIncTax <= totalCart)))) && !o.isApplied;
                    }).toArray();

                } else {
                    currentShoppingCart.customerLoyalty.RelevantOffers = undefined;
                }

                if (!$rootScope.$$phase) $rootScope.$apply();

                // Obtains balances can be used to pay
                var relevantBalances = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).where(function (o) {
                    return o.UseToPay && o.MinOrderTotalIncVAT <= totalCart;
                }).toArray();

                if (relevantBalances.length > 0) {
                    this.applyBalances(relevantBalances);
                }

                //Remove balances that no longer apply
                var balancesToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).where(function (o) {
                    return o.MinOrderTotalIncVAT > totalCart
                }).toArray();

                if (balancesToRemove.length > 0) {
                    this.removeBalances(balancesToRemove);
                }
            }
        };

        this.removeBalances = function (balancesToRemove) {
            for (var i = 0; i < balancesToRemove.length; i++) {
                var balance = balancesToRemove[i];
                var idxToRemove = Enumerable.from(paymentModesAvailable).indexOf(function (p) { return p.Value == balance; });
                if (idxToRemove > -1) {
                    paymentModesAvailable.splice(idxToRemove);
                }
            }
            $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
        };

        this.removeOffers = function (offersToRemove) {
            for (var i = 0; i < offersToRemove.length; i++) {
                var offer = offersToRemove[i];
                var cartItemToRemove = Enumerable.from(currentShoppingCart.Items).firstOrDefault(function (i) { return i.Offer == offer; });
                if (cartItemToRemove) {
                    offer.isApplied = false;
                    this.removeItem(cartItemToRemove);
                }
            }
        };

        this.applyBalances = function (balances) {
            paymentModesAvailable = paymentModesAvailable.filter(function(pma){
                return !pma.IsBalance;
            });
            // Il faut delete les autres balances avant d'ajouter celles ci
            for (var i = 0; i < balances.length; i++) {
                var balance = balances[i];
                //Create new payment mode
                var paymentModeExists = Enumerable.from(paymentModesAvailable).any(function (p) {
                    return p.Balance != undefined && p.Balance.Id == balance.Id;
                });
                if (!paymentModeExists) {
                    var newPaymentMode = {
                        Text: balance.BalanceName,
                        Value: balance.BalanceName,
                        Balance: balance,
                        IsBalance: true
                    };
                    paymentModesAvailable.push(newPaymentMode);
                }
            }
            $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
        };

        this.applyOffer = function (offer) {
            switch (offer.OfferTypeName) {
                case "AddProduct":
                    offer.isApplied = true;
                    this.offerAddProduct(offer);
                    break;
                case "PromoText":
                    offer.isApplied = true;
                    this.offerPromoText(offer);
                    break;
                case "OneProductInCategory":
                    offer.isApplied = true;
                    this.offerOneProductInCategory(offer);
                    break;
                default:
                    console.log("Unrecognized offer");
            }

            currentShoppingCart.Offer = offer;
        };

        this.offerAddProduct = function (offer) {
            //Obtain product id to add
            var productIds = productService.getProductIdsFromOfferParam(offer.OfferParam);
            var offerPrice = offer.OfferParam.Price;

            productService.getProductByIdsAsync(productIds).then(function (products) {
                Enumerable.from(products).forEach(function (product) {
                    //Apply offer price
                    product.Price = offerPrice > product.Price ? product.Price : offerPrice;

                    if(product.ProductAttributes.length > 0) {
                        current.addToCart(product, false, offer);
                    } else {
                        current.addToCart(product, true, offer);
                    }

                });
            });
        };

        this.offerPromoText = function (offer) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalPromoText.html',
                controller: 'ModalPromoTextController',
                resolve: {
                    offerPromoText: function () {
                        return offer;
                    }
                },
                backdrop: 'static'
            });
        };

        this.offerOneProductInCategory = function (offer) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalOneProductInCategory.html',
                controller: 'ModalOneProductInCategoryController',
                size: 'lg',
                resolve: {
                    offerOneProductInCategory: function () {
                        return offer;
                    }
                }
            });
        };

        this.removeBalanceUpdate = function () {
            currentShoppingCart.BalanceUpdate = undefined;
        };

        this.useOfferText = function (offerText) {
            //console.log(offerText);

            var passageObj = this.createEmptyPassageObj();
            passageObj.Offer = offerText;
            loyaltyService.addPassageAsync(passageObj).then(function (res) {
                sweetAlert($translate.instant("L'offre a été utilisé"));
                current.calculateLoyalty();
            });
        }

        //#endregion

        //#region Discount
        this.addShoppingCartDiscount = function (value, percent) {
            console.log("Add discount cart");
            this.createShoppingCart();

            if (currentShoppingCart.Discounts.length > 0) {
                sweetAlert($translate.instant("Le ticket a déjà une remise"));

            } else {
                var cartDiscount = new ShoppingCartDiscount();
                cartDiscount.Value = value;
                cartDiscount.IsPercent = percent;
                cartDiscount.Total = 0;

                currentShoppingCart.Discounts.push(cartDiscount);

                setTimeout(function () {

                    current.calculateTotal();
                    current.calculateLoyalty();
                    $rootScope.$emit("shoppingCartDiscountAdded", cartDiscount);
                }, 100)
            }

        };

        this.removeShoppingCartDiscount = function (item) {
            var idxToRemove = currentShoppingCart.Discounts.indexOf(item);
            if (idxToRemove > -1) {
                currentShoppingCart.Discounts.splice(idxToRemove, 1);

                // TODO check previous version of this function


                //In case the discount has been removed the discount has been removed
                Enumerable.from(currentShoppingCart.Items).forEach(function (i) {
                    i.DiscountIT = 0;
                    i.DiscountET = 0;
                });

                this.calculateTotal();
                this.calculateLoyalty();


                $rootScope.$emit("shoppingCartDiscountRemoved", item);
            }
        };
        //#endregion

        //#region Payment totals
        this.getPaymentModesAvailable = function () {
            return paymentModesAvailable;
        };

        this.removeTicketRestaurantFromCart = function (item) {
            currentShoppingCart.TicketsResto = undefined;
        };

        this.addTicketRestaurant = function (barcode) {
            var result = false;

            // If the ticket has already been added
            if (currentShoppingCart.TicketsResto != undefined && currentShoppingCart.TicketsResto.length > 0) {
                for (var i = 0; i < currentShoppingCart.TicketsResto.length; i++) {
                    if (currentShoppingCart.TicketsResto[i].Number == barcode.substr(0, 9)) {
                        sweetAlert($translate.instant("Le ticket-restaurant a déjà été ajouté!"));
                        return false;
                    }
                }
            }

            var tkRestoPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (pm) {
                return pm.PaymentType == PaymentType.TICKETRESTAURANT;
            });


            if (tkRestoPaymentMode) {

                var tkResto = {
                    Number: barcode.substr(0, 9),
                    Key: barcode.substr(9, 2),
                    Value: roundValue(parseFloat(barcode.substr(11, 5)) / 100),
                    Supplier: barcode.substr(16, 1),
                    ControlKey: barcode.substr(17, 2),
                    Family: barcode.substr(19, 3),
                    Product: barcode.substr(22, 1),
                    Year: barcode.substr(23, 1)
                };


                var tkRestoPayment = {
                    PaymentType: tkRestoPaymentMode.PaymentType,
                    Value: tkRestoPaymentMode.Value,
                    Text: tkRestoPaymentMode.Text,
                    Total: tkResto.Value,
                    IsBalance: tkRestoPaymentMode.IsBalance
                };

                result = current.addPaymentMode(tkRestoPayment);

                if (!result) {
                    sweetAlert($translate.instant("Le ticket-restaurant n'a pu être ajouté !"));
                }
                else {
                    // Add ticketresto to shoppingCart
                    if (!currentShoppingCart.TicketsResto) {
                        currentShoppingCart.TicketsResto = [];
                    }

                    currentShoppingCart.TicketsResto.push(tkResto);
                }
            }

            return result;
        };

        this.removeTicketRestaurant = function (tkResto) {
            var idx = currentShoppingCart.TicketsResto.indexOf(tkResto);
            if (idx > -1) {
                currentShoppingCart.TicketsResto.splice(idx, 1);

                var tkRestoPaymentMode = Enumerable.from(currentShoppingCart.PaymentModes).firstOrDefault(function (pm) {
                    return pm.PaymentType == PaymentType.TICKETRESTAURANT;
                });

                if (tkRestoPaymentMode) {
                    tkRestoPaymentMode.Total = roundValue(tkRestoPaymentMode.Total - tkResto.Value);
                }
            }
        };

        this.addPaymentMode = function (selectedPaymentMode) {
            var result = false;

            if (currentShoppingCart != undefined) {
                if (!currentShoppingCart.PaymentModes) {
                    currentShoppingCart.PaymentModes = [];
                }

                var paymentMode = Enumerable.from(currentShoppingCart.PaymentModes).firstOrDefault("x => x.Value == '" + selectedPaymentMode.Value + "'");

                if (!paymentMode) {
                    paymentMode = selectedPaymentMode;
                } else {
                    paymentMode.Total = roundValue(paymentMode.Total + selectedPaymentMode.Total);
                }

                result = current.setPaymentMode(paymentMode);
            }

            return result;
        };

        this.setPaymentMode = function (paymentMode) {
            var result = false;

            if (currentShoppingCart != undefined) {
                if (!currentShoppingCart.PaymentModes) {
                    currentShoppingCart.PaymentModes = [];
                }

                if (!paymentMode.IsBalance) {
                    var idxElem = currentShoppingCart.PaymentModes.indexOf(paymentMode);

                    if (idxElem == -1 && paymentMode.Total > 0) {
                        currentShoppingCart.PaymentModes.push(paymentMode);
                    } else if (paymentMode.Total == 0) {
                        currentShoppingCart.PaymentModes.splice(idxElem, 1);
                    }
                } else {
                    var balanceUpdate = new LoyaltyObjecBalancetUpdateModel();
                    balanceUpdate.Id = paymentMode.Balance.Id;
                    balanceUpdate.UpdateValue = paymentMode.Total;
                    balanceUpdate.BalanceName = paymentMode.Value;

                    if (balanceUpdate.UpdateValue > 0) {
                        currentShoppingCart.BalanceUpdate = balanceUpdate;
                    } else {
                        currentShoppingCart.BalanceUpdate = undefined;
                    }
                }

                current.calculateTotal();

                result = true;

                $rootScope.$emit("paymentModesChanged");
            }

            return result;
        };

        this.selectPaymentMode = function (selectedPaymentMode, customValue, isDirectPayment) {
            if (currentShoppingCart != undefined) {
                if (!currentShoppingCart.PaymentModes) {
                    currentShoppingCart.PaymentModes = [];
                }

                var currentPaymentMode = undefined;
                //TODO ? var currentPaymentMode = Enumerable.from(currentShoppingCart.PaymentModes).firstOrDefault("x => x.Value == '" + selectedPaymentMode.Value + "'");

                var maxValue = undefined;
                var currentValue = (customValue && customValue < currentShoppingCart.Residue) ? customValue : currentShoppingCart.Residue;

                // Prevents "cashback" : Le montant de la carte de bleue ne peut dépasser le montant du ticket
                if (selectedPaymentMode.PaymentType == PaymentType.CB) {
                    maxValue = currentShoppingCart.Residue + (currentPaymentMode ? currentPaymentMode.Total : 0);
                }

                //
                if (selectedPaymentMode.IsBalance) {
                    var totalBalance = currentShoppingCart.BalanceUpdate ? currentShoppingCart.BalanceUpdate.UpdateValue : 0;
                    currentValue = selectedPaymentMode.Balance.Value <= currentShoppingCart.Residue ? selectedPaymentMode.Balance.Value : currentShoppingCart.Residue;
                    maxValue = currentValue + totalBalance;
                }

                if (!currentPaymentMode) {
                    currentPaymentMode = {
                        PaymentType: selectedPaymentMode.PaymentType,
                        Value: selectedPaymentMode.Value,
                        Text: selectedPaymentMode.Text,
                        Options: selectedPaymentMode.Options,
                        Total: currentValue,
                        IsBalance: selectedPaymentMode.IsBalance
                    };

                    if (selectedPaymentMode.IsBalance) {
                        currentPaymentMode.Balance = selectedPaymentMode.Balance;
                    }
                }

                //
                if (!isDirectPayment) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalPaymentMode.html',
                        controller: 'ModalPaymentModeController',
                        resolve: {
                            paymentMode: function () {
                                return currentPaymentMode;
                            },
                            maxValue: function () {
                                return maxValue;
                            }
                        },
                        backdrop: 'static'
                    });

                    modalInstance.result.then(function (paymentMode) {
                        current.setPaymentMode(paymentMode);
                    }, function () {
                    });
                } else {
                    var b = parseFloat(currentBarcode.barcodeValue);
                    if (b) {
                        if (b > 0 && (maxValue && b < maxValue) || (!maxValue && b < 9999)) {
                            currentPaymentMode.Total = b;
                            currentBarcode.barcodeValue = "";
                        }
                    }
                    current.setPaymentMode(currentPaymentMode);
                }
            }
        };

        this.updatePaymentModes = function () {
            settingService.getPaymentModesAsync().then(function (paymentSetting) {
                paymentModesAvailable = paymentSetting;
                $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
            }, function (err) {
                console.log(err);
            });
        };

        //#endregion

        //#region Total Calcul
		/**
		 * @deprecated
		 */
        this.calculateTotal = function () {
            this.calculateTotalFor(currentShoppingCart);
        };

        // TODO : Make only one function
        this.calculateTotalFor = function (shoppingCart) {
            console.log("calc for");
            taxesService.calculateTotalFor(shoppingCart);
        };

        //#endregion

        //#region Properties
        this.getCurrentShoppingCart = function () {

            this.calculateTotalFor(); // For each get current we're doing calculation
            return currentShoppingCart;
        };
        this.getCurrentShoppingCartIn = function () {
            return currentShoppingCartIn;
        };
        this.getCurrentShoppingCartOut = function () {
            return currentShoppingCartOut;
        };

        this.getPaymentModesAvailable = function () {
            return paymentModesAvailable;
        };

        this.getDeliveryType = function () {
            return deliveryType;
        };

        this.setDeliveryType = function (value) {
            deliveryType = value;
            if (currentShoppingCart)
                currentShoppingCart.DeliveryType = deliveryType;

            this.calculateTotal();
        };

        this.getCurrentBarcode = function () {
            return currentBarcode;
        };
        //#endregion

        //#region Event shoppingCart
        $rootScope.$on("shoppingCartItemChanged", function (event, cartItem) {
            if (cartItem.Printed) {
                cartItem.Printed = false;
                cartItem.PrintCount = 0;
            }
        });
        //#endregion

        //#region Initialization FINALLY
        // BUGFIX: Initialisation de l'écran temporisation car on en peut pas binder sinon DD
        setTimeout(function () {
            current.setDeliveryType(DeliveryTypes.FORHERE);
            current.updatePaymentModes();
            current.calculateTotal();
        }, 500);

		/**
		* Event on PouchDbChanged
		*/

        // Payment modes updates
        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status === "Change" && args.id.indexOf('Setting_') === 0) {
                current.updatePaymentModes();
            }
        });
        //#endregion
    }
]);