app.service('posService', function ($rootScope, $q, $http, $translate, posUserService, stockService, taxesService) {
    const self = this;

    //Get Pos Name Infos
    this.getPosNameAsync = function (hardwareId) {
        var posDefer = $q.defer();

        $rootScope.dbInstance.rel.find('Pos').then(function (allPoss) {
            var posName = undefined;
            Enumerable.from(allPoss.Pos).forEach(function (ps) {
                if (ps.HardwareId === hardwareId) {
                    posName = ps.DefindedName;
                }
            });

            posDefer.resolve(posName);
        }, function (err) {
            posDefer.reject(err);
        });

        return posDefer.promise;
    };
    //Get Pos Infos
    this.getPosAsync = function (hardwareId) {
        var posDefer = $q.defer();

        $rootScope.dbInstance.rel.find('Pos').then(function (allPoss) {
            var pos = {};
            Enumerable.from(allPoss.Pos).forEach(function (ps) {
                if (ps.HardwareId == hardwareId) {
                    pos = ps;
                }
            });

            posDefer.resolve(pos);
        }, function (err) {
            posDefer.reject(err);
        });

        return posDefer.promise;
    };

    //Get all Pos Infos
    this.getAllPosAsync = function () {
        var posDefer = $q.defer();

        $rootScope.dbInstance.rel.find('Pos').then(function (allPoss) {
            posDefer.resolve(allPoss.Pos);
        }, function (err) {
            posDefer.reject(err);
        });

        return posDefer.promise;
    };

    this.startSocketDaemon = function () {
        if (window.printBorne) { //MonoPlugin
            const processDefer = $q.defer();
            const printPromise = new Promise(function (resolve, reject) {
                window.printBorne.initPrintUSB(resolve, reject);
            });

            printPromise.then((data) => {
                console.log(data);
                processDefer.resolve();
            }, (err) => {
                processDefer.reject(err);
            });
            // window.printBorne.initPrintUSB();
        }
    };

    this.initRkCounterListener = function () {
        $rootScope.$on('iziboxConnected', function (event, args) {
            self.getTotalRkCounterValueAsync().then(function (totalRk) {
                $rootScope.modelPos.rkCounter = totalRk;
            });
        });

        $rootScope.$on('dbFreezeChange', function (event, args) {
            self.getTotalRkCounterValueAsync().then(function (totalRk) {
                $rootScope.modelPos.rkCounter = totalRk;
            });
        });
    };

    this.getTotalRkCounterValueAsync = function () {
        const retDefer = $q.defer();

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        $http.get(urlFreezeApi + "/rkcounters").then(function (res) {
            var totalRkCounter = 0;

            Enumerable.from(res.data).forEach(function (rkCounter) {
                totalRkCounter += rkCounter.count;
            });

            retDefer.resolve(totalRkCounter);
        }, function (errGet) {
            retDefer.reject(errGet);
        });

        return retDefer.promise;
    };

    this.createKeyboardEvents = () => {
        if (!$rootScope.eventAttached) {
            // This functions traps the physical keyboard interaction in
            // By default it is enabled
            //Keypress and Keydown handle different character but we have
            let trapkeypress = (e) => {
                //How to tell if a uibModal is opened
                //https://github.com/angular-ui/bootstrap/tree/master/src/modal/docs
                let isModal = $("body").hasClass("modal-open");
                lastEvent = e;
                $rootScope.$emit(Keypad.KEY_PRESSED, String.fromCharCode(e.keyCode));
            };

            const trapkeydown = (e) => {
                //How to tell if a uibModal is opened
                //https://github.com/angular-ui/bootstrap/tree/master/src/modal/docs
                let isModal = $("body").hasClass("modal-open");
                if (e.keyCode === 13) { //enter
                    $rootScope.$emit(Keypad.MODIFIER_KEY_PRESSED, "NEXT");
                    e.preventDefault();
                    e.stopPropagation();
                }
                if (e.keyCode === 8) { //backspace
                    $rootScope.$emit(Keypad.MODIFIER_KEY_PRESSED, "CLEAR");
                    e.preventDefault();
                    e.stopPropagation();
                }
            };

            window.addEventListener("keypress", trapkeypress);
            window.addEventListener("keydown", trapkeydown);
        }

        $rootScope.eventAttached = true;
    };

    this.openDrawer = () => {
        // TODO : Log this event
        if (posUserService.isEnable('ODRAW')) {
            let configApiUrl = $rootScope.APIBaseURL + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, {
                timeout: 10000
            });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    this.setTableCutleries = (nb) => {
        $rootScope.currentShoppingCart.TableCutleries = nb;
    };

    //Delete a ticket in the freeze
    this.unfreezeShoppingCartAsync = (shoppingCart) => {
        let unfreezeDefer = $q.defer();

        const unfreezeShoppingCart = () => {
            let urlFreezeApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/freeze";

            let lastStep = Math.max(...shoppingCart.Items.map(i => i.Step));

            if (lastStep)
                shoppingCart.CurrentStep = lastStep;

            // RK : Appeller la fonction de décrément d'enfant dans le parc
            self.RKDecrement(shoppingCart);

            //if (shoppingCart.Origin === ShoppingCartOrigins.FREEZE) {
            let unfreezeRequest = {
                ShoppingCartId: shoppingCart.id || shoppingCart.OrderId || shoppingCart.Timestamp,
                HardwareId: $rootScope.modelPos.hardwareId,
            };

            $http.post(urlFreezeApi + "/unfreezeShoppingCart", unfreezeRequest).then((unfreezed) => {
                // Reaffecte le HardwareId
                unfreezed.HardwareIdCreation = unfreezed.HardwareId;
                unfreezed.HardwareId = $rootScope.modelPos.hardwareId;
                if (unfreezed.CurrentStep) {
                    unfreezed.CurrentStep = 0;
                }

                if ($rootScope.modelPos && $rootScope.modelPos.aliasCaisse) {
                    unfreezed.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                }

                stockService.moveStockBuffer("FRZ_" + unfreezed.Timestamp, "HID_" + $rootScope.modelPos.hardwareId).then(() => {
                    getShoppingCartTaxCategoryAsync(unfreezed.data).then((sc) => {
                        //$rootScope.$emit("dbFreezeReplicate");
                        unfreezeDefer.resolve(sc);
                    }, (err) => {
                        unfreezeDefer.reject("Failed to fetch tax category : " + err);
                    });
                }, (err) => {
                    unfreezeDefer.reject("Failed to move stock buffer : " + err);
                });
            });
        };

        if (shoppingCart.FreezeLockedBy && shoppingCart.FreezeLockedBy !== $rootScope.modelPos.hardwareId) {
            swal({
                title: $translate.instant("Ce ticket est verrouillé par une autre caisse ! "),
                text: $translate.instant("Récuperer ce ticket risque d'engendrer des problèmes de synchronisation, ou de perte de ticket."),
                buttons: [$translate.instant("Annuler"), $translate.instant("Continuer quand même")],
                dangerMode: true,
                icon: "warning"
            }).then((confirm) => {
                if (confirm) {
                    unfreezeShoppingCart();
                } else {
                    unfreezeDefer.reject("User declined");
                }
            });
        } else {
            unfreezeShoppingCart();
        }
        return unfreezeDefer.promise;
    };

    this.setKdsOrderToDone = (shoppingCartId) => {
        if ($rootScope.IziBoxConfiguration.EnableKDS) {
            const kdsApiUrl = $rootScope.APIBaseURL + "/setKdsOrderToDone?id=" + shoppingCartId;

            $http.get(kdsApiUrl).then((ret) => { }, (err) => { });
        }
    };

    this.deleteFromKds = (shoppingCartId) => {
        if ($rootScope.IziBoxConfiguration.EnableKDS) {
            const kdsApiUrl = $rootScope.APIBaseURL + "/deleteFromKds?id=" + shoppingCartId;

            $http.get(kdsApiUrl).then((ret) => { }, (err) => { });
        }
    };

    this.sendToKds = (req, defer) => {
        if (!defer)
            defer = $q.defer();
        if ($rootScope.IziBoxConfiguration.EnableKDS) {
            const kdsApiUrl = $rootScope.APIBaseURL + "/sendtokds";

            $rootScope.stringifyStoreInfos(req.ShoppingCart);

            $http.post(kdsApiUrl, req).then((ret) => {
                defer.resolve(req);
            }, (err) => {
                defer.reject(err);
            });
        } else {
            defer.reject("Kds not enabled");
        }
        return defer.promise;
    };

    this.getFreezeShoppingCartsAsync = () => {
        let freezeDefer = $q.defer();
        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        // Look for order in the couchDb
        $http.get(urlFreezeApi + "/shoppingcarts?lite=true").then((freezeSp) => {
            // Recupere les shopping cart du freeze

            freezeSp.data.map(s => {
                if (!s.Origin) s.Origin = ShoppingCartOrigins.FREEZE;
            });

            freezeDefer.resolve(treatShoppingCarts(freezeSp.data));
        }, (err) => {
            freezeDefer.reject(err);
        });
        return freezeDefer.promise;
    };

    this.getOrderShoppingCartsAsync = () => {
        let ordersDefer = $q.defer();
        //let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        // Look for order in the couchDb
        $rootScope.remoteDbOrder.rel.find('ShoppingCart').then((ordersSp) => {
            // Recupere les shopping cart du freeze

            ordersSp.ShoppingCarts.map(s => {
                if (!s.Origin) {
                    s.Origin = ShoppingCartOrigins.WEB;
                }
                if (s.PartnerOrderId) {
                    s.PartnerOrderId = s.PartnerOrderId.split("-")[0];
                }
            });

            ordersDefer.resolve(treatShoppingCarts(ordersSp.ShoppingCarts));
        }, (err) => {
            ordersDefer.reject(err);
        });
        return ordersDefer.promise;
    };

    const treatShoppingCarts = (shoppingCarts) => {
        let shoppingCartsToRemove = [];

        shoppingCarts.forEach((s) => {
            if (!shoppingCartsToRemove.includes(s)) {
                let duplicateShoppingCarts = [];
                if (s.Origin === ShoppingCartOrigins.FREEZE) {
                    duplicateShoppingCarts = shoppingCarts.filter(d => s.DatePickup && d.DatePickup === s.DatePickup);
                } else if (s.Origin === ShoppingCartOrigins.WEB) {
                    duplicateShoppingCarts = shoppingCarts.filter(d => s.OrderId && d.OrderId === s.OrderId);
                } else if (s.Origin === ShoppingCartOrigins.DELIVEROO) {
                    duplicateShoppingCarts = shoppingCarts.filter(d => s.PartnerOrderId && d.PartnerOrderId === s.PartnerOrderId);
                }

                shoppingCartsToRemove.concat(duplicateShoppingCarts);
            }
        });

        let shoppingCartsToReturn = shoppingCarts.filter(s => !shoppingCartsToRemove.includes(s));

        shoppingCartsToReturn.map((s) => {
            if (s.OrderId) {
                //s.Timestamp = s.OrderId;
                s.id = s.OrderId;
            }

            s.Timestamp = Number.parseInt(s.Timestamp);
            s.Items.map(i => {
                if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "string") {
                    i.Product.StoreInfos = JSON.parse(i.Product.StoreInfos);
                }
            });
        });

        return shoppingCartsToReturn;
    };

    const getShoppingCartTaxCategoryAsync = (shoppingCart) => {
        let taxDefer = $q.defer();

        taxesService.getTaxCategoriesAsync().then((taxCategories) => {
            shoppingCart.Items.forEach((cartItem) => {
                let taxCategoryIdToCheck = undefined;

                if (cartItem.TaxCategoryId) {
                    taxCategoryIdToCheck = cartItem.TaxCategoryId;
                } else if (cartItem.TaxCategory) {
                    taxCategoryIdToCheck = cartItem.TaxCategory.TaxCategoryId;
                } else if (cartItem.Product && cartItem.Product.TaxCategory) {
                    taxCategoryIdToCheck = cartItem.Product.TaxCategory.TaxCategoryId;
                }

                let taxCategory = taxCategories.find(t => t.TaxCategoryId === taxCategoryIdToCheck);

                cartItem.Product.TaxCategory = taxCategory ? taxCategory : undefined;
                cartItem.TaxCategory = taxCategory;
                if (!taxCategory) {
                    console.log("Pas de tax category !!!");
                }
                cartItem.TaxCategoryId = taxCategoryIdToCheck;
            });

            shoppingCart.Timestamp = Number.parseInt(shoppingCart.Timestamp);
            shoppingCart.Items.map(i => {
                if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "string") {
                    i.Product.StoreInfos = JSON.parse(i.Product.StoreInfos);
                }
            });

            taxDefer.resolve(shoppingCart);
        });

        return taxDefer.promise;
    };

    //Count the number of matching RK products in shopping cart
    const RKComptage = (shoppingCart) => {
        let compteur = 0;
        for (let item of shoppingCart.Items) {
            if (item.Product.Sku == "rkcompteur") {
                compteur += item.Quantity;
            }
        }
        return compteur;
    };

    //Increment counter in database
    this.RKIncrement = (shoppingCart) => {
        const incr = RKComptage(shoppingCart);
        if (shoppingCart.HardwareId) {
            getUpdRkCounterValueAsync(shoppingCart.HardwareId, incr);
        }
    };

    //Decrement counter in database
    this.RKDecrement = (shoppingCart, retry = 0) => {
        const decr = RKComptage(shoppingCart);
        if (shoppingCart.HardwareId) {
            getUpdRkCounterValueAsync(shoppingCart.HardwareId, -1 * decr);
        }
    };

    const getUpdRkCounterValueAsync = (hardwareId, changeValue) => {
        const retDefer = $q.defer();

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        $http.get(urlFreezeApi + "/incrementRkCounter?hardwareId=" + hardwareId + "&changeValue=" + changeValue).then((currentRkCounter) => {
            retDefer.resolve(currentRkCounter.count);
        }, (err) => {
            retDefer.reject(err);
        });

        return retDefer.promise;
    };
});