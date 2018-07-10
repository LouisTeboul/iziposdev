app.service('shoppingCartModel', ['$rootScope', '$q', '$state', '$timeout', '$uibModal', 'shoppingCartService', 'productService', 'loyaltyService', 'settingService', 'posUserService', '$translate', 'storeMapService', 'taxesService', 'posPeriodService', 'posService', 'zposService', 'borneService',
    function ($rootScope, $q, $state, $timeout, $uibModal, shoppingCartService, productService, loyaltyService, settingService, posUserService, $translate, storeMapService, taxesService, posPeriodService, posService, zposService, borneService) {
        var current = this;

        var lastShoppingCart = undefined;
        var currentShoppingCart = undefined;
        //For splitting ticket
        var currentShoppingCartIn = undefined;
        var currentShoppingCartOut = undefined;

        var shoppingCartQueue = [];
        var paymentModesAvailable = undefined;
        var deliveryType = DeliveryTypes.FORHERE;
        var currentBarcode = {barcodeValue: ''};

        //#region Actions on item
        this.getNbItems = function () {
            var count = 0;
            if (currentShoppingCart && currentShoppingCart.Items.length > 0) {
                Enumerable.from(currentShoppingCart.Items).forEach(function (i) {
                    count += i.Quantity;
                });
            }
            return count;
        };

        this.incrementQuantity = function (cartItem) {
            cartItem.DiscountIT += cartItem.DiscountIT / cartItem.Quantity;
            cartItem.DiscountET += cartItem.DiscountET / cartItem.Quantity;
            cartItem.Quantity++;
            cartItem.stockQuantity++;
            this.calculateTotal();
            this.calculateLoyalty();
            $rootScope.$emit("shoppingCartItemChanged", cartItem);
        };

        this.decrementQuantity = function (cartItem) {
            if (posUserService.isEnable('DELI')) {
                cartItem.DiscountIT -= cartItem.DiscountIT / cartItem.Quantity;
                cartItem.DiscountET -= cartItem.DiscountET / cartItem.Quantity;
                cartItem.Quantity--;
                if (cartItem.stockQuantity && cartItem.stockQuantity >= 1) {
                    cartItem.stockQuantity--;
                }

                this.calculateTotal();
                this.calculateLoyalty();
                $rootScope.$emit("shoppingCartItemChanged", cartItem);

            }
        };

        this.editDeliveryInfos = function () {

            if (!currentShoppingCart) {
                current.createShoppingCart();
            }

            //On ouvre la modal de commande
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalEditDeliveryInfo.html',
                controller: 'ModalEditDeliveryInfoController',
                resolve: {
                    existing: function () {
                        return {
                            timeGoal: currentShoppingCart.DatePickup ? currentShoppingCart.DatePickup : "",
                            commentaire: currentShoppingCart.ExtraInfos ? currentShoppingCart.ExtraInfos : "",
                            customer: currentShoppingCart.customerLoyalty ? currentShoppingCart.customerLoyalty : "",
                            deliveryAddress: currentShoppingCart.deliveryAddress ? currentShoppingCart.deliveryAddress : "",
                        }
                    }
                }
            });

            modalInstance.result.then(function (result) {

                if (!currentShoppingCart) {
                    current.createShoppingCart();
                }

                if (result) {
                    console.log(result);


                    // On stock les infos de retour dans le currentShoppingCart
                    if (result.timeGoal) {
                        currentShoppingCart.DatePickup = result.timeGoal.date.toString("dd/MM/yyyy HH:mm:ss");
                        currentShoppingCart.TimeOffset = {
                            hours: result.timeGoal.hours,
                            minutes: result.timeGoal.minutes
                        };
                    }

                    if (result.deliveryAddress) {
                        currentShoppingCart.deliveryAddress = result.deliveryAddress;
                    }

                    if (result.extraInfos) {
                        currentShoppingCart.ExtraInfos = result.extraInfos;
                    }

                    if (result.customerLoyalty) {
                        current.removeAllLoyalties();
                        currentShoppingCart.Barcode = result.customerLoyalty.Barcodes[0].Barcode;
                        currentShoppingCart.customerLoyalty = result.customerLoyalty;
                        current.calculateLoyalty();
                        $rootScope.$emit("customerLoyaltyChanged", result.customerLoyalty);
                    }

                } else {
                    console.log('clear');
                    delete currentShoppingCart.DatePickup;
                    delete currentShoppingCart.deliveryAddress;
                    delete currentShoppingCart.TimeOffset;
                    delete currentShoppingCart.ExtraInfos;

                    current.removeAllLoyalties();
                    delete currentShoppingCart.customerLoyalty;
                    delete currentShoppingCart.Barcode;
                    current.calculateLoyalty();
                }
            })
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
            }, function () {
            });
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

                if (idxToRemove > -1 || currentShoppingCart.ParentTicket) {
                    //If already printed in step mode we're setting the quantity to zero
                    //Or if this is a valid cancel negative ticket
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
                    return !x.Comment && !x.Offer && !x.IsFree && x.ProductId == cartItem.ProductId && x.hashkey == cartItem.hashkey;
                });
            }

            var ratio = roundValue(amount / cartItem.Product.Price);


            //S'occuper du discount également
            if (itemExist) {
                itemExist.Quantity = itemExist.Quantity + ratio;
                cartItem.Quantity = cartItem.Quantity - ratio;
            } else {
                var item = clone(cartItem);
                //Si on split plus que le montant unitaire du produit,
                if (ratio > 1) {
                    var j = 0;
                    for (var i = ratio; i >= 1; i--, j++) {
                        var newSplitItem = clone(cartItem);
                        newSplitItem.DiscountIT = 0;
                        newSplitItem.DiscountET = 0;
                        newSplitItem.stockQuantity = 1;
                        newSplitItem.Quantity = 1;
                        newSplitItem.hashkey = objectHash(newSplitItem);
                        newSplitItem.isPartSplitItem = true;
                        newSplitItem.stockQuantity = 0;
                        shoppingCartTo.Items.push(newSplitItem);
                    }
                    item.Quantity = ratio - j;
                    item.stockQuantity = Math.floor(item.Quantity);
                    item.DiscountIT = 0;
                    item.DiscountET = 0;
                    item.isPartSplitItem = true;
                    shoppingCartTo.Items.push(item);
                } else {
                    item.stockQuantity = 0;
                    item.Quantity = ratio;
                    item.DiscountIT = 0;
                    item.DiscountET = 0;
                    item.isPartSplitItem = true;
                    shoppingCartTo.Items.push(item);
                }

                if (cartItem.Quantity > 1 && ratio < 1) {
                    var newCartItem = clone(cartItem);
                    newCartItem.Quantity--;
                    cartItem.Quantity--;
                    //On regenere un hash
                    newCartItem.hashkey = objectHash(newCartItem);
                    newCartItem.stockQuantity = 0;
                    shoppingCartFrom.Items.push(newCartItem);
                }
                cartItem.Quantity = cartItem.Quantity - ratio;
                cartItem.isPartSplitItem = true;
            }
        };

        // Used to transfer item from a ticket to another when splitting ticket
        this.makeParts = function (shoppingCart, cartItem, nbPart) {
            //On crée une part
            //On l'insert autant de fois qu'il y a de part
            for (var i = 0; i < nbPart; i++) {
                var newPart = clone(cartItem);
                newPart.DiscountIT /= nbPart;
                newPart.DiscountET /= nbPart;
                newPart.Quantity /= nbPart;
                newPart.hashkey = objectHash(newPart);
                if (i == nbPart - 1) {
                    newPart.stockQuantity = 1;
                } else {
                    newPart.stockQuantity = 0;
                }


                shoppingCart.Items.push(newPart);
            }
            this.removeItemFrom(shoppingCart, cartItem);
        };


        // Used to transfer item from a ticket to another when splitting ticket
        this.addItemTo = function (shoppingCartTo, shoppingCartFrom, cartItem, qty) {
            if (!qty) {
                if (Number.isInteger(cartItem.Quantity) || cartItem.Quantity >= 1) {
                    qty = 1
                } else {
                    qty = cartItem.Quantity;
                }
            }

            var item = clone(cartItem);


            /*
            var ratio = qty / item.Quantity;
            item.DiscountIT = ratio * clone(cartItem.DiscountIT);
            item.DiscountET = ratio * clone(cartItem.DiscountET);

            cartItem.DiscountIT -= item.DiscountIT;
            cartItem.DiscountET -= item.DiscountET;
            */

            item.Quantity = qty;
            item.DiscountIT = 0;
            item.DiscountET = 0;
            shoppingCartTo.Items.push(item);
            cartItem.Quantity -= qty;

            if (cartItem.Quantity <= 0 && shoppingCartFrom) {
                this.removeItemFrom(shoppingCartFrom, cartItem);
                item.DiscountIT = cartItem.DiscountIT;
                item.DiscountET = cartItem.DiscountET;
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
            var cacheTaxProvider = null;
            var cacheIsPricesIncludedTax = null;

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

                    taxesService.getTaxProviderAsync().then(function (ctp) {
                        cacheTaxProvider = ctp;
                        var taxRate = getTaxRateFromProvider(cartItemDiscounted.TaxCategory, cacheTaxProvider, cartItemDiscounted.DeliveryType);

                        if (isPercent) {
                            //If this is a % discount
                            if (discountAmount <= 100) {
                                // The discount has to be less than 100%
                                // Set the discount property
                                taxesService.getPricesIncludedTaxAsync().then(function (cpit) {

                                    cacheIsPricesIncludedTax = cpit;

                                    switch (cacheTaxProvider) {
                                        case "Tax.FixedRate" :
                                            cartItemDiscounted.DiscountIT = cartItemDiscounted.Product.Price * (discountAmount / 100);
                                            cartItemDiscounted.DiscountET = ITtoET(cartItemDiscounted.DiscountIT, taxRate);
                                            break;
                                        case "Tax.Quebec":
                                            if (cacheIsPricesIncludedTax) {
                                                cartItemDiscounted.DiscountIT = cartItemDiscounted.Product.Price * (discountAmount / 100);
                                                cartItemDiscounted.DiscountET = ITtoET(cartItemDiscounted.DiscountIT, taxRate);
                                            } else {
                                                cartItemDiscounted.DiscountIT = cartItemDiscounted.PriceIT * (discountAmount / 100);
                                                cartItemDiscounted.DiscountET = ITtoET(cartItemDiscounted.DiscountIT, taxRate);
                                            }
                                            break;
                                    }
                                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                    current.calculateTotal();
                                    current.calculateLoyalty();
                                });
                            } else {
                                sweetAlert($translate.instant("Impossible de faire une remise de plus de 100% !"));
                            }

                        } else if (!isPercent) {
                            //If this is a flat discount
                            if (discountAmount <= cartItemDiscounted.Product.Price) {
                                //The discount has to be less than the product price

                                cartItemDiscounted.DiscountIT = discountAmount;
                                cartItemDiscounted.DiscountET = ITtoET(cartItemDiscounted.DiscountIT, taxRate);
                            } else {
                                sweetAlert($translate.instant("Impossible de faire une remise superieur au prix du produit !"));
                            }
                            $rootScope.$emit("shoppingCartItemChanged", cartItem);
                            $rootScope.$emit("shoppingCartItemChanged", cartItemDiscounted);
                            current.calculateTotal();
                            current.calculateLoyalty();
                        }
                    });


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
            var cacheTaxProvider = null;
            var cacheIsPricesIncludedTax = null;

            if (posUserService.isEnable('OFFI')) {
                if (!isNaN(discountAmount)) {


                    taxesService.getTaxProviderAsync().then(function (result) {
                        cacheTaxProvider = result;
                        var taxRate = getTaxRateFromProvider(cartItem.TaxCategory, cacheTaxProvider, cartItem.DeliveryType);
                        if (isPercent) {
                            //Remise en pourcentage
                            if (discountAmount <= 100) {
                                taxesService.getPricesIncludedTaxAsync().then(function (cpit) {

                                    cacheIsPricesIncludedTax = cpit;


                                    switch (cacheTaxProvider) {
                                        case "Tax.FixedRate" :
                                            cartItem.DiscountIT = (cartItem.Product.Price * (discountAmount / 100)) * cartItem.Quantity;
                                            cartItem.DiscountET = ITtoET(cartItem.DiscountIT, taxRate);
                                            break;
                                        case "Tax.Quebec":
                                            if (cacheIsPricesIncludedTax) {
                                                cartItem.DiscountIT = (cartItem.Product.Price * (discountAmount / 100)) * cartItem.Quantity;
                                                cartItem.DiscountET = ITtoET(cartItem.DiscountIT, taxRate);
                                            } else {
                                                cartItem.DiscountIT = (cartItem.PriceIT * (discountAmount / 100)) * cartItem.Quantity;
                                                cartItem.DiscountET = ITtoET(cartItem.DiscountIT, taxRate);
                                            }

                                            break;
                                    }
                                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                                    current.calculateTotal();
                                    current.calculateLoyalty();

                                });


                            } else
                                sweetAlert($translate.instant("Impossible de faire une remise de plus de 100% !"));

                        } else if (!isPercent) {
                            if (discountAmount <= cartItem.Product.Price * cartItem.Quantity) {
                                //Remise flat
                                cartItem.DiscountIT = discountAmount;
                                cartItem.DiscountET = ITtoET(cartItem.DiscountIT, taxRate);

                            } else
                                sweetAlert($translate.instant("Impossible de faire une remise superieur au prix de la ligne !"));

                            $rootScope.$emit("shoppingCartItemChanged", cartItem);
                            $rootScope.$emit("shoppingCartItemChanged", cartItem);
                            current.calculateTotal();
                            current.calculateLoyalty();
                        }
                    });


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

        this.NewTimeStampForClonedShoppingCart = function (shoppingCart, index) {

            //On declare le dailyticket comme undefined sur les shoppingcart de la queue
            //Il sera affecté en même temps que le shopping cart en question deviendra current
            //Car il est dependant du nombre de ticket validé
            shoppingCart.dailyTicketId = undefined;

            // Set a new TimeStamp for yeach "new" tickets.
            // We wait milliseconds just to ensure that we have a unique timestamp
            var timestamp = new Date().addMilliseconds(index).getTime();
            shoppingCart.Timestamp = timestamp;
            shoppingCart.id = timestamp;

            // For the moment we set TableCutleries to undefined, because only the original shoppingcart should have the information
            shoppingCart.TableCutleries = undefined;

            return shoppingCart;

        };

        this.createDividedShoppingCartsAsync = function (shoppingCart, divider) {

            var dividedDefer = $q.defer();
            if (divider > 1 && Number.isInteger(divider)) {

                shoppingCart.isDividedShoppingCart = true;
                Enumerable.from(shoppingCart.Discounts).forEach(function (discount) {
                    if (!discount.IsPercent) {
                        discount.Value /= divider;
                    }
                });

                Enumerable.from(shoppingCart.Items).forEach(function (item) {
                    item.OriginalQuantity = item.Quantity;
                    item.DiscountIT /= divider;
                    item.DiscountET /= divider;
                    item.isPartSplitItem = true;
                    item.stockQuantity = 0;
                    item.Quantity = Math.round10((item.Quantity / divider), -5);
                });

                var orginalShoppingCart = clone(shoppingCart);

                var clonedShoppingCart;
                for (var i = 0; i < divider - 1; i++) {

                    clonedShoppingCart = clone(orginalShoppingCart);

                    current.calculateTotalFor(clonedShoppingCart);

                    //Derniere itération
                    if (i == divider - 2) {

                        clonedShoppingCart = current.NewTimeStampForClonedShoppingCart(orginalShoppingCart, i);

                        //On ajuste quantité du dernier item pour corrigé les erreurs de nombre flottant de JS
                        Enumerable.from(clonedShoppingCart.Items).forEach(function (item) {

                            item.Quantity = adjustDividedQuantity(item.OriginalQuantity, item.Quantity, divider);
                            item.stockQuantity = item.OriginalQuantity;

                        });

                        shoppingCart.shoppingCartQueue.push(clonedShoppingCart);

                    } else {
                        clonedShoppingCart = current.NewTimeStampForClonedShoppingCart(clonedShoppingCart, i);
                        shoppingCart.shoppingCartQueue.push(clonedShoppingCart);
                    }
                }

                current.calculateTotalFor(shoppingCart);
                dividedDefer.resolve();

            } else {
                dividedDefer.reject('Diviseur decimal ou inferieur ou egal a 1');
            }
            return dividedDefer.promise;
        };

        // Creates an empty ticket
        this.createShoppingCart = function () {
            if (currentShoppingCart == undefined) {

                var timestamp = new Date().getTime();
                currentShoppingCart = new ShoppingCart();
                currentShoppingCart.dailyTicketId = undefined;
                currentShoppingCart.TableNumber = undefined;
                currentShoppingCart.TableId = undefined;
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
                currentShoppingCart.PosVersion = $rootScope.Version;
                currentShoppingCart.shoppingCartQueue = [];

                if ($rootScope.UserPreset && $rootScope.UserPreset.DefaultDeliveryMode) {
                    if (deliveryType != $rootScope.UserPreset.DefaultDeliveryMode) {
                        current.setDeliveryType($rootScope.UserPreset.DefaultDeliveryMode);
                    }
                }

                $rootScope.$emit("shoppingCartChanged", currentShoppingCart);

                var hdid = $rootScope.modelPos.hardwareId;

                //association period / shoppingCart


                posPeriodService.getYPeriodAsync($rootScope.PosLog.HardwareId, $rootScope.PosUserId).then(function (yPeriod) {
                    //Associate period on validate
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
            currentShoppingCartIn.TableId = undefined;
            currentShoppingCartIn.Items = new Array();
            currentShoppingCartIn.Timestamp = timestamp;
            currentShoppingCartIn.id = timestamp;
            currentShoppingCartIn.AliasCaisse = $rootScope.modelPos.aliasCaisse;
            currentShoppingCartIn.HardwareId = $rootScope.PosLog.HardwareId;
            currentShoppingCartIn.PosUserId = $rootScope.PosUserId;
            currentShoppingCartIn.PosUserName = $rootScope.PosUserName;
            currentShoppingCartIn.Discounts = clone(currentShoppingCart.Discounts);
            currentShoppingCartIn.DeliveryType = deliveryType;
            currentShoppingCartIn.CurrentStep = 0;
            currentShoppingCartIn.StoreId = $rootScope.IziBoxConfiguration.StoreId;
            currentShoppingCartIn.CompanyInformation = settingService.getCompanyInfo();
            currentShoppingCartIn.addCreditToBalance = false;
            currentShoppingCartIn.PosVersion = $rootScope.Version;
            currentShoppingCartIn.ExtraInfos = "";
            currentShoppingCartIn.shoppingCartQueue = [];

            Enumerable.from(currentShoppingCartIn.Discounts).forEach(function (item) {
                item.Total = 0;
            });

            var hdid = $rootScope.modelPos.hardwareId;

            //association period / shoppingCart


            // Pb asyncronisme pour les deux promesses

            posPeriodService.getYPeriodAsync($rootScope.PosLog.HardwareId, $rootScope.PosUserId).then(function (yPeriod) {
                //Asociate periods on validate
            }, function () {
                if ($rootScope.modelPos.iziboxConnected) {
                    //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                    current.cancelShoppingCart();
                }
            });


            /*
            //Sert a rien

            posService.getUpdDailyTicketValueAsync(hdid, 1).then(function (cashRegisterTicketId) {
                currentShoppingCartIn.dailyTicketId = cashRegisterTicketId;
            }).then(function () {
                $rootScope.$emit("shoppingCartChanged", currentShoppingCartIn);
            });
            */

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
                currentShoppingCartOut.TableId = undefined;
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
                currentShoppingCartOut.PosVersion = $rootScope.Version;
                currentShoppingCartOut.ExtraInfos = "";
                currentShoppingCartOut.shoppingCartQueue = [];

                var hdid = $rootScope.modelPos.hardwareId;

                //association period / shoppingCart


                posPeriodService.getYPeriodAsync($rootScope.PosLog.HardwareId, $rootScope.PosUserId).then(function (yPeriod) {
                    //Associate periods on validate
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
                    $rootScope.$emit("shoppingCartChanged", currentShoppingCartOut);
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
        };

        this.previousStep = function () {
            currentShoppingCart.CurrentStep -= 1;

            if (currentShoppingCart.CurrentStep < 0) {
                currentShoppingCart.CurrentStep = 0;
            }

            $rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        };

        this.setStep = function (step) {
            currentShoppingCart.CurrentStep = step;
            $rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        };

        this.addToCartBySku = function (sku) {
            var self = this;
            productService.getProductBySKUAsync(sku).then(function (product) {
                if (product) {
                    self.addToCart(product);
                } else {
                    sweetAlert($translate.instant("Produit introuvable"));
                }
            });
        };

        //Add a product to the cart
        //TODO : refactor
        this.addToCart = function (product, forceinbasket, offer, isfree, formuleOfferte = false) {
            // The product is payed
            if (this.getCurrentShoppingCart() && (this.getCurrentShoppingCart().isPayed || this.getCurrentShoppingCart().ParentTicket)) {
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
                    if (b > 0 && b <= 1000) {
                        qty = b;
                        currentBarcode.barcodeValue = "";
                    }
                }

                //Test for a product with attributes
                //POUR LES BURGERS / MENU
                if (!forceinbasket && product.ProductTemplate && product.ProductTemplate.ViewPath != 'ProductTemplate.Simple') {
                    $rootScope.currentConfigurableProduct = product;
                    $rootScope.isConfigurableProductOffer = formuleOfferte;
                    if ($rootScope.borne) {
                        $state.go('catalogBorne.' + product.ProductTemplate.ViewPath, {id: product.Id, offer: offer});
                    } else {
                        $state.go('catalogPOS.' + product.ProductTemplate.ViewPath, {id: product.Id, offer: offer});
                    }
                }
                else if (!forceinbasket && product.EmployeeTypePrice) {         //Product with a posuser defined price
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

                    if (!cartItem || product.ProductAttributes.length > 0 || product.EmployeeTypePrice || product.ProductComments.length > 0 || ($rootScope.UserPreset && !$rootScope.UserPreset.GroupProducts) ) {
                        cartItem = new ShoppingCartItem();
                        cartItem.ProductId = product.Id;
                        cartItem.Product = product;
                        cartItem.Quantity = qty;
                        cartItem.stockQuantity = qty;
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
                        console.log("Ajout d'un item : ", cartItem);
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

        function periodValidation(ignorePrintTicket) {
            // On recupere les periodes courantes et on les affecte au ticket
            // Si besoin est, on demande a l'utilisateur de renseigner le fond de caisse
            // Pour la nouvelle periode
            posPeriodService.getYPeriodAsync(currentShoppingCart.HardwareId, currentShoppingCart.PosUserId, true, false).then(function (yp) {
                $rootScope.hideLoading();
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
                toSave.Items = Enumerable.from(currentShoppingCart.Items).where("item => item.Quantity != 0").toArray();
                lastShoppingCart = toSave;

                // Once the ticket saved we delete the splitting ticket
                currentShoppingCartIn = undefined;

                if (currentShoppingCartOut || (currentShoppingCart.shoppingCartQueue && currentShoppingCart.shoppingCartQueue.length >= 1)) {
                    if (currentShoppingCartOut) {
                        currentShoppingCart = clone(currentShoppingCartOut);
                        deliveryType = currentShoppingCart.DeliveryType;
                        currentShoppingCartOut = undefined;
                        $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                    }

                    if (currentShoppingCart.shoppingCartQueue.length >= 1) {
                        //Stock la queue du ticket précédent
                        var q = currentShoppingCart.shoppingCartQueue;

                        //Affecte le shopping cart suivant de la queue
                        currentShoppingCart = clone(currentShoppingCart.shoppingCartQueue[0]);
                        //Raffecte la queue au nouveau current shoppingcart
                        currentShoppingCart.shoppingCartQueue = q;
                        currentShoppingCart.shoppingCartQueue.splice(0, 1);
                        deliveryType = currentShoppingCart.DeliveryType;
                        $rootScope.$emit("shoppingCartChanged", currentShoppingCart);

                        //Affecte le numéro dailyticket
                        if (!currentShoppingCart.dailyTicketId) {
                            posService.getUpdDailyTicketValueAsync(currentShoppingCart.hardwareId, 1).then(function (cashRegisterTicketId) {
                                currentShoppingCart.dailyTicketId = cashRegisterTicketId;
                            }).then(function () {
                                $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                                if (currentShoppingCart.shoppingCartQueue.length == 0) {
                                    currentShoppingCart.shoppingCartQueue = [];
                                }
                            }, (err) => {
                                console.log('error getting daily ticket ', err)
                            });
                        }
                    }
                } else {
                    current.clearShoppingCart();
                }
                $rootScope.hideLoading();
                // Print Ticket
                current.printPOSShoppingCart(toSave, ignorePrintTicket);
                // Lock la fermeture de periode
                $rootScope.closeLock = true;
                // Jusqu'a ce que le PaymentValues de la Y period soit update

            }, function (err) {
                //Dans le cas ou le fetch / creation yPeriod echoue, on supprime le panier
                $rootScope.hideLoading();
                console.log(err);
                if (err.request) {
                    console.log(err.request);
                    err.request._id = err.request.ShoppingCart.id.toString();
                    $rootScope.dbValidatePool.put(err.request);
                }
                current.clearShoppingCart();
            });
        }

        /**
         *@ngdoc method
         *@name validShoppingCart
         *@methodOf shoppingCartModel
         *@description
         *  Ticket validation
         *@param {boolean} ignorePrintTicket printing is ignored
         *@return {void}
         */
        this.validShoppingCart = function (ignorePrintTicket) {
            if (currentShoppingCart != undefined && currentShoppingCart.Items.length > 0) {
                $rootScope.showLoading();

                //The ticket must be paid
                if (currentShoppingCart.Residue > 0 && !currentShoppingCart.ParentTicket) {
                    $rootScope.hideLoading();
                    sweetAlert($translate.instant("Le ticket n'est pas soldé"));
                    return;
                }

                // Annulation NF
                if (currentShoppingCart.ParentTicket) {
                    var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;
                    db.rel.find('ShoppingCart', currentShoppingCart.ParentTicket).then(function (response) {
                        response.ShoppingCarts[0].Deleted = true;
                        console.log(response);
                        db.rel.save('ShoppingCart', response.ShoppingCarts[0]);
                    });
                }

                //Si le ticket est associé à une table
                if (currentShoppingCart.TableNumber) {
                    //On stock l'info du temps d'activité de la table
                    currentShoppingCart.TableActiveTime = Date.now() - currentShoppingCart.Timestamp - 3600000;
                }

                // Si le ticket est associé à un client
                if (currentShoppingCart.customerLoyalty) {
                    //Si le client possède au moins une balance UseToPay
                    var hasBalanceUseToPay = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).firstOrDefault(function (balance) {
                        return balance.UseToPay == true;
                    });

                    if (hasBalanceUseToPay && currentShoppingCart.Credit > 0) {
                        currentShoppingCart.utpId = hasBalanceUseToPay.Id;
                        // Propose à l'utilisateur de crediter son compte fidélité
                        swal({
                                title: "Cagnotter l'avoir sur le compte fidélité ?",
                                text: currentShoppingCart.Credit + " " + $rootScope.IziPosConfiguration.Currency.currencySymbol + " d'avoir",
                                type: "warning",
                                showCancelButton: true,
                                confirmButtonColor: '#DD6B55',
                                confirmButtonText: 'Oui',
                                cancelButtonText: "Non",
                                closeOnConfirm: true,
                                closeOnCancel: true
                            },
                            function (isConfirm) {
                                currentShoppingCart.addCreditToBalance = isConfirm;
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

        this.validBorneOrder = function () {
            if ($rootScope.borne) {
                if (currentShoppingCart.Items.length > 0) {
                    $rootScope.showLoading();
                    current.printBorneShoppingCartAsync(false).then(function () {
                        current.printBorneShoppingCartAsync(true).then(function () {
                            current.printStepProdShoppingCartAsync(currentShoppingCart).then(function () {
                                current.freezeShoppingCart();
                            });
                            $rootScope.hideLoading();
                            var textSwal, payed = true;
                            /*if(currentShoppingCart.isPayed) {
                                payed = true;
                            }*/
                            if (payed) {
                                textSwal = "Veuillez récupérer votre commande à la caisse.";
                            } else {
                                textSwal = "Veuillez payer et récupérer votre commande à la caisse.";
                            }
                            sweetAlert({
                                title: $translate.instant("Merci de votre visite !"),
                                text: $translate.instant(textSwal),
                                timer: 5000
                            }, function () {
                                borneService.redirectToHome();
                                sweetAlert.close();
                            });
                        }, function (err) {
                            $rootScope.hideLoading();
                            console.log(err);
                            borneService.redirectToHome();
                        });
                    }, function (err) {
                        $rootScope.hideLoading();
                        borneService.redirectToHome();
                    });
                }
            }
        };

        /**
         *  Print the last ticket
         */
        this.printLastShoppingCart = function () {

            this.getLastShoppingCartAsync().then(function (lastShoppingCart) {
                if (lastShoppingCart) {
                    shoppingCartService.reprintShoppingCartAsync(lastShoppingCart).then(function () {
                        },
                        function () {
                            sweetAlert($translate.instant("Erreur d'impression du dernier ticket !"));
                        });
                }
            }, function () {
                sweetAlert($translate.instant("Dernier ticket introuvable!"));
            });

        };

        this.getLastShoppingCartAsync = function () {
            var reqDefer = $q.defer();

            zposService.getLastShoppingCartAsync($rootScope.modelPos.hardwareId).then(function (lastShoppingCart) {
                reqDefer.resolve(lastShoppingCart);
            }, function () {
                reqDefer.reject();
            });

            return reqDefer.promise;
        };

        this.getLastShoppingCart = function () {
            return lastShoppingCart;
        };

        /***
         * Print a note for the customer - The note doesn't include the shopping cart details
         * @param shoppingCart
         */
        this.printShoppingCartNote = function (shoppingCart) {

            var continuePrint = function (shoppingCart) {
                // Print the current shopping cart
                if (shoppingCart) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalShoppingCartNote.html',
                        controller: 'ModalShoppingCartNoteController',
                        backdrop: 'static'
                    });

                    modalInstance.result.then(function (nbNote) {
                        shoppingCartService.printShoppingCartAsync(shoppingCart, $rootScope.PrinterConfiguration.POSPrinter, false, 1, false, nbNote).then(function () {
                            },
                            function () {
                                sweetAlert($translate.instant("Erreur d'impression de la note !"));
                            });

                    }, (err) => {
                        console.log(err)
                    });
                }
            };

            // Print the last transaction or not
            if (!shoppingCart) {
                this.getLastShoppingCartAsync().then(function (lastShoppingCart) {
                    if (lastShoppingCart) {
                        continuePrint(lastShoppingCart);
                    }
                }, function () {
                    sweetAlert($translate.instant("Dernier ticket introuvable!"));
                });
            } else {
                continuePrint(shoppingCart);
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
                console.log('Suite de l\'impression');

                if ($rootScope.IziBoxConfiguration.ForcePrintProdTicket) {
                    // TODO : Il faut check si le ticker a deja été imprimé en prod, si oui afficher en warning

                    //Print the Prod Ticket (toque)
                    if ($rootScope.IziBoxConfiguration.StepEnabled) {
                        current.printStepProdShoppingCartAsync(lastShoppingCart).then(function () {

                        });
                    }
                    //Print the Prod Ticket (bouton bleu)
                    else {
                        current.printProdShoppingCartAsync(lastShoppingCart);
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
            // Retabli le mode de fonctionnement normal
            $rootScope.PhoneOrderMode = false;
            //Reset le mode de consommation à sur place
            deliveryType = 0;
            if (currentShoppingCart != undefined) {
                //console.log(currentShoppingCart);
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
        this.printProdShoppingCartAsync = function (forceShoppingCart) {

            var printDefer = $q.defer();
            var shoppingCart = currentShoppingCart;

            if (forceShoppingCart != undefined && forceShoppingCart.Items.length > 0) {
                shoppingCart = forceShoppingCart;
            }
            if (shoppingCart != undefined && shoppingCart.Items.length > 0) {

                shoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

                // No line with quantity 0
                var toPrint = clone(shoppingCart);
                toPrint.Items = Enumerable.from(shoppingCart.Items).where("item => item.Quantity > 0").toArray();

                shoppingCartService.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.ProdPrinter, false, $rootScope.PrinterConfiguration.ProdPrinterCount, false, 0, printDefer).then(function (msg) {

                }, function (err) {
                    sweetAlert($translate.instant("Erreur d'impression production !"));
                });
            }

            return printDefer.promise;
        };

        this.printBorneShoppingCartAsync = function (toPos) {
            var printDefer = $q.defer();
            if (currentShoppingCart != undefined && currentShoppingCart.Items.length > 0) {

                currentShoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

                //Suppression des lignes à qté 0
                var toPrint = clone(currentShoppingCart);
                toPrint.Items = Enumerable.from(currentShoppingCart.Items).where("item => item.Quantity > 0").toArray();
                var printer;
                // routage différent en fonction du mode de paiement du ticket
                if (toPos) {
                    printer = $rootScope.PrinterConfiguration.ProdPrinter;
                } else {
                    printer = $rootScope.PrinterConfiguration.POSPrinter;
                }

                shoppingCartService.printShoppingCartAsync(toPrint, printer, toPos, $rootScope.PrinterConfiguration.ProdPrinterCount, false, 0, printDefer).then(function (msg) {
                }, function (err) {
                });
            }
            return printDefer.promise;
        };

        //Send the ticket to the production printer
        //The printing is managing the 'steps'
        this.printStepProdShoppingCartAsync = function (forceShoppingCart, nbStep) {
            var printDefer = $q.defer();

            var shoppingCart = currentShoppingCart;

            if (forceShoppingCart != undefined && forceShoppingCart.Items.length > 0) {
                shoppingCart = forceShoppingCart;
            }
            if (shoppingCart != undefined && shoppingCart.Items.length > 0) {

                shoppingCart.DateProd = new Date().toString('dd/MM/yyyy H:mm:ss');

                var shoppingCartProd = clone(shoppingCart);

                shoppingCartService.printProdAsync(shoppingCartProd, shoppingCart.CurrentStep, printDefer, nbStep).then(function (req) {
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

                            item.PartialPrinted = false;
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

            return printDefer.promise;
        };

        //Put a ticket in a stand-by
        //When a ticket is 'unfreezed' other POs can't access it
        this.freezeShoppingCart = function () {
            if (currentShoppingCart) {

                var freezeCurrent = () => {
                    shoppingCartService.freezeShoppingCartAsync(currentShoppingCart).then(() => {
                        if (currentShoppingCartOut) {
                            current.setCurrentShoppingCart(currentShoppingCartOut);
                            currentShoppingCartOut = undefined;
                            currentShoppingCartIn = undefined;
                        } else {
                            current.clearShoppingCart();
                        }
                    }, () => {
                        sweetAlert($translate.instant("Erreur de mise en attente !"));
                    });
                };

                if ($rootScope.UserPreset && $rootScope.UserPreset.PrintOnFreeze) {
                    if ($rootScope.IziBoxConfiguration.StepEnabled) {
                        if (!currentShoppingCart.hasBeenFrozen) {
                            current.printStepProdShoppingCartAsync(currentShoppingCart).then(() => {
                                freezeCurrent();
                            })
                        } else {
                            swal({
                                title: $translate.instant("Mise en attente"),
                                text: $translate.instant("Ce ticket à déjà imprimé en cuisine. Voulez-vous le réimprimer ?"),
                                type: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#d83448",
                                confirmButtonText: $translate.instant("Oui"),
                                cancelButtonText: $translate.instant("Non"),
                                closeOnConfirm: true
                            }, function (result) {
                                if (result) {
                                    current.printStepProdShoppingCartAsync(currentShoppingCart).then(() => {
                                        freezeCurrent();
                                    })
                                } else {
                                    freezeCurrent()
                                }
                            })
                        }
                    } else {
                        freezeCurrent()
                    }
                    // TODO : envoyer un toast
                } else {
                    freezeCurrent();
                }

            }
        };

        this.setCurrentShoppingCart = function (shoppingCart) {
            if (!shoppingCart.Discounts) {
                shoppingCart.Discounts = [];
            }
            if (!shoppingCart.Items) {
                shoppingCart.Items = [];
            }
            currentShoppingCart = shoppingCart;
            deliveryType = currentShoppingCart.DeliveryType;
            current.calculateTotal();
            current.calculateLoyalty();
            $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
        };

        this.unfreezeShoppingCartById = function (id) {
            if (!currentShoppingCart) {
                shoppingCartService.getFreezedShoppingCartByIdAsync(id).then(function (shoppingCart) {
                    shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function () {
                        currentShoppingCart = shoppingCart;
                        deliveryType = currentShoppingCart.DeliveryType;
                        current.calculateTotal();
                        current.calculateLoyalty();

                        $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                    });
                }, function () {
                    sweetAlert($translate.instant("Ticket introuvable") + "...");
                });
            } else {
                sweetAlert($translate.instant("Vous avez déjà un ticket en cours") + "...");
            }
        };

        this.unfreezeShoppingCartByBarcode = function (barcode) {
            if (!currentShoppingCart) {
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
            if (!currentShoppingCart) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalUnfreezeShoppingCart.html',
                    controller: 'ModalUnfreezeShoppingCartController',
                    size: 'lg',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (shoppingCart) {

                    // Set the new HarwareId
                    shoppingCart.HardwareIdCreation = shoppingCart.HardwareId;
                    shoppingCart.HardwareId = $rootScope.PosLog.HardwareId;
                    if ($rootScope.modelPos && $rootScope.modelPos.aliasCaisse) {
                        shoppingCart.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                    }
                    currentShoppingCart = shoppingCart;

                    deliveryType = currentShoppingCart.DeliveryType;
                    current.calculateTotal();
                    current.calculateLoyalty();

                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);

                    if(shoppingCart.isJoinedShoppingCart) {
                        current.selectTableNumber();
                    }
                }, function () {
                });
            } else {
                sweetAlert($translate.instant("Vous avez déjà un ticket en cours") + "...");
            }
        };

        this.clearShoppingCart = function () {
            if (currentShoppingCart) {
                //console.log($rootScope.UserPreset.DefaultDeliveryMode);
                if ($rootScope.UserPreset) {
                    $rootScope.UserPreset.DefaultDeliveryMode ? current.setDeliveryType($rootScope.UserPreset.DefaultDeliveryMode) : current.setDeliveryType(DeliveryTypes.FORHERE);
                }
                currentShoppingCart = undefined;
                currentShoppingCartIn = undefined;
                currentShoppingCartOut = undefined;
                $rootScope.$emit("shoppingCartCleared");
            }

            deliveryType = 0;

            shoppingCartQueue = [];
            this.updatePaymentModes();
        };

        this.setTableCutleries = function (nb) {
            currentShoppingCart.TableCutleries = nb;
        };

        this.selectTableNumber = function () {
            var currentTableNumber;

            if (currentShoppingCart && currentShoppingCart.TableNumber) {
                currentTableNumber = currentShoppingCart.TableNumber;
            }

            var currentTableId;

            if(currentShoppingCart && currentShoppingCart.TableId) {
                currentTableId = currentShoppingCart.TableId;
            }

            var currentTableCutleries;

            if (currentShoppingCart && currentShoppingCart.TableCutleries) {
                currentTableCutleries = currentShoppingCart.TableCutleries;
            }


            var modalInstance;

            var resultSelectTable = function () {

                modalInstance.result.then(function (tableValues) {
                    current.setDeliveryType(0);
                    var updateSelectedTable = function (tableValues, isUnfreeze) {
                        var setValues = function (tableValues) {
                            currentShoppingCart.TableNumber = tableValues.tableNumber;
                            currentShoppingCart.TableId = tableValues.tableId;
                            currentShoppingCart.TableCutleries = tableValues.tableCutleries;
                            $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                        };

                        if (isUnfreeze) {
                            setValues(tableValues);
                        } else {
                            shoppingCartService.getFreezedShoppingCartByTableNumberAsync(tableValues.tableId).then(function (sc) {
                                sweetAlert($translate.instant("Cette table existe déjà") + "...");
                                $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                            }, function () {
                                setValues(tableValues);
                            });
                        }
                    };

                    if (!currentShoppingCart) {
                        shoppingCartService.getFreezedShoppingCartByTableNumberAsync(tableValues.tableId).then(function (sc) {
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
                        },
                        currentTableId: function() {
                            return currentTableId;
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
                    if (loyalty && (loyalty.CustomerId && loyalty.CustomerId != 0)) {
                        current.createShoppingCart();
                        current.removeAllLoyalties();

                        currentShoppingCart.Barcode = barcode;
                        currentShoppingCart.customerLoyalty = loyalty;
                        current.calculateLoyalty();
                        $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    } else {
                        if (loyalty && loyalty != '' && !angular.isObject(loyalty)) {
                            swal($translate.instant(loyalty));
                        }
                        else {
                            swal($translate.instant("Carte de fidélité introuvable !"));
                        }
                    }
                }, function (err) {
                    console.log(err);
                    swal($translate.instant("Le serveur de fidélité n'est pas joignable ..."));
                    $rootScope.hideLoading();
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
                var idxToRemove = Enumerable.from(paymentModesAvailable).indexOf(function (p) {
                    return p.Value == balance;
                });
                if (idxToRemove > -1) {
                    paymentModesAvailable.splice(idxToRemove);
                }
            }
            $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
        };

        this.removeOffers = function (offersToRemove) {
            for (var i = 0; i < offersToRemove.length; i++) {
                var offer = offersToRemove[i];
                var cartItemToRemove = Enumerable.from(currentShoppingCart.Items).firstOrDefault(function (i) {
                    return i.Offer == offer;
                });
                if (cartItemToRemove) {
                    offer.isApplied = false;
                    this.removeItem(cartItemToRemove);
                }
            }
        };

        this.applyBalances = function (balances) {
            paymentModesAvailable = paymentModesAvailable.filter(function (pma) {
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

                    if (product.ProductAttributes.length > 0) {
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
            current.calculateTotalFor(currentShoppingCart);
        };

        this.addBalanceUpdate = function (balanceUpdate) {
            currentShoppingCart.BalanceUpdate = balanceUpdate;
        };

        this.useOfferText = function (offerText) {
            //console.log(offerText);

            var passageObj = this.createEmptyPassageObj();
            passageObj.Offer = offerText;
            loyaltyService.addPassageAsync(passageObj).then(function (res) {
                sweetAlert($translate.instant("L'offre a été utilisé"));
                current.calculateLoyalty();
            });
        };

        //#endregion

        //#region Discount
        this.addShoppingCartDiscount = function (value, percent) {
            console.log("Add cart discount : " + value + (percent ? "%" : "€"));
            this.createShoppingCart();

            if (!currentShoppingCart.Discounts) {
                currentShoppingCart.Discounts = new Array();
            }
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
            console.log("Remove cart discount");
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


            var currentTime = new Date();
            var currentYear = currentTime.getFullYear().toString().substr(-1);

            var TRYear = barcode.substr(23, 1);

            /*
            Format : NNNNNNNNN KK VVVVV E CC SSS PM

            NNNNNNNNN Numéro de titre
            KK Clé de cryptage
            VVVVV Valeur Faciale (en centimes)
            E Émetteur
            CC Clé de contrôle
            SSS Code Famille(s) d’utilisation
            P Produit
            M Millésime
            */
            console.log(currentTime.getMonth(), currentTime.getDate());


            //Si le ticket n'est pas de cette année
            if (TRYear < currentYear) {
                // Si neanmoins, il est de l'année derniere
                // Et qu'on est avant le 31 janvier, alors il est valide
                if (TRYear == currentYear - 1 && currentTime.getMonth() == 0 && currentTime.getDate() <= 31) {
                    console.log("Le ticket est de l'année derniere, mais est valable jusqu'au 31 janvier de cette année")
                } else {
                    sweetAlert($translate.instant("Ticket périmé !"));
                    return false;
                }

            }

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
                // Attention, si il y a plusieurs mode de paiement de type ticket resto, ca peut retourné nimporte lequel
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

        this.addPaymentMode = function (selectedPaymentMode, isValidCancel) {
            var result = false;

            if (currentShoppingCart) {
                result = current.setPaymentMode(selectedPaymentMode, isValidCancel);
            }

            return result;
        };

        this.setPaymentMode = function (paymentMode, isValidCancel) {
            var result = false;

            if (currentShoppingCart) {

                console.log(currentShoppingCart);

                if (!currentShoppingCart.PaymentModes) {
                    currentShoppingCart.PaymentModes = [];
                }

                if (!paymentMode.IsBalance) {
                    var idxElem = currentShoppingCart.PaymentModes.indexOf(paymentMode);

                    if (idxElem == -1 && (paymentMode.Total > 0 || isValidCancel)) {
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
                        backdrop: 'static',
                        keyboard: false
                    });

                    modalInstance.result.then(function (paymentMode) {
                        current.setPaymentMode(paymentMode);
                        // Si c'est Easytransac
                        if (paymentMode.PaymentType === 7) {
                            // Si le ticket a été totalement payé
                            if (currentShoppingCart.Residue === 0) {
                                // On valide le ticket
                                current.validShoppingCart();
                            }
                        }
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

            if (currentShoppingCart) {
                $rootScope.$emit("shoppingCartTotalChanged", currentShoppingCart.Total);
            }
        };

        // TODO : Make only one function
        this.calculateTotalFor = function (shoppingCart) {
            //console.log("calc for");
            taxesService.calculateTotalFor(shoppingCart);

            if (currentShoppingCart && shoppingCart == currentShoppingCart) {
                $rootScope.$emit("shoppingCartTotalChanged", currentShoppingCart.Total);
            }
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

            $rootScope.$emit('deliveryTypeChanged', value);

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
            if ($rootScope.UserPreset) {
                $rootScope.UserPreset.DefaultDeliveryMode ? current.setDeliveryType($rootScope.UserPreset.DefaultDeliveryMode) : current.setDeliveryType(DeliveryTypes.FORHERE);
            }
            $rootScope.$apply();
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