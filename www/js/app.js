let app = angular.module('app', [
    'ui.router',
    'ngMaterial',
    'ui.bootstrap',
    'ngSanitize',
    'toggle-switch',
    'kendo.directives',
    'ngIdle',
    'ngKeypad',
    'ngDraggable',
    'angular-md5',
    'ngToast',
    'pascalprecht.translate',
    'md.data.table',
    'frapontillo.gage',
    'angularLazyImg',
    'angularUUID2',
    'ui.select',
    'angular-websocket'
]);
let controllerProvider = null;
let $routeProviderReference = null;
let angularLocation = null;

$(() => {
    FastClick.attach(document.body);
});

app.config(($stateProvider, $urlRouterProvider, ngToastProvider, $httpProvider, $sceDelegateProvider, $controllerProvider, lazyImgConfigProvider) => {
    controllerProvider = $controllerProvider;
    $routeProviderReference = $stateProvider;
    $sceDelegateProvider.resourceUrlWhitelist(['**']);

    lazyImgConfigProvider.setOptions({
        offset: 0, // how early you want to load image (default = 100)
        errorClass: 'imgError',
        successClass: 'imgLoaded checkered'
    });

    $urlRouterProvider
        .otherwise('/');
    ngToastProvider.configure({
        verticalPosition: 'bottom',
        horizontalPosition: 'left',
        animation: 'slide' // or 'fade'
    });



    // Auth interceptor
    $httpProvider.interceptors.push(($q, $injector) => {
        return {
            request: (config) => {
                const authService = $injector.get('authService')
                if (authService && authService.getToken()) {
                    config.headers['Authorization'] = 'bearer ' + authService.getToken().access_token;
                }
                return $q.when(config);
            }
        };
    });
});

app.run(function ($rootScope, $location, $q, $interval, $http, $translate, $uibModal, $timeout, $state, ipService, orderService, posPeriodService, posService, taxesService, stockService, paymentService, loyaltyService, productService) {
    try {
        angularLocation = $location;
        $rootScope.Version = "4.4.11162";
        $rootScope.adminMode = {
            state: false
        };
        $rootScope.loading = 0;
        $rootScope.loadingTimer = 0;

        $rootScope.modelPos = {
            posNumber: 1,
            isPosOpen: false,
            hardwareId: undefined,
            iziboxConnected: false,
            RKCounter: 0,
            categoryLoading: false
        };

        let loadingInterval = null;

        $rootScope.stringifyStoreInfos = (shoppingCart) => {
            // Si pas de shoppingcart, on fallback sur le current
            if (!shoppingCart) {
                if ($rootScope.currentShoppingCart) {
                    shoppingCart = $rootScope.currentShoppingCart;
                } else {
                    // Si pas de current, on break
                    return;
                }
            }

            if (shoppingCart && shoppingCart.Items && shoppingCart.Items.length > 0) {
                shoppingCart.Items.forEach((item) => {
                    // On stringify le store info pour stockage
                    if (item.Product.StoreInfos && typeof item.Product.StoreInfos === "object") {
                        item.Product.StoreInfos = JSON.stringify(item.Product.StoreInfos);
                    }

                    // On stringify aussi le store info dans les linkedproduct du ProductAttributes
                    if (item.Product.ProductAttributes && item.Product.ProductAttributes.length > 0) {
                        item.Product.ProductAttributes.forEach((pa) => {
                            if (pa.ProductAttributeValues && pa.ProductAttributeValues.length > 0) {
                                pa.ProductAttributeValues.forEach((pav) => {
                                    if (pav.LinkedProduct) {
                                        if (pav.LinkedProduct.StoreInfos && typeof pav.LinkedProduct.StoreInfos === "object") {
                                            pav.LinkedProduct.StoreInfos = JSON.stringify(pav.LinkedProduct.StoreInfos);
                                        }

                                        if (pav.LinkedProduct.ProductAttributes) {
                                            delete pav.LinkedProduct.ProductAttributes;
                                        }
                                    }

                                })
                            }
                        })
                    }
                });
            }
        };

        // Creates an empty ticket
        $rootScope.createShoppingCart = (isLoss = false, isEmployeeMeal = false, ParentTicket = null) => {
            if (!$rootScope.currentShoppingCart) {
                let newSC;

                const timestamp = new Date().getTime();
                newSC = new ShoppingCart();
                newSC.dailyTicketId = null;
                newSC.TableNumber = null;
                newSC.TableId = null;
                newSC.Items = [];
                newSC.Discounts = [];
                newSC.Timestamp = timestamp;
                newSC.id = timestamp;
                newSC.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                newSC.HardwareId = $rootScope.modelPos.hardwareId;
                newSC.PosUserId = $rootScope.PosUserId;
                newSC.PosUserName = $rootScope.PosUserName;
                newSC.DeliveryType = $rootScope.currentDeliveryType;
                newSC.CurrentStep = 0;

                // NOTE : En mode multistore, le storeID au niveau du ticket est le Store principal du tenant
                newSC.StoreId = $rootScope.IziBoxConfiguration.StoreId;

                newSC.CompanyInformation = $rootScope.cacheCompanyInfo;
                newSC.addCreditToBalance = false;
                newSC.PosVersion = $rootScope.Version;
                newSC.shoppingCartQueue = [];
                newSC.StageHistory = {};
                newSC.FromBorne = $rootScope.borne;

                newSC.ParentTicket = ParentTicket;
                newSC.isLoss = isLoss;
                newSC.isEmployeeMeal = isEmployeeMeal;

                $rootScope.currentShoppingCart = newSC;

                if (!isLoss && !isEmployeeMeal) {
                    if ($rootScope.UserPreset && $rootScope.UserPreset.DefaultDeliveryMode) {
                        if ($rootScope.currentDeliveryType !== $rootScope.UserPreset.DefaultDeliveryMode) {
                            $rootScope.currentDeliveryType = $rootScope.UserPreset.DefaultDeliveryMode;
                            if ($rootScope.currentShoppingCart) {
                                $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                            }
                            $rootScope.$emit('deliveryTypeChanged');
                        }
                    }
                } else {
                    $rootScope.currentDeliveryType = DeliveryType.FORHERE;
                    if ($rootScope.currentShoppingCart) {
                        $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                    }
                    $rootScope.$emit('deliveryTypeChanged');
                }

                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                const hdid = $rootScope.modelPos.hardwareId;

                //association period / shoppingCart
                posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {
                    //Associate period on validate
                }, () => {
                    if ($rootScope.modelPos.iziboxConnected) {
                        //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                        $rootScope.clearShoppingCart();
                    }
                });
                orderService.getUpdDailyTicketValueAsync(hdid, 1).then((cashRegisterTicketId) => {
                    $rootScope.currentShoppingCart.dailyTicketId = cashRegisterTicketId;
                }).then(() => {
                    //TODO ?? $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                });
            }
        };

        // Add a product to the cart
        // TODO : refactor
        $rootScope.addToCart = (product, forceinbasket, offer, isfree, formuleOfferte = false) => {
            let cartItem = null;

            // The product is payed
            if ($rootScope.currentShoppingCart && ($rootScope.currentShoppingCart.isPayed || $rootScope.currentShoppingCart.ParentTicket ||
                    $rootScope.currentShoppingCart.IsAccountConsignorPayment || $rootScope.printingInProgress)) {
                return;
            }
            if (!product.DisableBuyButton) { //Product is not available
                if (!isfree) {
                    isfree = false;
                }
                let qty = product.Quantity || 1;
                const b = parseInt($rootScope.currentBarcode.barcodeValue);
                if (b) {
                    // Hardcoded limit for the quantity
                    if (b > 0 && b <= 1000) {
                        qty = b;
                        $rootScope.currentBarcode.barcodeValue = "";
                    }
                }

                //Test for a product with attributes
                //POUR LES BURGERS / MENU
                if (!forceinbasket && product.ProductTemplate && product.ProductTemplate.ViewPath !== 'ProductTemplate.Simple') {
                    $rootScope.currentConfigurableProduct = product;
                    $rootScope.isConfigurableProductOffer = formuleOfferte;
                    if ($rootScope.borne) {
                        if (product.ProductTemplate.ViewPath === 'ProductTemplate.ConfigurableMenu') {
                            $state.go('catalogBorne.ProductTemplate.ConfigurableMenuList', {
                                id: product.Id,
                                offer: offer
                            });
                        } else {
                            $state.go('catalogBorne.' + product.ProductTemplate.ViewPath, {
                                id: product.Id,
                                offer: offer
                            });
                        }
                    } else {
                        $state.go('catalogPOS.' + product.ProductTemplate.ViewPath, {
                            id: product.Id,
                            offer: offer
                        });
                    }
                } else if (!forceinbasket && product.EmployeeTypePrice) { // Product with a posuser defined price
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalTypePrice.html',
                        controller: 'ModalTypePriceController',
                        size: 'sm',
                        resolve: {
                            currentPrice: () => {
                                return product.Price;
                            },
                            minPrice: () => {
                                return product.EmployeeTypePriceMin;
                            },
                            maxPrice: () => {
                                return product.EmployeeTypePriceMax;
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then((priceValue) => {
                        let newProduct = angular.copy(product);
                        newProduct.Price = priceValue;
                        $rootScope.addToCart(newProduct, true);
                    }, () => {});
                } else if (!forceinbasket && product.SaleUnit) { // Si c'est un produit en vente à la quantité
                    // On ouvre une modal qui invite a saisir la quantité
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalPickQuantity.html',
                        controller: 'ModalPickQuantityController',
                        size: 'sm',
                        resolve: {
                            product: () => {
                                return product;
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then((newQuantity) => {
                        let newProduct = angular.copy(product);
                        newProduct.Quantity = newQuantity;
                        $rootScope.addToCart(newProduct, true);
                    });
                } else {
                    $rootScope.createShoppingCart();

                    if (!offer && !isfree && (product.ProductTemplate && product.ProductTemplate.ViewPath === 'ProductTemplate.Simple')) {
                        cartItem = Enumerable.from($rootScope.currentShoppingCart.Items).firstOrDefault(x => !x.Comment && !x.Offer && !x.IsFree &&
                            x.Product.Id === product.Id && x.Step === $rootScope.currentShoppingCart.CurrentStep && x.DiscountET === 0);
                    }

                    // Produit formule
                    if (!cartItem || product.ProductTemplate && product.ProductTemplate.ViewPath !== 'ProductTemplate.Simple' || product.EmployeeTypePrice ||
                        product.ProductComments.length > 0 || !$rootScope.borne && $rootScope.UserPreset && !$rootScope.UserPreset.GroupProducts) {
                        cartItem = new ShoppingCartItem();
                        cartItem.ProductId = product.Id;
                        cartItem.Product = product;

                        let stockInBuffer = stockService.getBufferStockForProductId(product.Id);
                        if (product.ManageInventoryMethodId === 1) {
                            if (product.StockQuantity - stockInBuffer < qty) {
                                qty = product.StockQuantity - stockInBuffer;
                            }
                        }

                        if (product.ManageInventoryMethodId === 1) {
                            if (product.StockQuantity && qty <= product.StockQuantity - stockInBuffer) {
                                stockService.addToStockBuffer(cartItem, cartItem.Product.Id, qty);
                                paymentService.calculateTotal();
                            } else {
                                return false;
                            }
                        }

                        cartItem.Quantity = qty;

                        if (cartItem.stockQuantity === undefined && !cartItem.Product.SaleUnit) {
                            cartItem.stockQuantity = Number.isInteger(qty) ? qty : null;
                        }

                        // En mode multistore, il faut pouvoir recuperer le StoreId du produit qu'on ajoute
                        if ($rootScope.EnableMultiStore) {
                            cartItem.StoreId = product.StoreId;
                        }

                        if (typeof product.StoreInfos === "string") {
                            product.StoreInfos = JSON.parse(product.StoreInfos);
                        }

                        // if (product.StoreInfos) {
                        //     cartItem.Printer_Id = product.StoreInfos.Printer_Id;
                        // }

                        let currentStep = $rootScope.currentShoppingCart.CurrentStep || 0;
                        cartItem.Step = currentStep;
                        cartItem.IsFree = isfree;
                        const pStep = $rootScope.currentShoppingCart.Items.find(x => x.Step === currentStep && x.StepPrintCount && x.StepPrintCount > 0);

                        if (pStep) {
                            cartItem.StepPrintCount = pStep.StepPrintCount;
                        }
                        cartItem.TaxCategory = product.TaxCategory;
                        cartItem.TaxCategoryId = product.TaxCategory.TaxCategoryId;
                        cartItem.Offer = offer;


                        cartItem.position = $rootScope.currentShoppingCart.Items.length + 1;
                        cartItem.hashkey = objectHash(cartItem);

                        // Note : Ca sert a quoi ? On refait un calculateTotal plus bas !
                        //taxesService.calculateCartItemTotal($rootScope.currentShoppingCart, cartItem, $rootScope.currentShoppingCart.DeliveryType);

                        if ($rootScope.animProduct) {
                            productService.addAnimation(cartItem.Product.Id);
                        }

                        if (product.ProductAttributes && product.ProductAttributes.length > 0) {
                            console.log('Start create cart item :', Date.now());
                            const stepMainProduct = Enumerable.from(product.ProductAttributes).min(attr => attr.Step);
                            cartItem.Step = stepMainProduct ? stepMainProduct : cartItem.Step;
                            cartItem.Attributes = [];

                            for (let i = 0; i < product.ProductAttributes.length; i++) {
                                let attribute = product.ProductAttributes[i];

                                for (let j = 0; j < attribute.ProductAttributeValues.length; j++) {
                                    const value = attribute.ProductAttributeValues[j];

                                    if (value.Selected) {
                                        let elem = {
                                            ProductAttributeId: attribute.Id,
                                            ProductAttributeValueId: value.Id,
                                            PriceAdjustment: value.PriceAdjustment
                                        };

                                        if (value.LinkedProduct) {
                                            elem.Name = value.LinkedProduct.Name;
                                            elem.Comment = value.Comment;

                                            //elem.TaxDetails = value.LinkedProduct.TaxDetails

                                            if (value.LinkedProduct.StoreInfos) {
                                                // elem.Printer_Id = value.LinkedProduct.StoreInfos.Printer_Id;

                                                let storeId = $rootScope.IziBoxConfiguration.StoreId;
                                                if ($rootScope.EnableMultiStore && $rootScope.MainStoreId) {
                                                    storeId = $rootScope.MainStoreId;
                                                }

                                                let relevantStoreInfo = Enumerable.from(value.LinkedProduct.StoreInfos).firstOrDefault(lp => lp.StoreId == storeId);
                                                if (relevantStoreInfo) {
                                                    elem.TargetPrinters = relevantStoreInfo.TargetPrinters;
                                                }
                                            }
                                        } else {
                                            elem.Name = value.Name;
                                        }
                                        elem.Step = attribute.Step ? attribute.Step : 0;
                                        elem.hashkey = objectHash(elem);


                                        cartItem.Attributes.push(elem);
                                    }
                                }
                            }
                            console.log('End create cart item :', Date.now());
                        }

                        $rootScope.currentShoppingCart.ItemsChanged = true;
                        $rootScope.currentShoppingCart.Items.push(cartItem);

                        if (cartItem.Product.ProductComments && cartItem.Product.ProductComments.length > 0) {
                            productService.editComment(cartItem);
                        }

                    } else {
                        if (product.OrderMaximumQuantity && cartItem.Quantity + qty > product.OrderMaximumQuantity) {
                            swal({
                                title: `Vous avez atteint la quantité maximum (${product.OrderMaximumQuantity}) de ${product.Name} par commande !`,
                            });
                            return;
                        }


                        if (product.ManageInventoryMethodId === 1) {
                            if (product.StockQuantity && cartItem.Quantity + qty <= product.StockQuantity) {
                                cartItem.Quantity = cartItem.Quantity + qty;
                                if (cartItem.stockQuantity) {
                                    cartItem.stockQuantity = Number.isInteger(cartItem.stockQuantity + qty) ? cartItem.stockQuantity + qty : null;
                                }

                                stockService.addToStockBuffer(cartItem, cartItem.Product.Id, qty);
                                paymentService.calculateTotal();

                                console.log("Ajout d'un item : ", cartItem);
                                $rootScope.$emit("shoppingCartItemChanged", cartItem);
                            } else {
                                return false;
                            }
                            // Ou si on ne gere pas les stocks
                        } else {
                            cartItem.Quantity = cartItem.Quantity + qty;
                            if (cartItem.stockQuantity) {
                                cartItem.stockQuantity = Number.isInteger(cartItem.stockQuantity + qty) ? cartItem.stockQuantity + qty : null;
                            }
                            console.log("Ajout d'un item : ", cartItem);
                            $rootScope.$emit("shoppingCartItemChanged", cartItem);
                        }

                        if ($rootScope.animProduct) {
                            productService.addAnimation(cartItem.Product.Id);
                        }
                    }

                    // Note : Pourquoi un Timeout ici ?
                    //$timeout(() => {
                    paymentService.calculateTotal();
                    loyaltyService.calculateLoyalty();
                    if (!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }

                    //notify add
                    var newItem = {
                        ProductId: cartItem.ProductId,
                        Product: cartItem.Product,
                        Quantity: qty,
                        IsFree: cartItem.IsFree,
                        PriceIT: (cartItem.PriceIT / cartItem.Quantity) * qty,
                        DiscountIT: (cartItem.DiscountIT / cartItem.Quantity) * qty,
                        hashkey: cartItem.hashkey
                    }
                    $rootScope.$emit("shoppingCartItemAdded", newItem);
                    //});

                    if (!cartItem.IsFree) {
                        productService.tryApplyDiscountsCartItem(cartItem);
                    }

                    if (cartItem) {
                        cartItem.Printed = cartItem.PrintedQuantity === cartItem.Quantity;
                    }
                }

                productService.tryMatchItem(product);

                return cartItem;
            } else {
                swal({
                    title: "Ce produit est désactivé à l'achat.",
                    text: "Veuillez activer l'achat de ce produit sur votre Back Office et redémarrer vos caisses."
                });
            }
        };

        $rootScope.UpdateDeliverooPrepStage = (shoppingCart, prepStage, updateFreeze = true) => {
            const updateDefer = $q.defer();

            shoppingCart.ProductionStage = prepStage;

            if (!shoppingCart.StageHistory) {
                shoppingCart.StageHistory = {};
            }
            switch (shoppingCart.ProductionStage) {
                case ProductionStages.KITCHEN:
                    if (!shoppingCart.StageHistory.InKitchenAt)
                        shoppingCart.StageHistory.InKitchenAt = Date.now();
                    shoppingCart.StageHistory.ReadyAt = null;
                    shoppingCart.StageHistory.CollectedAt = null;
                    break;
                case ProductionStages.READY:
                    // Supprime du KDS
                    posService.setKdsOrderToDone(shoppingCart.Timestamp);
                    shoppingCart.StageHistory.ReadyAt = Date.now();
                    break;
                case ProductionStages.COLLECTED:
                    // Supprime du KDS
                    posService.deleteFromKds(shoppingCart.Timestamp);
                    shoppingCart.StageHistory.CollectedAt = Date.now();
                    break;
            }

            const url = $rootScope.APIBaseURL + "/UpdatePrepStage";
            $http.post(url, {
                ShoppingCartId: shoppingCart.OrderId || shoppingCart.Timestamp,
                PartnerOrderId: shoppingCart.PartnerOrderId,
                OccurredAt: moment.utc(Date.now(), 'x').format(),
                PrepStage: prepStage,
                Origin: shoppingCart.Origin,
                UpdateFreeze: updateFreeze
            }).then((res) => {
                console.log(res);
                if (shoppingCart.Origin === 1) {
                    $rootScope.remoteDbOrder.rel.del('ShoppingCart', shoppingCart).then((result) => {
                        console.log(result);
                        updateDefer.resolve();
                    }, (errDel) => {
                        console.error(errDel);
                        updateDefer.resolve();
                    });
                } else {
                    updateDefer.resolve();
                }


            }, (err) => {
                console.error(err);
                updateDefer.reject();
            });

            return updateDefer.promise;
        };

        $rootScope.clearShoppingCart = (clearBuffer = true) => {
            if ($rootScope.currentShoppingCart) {
                productService.currentPossibleMenus = [];
                //console.log($rootScope.UserPreset.DefaultDeliveryMode);
                if ($rootScope.UserPreset) {
                    // On set le delivery mode a la valeur par defaut,en passant le flag calculate = false, pour ne pas fausser les taxes
                    if ($rootScope.UserPreset.DefaultDeliveryMode) {
                        $rootScope.currentDeliveryType = $rootScope.UserPreset.DefaultDeliveryMode;
                        $rootScope.$emit('deliveryTypeChanged', false);
                    } else {
                        $rootScope.currentDeliveryType = DeliveryType.FORHERE;
                        $rootScope.$emit('deliveryTypeChanged', false);
                    }
                }
                $rootScope.currentShoppingCart = null;
                $rootScope.currentShoppingCartRight = null;
                $rootScope.currentShoppingCartLeft = null;
                $rootScope.$emit("shoppingCartCleared");
            }
            // deliveryType = 0;
            shoppingCartQueue = [];
            if (clearBuffer) {
                stockService.clearStockBuffer();
            }
            paymentService.updatePaymentModes();
        };

        $rootScope.showLoading = () => {
            $rootScope.loading++;
            $rootScope.$evalAsync();
            loadingInterval = $interval(() => {
                $rootScope.loadingTimer++;
            }, 1000);
        };
        $rootScope.hideLoading = () => {
            if (loadingInterval) {
                $interval.cancel(loadingInterval);
                $rootScope.loadingTimer = 0;
            }

            $rootScope.loading--;
            if ($rootScope.loading < 0) {
                $rootScope.loading = 0;
            }
            $rootScope.$evalAsync();
        };

        //
        $("#indexUtils").css("display", "block");

        $rootScope.PosUserId = -1;
        $rootScope.PosUserName = "";
        window.sessionStorage.clear();

        window.onerror = (errorMsg, url, lineNumber) => {
            console.error("Error occured: " + errorMsg); //or any message
            return false;
        };

        // Langage configuration
        let codeLng = window.localStorage.getItem("CurrentLanguage");

        if (codeLng) {
            $translate.use(codeLng);
        } else {
            $translate.use('fr_FR');
        }

        // Display configuration
        $rootScope.RatioConfiguration = {
            Enabled: true
        };

        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
            $rootScope.isBrowser = false;
            $rootScope.isWindowsContainer = false;

            let deviceInit = false;

            document.addEventListener("deviceready", () => {
                if (!deviceInit) {
                    deviceInit = true;
                    $rootScope.deviceReady = true;
                    init($rootScope, $location, $q, $http, ipService, $translate, $uibModal);
                }
            }, false);

            // Si le device n'est pas ready en 5s, on init quand même
            setTimeout(() => {
                if (!deviceInit) {
                    deviceInit = true;
                    init($rootScope, $location, $q, $http, ipService, $translate, $uibModal);
                }
            }, 5000);

            if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
                FastClick.attach(document.body);
            }
        } else if (navigator.userAgent.match(/(WPF)/)) {
            $rootScope.isBrowser = false;
            $rootScope.isWindowsContainer = true;
            init($rootScope, $location, $q, $http, ipService, $translate, $uibModal);

            initLineDisplay($rootScope);
        } else {
            $rootScope.isBrowser = true;
            $rootScope.isWindowsContainer = false;
            init($rootScope, $location, $q, $http, ipService, $translate, $uibModal); //this is the browser
        }

        if (navigator.platform == "Linux armv7l") {
            $rootScope.isOnIzibox = true;
        }

        if (window.printBorne) {
            posService.startSocketDaemon();
        }

        $rootScope.setLanguage = (codeLng) => {
            window.localStorage.setItem("CurrentLanguage", codeLng);
            $translate.use(codeLng);
        };


        $rootScope.$on("shoppingCartItemAdded", (event, cartItem) => {});


        $rootScope.setPMRmode = () => {
            $rootScope.isPMREnabled = !$rootScope.isPMREnabled;
        };
    } catch (exAll) {
        console.error(exAll);
        $rootScope.hideLoading();
    }
});

const initLineDisplay = ($rootScope) => {
    if (lineDisplay && lineDisplay.clearScreen) {
        lineDisplay.clearScreen();
    }

    $rootScope.$on("shoppingCartChanged", (event, shoppingCart) => {
        if (shoppingCart && shoppingCart.Total && lineDisplay && lineDisplay.writeTotal) {
            lineDisplay.writeTotal(roundValue(shoppingCart.Total).toFixed(2));
        }
    });

    $rootScope.$on("shoppingCartTotalChanged", (event, total) => {
        let param = roundValue(total).toFixed(2);
        if (lineDisplay && lineDisplay.writeTotal) {
            lineDisplay.writeTotal(param);
        }
    });

    $rootScope.$on("shoppingCartCleared", (event) => {
        if (lineDisplay && lineDisplay.clearScreen) {
            lineDisplay.clearScreen();
        }
    });


    const updateDisplay2 = (cartItem, modifier) => {
        let itemLinePrice = "";

        if (cartItem.IsFree) {
            itemLinePrice += "0.00";
        } else {
            itemLinePrice += roundValue(cartItem.PriceIT + cartItem.DiscountIT).toFixed(2);
        }

        if (lineDisplay && lineDisplay.writeItem) {
            lineDisplay.writeItem(modifier, cartItem.Quantity.toFixed(2), cartItem.Product.Name, itemLinePrice);
        }
    };

    $rootScope.$on("shoppingCartItemAdded", (event, cartItem) => {
        if (cartItem) updateDisplay2(cartItem, '+');
    });

    $rootScope.$on("shoppingCartItemChanged", (event, cartItem) => {
        if (cartItem) updateDisplay2(cartItem, '*');
    });

    $rootScope.$on("shoppingCartItemRemoved", (event, cartItem) => {
        if (cartItem) updateDisplay2(cartItem, '-');
    });
};

const initServices = ($rootScope, $injector) => {
    $rootScope.syncValidatePoolDb($rootScope);

    let zposService = $injector.get('zposService');
    zposService.init();

    let posService = $injector.get('posService');
    posService.createKeyboardEvents();

    posService.initRkCounterListener();

    let webSocketService = $injector.get('webSocketService');
    webSocketService.startWebSocket();

    let stockService = $injector.get('stockService');
    stockService.fetchBufferStock();

    // let posPeriodService = $injector.get('posPeriodService');
    // posPeriodService.initPeriodListener();
    //posPeriodService.startPeriodDaemon();

    let taxesService = $injector.get('taxesService');
    taxesService.initTaxCache();
};

const init = ($rootScope, $location, $q, $http, ipService, $translate, $uibModal) => {
    // IziBoxConfiguration
    app.getConfigIziBoxAsync($rootScope, $q, $http, $translate, $uibModal, ipService).then((config) => {
        if (config.IndexIsNotDefined) {
            $rootScope.IziBoxTempConfiguration = config;
            $location.path("/initizibox");
        } else {
            $rootScope.IziBoxConfiguration = config;
            if (config) {
                $rootScope.APIBaseURL = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort;
            }
            if ($rootScope.borne) {
                if ($rootScope.IziBoxConfiguration.StoreBorneId) {
                    $rootScope.IziBoxConfiguration.defaultStoreId = $rootScope.IziBoxConfiguration.StoreId;
                    console.log("StoreId changed : " + $rootScope.IziBoxConfiguration.StoreId + " => " + $rootScope.IziBoxConfiguration.StoreBorneId);
                    $rootScope.IziBoxConfiguration.StoreId = $rootScope.IziBoxConfiguration.StoreBorneId;
                }
            }
            // $rootScope.IziBoxConfiguration.LoginRequired = false;

            // Convert settings from 'string' to 'boolean'
            for (let prop in config) {
                if (config[prop] === "true") {
                    config[prop] = true;
                }

                if (config[prop] === "false") {
                    config[prop] = false;
                }
            }

            // BackButton
            app.configHWButtons($rootScope, $translate);
        }
    });

    //Use for displaying the wpf keyboard on windows system
    $rootScope.showWPFKeyboard = (openCordovaKeyboard) => {
        if ($rootScope.isWindowsContainer) {
            try {
                wpfKeyboard.showKeyboard();
            } catch (err) {}
        }

        if (!openCordovaKeyboard) {
            try {
                cordova.plugins.Keyboard.show();
            } catch (err) {}
        }

        $rootScope.keyboardVisible = true;
    };

    $rootScope.hideWPFKeyboard = () => {
        if ($rootScope.isWindowsContainer) {
            try {
                wpfKeyboard.hideKeyboard();
            } catch (err) {}
        }

        try {
            cordova.plugins.Keyboard.close();
        } catch (err) {}

        $rootScope.keyboardVisible = false;
    };
    $location.path("/");
};

app.configHWButtons = function ($rootScope, $translate) {
    document.addEventListener("backbutton", () => {
        if ($rootScope.tryExit) {
            try {
                navigator.app.exitApp();
            } catch (err) {
                swal({
                    title: "EXIT"
                });
            }
        } else {
            $rootScope.tryExit = true;
            try {
                window.plugins.toast.showLongBottom($translate.instant("Appuyez une autre fois pour quitter"));
            } catch (err) {
                swal({
                    title: $translate.instant("Appuyez une autre fois pour quitter")
                });
            }
            setTimeout(() => {
                $rootScope.tryExit = false;
            }, 3000);
        }
    }, false);
};

// #region StackTrace
app.factory('$exceptionHandler', ($injector) => {
    return (exception, cause) => {
        console.error(exception, cause);
        const $rootScope = $injector.get("$rootScope");
        const $http = $injector.get("$http");
        let logUrl = $rootScope.APIBaseURL + "/log";

        let log = {
            Alias: $rootScope.modelPos.aliasCaisse,
            Type: $rootScope.borne ? "Borne" : "Caisse",
            Platform: $rootScope.isBrowser ? "Browser" : ($rootScope.isWindowsContainer ? "Windows" : "Mobile"),
            HardwareId: $rootScope.modelPos.hardwareId,
            Version: $rootScope.Version,
            Message: exception.stack,
        };

        $http.post(logUrl, log);
    };
});

window.onerror = (msg, url, lineNo, columnNo, error) => {
    console.error("Error occured: " + msg);
    return false;
};
// #endregion