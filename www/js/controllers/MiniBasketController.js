app.controller('MiniBasketController', ['$scope', '$http', '$rootScope', '$state', '$uibModal', '$timeout', '$filter', '$mdMedia', 'settingService', 'shoppingCartService', 'productService', 'shoppingCartModel', 'posUserService', 'orderShoppingCartService', 'taxesService', '$translate', 'borneService',
    function ($scope, $http, $rootScope, $state, $uibModal, $timeout, $filter, $mdMedia, settingService, shoppingCartService, productService, shoppingCartModel, posUserService, orderShoppingCartService, taxesService, $translate, borneService) {
        let deliveryTypeHandler = undefined;
        let itemsHandler = undefined;
        let accordionHandler = undefined;
        let loyaltyHandler = undefined;
        let orderServiceHandler = undefined;

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
                const cHLoyalty = document.querySelector("#loyaltyRow");
                if (cHLoyalty)
                    return cHLoyalty.clientHeight;
            }, function () {
                resizeMiniBasket();
            });


            const currentShoppingCartHandler = $scope.$watchCollection('currentShoppingCart', function () {
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
                const padHeight = window.innerHeight;
                let posMouse;
                let offset = 0;
                let myBasketDiv = document.querySelector(".miniBasketPAD");
                let isDown = false;

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
                        let moveTop = posMouse + offset;
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
                        let moveTop = posMouse + offset;
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
                    ($rootScope.UserPreset && $rootScope.UserPreset.PhoneOrder && $rootScope.UserPreset.PhoneOrder.Popup) )
                ) {
                shoppingCartModel.editDeliveryInfos();
            }

            if ($scope.currentShoppingCart && !$scope.currentShoppingCart.ParentTicket) {
                $scope.deliveryType = value;
            } else {
                $scope.deliveryType = value;
            }
        };

        const updateCurrentShoppingCart = function () {
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

        const updateCurrentLines = function () {
            if (!$scope.currentShoppingCart) {
                $scope.shoppingCartLines = undefined;
            } else {
                if ($rootScope.IziBoxConfiguration.StepEnabled) {
                    let groupedLinesStep = [];

                    const addItemToStep = function (item, step) {
                        //On recherche si le step existe déjà
                        let currentLine = Enumerable.from(groupedLinesStep).firstOrDefault("line => line.Step == " + step);

                        //Si il n'existe pas on créer le step
                        if (!currentLine) {
                            currentLine = {Step: step, Items: []};
                            groupedLinesStep.push(currentLine);
                        }

                        //Si le step ne contient pas déjà l'item, on l'ajoute
                        if (currentLine.Items.indexOf(item) === -1) {
                            currentLine.Items.push(item);
                        }
                    };

                    for (let item of $scope.currentShoppingCart.Items) {
                        if (item.Attributes && item.Attributes.length > 0) {
                            for (let attr of Array.from(item.Attributes)) {
                                addItemToStep(item, attr.Step);
                            }
                        } else {
                            addItemToStep(item, item.Step);
                        }
                    }

                    //Tri des lignes par no de step
                    let lastStep = Enumerable.from(groupedLinesStep).select("x=>x.Step").orderByDescending().firstOrDefault();

                    if (!lastStep || lastStep < $scope.currentShoppingCart.CurrentStep) {
                        lastStep = $scope.currentShoppingCart.CurrentStep;
                    }

                    for (let s = lastStep; s >= 0; s--) {
                        const lineExists = Enumerable.from(groupedLinesStep).any("line => line.Step == " + s);
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
            if ($rootScope.borne) {
                groupCurrentLines();
            }
            $scope.$evalAsync();
        };

        const groupCurrentLines = function () {
            if ($scope.shoppingCartLines) {
                let countGroups = 0;
                let cart = $scope.shoppingCartLines[0];
                for (const item of cart.Items) {
                    if (item.Attributes) {
                        if (!cart.AttrItems) {
                            cart.AttrItems = [];
                        }
                        cart.AttrItems.push(item);
                    } else {
                        if (!cart.NormalItems) {
                            cart.NormalItems = [];
                        }
                        if (!cart.NormalItems[countGroups]) {
                            cart.NormalItems[countGroups] = [];
                        }
                        if (cart.NormalItems[countGroups].length < 3) {
                            cart.NormalItems[countGroups].push(item);
                        } else {
                            countGroups++;
                            cart.NormalItems[countGroups] = [];
                            cart.NormalItems[countGroups].push(item);
                        }
                    }
                }
            }
        };

        /**
         * Events on ShoppingCartItem
         */
        const shoppingCartChangedHandler = $rootScope.$on('shoppingCartChanged', function () {
            if ($scope.PhoneOrderMode) {
                console.log($scope.TimeOffset);
                $scope.setShoppingCartTime();
            }
            updateCurrentShoppingCart();
        });

        const shoppingCartStepChangedHandler = $rootScope.$on('shoppingCartStepChanged', function (event, shoppingCart) {
            updateCurrentLines();

            $timeout(function () {
                let selectedStep = document.querySelector(`#step${shoppingCart.CurrentStep}`);

                if (selectedStep /* && $mdMedia('min-width: 800px') */) {
                    selectedStep.scrollIntoView(false);
                }
            }, 250);
        });

        const shoppingCartClearedHandler = $rootScope.$on('shoppingCartCleared', function () {
            $scope.currentShoppingCart = undefined;
            $scope.balancePassages = undefined;
            $scope.filteredTaxDetails = undefined;
            $scope.accordionStatus.paiementOpen = false;
            $scope.accordionStatus.ticketOpen = true;
            $scope.viewmodel.lastShoppingCart = shoppingCartModel.getLastShoppingCart();
            $scope.$evalAsync();
        });

        const shoppingCartItemAddedHandler = $rootScope.$on('shoppingCartItemAdded', function (event, args) {
            scrollToItem(args);
        });

        const scrollToItem = function (item) {
            resizeMiniBasket();

            let updatedItemElem;
            if (item) {
                if ($rootScope.borne) {
                    updatedItemElem = document.getElementById(item.ProductId);
                } else {
                    updatedItemElem = document.querySelector(`#itemRow${item.hashkey}`);
                }
            }
            if (updatedItemElem && $mdMedia('min-width: 800px')) {
                updatedItemElem.scrollIntoView({block: "end", inline: "nearest", behavior: "smooth"});
            } else if (updatedItemElem && $rootScope.borne) {
                updatedItemElem.scrollIntoView({block: "end", inline: "nearest", behavior: "smooth"});
            }
        };

        const shoppingCartItemRemovedHandler = $rootScope.$on('shoppingCartItemRemoved', function () {
            resizeMiniBasket();
        });

        /**
         * Events on payment modes
         */
        const paymentModesAvailableChangedHandler = $rootScope.$on('paymentModesAvailableChanged', function (event, args) {
            if (args) {
                args = Enumerable.from(args).orderBy("x => x.PaymentType").toArray();
            }
            $scope.paymentModesAvailable = args;
            resizeMiniBasket();
        });

        const paymentModesChangedHandler = $rootScope.$on('paymentModesChanged', function () {
            resizeMiniBasket();
        });

        /**
         * Events on fid
         */
        const customerLoyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', function () {
            checkForBirthday();
            updateBalancePassages();
            resizeMiniBasket();
        });

        const shoppingCartDiscountChangedHandler = $rootScope.$on('shoppingCartDiscountRemoved', function () {
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
            const modalInstance = $uibModal.open({
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
                if (result.action.localeCompare("Offer") === 0) {
                    //Offer
                    shoppingCartModel.offerItem(cartItem);


                } else if (result.action.localeCompare("Discount") === 0) {
                    //Discount
                    if (result.type.localeCompare("item") === 0) {
                        shoppingCartModel.addCartItemDiscount(cartItem, result.montant, result.isPercent);
                    }

                    if (result.type.localeCompare("line") === 0) {
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
            const modalInstance = $uibModal.open({
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
            let minutesDisp = 0;
            let heuresDisp = 0;
            let retour = "";
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
            if (selectedPaymentMode.PaymentType === PaymentType.TICKETRESTAURANT) {
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
                const customValue = $scope.totalDivider > 1 ? parseFloat((Math.round($scope.currentShoppingCart.Total / $scope.totalDivider * 100) / 100).toFixed(2)) : undefined;

                shoppingCartModel.selectPaymentMode(selectedPaymentMode, customValue, $rootScope.IziPosConfiguration.IsDirectPayment);
            }


        };

        $scope.splitShoppingCart = function () {
            if ($scope.currentShoppingCart && $scope.currentShoppingCart.Items.length > 0) {
                if (posUserService.isEnable('SPLIT')) {
                    $uibModal.open({
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
                const modalInstance = $uibModal.open({
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
            // Unsplit
            itemIn.isPartSplitItem = false;
            if (shoppingCartTo.Items) {
                let matchedItem = Enumerable.from(shoppingCartTo.Items).firstOrDefault(function (itemTo) {
                    return itemTo.hashkey === itemIn.hashkey && itemTo.Product.Name === itemIn.Product.Name;
                });

                if (matchedItem) {
                    // Unsplit
                    matchedItem.isPartSplitItem = false;
                    const miq = new Decimal(matchedItem.Quantity);
                    const iiq = new Decimal(itemIn.Quantity);
                    matchedItem.Quantity = parseFloat(miq.plus(iiq));

                    const midit = new Decimal(matchedItem.DiscountIT);
                    const iidit = new Decimal(itemIn.DiscountIT);
                    matchedItem.DiscountIT = parseFloat(midit.plus(iidit));

                    const midet = new Decimal(matchedItem.DiscountET);
                    const iidet = new Decimal(itemIn.DiscountET);
                    matchedItem.DiscountET = parseFloat(midet.plus(iidet));

                    if (Math.max(itemIn.stockQuantity, matchedItem.stockQuantity) > 0) {
                        matchedItem.stockQuantity = Math.max(itemIn.stockQuantity, matchedItem.stockQuantity);
                    }

                } else {
                    shoppingCartTo.Items.push(itemIn);
                }
            } else {
                shoppingCartTo.Items.push(itemIn);
            }
        }


        $scope.mergeDividedTickets = function () {
            //Prend tout les item de chaque shopping cart de la queue
            //les stock dans un meme shoppingcart
            for (let shoppingCart of $scope.currentShoppingCart.shoppingCartQueue) {
                for (let item of shoppingCart.Items) {
                    tryMatch(item, $scope.currentShoppingCart);
                }
            }

            //On multiplie la valeur du discount € par le nombre de shopping cart divisé
            for (let discount of $scope.currentShoppingCart.Discounts) {
                if (!discount.IsPercent) {
                    discount.Value *= $scope.currentShoppingCart.shoppingCartQueue.length + 1;
                }
            }

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
            // The Delivery Choice Modal and the Cutleries Model are not shown when we cancel a stored Ticket (From the ticket List)
            if ($scope.currentShoppingCart.ParentTicket) {
                shoppingCartModel.validShoppingCart(ignorePrintTicket);
            }
            else if ($rootScope.UserPreset && $rootScope.UserPreset.ForceOnCreateTicket && $rootScope.UserPreset.ForceOnCreateTicket.Cutleries) {
                const modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalCutleries.html',
                    controller: 'ModalCutleriesController',
                    size: 'sm',
                    resolve: {
                        initCutleries: function () {
                            return $scope.currentShoppingCart.TableCutleries;
                        }
                    },
                    backdrop: 'static'
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
            if($scope.currentShoppingCart) {
                if ($scope.currentShoppingCart.Items.length > 0) {
                    const modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalPickPaymentMode.html',
                        controller: 'ModalPickPaymentModeController',
                        backdrop: 'static',
                        windowClass: 'mainModals',
                        resolve: {
                            pmAvailable: function () {
                                return $scope.paymentModesAvailable;
                            },
                        }
                    });
                    modalInstance.result.then(function (toPos) {
                        if (toPos) {
                            shoppingCartModel.validBorneOrder();
                        }
                    }, function () {
                        console.log('Erreur');
                    });
                }
            }
        };

        $scope.openCustomActionModal = function () {
            shoppingCartModel.openCustomActionModal();
        };

        $scope.printProdShoppingCart = function () {
            if ($scope.currentShoppingCart !== undefined && $scope.currentShoppingCart.Items.length > 0 && !$scope.printProdDisabled) {
                $scope.printProdDisabled = true;
                shoppingCartModel.printProdShoppingCartAsync().then(function () {
                    //Enable
                    setTimeout(function () {
                        $scope.printProdDisabled = false;
                    }, 700);

                }, function () {
                    //Enable
                    setTimeout(function () {
                        $scope.printProdDisabled = false;
                    }, 700);
                });
                // Desactiver le bouton Print Prod (bleu) tant que la promesse n'a pas timeout / n'est pas resolu
            }
        };

        $scope.printStepProdShoppingCart = function () {

            if ($scope.currentShoppingCart !== undefined && $scope.currentShoppingCart.Items.length > 0 && !$scope.printStepProdDisabled) {
                //Disable button prind prod step
                $scope.printStepProdDisabled = true;
                shoppingCartModel.printStepProdShoppingCartAsync(undefined, $scope.shoppingCartLines.length).then(function () {
                    //Enable
                    setTimeout(function () {
                        $scope.printStepProdDisabled = false;
                    }, 700);
                }, function () {
                    //Enable
                    setTimeout(function () {
                        $scope.printStepProdDisabled = false;
                    }, 700);
                });
            }
        };

        $scope.cancelShoppingCart = function () {
            if ($scope.currentShoppingCart) {
                if (!$scope.currentShoppingCart.isPayed) {
                    $rootScope.isCustomerLog = false;
                    if (!$scope.currentShoppingCart.ParentTicket) {
                        if (posUserService.isEnable('DELT')) {
                            const errMess = $scope.shoppingCartQueue && $scope.shoppingCartQueue.length > 0 ? "Vous allez supprimer toutes les parts d'un ticket partagé" : "";
                            const title = $rootScope.borne ? "Abandonner la commande ?" : "Supprimer le ticket ?";
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
                }
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
            $uibModal.open({
                templateUrl: 'modals/modalCustomer.html',
                controller: 'ModalCustomerController',
                backdrop: 'static',
                size: 'lg'
            });
        };

        $scope.chooseRelevantOffer = function () {
            shoppingCartModel.chooseRelevantOffer();
        };

        const checkForBirthday = function () {
            if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.CustomerDateOfBirth) {
                const arrDoB = $scope.currentShoppingCart.customerLoyalty.CustomerDateOfBirth.split('T')[0].split('-');

                if (new Date().getMonth() + 1 === parseInt(arrDoB[1]) && new Date().getDate() === parseInt(arrDoB[2])) {
                    if ($rootScope.borne) {
                        swal({
                            title: `${ $translate.instant("Joyeux anniversaire")} ${$scope.currentShoppingCart.customerLoyalty.CustomerFirstName} !`,
                            text: $translate.instant("Utilisez votre offre anniversaire !"),
                            showCancelButton: false,
                            imageUrl: 'img/ajax-loader.gif',
                            confirmButtonColor: "#20d8bb",
                            confirmButtonText: $translate.instant("OK"),
                            closeOnConfirm: true
                        });

                    } else {
                        swal(`${ $translate.instant("C'est l'anniversaire de ")} ${$scope.currentShoppingCart.customerLoyalty.CustomerFirstName} ${$scope.currentShoppingCart.customerLoyalty.CustomerLastName}!`);
                    }
                }
            }

        };

        const updateBalancePassages = function () {
            if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.Balances) {
                $scope.balancePassages = Enumerable.from($scope.currentShoppingCart.customerLoyalty.Balances).firstOrDefault(function (b) {
                    return b.BalanceType === "Passages";
                });

                resizeMiniBasket();
            } else {
                $scope.balancePassages = undefined;
            }
        };
        //#endregion

        //#region Misc
        $scope.selectLine = function (item) {
            $scope.viewmodel.selectedLine === item ? $scope.viewmodel.selectedLine = undefined : $scope.viewmodel.selectedLine = item;
            $scope.$evalAsync();

            setTimeout(function () {
                scrollToItem(item);
            });
        };

        /**
         * Refresh the miniBasket
         * */
        const resizeMiniBasket = function () {
            const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            if (width >= 800 && !$rootScope.showShoppingCart) {
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
            const ret = Enumerable.from(item.Attributes).any('attr=>attr.Printed') || item.IsFree || !item.Product.ProductAttributes || (item.Product.ProductAttributes && item.Product.ProductAttributes.length == 0);
            return (ret);
        };

        $scope.getNbItems = function () {
            return roundValue(shoppingCartModel.getNbItems(), -2);
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
        };

        $scope.setPMRmode = function () {
            $rootScope.isPMREnabled = !$rootScope.isPMREnabled;
            let el = document.querySelector('#pubProductsList');
            let eldown = document.querySelector('#pubProductsCutB');
            if (el) {
                if ($rootScope.isPMREnabled) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'block';
                }
            }
            if (eldown) {
                if ($rootScope.isPMREnabled) {
                    eldown.style.bottom = '0';
                } else {
                    eldown.style.bottom = '250px';
                }
            }
        }
    }
]);