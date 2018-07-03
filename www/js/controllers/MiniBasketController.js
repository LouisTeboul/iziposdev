app.controller('MiniBasketController', ['$scope', '$rootScope', '$state', '$uibModal', '$timeout', '$filter', '$mdMedia', 'settingService', 'shoppingCartService', 'productService', 'shoppingCartModel', 'posUserService', 'orderShoppingCartService', 'taxesService', '$translate', 'borneService', '$mdMedia',
    function ($scope, $rootScope, $state, $uibModal, $timeout, $filter, $mdMedia, settingService, shoppingCartService, productService, shoppingCartModel, posUserService, orderShoppingCartService, taxesService, $translate, borneService) {
        var deliveryTypeHandler = undefined;
        var itemsHandler = undefined;
        var accordionHandler = undefined;
        var loyaltyHandler = undefined;
        var orderServiceHandler = undefined;

        $scope.filter = $filter;

        $scope.DeliveryTypes = DeliveryTypes;

        $scope.totalDivider = 1;
        //#region Controller init
        /**
         * Initialize controller
         */
        $scope.init = function () {
            $scope.viewmodel = {};
            $scope.TimeOffset = 0;
            $scope.mdMedia = $mdMedia;

            updateCurrentShoppingCart();


            //ResizeEvent
            window.addEventListener('resize', function () {
                resizeMiniBasket();
            });

            $scope.tempStep = 0;
            $scope.deliveryType = shoppingCartModel.getDeliveryType();

            $scope.accordionStatus = {
                paiementOpen: false,
                ticketOpen: true
            };


            // Causes infinite digest loop
            // BUGFIX: The loyalty div was modified after the miniBasketResize()
            $scope.$watch(function () {
                var cHLoyalty = document.querySelector("#loyaltyRow");
                if (cHLoyalty)
                    return cHLoyalty.clientHeight;
            }, function () {
                resizeMiniBasket();
            });


            var currentShoppingCartHandler = $scope.$watchCollection('currentShoppingCart', function () {
                if ($scope.currentShoppingCart) {
                    $scope.filteredTaxDetails = taxesService.groupTaxDetail($scope.currentShoppingCart.TaxDetails);
                    $scope.$evalAsync();
                }
            });

            deliveryTypeHandler = $scope.$watch('deliveryType', function () {
                shoppingCartModel.setDeliveryType($scope.deliveryType);
            });

            accordionHandler = $scope.$watch('accordionStatus.ticketOpen', function () {
                setTimeout(resizeMiniBasket, 500);
            });

            loyaltyHandler = $scope.$watch('currentShoppingCart.customerLoyalty', function () {
                resizeMiniBasket();
            });

            if ($rootScope.IziBoxConfiguration.StepEnabled) {
                settingService.getStepNamesAsync().then(function (stepNames) {
                    $scope.stepNames = stepNames;
                });
            }

            orderServiceHandler = $rootScope.$on('orderShoppingCartChanged', function () {
                $scope.initOrder();
            });

            //Move
            if ($mdMedia('(max-width: 800px)')) {
                var posMouse;
                var offset = 0;
                var padHeight = window.innerHeight;
                var myBasketDiv = document.querySelector(".miniBasketPAD");
                var isDown = false;

                if (myBasketDiv) {
                    myBasketDiv.style.height = (padHeight - 100) + 'px';

                    myBasketDiv.addEventListener('mousedown', function (e) {
                        isDown = true;
                        offset = myBasketDiv.offsetTop - e.clientY;
                    }, true);
                }


                document.addEventListener('mousemove', function (e) {
                    e.stopPropagation();
                    if (isDown) {
                        posMouse = e.clientY;
                        var moveTop = posMouse + offset;
                        if (moveTop >= 0 && moveTop < (padHeight * 0.75) && offset > -150) {
                            if (moveTop < 75) {
                                moveTop = 0;
                            }
                            if (moveTop > (padHeight * 0.60)) {
                                moveTop = Math.floor(padHeight * 0.75);
                            }
                            myBasketDiv.style.top = moveTop + 'px';
                        }
                        resizeMiniBasket();
                    }
                }, true);

                document.addEventListener('mouseup', function () {
                    isDown = false;
                }, true);
                if (myBasketDiv) {
                    myBasketDiv.addEventListener('touchstart', function (e) {
                        isDown = true;
                        offset = myBasketDiv.offsetTop - e.touches[0].clientY;
                    }, true);
                }

                document.addEventListener('touchmove', function (e) {
                    e.stopPropagation();
                    if (isDown) {
                        posMouse = e.touches[0].clientY;
                        var moveTop = posMouse + offset;
                        if (moveTop >= 0 && moveTop < (padHeight * 0.75) && offset > -150) {
                            if (moveTop < 75) {
                                moveTop = 0;
                            }
                            if (moveTop > (padHeight * 0.60)) {
                                moveTop = Math.floor(padHeight * 0.75);
                            }
                            myBasketDiv.style.top = moveTop + 'px';
                        }
                        resizeMiniBasket();
                    }
                }, true);

                document.addEventListener('touchend', function () {
                    isDown = false;
                }, true);
            }
        };

        $scope.initOrder = function () {
            $scope.orders = orderShoppingCartService.orders;
            $scope.ordersInProgress = orderShoppingCartService.ordersInProgress;
        };


        $scope.setDeliveryType = function (value) {
            if (value !== 0 &&
                ($rootScope.IziBoxConfiguration.OrderPopUpOnDeliveryChange ||
                    $rootScope.UserPreset && $rootScope.UserPreset.PhoneOrder && $rootScope.UserPreset.PhoneOrder.Popup)) {
                shoppingCartModel.editDeliveryInfos();
            }

            if ($scope.currentShoppingCart && !$scope.currentShoppingCart.ParentTicket) {
                $scope.deliveryType = value;
            } else {
                $scope.deliveryType = value;
            }
        };

        var updateCurrentShoppingCart = function () {
            $scope.totalDivider = 1;
            $scope.filteredTaxDetails = undefined;

            if (itemsHandler) itemsHandler();

            $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
            $scope.viewmodel.lastShoppingCart = shoppingCartModel.getLastShoppingCart();
            $scope.$evalAsync();

            if ($scope.currentShoppingCart) {
                $scope.deliveryType = shoppingCartModel.getDeliveryType();
                updateBalancePassages();

                itemsHandler = $scope.$watchCollection('currentShoppingCart.Items', function () {
                    updateCurrentLines();
                });
            }

            shoppingCartModel.calculateLoyalty();
            shoppingCartModel.calculateTotal();
            resizeMiniBasket();
        };

        var updateCurrentLines = function () {
            if (!$scope.currentShoppingCart) {
                $scope.shoppingCartLines = undefined;
            } else {
                if ($rootScope.IziBoxConfiguration.StepEnabled) {
                    var groupedLinesStep = [];

                    var addItemToStep = function (item, step) {
                        //On recherche si le step existe déjà
                        var currentLine = Enumerable.from(groupedLinesStep).firstOrDefault("line => line.Step == " + step);

                        //Si il n'existe pas on créer le step
                        if (!currentLine) {
                            currentLine = {Step: step, Items: []};
                            groupedLinesStep.push(currentLine);
                        }

                        //Si le step ne contient pas déjà l'item, on l'ajoute
                        if (currentLine.Items.indexOf(item) == -1) {
                            currentLine.Items.push(item);
                        }
                    };


                    Enumerable.from($scope.currentShoppingCart.Items).forEach(function (item) {
                        //Formule
                        if (item.Attributes && item.Attributes.length > 0) {
                            Enumerable.from(item.Attributes).forEach(function (attr) {
                                addItemToStep(item, attr.Step);
                            });
                        } else {
                            addItemToStep(item, item.Step);
                        }
                    });

                    //Tri des lignes par no de step
                    var lastStep = Enumerable.from(groupedLinesStep).select("x=>x.Step").orderByDescending().firstOrDefault();

                    if (!lastStep || lastStep < $scope.currentShoppingCart.CurrentStep) {
                        lastStep = $scope.currentShoppingCart.CurrentStep;
                    }

                    for (var s = lastStep; s >= 0; s--) {
                        var lineExists = Enumerable.from(groupedLinesStep).any("line => line.Step == " + s);
                        if (!lineExists) {

                            groupedLinesStep.push({Step: s, Items: []});
                        }
                    }
                    $scope.shoppingCartLines = Enumerable.from(groupedLinesStep).orderBy("x => x.Step").toArray();
                } else {

                    $scope.shoppingCartLines = [];
                    $scope.shoppingCartLines.push({Step: 0, Items: $scope.currentShoppingCart.Items});
                }
            }
            $scope.$evalAsync();
        };

        /**
         * Events on ShoppingCartItem
         */
        var shoppingCartChangedHandler = $rootScope.$on('shoppingCartChanged', function (event, args) {
            if ($scope.PhoneOrderMode) {
                console.log($scope.TimeOffset);
                $scope.setShoppingCartTime();
            }
            updateCurrentShoppingCart();
        });

        var shoppingCartStepChangedHandler = $rootScope.$on('shoppingCartStepChanged', function (event, shoppingCart) {
            updateCurrentLines();

            $timeout(function () {
                var selectedStep = document.querySelector("#step" + shoppingCart.CurrentStep);

                if (selectedStep /* && $mdMedia('min-width: 800px') */) {
                    selectedStep.scrollIntoView(false);
                }
            }, 250);
        });

        var shoppingCartClearedHandler = $rootScope.$on('shoppingCartCleared', function (event, args) {
            $scope.currentShoppingCart = undefined;
            $scope.balancePassages = undefined;
            $scope.filteredTaxDetails = undefined;
            $scope.accordionStatus.paiementOpen = false;
            $scope.accordionStatus.ticketOpen = true;
            $scope.viewmodel.lastShoppingCart = shoppingCartModel.getLastShoppingCart();
            $scope.$evalAsync();
        });

        var shoppingCartItemAddedHandler = $rootScope.$on('shoppingCartItemAdded', function (event, args) {
            scrollToItem(args);
        });

        var scrollToItem = function (item) {
            resizeMiniBasket();

            var updatedItemElem = document.querySelector("#itemRow" + item.hashkey);

            if (updatedItemElem && $mdMedia('min-width: 800px')) {
                updatedItemElem.scrollIntoView({block: "end", inline: "nearest", behavior: "smooth"});

            }
        };

        var shoppingCartItemRemovedHandler = $rootScope.$on('shoppingCartItemRemoved', function (event, args) {
            resizeMiniBasket();
        });

        /**
         * Events on payment modes
         */
        var paymentModesAvailableChangedHandler = $rootScope.$on('paymentModesAvailableChanged', function (event, args) {
            if (args) {
                args = Enumerable.from(args).orderBy("x => x.PaymentType").toArray();
            }
            $scope.paymentModesAvailable = args;
            resizeMiniBasket();
        });

        var paymentModesChangedHandler = $rootScope.$on('paymentModesChanged', function (event, args) {
            resizeMiniBasket();
        });

        /**
         * Events on fid
         */
        var customerLoyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', function (event, args) {
            updateBalancePassages();
            resizeMiniBasket();
        });

        var shoppingCartDiscountChangedHandler = $rootScope.$on('shoppingCartDiscountRemoved', function (event, args) {
            //
            resizeMiniBasket();
        });

        $scope.$on("$destroy", function () {
            if (deliveryTypeHandler) deliveryTypeHandler();
            if (itemsHandler) itemsHandler();
            if (accordionHandler) accordionHandler();
            if (loyaltyHandler) loyaltyHandler();
            shoppingCartChangedHandler();
            shoppingCartClearedHandler();
            shoppingCartItemAddedHandler();
            shoppingCartItemRemovedHandler();
            paymentModesAvailableChangedHandler();
            paymentModesChangedHandler();
            customerLoyaltyChangedHandler();
            orderServiceHandler();
        });

        //#endregion

        //#region Actions on item
        $scope.incrementQuantity = function (cartItem) {
            shoppingCartModel.incrementQuantity(cartItem);
        };

        $scope.decrementQuantity = function (cartItem) {
            shoppingCartModel.decrementQuantity(cartItem);
        };

        $scope.removeItem = function (cartItem) {
            shoppingCartModel.removeItem(cartItem);
        };

        $scope.chooseOffer = function (cartItem) {
            console.log(cartItem);
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalChooseOffer.html',
                controller: 'ModalChooseOfferController',
                backdrop: 'static',
                resolve: {
                    defaultValue: function () {
                        return true;
                    }
                }
            });

            modalInstance.result.then(function (result) {
                if (result.action.localeCompare("Offer") == 0) {
                    //Offer
                    shoppingCartModel.offerItem(cartItem);


                } else if (result.action.localeCompare("Discount") == 0) {
                    //Discount
                    if (result.type.localeCompare("item") == 0) {
                        shoppingCartModel.addCartItemDiscount(cartItem, result.montant, result.isPercent);
                    }

                    if (result.type.localeCompare("line") == 0) {
                        shoppingCartModel.addCartLineDiscount(cartItem, result.montant, result.isPercent);

                    }

                }
                shoppingCartModel.calculateTotal();
                shoppingCartModel.calculateLoyalty();
                resizeMiniBasket();
            }, function () {
                console.log('Erreur');
            });
        };

        $scope.removeOffer = function (cartItem) {
            cartItem.DiscountET = 0;
            cartItem.DiscountIT = 0;
            console.log("Remove free/discount", cartItem);
            shoppingCartModel.calculateTotal();
            shoppingCartModel.calculateLoyalty();
        };


        $scope.editMenu = function (cartItem) {
            shoppingCartModel.editMenu(cartItem);
        };

        $scope.editComment = function (cartItem) {
            shoppingCartModel.editComment(cartItem);
        };
        //#endregion

        //#region Phone Order Action

        $scope.pickTime = function () {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalPhoneOrderTime.html',
                controller: 'ModalPhoneOrderTimeController',
                resolve: {
                    currentTimeOffset: function () {
                        return $scope.TimeOffset;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then(function (model) {
                console.log(model);
                console.log("On a finit");

                $scope.TimeOffset = 60 * model.heure + model.minute;

            }, function () {
                console.log("On a cancel");
            });

        };


        $scope.setShoppingCartTime = function () {
            $scope.currentShoppingCart.DatePickup = new Date().addMinutes($scope.TimeOffset).toString("dd/MM/yyyy HH:mm:ss");
            $scope.currentShoppingCart.id = new Date().addMinutes($scope.TimeOffset).getTime();
        };

        $scope.minutesToDisplay = function (minutes) {
            var minutesDisp = 0;
            var heuresDisp = 0;
            var retour = "";
            if (minutes >= 60) {
                heuresDisp = Math.trunc(minutes / 60);
                minutesDisp = minutes % 60;
                retour = heuresDisp + "h" + minutesDisp + "min";

            } else {
                minutesDisp = minutes;
                retour = minutesDisp + "min";
            }

            return retour;
        };

        //#endregion


        //#region Payments
        $scope.removePayment = function (selectedPaymentMode) {

            //reset des tickets resto
            if (selectedPaymentMode.PaymentType == PaymentType.TICKETRESTAURANT) {
                shoppingCartModel.removeTicketRestaurantFromCart();
            }
            selectedPaymentMode.Total = 0;
            shoppingCartModel.setPaymentMode(selectedPaymentMode);
        };

        $scope.removeBalanceUpdate = function () {
            shoppingCartModel.removeBalanceUpdate();
        };

        $scope.selectPaymentMode = function (selectedPaymentMode) {

            if ($scope.currentShoppingCart.Residue > 0) {
                // Attention à la fonction d'arrondi
                var customValue = $scope.totalDivider > 1 ? parseFloat((Math.round($scope.currentShoppingCart.Total / $scope.totalDivider * 100) / 100).toFixed(2)) : undefined;

                shoppingCartModel.selectPaymentMode(selectedPaymentMode, customValue, $rootScope.IziPosConfiguration.IsDirectPayment);
            }


        };

        $scope.splitShoppingCart = function () {
            if ($scope.currentShoppingCart && $scope.currentShoppingCart.Items.length > 0) {
                if (posUserService.isEnable('SPLIT')) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalShoppingCartSplit.html',
                        controller: 'ModalShoppingCartSplitController',
                        backdrop: 'static',
                        size: 'lg',
                        resolve: {
                            defaultValue: function () {
                                return true;
                            }
                        }
                    });
                }
            }
        };

        $scope.divideTotal = function () {
            if ($scope.currentShoppingCart && $scope.currentShoppingCart.Items.length > 0) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalTotalDivider.html',
                    controller: 'ModalTotalDividerController',
                    resolve: {
                        currentTotalDivider: function () {
                            return $scope.totalDivider;
                        }
                    },
                    size: 'sm',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (divider) {
                    //$scope.totalDivider = divider;

                    shoppingCartModel.createDividedShoppingCartsAsync($scope.currentShoppingCart, divider).then(function () {
                        console.log('Shopping cart queue', $scope.currentShoppingCart.shoppingCartQueue);
                    }, function (err) {
                        //alert erreur
                    });

                }, function () {
                });
            }
        };


        function tryMatch(itemIn, shoppingCartTo) {
            if (shoppingCartTo.Items) {
                var matchedItem = Enumerable.from(shoppingCartTo.Items).firstOrDefault(function (itemTo) {
                    return itemTo.hashkey == itemIn.hashkey && itemTo.Product.Name == itemIn.Product.Name;
                });

                if (matchedItem) {
                    var miq = new Decimal(matchedItem.Quantity);
                    var iiq = new Decimal(itemIn.Quantity);
                    matchedItem.Quantity = parseFloat(miq.plus(iiq));

                    var midit = new Decimal(matchedItem.DiscountIT);
                    var iidit = new Decimal(itemIn.DiscountIT);
                    matchedItem.DiscountIT = parseFloat(midit.plus(iidit));

                    var midet = new Decimal(matchedItem.DiscountET);
                    var iidet = new Decimal(itemIn.DiscountET);
                    matchedItem.DiscountET = parseFloat(midet.plus(iidet));

                    if(Math.max(itemIn.stockQuantity, matchedItem.stockQuantity) > 0) {
                        matchedItem.stockQuantity = Math.max(itemIn.stockQuantity, matchedItem.stockQuantity);
                    }

                } else {
                    shoppingCartTo.Items.push(itemIn)
                }
            } else {
                shoppingCartTo.Items.push(itemIn)
            }
        }


        $scope.mergeDividedTickets = function () {
            //Prend tout les item de chaque shopping cart de la queue
            //les stock dans un meme shoppingcart
            Enumerable.from($scope.currentShoppingCart.shoppingCartQueue).forEach(function (shoppingCart) {
                Enumerable.from(shoppingCart.Items).forEach(function (item) {
                    tryMatch(item, $scope.currentShoppingCart)
                });
            });

            //On multiplie la valeur du discount € par le nombre de shopping cart divisé
            Enumerable.from($scope.currentShoppingCart.Discounts).forEach(function (discount) {
                if (!discount.IsPercent) {
                    discount.Value *= $scope.currentShoppingCart.shoppingCartQueue.length + 1;
                }
            });

            $scope.currentShoppingCart.shoppingCartQueue = [];
            shoppingCartModel.calculateTotal();
            shoppingCartModel.calculateLoyalty();
            $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
            resizeMiniBasket();

        };
        //#endregion

        //#region Actions on cart
        $scope.addStep = function () {
            if (!$rootScope.borne) {
                shoppingCartModel.nextStep();
            }
        };

        $scope.selectStep = function (step) {
            shoppingCartModel.setStep(step);
        };

        $scope.unfreezeShoppingCart = function () {
            shoppingCartModel.unfreezeShoppingCart();
        };

        $scope.freezeShoppingCart = function () {
            if ($rootScope.PhoneOrderMode) {
                if ($scope.currentShoppingCart.Items.length > 0) {
                    if ($scope.currentShoppingCart.Residue == 0) {
                        $scope.currentShoppingCart.isPayed = true;
                    }
                    $scope.setShoppingCartTime();
                    $rootScope.PhoneOrderMode = false;
                    shoppingCartModel.freezeShoppingCart();
                } else {
                    swal("Le ticket doit contenir au moins un produit !");
                }
            } else {
                shoppingCartModel.freezeShoppingCart();
            }

        };

        $scope.validShoppingCart = function (ignorePrintTicket) {
            if ($rootScope.UserPreset && $rootScope.UserPreset.ForceOnCreateTicket && $rootScope.UserPreset.ForceOnCreateTicket.Cutleries) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalCutleries.html',
                    controller: 'ModalCutleriesController',
                    size: 'sm',
                    resolve: {
                        initCutleries: function () {
                            return $scope.currentShoppingCart.TableCutleries
                        }
                    },
                    backdrop: 'static',
                });

                modalInstance.result.then(function (nbCutleries) {
                    shoppingCartModel.setTableCutleries(nbCutleries);
                    if ($rootScope.IziBoxConfiguration.ForceDeliveryChoice) {
                        shoppingCartModel.openModalDelivery(ignorePrintTicket);
                    } else {
                        shoppingCartModel.validShoppingCart(ignorePrintTicket);
                    }
                }, function () {
                    console.log('Erreur');
                });
            } else {
                if ($rootScope.IziBoxConfiguration.ForceDeliveryChoice) {
                    shoppingCartModel.openModalDelivery(ignorePrintTicket);
                } else {
                    shoppingCartModel.validShoppingCart(ignorePrintTicket);
                }
            }
        };

        $scope.confirmBorneOrder = function () {
            shoppingCartModel.validBorneOrder();
        };

        $scope.openCustomActionModal = function () {
            shoppingCartModel.openCustomActionModal();
        };

        $scope.printProdShoppingCart = function () {
            if ($scope.currentShoppingCart != undefined && $scope.currentShoppingCart.Items.length > 0 && !$scope.printProdDisabled) {
                $scope.printProdDisabled = true;
                shoppingCartModel.printProdShoppingCartAsync().then(function (msg) {
                    //Enable
                    setTimeout(function () {
                        $scope.printProdDisabled = false;
                    }, 700);

                }, function (err) {
                    //Enable
                    setTimeout(function () {
                        $scope.printProdDisabled = false;
                    }, 700);
                });
                // Desactiver le bouton Print Prod (bleu) tant que la promesse n'a pas timeout / n'est pas resolu
            }
        };

        $scope.printStepProdShoppingCart = function () {

            if ($scope.currentShoppingCart != undefined && $scope.currentShoppingCart.Items.length > 0 && !$scope.printStepProdDisabled) {
                //Disable button prind prod step
                $scope.printStepProdDisabled = true;
                shoppingCartModel.printStepProdShoppingCartAsync(undefined, $scope.shoppingCartLines.length).then(function (msg) {
                    //Enable
                    setTimeout(function () {
                        $scope.printStepProdDisabled = false;
                    }, 700);
                }, function (err) {
                    //Enable
                    setTimeout(function () {
                        $scope.printStepProdDisabled = false;
                    }, 700);
                });
            }
        };

        $scope.cancelShoppingCart = function () {
            if (!$scope.currentShoppingCart.ParentTicket) {
                if (posUserService.isEnable('DELT')) {
                    var errMess = $scope.shoppingCartQueue && $scope.shoppingCartQueue.length > 0 ? "Vous allez supprimer toutes les parts d'un ticket partagé" : "";
                    var title = $rootScope.borne ? "Abandonner la commande ?" : "Supprimer le ticket ?";
                    swal({
                            title: $translate.instant(title),
                            text: errMess, type: "warning",
                            showCancelButton: true,
                            confirmButtonColor: "#d83448",
                            confirmButtonText: $translate.instant("Oui"),
                            cancelButtonText: $translate.instant("Non"),
                            closeOnConfirm: true
                        },
                        function () {
                            $scope.shoppingCartQueue = [];
                            shoppingCartModel.cancelShoppingCartAndSend();
                            if ($rootScope.borne) {
                                borneService.redirectToHome();
                            }
                        });
                }
            } else {
                shoppingCartModel.clearShoppingCart();
            }
        };
        //#endregion

        //#region Discount
        $scope.removeShoppingCartDiscount = function (item) {
            shoppingCartModel.removeShoppingCartDiscount(item);
        };
        //#endregion

        //#region FID
        $scope.openClientModal = function () {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalCustomer.html',
                controller: 'ModalCustomerController',
                backdrop: 'static',
                size: 'lg'
            });
        };

        $scope.chooseRelevantOffer = function () {
            shoppingCartModel.chooseRelevantOffer();
        };

        var updateBalancePassages = function () {
            if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.Balances) {
                $scope.balancePassages = Enumerable.from($scope.currentShoppingCart.customerLoyalty.Balances).firstOrDefault(function (b) {
                    return b.BalanceType == "Passages";
                });

                resizeMiniBasket();
            } else {
                $scope.balancePassages = undefined;
            }
        };
        //#endregion

        //#region Misc
        $scope.selectLine = function (item) {
            $scope.viewmodel.selectedLine == item ? $scope.viewmodel.selectedLine = undefined : $scope.viewmodel.selectedLine = item;
            $scope.$evalAsync();

            setTimeout(function () {
                scrollToItem(item);
            });
        };

        /**
         * Refresh the miniBasket
         * */
        var resizeMiniBasket = function () {
            var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            if (w >= 800 && !$rootScope.showShoppingCart) {
                $rootScope.showShoppingCart = true;
            }
        };
        //#endregion

        $scope.selectTable = function () {
            if (!$rootScope.borne) {
                shoppingCartModel.selectTableNumber();
            }
        };

        $scope.isMenuDisable = function (item) {
            var ret = Enumerable.from(item.Attributes).any('attr=>attr.Printed') || item.IsFree || !item.Product.ProductAttributes || (item.Product.ProductAttributes && item.Product.ProductAttributes.length == 0);
            return (false);
            return (ret);
        };

        $scope.getNbItems = function () {
            return Math.round10(shoppingCartModel.getNbItems(), -2);
        };

        /** Clear the loyalty info linked to the ticket */
        $scope.removeLoyaltyInfo = function () {
            //Une commande telephonique est forcement lié a un client
            //Si on supprime, un client, on sort donc du mode commande telephonique
            $rootScope.PhoneOrderMode = false;
            // Il faut suppr les paymentModesAvailable lié a la fid
            console.log($scope.paymentModesAvailable);
            $scope.paymentModesAvailable = $scope.paymentModesAvailable.filter(function (pma) {
                return !pma.IsBalance;
            });
            $rootScope.$emit('paymentModesAvailableChanged', $scope.paymentModesAvailable);
            $scope.currentShoppingCart.customerLoyalty = null;
            $rootScope.$emit("customerLoyaltyChanged", $scope.currentShoppingCart.customerLoyalty);
            $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
            shoppingCartModel.clearShoppingCart();
            if ($rootScope.borne) {
                borneService.redirectToHome();
            }
        }
    }
]);