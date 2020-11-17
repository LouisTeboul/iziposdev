app.controller('MiniBasketController', function ($scope, $http, $rootScope, $uibModal, $interval, $filter, $mdMedia, $translate, $q, settingService, posUserService, orderService, taxesService, borneService, stockService, shoppingCartService, paymentService, posService, printService, deliveryService, productService, loyaltyService, discountService) {
    let deliveryTypeHandler = undefined;
    let deliveryTypeListener = undefined;
    let itemsHandler = undefined;
    let accordionHandler = undefined;
    let loyaltyHandler = undefined;
    let orderServiceHandler = undefined;
    let currentShoppingCartHandler = undefined;
    let loyaltyRowHandler = undefined;

    let shoppingCartStepChangedHandler = undefined;
    let shoppingCartClearedHandler = undefined;
    let shoppingCartItemAddedHandler = undefined;
    let shoppingCartItemChangedHandler = undefined;
    let shoppingCartItemRemovedHandler = undefined;
    let paymentModesChangedHandler = undefined;
    let customerLoyaltyChangedHandler = undefined;
    let shoppingCartDiscountChangedHandler = undefined;

    let shoppingCartChangedHandler = undefined;

    $scope.$on("$destroy", () => {
        // Watchers
        if (loyaltyRowHandler) loyaltyRowHandler();
        if (deliveryTypeHandler) deliveryTypeHandler();
        if (deliveryTypeListener) deliveryTypeListener();
        if (itemsHandler) itemsHandler();
        if (accordionHandler) accordionHandler();
        if (loyaltyHandler) loyaltyHandler();
        if (currentShoppingCartHandler) currentShoppingCartHandler();
        if (consignorPaymentHandler) consignorPaymentHandler();

        // Event listeners
        if (shoppingCartChangedHandler) shoppingCartChangedHandler();
        if (shoppingCartClearedHandler) shoppingCartClearedHandler();
        if (shoppingCartItemAddedHandler) shoppingCartItemAddedHandler();
        if (shoppingCartItemChangedHandler) shoppingCartItemChangedHandler();
        if (shoppingCartItemRemovedHandler) shoppingCartItemRemovedHandler();
        if (paymentModesChangedHandler) paymentModesChangedHandler();
        if (customerLoyaltyChangedHandler) customerLoyaltyChangedHandler();
        if (orderServiceHandler) orderServiceHandler();
        if (shoppingCartStepChangedHandler) shoppingCartStepChangedHandler();
        if (shoppingCartDiscountChangedHandler) shoppingCartDiscountChangedHandler();
    });

    $scope.filter = $filter;
    $scope.stockService = stockService;
    $scope.paymentType = PaymentType;
    $scope.DeliveryType = DeliveryType;
    $scope.GloryEnabled = window.glory && ($rootScope.UserPreset && $rootScope.UserPreset.EnableGlory);

    $scope.nbItems = 0;

    $scope.mbLoadingTimer = 0;

    let loadingInterval = null;

    //#region Controller init
    //Initialize controller
    $scope.init = () => {
        $scope.viewmodel = {};
        $scope.TimeOffset = 0;
        $scope.mdMedia = $mdMedia;

        let loaded = false;
        const loadBasket = () => {
            $("#panelTotal > div").each(function (index) {
                if (index === 0) {
                    $(this).css("min-height", "60px");
                } else {
                    $(this).css("overflow", "scroll");
                    $(this).css("flex", "1");
                    loaded = true;
                }
            });
            if (!loaded) {
                window.requestAnimationFrame(loadBasket);
            }
        };
        loadBasket();

        updateCurrentShoppingCart();

        //ResizeEvent
        window.addEventListener('resize', () => {
            $rootScope.resizeMiniBasket();
        });

        $scope.tempStep = 0;
        $scope.deliveryType = $rootScope.currentDeliveryType;

        $scope.accordionStatus = {
            paiementOpen: false,
            ticketOpen: true
        };

        // Causes infinite digest loop
        // BUGFIX: The loyalty div was modified after the miniBasketResize()
        loyaltyRowHandler = $scope.$watch(() => {
            const cHLoyalty = document.querySelector("#loyaltyRow");
            if (cHLoyalty) {
                return cHLoyalty.clientHeight;
            }
        }, () => {
            $rootScope.resizeMiniBasket();
        });

        currentShoppingCartHandler = $rootScope.$watchCollection('currentShoppingCart', () => {
            if ($rootScope.currentShoppingCart) {
                $scope.filteredTaxDetails = taxesService.groupTaxDetail($rootScope.currentShoppingCart.TaxDetails);
                $scope.$evalAsync();
            }
        });

        consignorPaymentHandler = $rootScope.$watch('currentShoppingCart.IsAccountConsignorPayment', (newV) => {
            if (newV === true) {
                $scope.accordionStatus.ticketOpen = false;
                $scope.accordionStatus.paiementOpen = true;
            }
        });

        deliveryTypeHandler = $scope.$watch('deliveryType', () => {
            $rootScope.currentDeliveryType = $scope.deliveryType;
            if ($rootScope.currentShoppingCart) {
                $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
            }
            $rootScope.$emit('deliveryTypeChanged', $rootScope.currentDeliveryType);
        });

        deliveryTypeListener = $rootScope.$on('deliveryTypeChanged', (event, calculate = true) => {
            $scope.deliveryType = $rootScope.currentDeliveryType;
            if (calculate) {
                paymentService.calculateTotal();
            }
        });

        accordionHandler = $scope.$watch('accordionStatus.ticketOpen', () => {
            setTimeout($rootScope.resizeMiniBasket, 500);
        });

        loyaltyHandler = $rootScope.$watch('currentShoppingCart.customerLoyalty', (newV) => {
            if ($rootScope.currentShoppingCart) {
                $rootScope.resizeMiniBasket();
            }
        });

        if ($rootScope.IziBoxConfiguration && $rootScope.IziBoxConfiguration.StepEnabled) {
            settingService.getStepNamesAsync().then((stepNames) => {
                $scope.stepNames = stepNames;
            });
        }

        orderServiceHandler = $rootScope.$on('orderShoppingCartChanged', () => {
            $scope.initOrder();
        });

        //Move
        if (!$mdMedia('min-width: 800px')) {
            const padHeight = window.innerHeight;
            let posMouse;
            let offset = 0;
            let myBasketDiv = document.querySelector(".miniBasketPAD");
            let isDown = false;

            if (myBasketDiv) {
                myBasketDiv.style.height = padHeight - 100 + 'px';

                myBasketDiv.addEventListener('mousedown', (e) => {
                    isDown = true;
                    offset = myBasketDiv.offsetTop - e.clientY;
                }, true);
            }

            document.addEventListener('mousemove', (e) => {
                e.stopPropagation();
                if (isDown) {
                    posMouse = e.clientY;
                    let moveTop = posMouse + offset;
                    if (moveTop >= 0 && moveTop < padHeight * 0.75 && offset > -150) {
                        if (moveTop < 75) {
                            moveTop = 0;
                        }
                        if (moveTop > padHeight * 0.60) {
                            moveTop = Math.floor(padHeight * 0.75);
                        }
                        myBasketDiv.style.top = moveTop + 'px';
                    }
                    $rootScope.resizeMiniBasket();
                }
            }, true);

            document.addEventListener('mouseup', () => {
                isDown = false;
            }, true);
            if (myBasketDiv) {
                myBasketDiv.addEventListener('touchstart', (e) => {
                    isDown = true;
                    offset = myBasketDiv.offsetTop - e.touches[0].clientY;
                }, true);
            }

            document.addEventListener('touchmove', (e) => {
                e.stopPropagation();
                if (isDown) {
                    posMouse = e.touches[0].clientY;
                    let moveTop = posMouse + offset;
                    if (moveTop >= 0 && moveTop < padHeight * 0.75 && offset > -150) {
                        if (moveTop < 75) {
                            moveTop = 0;
                        }
                        if (moveTop > padHeight * 0.60) {
                            moveTop = Math.floor(padHeight * 0.75);
                        }
                        myBasketDiv.style.top = moveTop + 'px';
                    }
                    $rootScope.resizeMiniBasket();
                }
            }, true);

            document.addEventListener('touchend', () => {
                isDown = false;
            }, true);
        }

        if ($rootScope.UserPreset) {
            if ($rootScope.UserPreset.DefaultDeliveryMode) {
                $rootScope.currentDeliveryType = $rootScope.UserPreset.DefaultDeliveryMode;
                if ($rootScope.currentShoppingCart) {
                    $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                }
                $rootScope.$emit('deliveryTypeChanged');
            } else {
                $rootScope.UserPreset.DefaultDeliveryMode = DeliveryType.FORHERE;
                $rootScope.currentDeliveryType = DeliveryType.FORHERE;
                if ($rootScope.currentShoppingCart) {
                    $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                }
                $rootScope.$emit('deliveryTypeChanged');
            }
        }
        paymentService.updatePaymentModes();
        paymentService.calculateTotal();
    };

    $scope.initOrder = () => {
        $scope.orders = orderService.orders;
        loadReadyOrders();
    };

    const loadReadyOrders = () => {
        if ($rootScope.UserPreset && $rootScope.UserPreset.AutoLoadReadyOrders && !$rootScope.borne) {
            if (!$rootScope.currentShoppingCart) {
                if ($scope.orders && $scope.orders.ready && $scope.orders.ready.length > 0) {
                    let firstOrder = Enumerable.from($scope.orders.ready).firstOrDefault(o => !o.DontAutoLoad);
                    if (firstOrder && firstOrder.Timestamp) {
                        shoppingCartService.unfreezeShoppingCartById(firstOrder.Timestamp).then((res) => {
                            console.log(res);
                        }, (err) => {
                            console.error(err);
                        });
                    }
                }
            }
        }
    };

    $scope.setDeliveryType = (value) => {
        $rootScope.currentDeliveryType = value;
        if ($rootScope.currentShoppingCart) {
            $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
        }
        $rootScope.$emit('deliveryTypeChanged');

        if (value !== DeliveryType.FORHERE) {
            if ($rootScope.IziBoxConfiguration.PhoneOrderEnable && ($rootScope.UserPreset && $rootScope.UserPreset.PhoneOrder && $rootScope.UserPreset.PhoneOrder.Popup)) {
                deliveryService.editDeliveryInfos(false, value);
            }
        } else {
            deliveryService.removeDeliveryInfos();
        }
    };

    const updateCurrentShoppingCart = () => {
        $scope.filteredTaxDetails = undefined;

        if (itemsHandler) itemsHandler();

        $scope.viewmodel.lastShoppingCart = $rootScope.lastShoppingCart;
        $scope.$evalAsync();

        if ($rootScope.currentShoppingCart) {
            $scope.deliveryType = $rootScope.currentDeliveryType;

            itemsHandler = $rootScope.$watchCollection('currentShoppingCart.Items', () => {
                updateCurrentLines();
            });
        }

        loyaltyService.calculateLoyalty();
        paymentService.calculateTotal();
        $rootScope.resizeMiniBasket();
    };

    const updateCurrentLines = () => {
        if (!$rootScope.currentShoppingCart) {
            $scope.shoppingCartLines = undefined;
        } else {
            if ($rootScope.IziBoxConfiguration.StepEnabled) {
                let groupedLinesStep = [];

                const addItemToStep = (item, step) => {
                    //On recherche si le step existe déjà
                    let currentLine = Enumerable.from(groupedLinesStep).firstOrDefault("line => line.Step == " + step);

                    //Si il n'existe pas on créer le step
                    if (!currentLine) {
                        currentLine = {
                            Step: step,
                            Items: []
                        };
                        groupedLinesStep.push(currentLine);
                    }

                    //Si le step ne contient pas déjà l'item, on l'ajoute
                    if (currentLine.Items.indexOf(item) === -1) {
                        currentLine.Items.push(item);
                    }
                };

                for (let item of $rootScope.currentShoppingCart.Items) {
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

                if (!lastStep || lastStep < $rootScope.currentShoppingCart.CurrentStep) {
                    lastStep = $rootScope.currentShoppingCart.CurrentStep;
                }

                for (let s = lastStep; s >= 0; s--) {
                    const lineExists = Enumerable.from(groupedLinesStep).any("line => line.Step == " + s);
                    if (!lineExists) {
                        groupedLinesStep.push({
                            Step: s,
                            Items: []
                        });
                    }
                }
                $scope.shoppingCartLines = Enumerable.from(groupedLinesStep).orderBy("x => x.Step").toArray();
            } else {
                $scope.shoppingCartLines = [];
                $scope.shoppingCartLines.push({
                    Step: 0,
                    Items: $rootScope.currentShoppingCart.Items
                });
            }
        }
        if ($rootScope.borne) {
            groupCurrentLines();
        }
        $scope.$evalAsync();
    };

    const groupCurrentLines = () => {
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
    shoppingCartChangedHandler = $rootScope.$on('shoppingCartChanged', () => {
        // if ($scope.PhoneOrderMode) {
        //     console.log($scope.TimeOffset);
        //     $scope.setShoppingCartTime();
        // }
        updateCurrentShoppingCart();
    });

    shoppingCartStepChangedHandler = $rootScope.$on('shoppingCartStepChanged', (event, shoppingCart) => {
        updateCurrentLines();

        setTimeout(() => {
            let selectedStep = document.querySelector(`#step${shoppingCart.CurrentStep}`);

            if (selectedStep /* && $mdMedia('min-width: 800px') */) {
                selectedStep.scrollIntoView(false);
            }
        }, 250);
    });

    shoppingCartClearedHandler = $rootScope.$on('shoppingCartCleared', () => {
        $rootScope.currentShoppingCart = null;
        $scope.filteredTaxDetails = undefined;
        $scope.accordionStatus.paiementOpen = false;
        $scope.accordionStatus.ticketOpen = true;
        $scope.viewmodel.lastShoppingCart = $rootScope.lastShoppingCart;
        loadReadyOrders();
        $scope.$evalAsync();
    });

    const scrollToItem = (item, retry = 0) => {
        $rootScope.resizeMiniBasket();

        let updatedItemElem;
        if (item) {
            if ($rootScope.borne) {
                updatedItemElem = document.querySelector("#" + item.ProductId);
            } else {
                updatedItemElem = document.querySelector("#itemRow" + item.hashkey);
            }
        }
        if (updatedItemElem && $mdMedia('min-width: 800px')) {
            updatedItemElem.scrollIntoView({
                block: "end",
                inline: "nearest",
                behavior: "smooth"
            });
        } else if (updatedItemElem && $rootScope.borne) {
            updatedItemElem.scrollIntoView({
                block: "end",
                inline: "nearest",
                behavior: "smooth"
            });
        } else if (!updatedItemElem) {
            if (retry < 5) {
                retry++;
                setTimeout(() => {
                    scrollToItem(item, retry);
                }, 50);
            }
        }
    };

    shoppingCartItemAddedHandler = $rootScope.$on('shoppingCartItemAdded', (event, args) => {
        scrollToItem(args);
        getNbItems();
    });

    shoppingCartItemChangedHandler = $rootScope.$on("shoppingCartItemChanged", (event, args) => {
        getNbItems();
    });

    shoppingCartItemRemovedHandler = $rootScope.$on('shoppingCartItemRemoved', () => {
        $rootScope.resizeMiniBasket();
    });

    paymentModesChangedHandler = $rootScope.$on('paymentModesChanged', () => {
        $rootScope.resizeMiniBasket();
    });

    //Events on fid
    customerLoyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', () => {
        checkForBirthday();
        $rootScope.resizeMiniBasket();
        $rootScope.currentShoppingCart.LoyaltyChanged = true;
    });

    shoppingCartDiscountChangedHandler = $rootScope.$on('shoppingCartDiscountRemoved', () => {
        $rootScope.resizeMiniBasket();
    });

    //#endregion

    //#region Actions on item
    $scope.incrementQuantity = (cartItem) => {
        productService.incrementQuantity(cartItem);
        getNbItems();
    };

    $scope.decrementQuantity = (cartItem) => {
        productService.decrementQuantity(cartItem);
        getNbItems();
    };

    $scope.removeItem = (cartItem) => {
        productService.removeItem(cartItem);
        getNbItems();
    };

    $scope.chooseOffer = (cartItem) => {
        console.log(cartItem);
        const modalInstance = $uibModal.open({
            templateUrl: 'modals/modalChooseOffer.html',
            controller: 'ModalChooseOfferController',
            backdrop: 'static',
            resolve: {
                defaultValue: () => {
                    return true;
                },
                product: cartItem
            }
        });

        modalInstance.result.then((result) => {
            if (result.action === 'Offer') {
                if (result.type === "item") {
                    discountService.offerItem(cartItem);
                } else if (result.type === "line") {
                    discountService.offerItem(cartItem, true);
                }
            } else if (result.action === 'Discount') {
                if (result.type === "item") {
                    discountService.addCartItemDiscount(cartItem, result.montant, result.isPercent);
                } else if (result.type === "line") {
                    discountService.addCartLineDiscount(cartItem, result.montant, result.isPercent);
                }
            }
            paymentService.calculateTotal();
            loyaltyService.calculateLoyalty();
            $rootScope.resizeMiniBasket();
        }, () => {
            console.log('Erreur');
        });
    };

    $scope.removeOffer = (cartItem) => {
        cartItem.DiscountET = 0;
        cartItem.DiscountIT = 0;
        console.log("Remove free/discount", cartItem);
        paymentService.calculateTotal();
        loyaltyService.calculateLoyalty();
    };

    $scope.editMenu = (item) => {
        if ($scope.isMenuDisable(item) && (item.Attributes && item.Attributes.length > 0) || item.Product && item.Product.ProductAttributes && item.Product.ProductAttributes.length > 0) {
            productService.editMenu(item);
        }
    };

    $scope.editComment = (cartItem) => {
        productService.editComment(cartItem);
    };

    $scope.editQuantity = (cartItem) => {
        productService.editQuantity(cartItem);
    };
    //#endregion

    //#region Phone Order Action

    // $scope.pickTime = () => {
    //     const modalInstance = $uibModal.open({
    //         templateUrl: 'modals/modalPhoneOrderTime.html',
    //         controller: 'ModalPhoneOrderTimeController',
    //         resolve: {
    //             currentTimeOffset: () => {
    //                 return $scope.TimeOffset;
    //             }
    //         },
    //         backdrop: 'static'
    //     });
    //
    //     modalInstance.result.then((model) => {
    //         console.log(model);
    //         console.log("On a finit");
    //
    //         $scope.TimeOffset = 60 * model.heure + model.minute;
    //
    //     }, () => {
    //         console.log("On a cancel");
    //     });
    //
    // };

    // $scope.setShoppingCartTime = () => {
    //     $rootScope.currentShoppingCart.DatePickup = new Date().addMinutes($scope.TimeOffset).toString("dd/MM/yyyy HH:mm:ss");
    //     $rootScope.currentShoppingCart.id = new Date().addMinutes($scope.TimeOffset).getTime();
    // };

    $scope.minutesToDisplay = (minutes) => {
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
    $scope.removePayment = (selectedPaymentMode) => {
        //reset des tickets resto
        if (selectedPaymentMode.PaymentType === PaymentType.TICKETRESTAURANT) {
            paymentService.removeTicketRestaurantFromCart(selectedPaymentMode.Barcode);
        }
        //reset des credits
        if (selectedPaymentMode.PaymentType === PaymentType.AVOIR) {
            paymentService.removeCreditFromCart(selectedPaymentMode.Barcode);
        }
        //reset du BalanceUpdate
        if (selectedPaymentMode.PaymentType === PaymentType.FIDELITE) {
            paymentService.removeBalanceUpdate();
        }
        selectedPaymentMode.Total = 0;
        paymentService.setPaymentMode(selectedPaymentMode);
    };

    $scope.selectPaymentMode = (selectedPaymentMode) => {
        $rootScope.currentShoppingCart.IsEmployeeMeal = false;
        $rootScope.currentShoppingCart.IsLossTicket = false;

        if ($rootScope.currentShoppingCart.Residue !== 0 || $rootScope.currentShoppingCart.IsAccountConsignorPayment) {
            paymentService.selectPaymentMode(selectedPaymentMode, undefined, $rootScope.IziPosConfiguration.IsDirectPayment);
        }
    };

    $scope.flagAsLoss = () => {
        console.log("pertes");
        $rootScope.currentShoppingCart.IsEmployeeMeal = false;
        $rootScope.currentShoppingCart.IsLossTicket = true;
    };

    $scope.flagAsEmployeeMeal = () => {
        // TODO : Pick the employee
        console.log("repas employé");
        $rootScope.currentShoppingCart.IsLossTicket = false;
        $rootScope.currentShoppingCart.IsEmployeeMeal = true;
    };

    $scope.currentShoppingCartRight = () => {
        return shoppingCartService.getCurrentShoppingCartRight();
    };

    $scope.splitShoppingCart = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items.length > 0) {
            if (posUserService.isEnable('SPLIT')) {
                $uibModal.open({
                    templateUrl: 'modals/modalShoppingCartSplit.html',
                    controller: 'ModalShoppingCartSplitController',
                    backdrop: 'static',
                    size: 'lg',
                    resolve: {
                        defaultValue: () => {
                            return true;
                        }
                    }
                });
            } else {
                swal({
                    title: $translate.instant("Vous n'avez pas les droits nécessaires.")
                });
            }
        }
    };

    $scope.divideTotal = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items.length > 0) {
            const modalInstance = $uibModal.open({
                templateUrl: 'modals/modalTotalDivider.html',
                controller: 'ModalTotalDividerController',
                size: 'sm',
                backdrop: 'static'
            });

            modalInstance.result.then((divider) => {
                productService.createDividedShoppingCartsAsync($rootScope.currentShoppingCart, divider).then(() => {
                    console.log('Shopping cart queue', $rootScope.currentShoppingCart.shoppingCartQueue);
                }, (err) => {
                    //alert erreur
                });
            }, () => { });
        }
    };

    const tryMatch = (itemIn, shoppingCartTo) => {
        // Unsplit
        let isPartSplitItem = false;
        // Case when a splitTicket is partiallyPaid, we set all Items to isPartSplitItem to avoid deletion of those items
        if (shoppingCartTo.spitTicketPartiallyPaid) {
            isPartSplitItem = true;
        }

        if (shoppingCartTo.Items) {
            let matchedItem = Enumerable.from(shoppingCartTo.Items).firstOrDefault((itemTo) => {
                return itemTo.hashkey === itemIn.hashkey && itemTo.Product.Name === itemIn.Product.Name;
            });

            if (matchedItem) {
                // Unsplit
                matchedItem.isPartSplitItem = isPartSplitItem;
                const miq = new Decimal(matchedItem.Quantity);
                const iiq = new Decimal(itemIn.Quantity);
                matchedItem.Quantity = parseFloat(miq.plus(iiq));

                const midit = new Decimal(matchedItem.DiscountIT);
                const iidit = new Decimal(itemIn.DiscountIT);
                matchedItem.DiscountIT = parseFloat(midit.plus(iidit));

                const midet = new Decimal(matchedItem.DiscountET);
                const iidet = new Decimal(itemIn.DiscountET);
                matchedItem.DiscountET = parseFloat(midet.plus(iidet));
                if (itemIn.stockQuantity && matchedItem.stockQuantity && itemIn.stockQuantity > 0 && matchedItem.stockQuantity > 0) {
                    matchedItem.stockQuantity = Math.max(itemIn.stockQuantity, matchedItem.stockQuantity);
                    if (!Number.isInteger(matchedItem.stockQuantity)) {
                        matchedItem.stockQuantity = null;
                    }
                }
            } else {
                shoppingCartTo.Items.push(itemIn);
            }
        } else {
            shoppingCartTo.Items.push(itemIn);
        }
    };

    $scope.mergeOnePart = () => {
        // Fusionne une part au ticket courant

        if ($rootScope.currentShoppingCart.shoppingCartQueue && $rootScope.currentShoppingCart.shoppingCartQueue.length > 0) {
            for (let item of $rootScope.currentShoppingCart.shoppingCartQueue[0].Items) {
                tryMatch(item, $rootScope.currentShoppingCart);
            }

            //On multiplie la valeur du discount € par le nombre de shopping cart divisé
            for (let discount of $rootScope.currentShoppingCart.Discounts) {
                if (!discount.IsPercent) {
                    discount.Value *= 2;
                }
            }

            $rootScope.currentShoppingCart.shoppingCartQueue.shift();
            paymentService.calculateTotal();
            loyaltyService.calculateLoyalty();
            $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
            $rootScope.resizeMiniBasket();
        }
    };

    $scope.mergeDividedTickets = () => {
        // Avant de merge, on essaie de supprimer le ticket locké correspondant aux tickets splité dans le freeze
        const url = $rootScope.APIBaseURL + "/freeze/deleteLockedFreezeTicket";
        $http.get(url + "?ticketId=" + $rootScope.currentShoppingCart.Timestamp).then((res) => {
            console.log(res);
        }, (err) => {
            console.error(err);
        });

        let merged = $rootScope.currentShoppingCart.splitAmountPaid ? true : false;

        if ($rootScope.currentShoppingCart.splitAmountPaid) {
            let discountValue = $rootScope.currentShoppingCart.splitAmountPaid;

            $rootScope.currentShoppingCart = $rootScope.currentShoppingCart.origShoppingCart;

            $rootScope.currentShoppingCart.Discounts = $rootScope.currentShoppingCart.Discounts ? $rootScope.currentShoppingCart.Discounts : [];
            $rootScope.currentShoppingCart.Items = $rootScope.currentShoppingCart.Items ? $rootScope.currentShoppingCart.Items : [];
            deliveryService.upgradeCurrentShoppingCartAndDeliveryType($rootScope.currentShoppingCart);

            // Si il y a deja un discount sur le ticket, on fusionne
            if ($rootScope.currentShoppingCart.Discounts && $rootScope.currentShoppingCart.Discounts.length > 0) {
                for (let discount of $rootScope.currentShoppingCart.Discounts) {
                    discountValue += discount.Value;
                }
            }

            $rootScope.currentShoppingCart.Discounts = [];

            discountObj = new ShoppingCartDiscount(null, "Partiellement payé", discountValue, false, true);
            discountService.addShoppingCartDiscount(discountObj);
        } else {
            $rootScope.currentShoppingCart = $rootScope.currentShoppingCart.origShoppingCart;

            if (!$rootScope.currentShoppingCart.Discounts) {
                $rootScope.currentShoppingCart.Discounts = [];
            }
            if (!$rootScope.currentShoppingCart.Items) {
                $rootScope.currentShoppingCart.Items = [];
            }
            deliveryService.upgradeCurrentShoppingCartAndDeliveryType($rootScope.currentShoppingCart);
        }

        paymentService.calculateTotal();
        loyaltyService.calculateLoyalty();

        $rootScope.currentShoppingCart.merged = merged;

        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
        $rootScope.resizeMiniBasket();
    };

    //#endregion

    //#region Actions on cart
    $scope.addStep = () => {
        if (!$rootScope.borne) {
            shoppingCartService.nextStep();
        }
    };

    $scope.toggleAccordion = () => {
        //if (!$rootScope.currentShoppingCart || ($rootScope.currentShoppingCart && !$rootScope.currentShoppingCart.IsAccountConsignorPayment)) {
        //    $scope.accordionStatus.ticketOpen = !$scope.accordionStatus.paiementOpen;
        //}
    };

    $scope.selectStep = (step) => {
        if ($rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            shoppingCartService.setStep(step);
        }
    };

    $scope.unfreezeShoppingCart = () => {
        if ($rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            shoppingCartService.unfreezeShoppingCart();
        }
    };

    $scope.freezeShoppingCart = () => {
        if ($rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            if (!$scope.printProdDisabled && $rootScope.currentShoppingCart) {
                disablePrint();
                showLoading();

                if ($rootScope.currentShoppingCart.Items.length > 0) {
                    forceCustomerInfo().then(() => {
                        orderService.freezeCurrentShoppingCartAsync().then((ret) => { }).catch((err) => { }).then(() => {
                            enablePrint();
                            hideLoading();
                        });
                    }, (err) => {
                        enablePrint();
                        hideLoading();
                    });
                } else {
                    swal({
                        title: "Le ticket doit contenir au moins un produit !"
                    });
                    enablePrint();
                    hideLoading();
                }
            }
        }
    };

    const showLoading = () => {
        $rootScope.printingInProgress = true;
        loadingInterval = $interval(() => {
            $scope.mbLoadingTimer++;
        }, 1000);
    };

    $scope.hideLoading = () => {
        hideLoading();
        enablePrint();
    };

    const hideLoading = () => {
        if (loadingInterval) {
            $interval.cancel(loadingInterval);
            $scope.mbLoadingTimer = 0;
        }
        $rootScope.printingInProgress = false;
    };

    const disablePrint = () => {
        $scope.printProdDisabled = true;
    };

    const enablePrint = () => {
        $scope.printProdDisabled = false;
    };

    const forceCutleries = () => {
        let cutleriesDefer = $q.defer();
        if ($rootScope.UserPreset && $rootScope.UserPreset.ForceOnCreateTicket && $rootScope.UserPreset.ForceOnCreateTicket.Cutleries) {
            const modalInstance = $uibModal.open({
                templateUrl: 'modals/modalCutleries.html',
                controller: 'ModalCutleriesController',
                size: 'sm',
                resolve: {
                    initCutleries: () => {
                        return $rootScope.currentShoppingCart.TableCutleries;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then((nbCutleries) => {
                posService.setTableCutleries(nbCutleries);
                cutleriesDefer.resolve();
            }, () => {
                console.log('Erreur');
                cutleriesDefer.reject();
            });
        } else {
            cutleriesDefer.resolve();
        }
        return cutleriesDefer.promise;
    };

    const forceCustomerInfo = () => {
        let customerInfoDefer = $q.defer();
        if ($rootScope.UserPreset && $rootScope.UserPreset.ForceOnCreateTicket && $rootScope.UserPreset.ForceOnCreateTicket.CustomerInfo &&
            !$rootScope.currentShoppingCart.customerLoyalty && !$rootScope.currentShoppingCart.customerInfo) {
            const modalInstance = $uibModal.open({
                templateUrl: 'modals/modalCustomerInfo.html',
                controller: 'ModalCustomerInfoController',
                size: 'sm',
                backdrop: 'static'
            });

            modalInstance.result.then((customerFirstName) => {
                if (!$rootScope.currentShoppingCart.customerInfo) {
                    $rootScope.currentShoppingCart.customerInfo = {};
                }
                $rootScope.currentShoppingCart.customerInfo.FirstName = customerFirstName;
                customerInfoDefer.resolve();
            }, () => {
                console.log('Erreur');
                customerInfoDefer.reject();
            });
        } else {
            customerInfoDefer.resolve();
        }
        return customerInfoDefer.promise;
    };

    $scope.validShoppingCart = (ignorePrintTicket) => {
        if (ignorePrintTicket || $rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            if ($rootScope.currentShoppingCart) {
                stockService.checkStockBufferAsync().then(() => {
                    // The Delivery Choice Modal and the Cutleries Model are not shown when we cancel a stored Ticket (From the ticket List)
                    if ($rootScope.currentShoppingCart && ($rootScope.currentShoppingCart.ParentTicket || $rootScope.currentShoppingCart.IsAccountConsignorPayment)) {
                        paymentService.validShoppingCart(ignorePrintTicket);
                    } else {
                        forceCutleries().then(() => {
                            if ($rootScope.IziBoxConfiguration.ForceDeliveryChoice) {
                                deliveryService.openModalDelivery(ignorePrintTicket);
                            } else {
                                paymentService.validShoppingCart(ignorePrintTicket);
                            }
                        });
                    }
                }, (msg) => {
                    swal({
                        title: "Oops",
                        text: msg
                    });
                    $rootScope.hideLoading();
                });
            }
        }
    };

    $scope.confirmBorneOrder = () => {
        const pickPayment = () => {
            const pickPaymentModal = $uibModal.open({
                templateUrl: 'modals/modalPickPaymentMode.html',
                controller: 'ModalPickPaymentModeController',
                backdrop: 'static',
                windowClass: 'mainModals',
                resolve: {
                    pmAvailable: () => {
                        return $rootScope.paymentModesAvailable;
                    }
                }
            });
            pickPaymentModal.result.then((toPos) => {
                if (toPos) {
                    paymentService.validBorneOrder();
                }
            });
        };

        if (!$rootScope.borneValidationLocked && $scope.currentShoppingCart.Items.length >= 0) {
            stockService.checkStockBufferAsync().then(() => {
                let borneCollectionEnabled = $rootScope.borne && $rootScope.currentShoppingCart.DeliveryType === DeliveryType.FORHERE && $rootScope.borneForHereCollection
                    || $rootScope.borne && $rootScope.currentShoppingCart.DeliveryType === DeliveryType.TAKEOUT && $rootScope.borneTakeawayCollection;
                if ($rootScope.currentShoppingCart.Items.length > 0) {
                    if ($rootScope.productRecap) {
                        const recapModal = $uibModal.open({
                            templateUrl: 'modals/modalProductRecapBorne.html',
                            controller: 'ModalProductRecapBorneController',
                            backdrop: 'static',
                            windowClass: 'mainModals',
                            resolve: {
                                shoppingCart: () => {
                                    return $rootScope.currentShoppingCart;
                                }
                            }
                        });
                        recapModal.result.then(() => {
                            // Apres le productRecap

                            if (borneCollectionEnabled) {
                                const tableModal = $uibModal.open({
                                    templateUrl: 'modals/modalBipperBorne.html',
                                    controller: 'ModalBipperBorneController',
                                    backdrop: 'static',
                                    windowClass: 'mainModals',
                                    resolve: {
                                        shoppingCart: () => {
                                            return $rootScope.currentShoppingCart;
                                        }
                                    }
                                });
                                tableModal.result.then(() => {
                                    pickPayment();
                                });
                            } else {
                                pickPayment();
                            }
                        }, () => {
                            console.log('Cancel');
                        });
                    } else {
                        if (borneCollectionEnabled) {
                            const tableModal = $uibModal.open({
                                templateUrl: 'modals/modalBipperBorne.html',
                                controller: 'ModalBipperBorneController',
                                backdrop: 'static',
                                windowClass: 'mainModals',
                                resolve: {
                                    shoppingCart: () => {
                                        return $rootScope.currentShoppingCart;
                                    }
                                }
                            });
                            tableModal.result.then(() => {
                                pickPayment();
                            });
                        } else {
                            pickPayment();
                        }
                    }
                }
            }, (msg) => {
                swal({
                    title: "Oops",
                    text: msg
                });
                $rootScope.hideLoading();
            });
        }
    };

    $scope.openCustomActionModal = () => {
        loyaltyService.openCustomActionModal();
    };

    $scope.printProdShoppingCart = () => {
        if ($rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items && $rootScope.currentShoppingCart.Items.length > 0 && !$scope.printProdDisabled) {
                enablePrint();
                printService.printProdShoppingCartAsync().then(() => {
                    //Enable
                    setTimeout(() => {
                        enablePrint();
                        $scope.$evalAsync();
                    }, 700);
                }, () => {
                    //Enable
                    setTimeout(() => {
                        enablePrint();
                        $scope.$evalAsync();
                    }, 700);
                });
                // Desactiver le bouton Print Prod (bleu) tant que la promesse n'a pas timeout / n'est pas resolu
            }
        }
    };

    $scope.printStepProdShoppingCart = () => {
        if ($rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items.length > 0 && !$scope.printStepProdDisabled) {
                //Disable button prind prod step
                $scope.printStepProdDisabled = true;
                printService.printStepProdCurrentShoppingCartAsync().then(() => {
                    //Enable
                    setTimeout(() => {
                        $scope.printStepProdDisabled = false;
                        $scope.$evalAsync();
                    }, 700);
                }, () => {
                    //Enable
                    setTimeout(() => {
                        $scope.printStepProdDisabled = false;
                        $scope.$evalAsync();
                    }, 700);
                });
            }
        }
    };

    $scope.cancelShoppingCart = () => {
        if ($rootScope.currentShoppingCart) {
            if (!$rootScope.currentShoppingCart.isPayed) {
                $rootScope.isCustomerLog = false;
                if (!$rootScope.currentShoppingCart.ParentTicket && !$rootScope.currentShoppingCart.IsLoss && !$rootScope.currentShoppingCart.IsEmployeeMeal &&
                    !$rootScope.currentShoppingCart.IsAccountConsignorPayment) {
                    if ($rootScope.borne || posUserService.isEnable('DELT')) {
                        const errMess = $scope.shoppingCartQueue && $scope.shoppingCartQueue.length > 0 ? "Vous allez supprimer toutes les parts d'un ticket partagé" : "";
                        const title = $rootScope.borne ? "Abandonner la commande ?" : "Supprimer le ticket ?";

                        swal({
                            title: $translate.instant(title),
                            text: errMess,
                            buttons: [$translate.instant("Non"), $translate.instant("Oui")],
                            dangerMode: true
                        }).then((confirm) => {
                            if (confirm) {
                                $scope.shoppingCartQueue = [];
                                shoppingCartService.cancelShoppingCartAndSend();
                                productService.resetCurrentItems();
                                if ($rootScope.borne) {
                                    borneService.redirectToHome();
                                }
                            }
                        });
                    } else {
                        swal({
                            title: $translate.instant("Vous n'avez pas les droits nécessaires.")
                        });
                    }
                } else {
                    $rootScope.clearShoppingCart();
                }
            }
        }
    };
    //#endregion

    //#region Discount
    $scope.removeShoppingCartDiscount = (item) => {
        discountService.removeShoppingCartDiscount(item);
    };
    //#endregion

    //#region FID
    $scope.openClientModal = (selectedTab) => {
        if ($rootScope.Logged) {
            $uibModal.open({
                templateUrl: 'modals/modalCustomer.html',
                controller: 'ModalCustomerController',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    selectedTab: () => {
                        return selectedTab;
                    }
                }
            });
        } else {         
            if(!$rootScope.borne && $rootScope.IziBoxConfiguration.UseFid) {
                swal({
                    title: "Erreur d'authentification !",
                    text: "Veuillez contacter le support"
                });
            }
        }
    };

    $scope.chooseRelevantOffer = () => {
        discountService.chooseRelevantOffer();
    };

    const checkForBirthday = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty && $rootScope.currentShoppingCart.customerLoyalty.CustomerDateOfBirth) {
            const arrDoB = $rootScope.currentShoppingCart.customerLoyalty.CustomerDateOfBirth.split('T')[0].split('-');

            if (new Date().getMonth() + 1 === parseInt(arrDoB[1]) && new Date().getDate() === parseInt(arrDoB[2])) {
                if ($rootScope.borne) {
                    swal({
                        title: $translate.instant("Joyeux anniversaire") + " " + $rootScope.currentShoppingCart.customerLoyalty.CustomerFirstName + " ! ",
                        text: $translate.instant("Utilisez votre offre anniversaire !"),
                        buttons: [false, $translate.instant("Ok")],
                        dangerMode: true,
                        icon: 'img/icons/cake.svg'
                    });
                } else {
                    swal({
                        title: $translate.instant("C'est l'anniversaire de ") + " " + $rootScope.currentShoppingCart.customerLoyalty.CustomerFirstName + " " + $rootScope.currentShoppingCart.customerLoyalty.CustomerLastName + "!"
                    });
                }
            }
        }
    };

    //#endregion

    //#region Misc
    $scope.selectLine = (item) => {
        $scope.viewmodel.selectedLine === item ? $scope.viewmodel.selectedLine = undefined : $scope.viewmodel.selectedLine = item;
        $scope.$evalAsync();

        setTimeout(() => {
            scrollToItem(item);
        });
    };

    //Refresh the miniBasket
    $rootScope.resizeMiniBasket = () => {
        const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        if (width >= 800 && !$rootScope.showShoppingCart) {
            $rootScope.showShoppingCart = true;
        }
    };
    //#endregion

    $scope.selectTable = () => {
        if ($rootScope.modelPos.iziboxConnected && $rootScope.modelPos.iziboxStatus.LocalDb /*&& $rootScope.modelPos.iziboxStatus.DistantDb*/) {
            if (!$rootScope.borne) {
                showLoading();
                deliveryService.selectTableNumberAsync().then(() => {
                    hideLoading();
                }, () => {
                    hideLoading();
                });
            }
        }
    };

    $scope.selectBipper = () => {
        if (!$rootScope.borne) {
            showLoading();

            const modalInstance = $uibModal.open({
                templateUrl: 'modals/modalBipper.html',
                controller: 'ModalBipperController',
                size: 'sm',
                backdrop: 'static'
            });

            modalInstance.result.then((selectedBipper) => {
                if (!$rootScope.currentShoppingCart) {
                    $rootScope.createShoppingCart();
                }
                $rootScope.currentShoppingCart.BipperNumber = selectedBipper;
                hideLoading();
            }, () => {
                hideLoading();
            });
        }
    };

    $scope.isMenuDisable = (item) => {
        const ret = item.Attributes && item.Attributes.some(attr => attr.Printed) || item.IsFree || !item.Product.ProductAttributes || item.Product.ProductAttributes && item.Product.ProductAttributes.length === 0;
        return ret;
    };

    const getNbItems = () => {
        $scope.nbItems = roundValue(shoppingCartService.getNbItems());
    };

    /** Clear the loyalty info linked to the ticket */
    $scope.removeLoyaltyInfo = () => {
        // Il faut suppr les paymentModesAvailable lié a la fid
        // Et le paymentMode en compte
        console.log($rootScope.paymentModesAvailable);

        $rootScope.paymentModesAvailable = $rootScope.paymentModesAvailable.filter((pma) => {
            return !pma.IsBalance && pma.PaymentType !== PaymentType.FIDELITE && pma.PaymentType !== PaymentType.ENCOMPTE;
        });

        $scope.$evalAsync();
        $rootScope.resizeMiniBasket();
        delete $rootScope.currentShoppingCart.customerLoyalty;
        delete $rootScope.currentShoppingCart.customerInfo;
        delete $rootScope.currentShoppingCart.customerAccountConsignor;
        $rootScope.currentShoppingCart.Barcode = undefined;
        $rootScope.currentShoppingCart.BalanceUpdate = undefined;
        if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
            $rootScope.currentShoppingCart.PaymentModes = $rootScope.currentShoppingCart.PaymentModes.filter((pma) => {
                return !pma.IsBalance && pma.PaymentType !== PaymentType.FIDELITE;
            });
        }

        // Deleted Offer
        $rootScope.currentShoppingCart.Offer = undefined;
        $rootScope.currentShoppingCart.Items = $rootScope.currentShoppingCart.Items.filter((item) => {
            return !item.Offer;
        });

        // Remove Customer Auto Discount
        if ($rootScope.currentShoppingCart.Discounts) {
            let discountToRemove = $rootScope.currentShoppingCart.Discounts.find(d => d.IsLimitedToThisCustomer);
            if (discountToRemove) {
                discountService.removeShoppingCartDiscount(discountToRemove);
            }
        }
        $rootScope.$emit("customerLoyaltyChanged", $rootScope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);

        if ($rootScope.borne) {
            $rootScope.clearShoppingCart();
            borneService.redirectToHome();
        }
    };

    $scope.getTRPayable = () => {
        let total = 0;
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items) {
            for (let item of $rootScope.currentShoppingCart.Items) {
                if (!item.Product.DisableTR) {
                    total += item.PriceIT;
                }
            }
        }
        return total;
    };

    $scope.checkPaymentModes = (paymentMode) => {
        if ($scope.currentShoppingCart && $scope.currentShoppingCart.Residue >= 0 || paymentMode.PaymentType === PaymentType.ESPECE) {
            if (paymentMode.PaymentType === PaymentType.FIDELITE) {
                if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty
                    && $scope.currentShoppingCart.customerLoyalty.Balances && $scope.currentShoppingCart.customerLoyalty.Balances.length > 0) {
                    for (let balance of $scope.currentShoppingCart.customerLoyalty.Balances) {
                        if (balance.Value > 0) {
                            return true;
                        }
                    }
                }
            } else {
                return true;
            }
        }
        return false;
    }
});
