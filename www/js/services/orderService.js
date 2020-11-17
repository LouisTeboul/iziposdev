app.service('orderService', function ($http, $rootScope, $translate, $q, settingService, stockService, posService, printService) {
    const self = this;
    let tryGetFreezed = 0;
    let lastFreezeUpdate = null;

    let initDefer = $q.defer();

    this.orders = {};

    //Initialisation du service
    this.init = () => {
        //initOrders();
        if (!$rootScope.borne) {
            //orderInProgressDaemon();
        }
    };

    this.refecthOrdersAsync = (forceUpdate) => {
        let refetchDefer = $q.defer();
        initOrders(forceUpdate).then((orderList) => {
            refetchDefer.resolve(orderList);
        }, (err) => {
            refetchDefer.reject(err);
        });

        return refetchDefer.promise;
    };

    this.cancelRefetch = () => {
        initDefer.reject("Canceled");
    };

    const dbOrderChangedHandler = $rootScope.$on('dbOrderReplicate', () => {
        // Quand on reçoit un order, on refresh dans tous les cas
        initOrders(true);
    });

    const initOrders = (forceUpdate) => {
        initDefer = $q.defer();
        if ($rootScope.FreezeCount && lastFreezeUpdate && lastFreezeUpdate === $rootScope.FreezeCount.lastUpdate && !forceUpdate) {
            initDefer.resolve(self.orders);
        } else {
            posService.getOrderShoppingCartsAsync().then((orderShoppingCarts) => {
                if ($rootScope.FreezeCount && $rootScope.FreezeCount.lastUpdate)
                    lastFreezeUpdate = $rootScope.FreezeCount.lastUpdate;

                $rootScope.OrderCount = {
                    untouched: {
                        unlocked: orderShoppingCarts.filter(s => !s.ProductionStage && !s.FreezeLockedBy).length,
                        locked: orderShoppingCarts.filter(s => !s.ProductionStage && s.FreezeLockedBy).length
                    },
                    in_kitchen: {
                        unlocked: orderShoppingCarts.filter(s => s.ProductionStage === ProductionStages.KITCHEN && !s.FreezeLockedBy).length,
                        locked: orderShoppingCarts.filter(s => s.ProductionStage === ProductionStages.KITCHEN && s.FreezeLockedBy).length
                    },
                    ready: {
                        unlocked: orderShoppingCarts.filter(s => s.ProductionStage === ProductionStages.READY && !s.FreezeLockedBy).length,
                        locked: orderShoppingCarts.filter(s => s.ProductionStage === ProductionStages.READY && s.FreezeLockedBy).length
                    },
                    total: {
                        unlocked: orderShoppingCarts.filter(s => !s.FreezeLockedBy).length,
                        locked: orderShoppingCarts.filter(s => s.FreezeLockedBy).length
                    }
                };

                posService.getFreezeShoppingCartsAsync().then((freezeShoppingCarts) => {
                    let shoppingCarts = freezeShoppingCarts.concat(orderShoppingCarts);

                    let localSp = $rootScope.IziBoxConfiguration.EnableKDS ? [] : shoppingCarts.filter(s => !s.DatePickup && !s.ShippingOption);
                    let timedSp = $rootScope.IziBoxConfiguration.EnableKDS ? shoppingCarts : shoppingCarts.filter(s => s.DatePickup || s.ShippingOption);

                    self.orders = {
                        local: [],
                        untouched: [],
                        in_kitchen: [],
                        ready: [],
                        all: angular.copy(shoppingCarts)
                    };

                    self.orders.local = localSp;

                    self.orders.untouched = timedSp.filter(s => !s.ProductionStage);
                    self.orders.in_kitchen = timedSp.filter(s => s.ProductionStage === ProductionStages.KITCHEN);
                    self.orders.ready = timedSp.filter(s => s.ProductionStage === ProductionStages.READY);

                    initDefer.resolve(self.orders);

                    //refreshOrdersInProgress();
                });
            }, (err) => {
                initDefer.reject();
                console.error(err);
                if (tryGetFreezed < 3) {
                    tryGetFreezed = tryGetFreezed + 1;
                    setTimeout(() => {
                        initOrders();
                    }, 1000);
                }
            });
        }

        return initDefer.promise;
    };

    this.loadOrderShoppingCartAsync = (shoppingCart) => {
        const unfreezeDefer = $q.defer();

        if (!shoppingCart.Discounts) {
            shoppingCart.Discounts = [];
        }
        if (!shoppingCart.Items) {
            shoppingCart.Items = [];
        }

        if (shoppingCart.Origin === ShoppingCartOrigins.DELIVEROO || shoppingCart.Origin === ShoppingCartOrigins.WEB) {
            // Provenance : orders
            // shoppingCart.Timestamp = new Date().getTime();
            shoppingCart.CurrentStep = 0;

            // Conviertie le champs customer vers customerInfo
            if (shoppingCart.Customer && !shoppingCart.customerInfo) {
                shoppingCart.customerInfo = shoppingCart.Customer;
            }

            if (shoppingCart.isPayed && shoppingCart.PaymentModes && shoppingCart.PaymentModes.length > 0) {
                // Search payments Methods
                settingService.getPaymentModesAsync().then((paymentSetting) => {
                    let paymentModes = paymentSetting;

                    if(shoppingCart.PaymentModes && shoppingCart.PaymentModes.length > 0) {
                        shoppingCart.PaymentModes.forEach((item) => {
                            let p = paymentModes.find(x => x.Text === item.Text);
                            if (p)
                                item.PaymentType = p.PaymentType;
                        });
                    }

                });
            } else {
                shoppingCart.PaymentModes = [];
            }

            // Orders that come from the web, we have to set with the current pos HardwareId
            if (!shoppingCart.HardwareId) {
                shoppingCart.HardwareId = $rootScope.modelPos.hardwareId;
                if ($rootScope.modelPos && $rootScope.modelPos.aliasCaisse) {
                    shoppingCart.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                }
            }

            if (!shoppingCart.dailyTicketId) {
                self.getUpdDailyTicketValueAsync($rootScope.modelPos.hardwareId, 1).then((cashRegisterTicketId) => {
                    shoppingCart.dailyTicketId = cashRegisterTicketId;
                });
            }

            shoppingCart.Id = shoppingCart.OrderId || shoppingCart.Timestamp;

            posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezedSc) => {
                unfreezeDefer.resolve(unfreezedSc);
            }, (errDel) => {
                unfreezeDefer.reject(errDel);
            });

        } else if (shoppingCart.Origin === ShoppingCartOrigins.FREEZE) {
            // Provenance : freeze
            posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezedSc) => {
                unfreezeDefer.resolve(unfreezedSc);
            }, (errDel) => {
                unfreezeDefer.reject(errDel);
            });
        }
        return unfreezeDefer.promise;
    };

    this.joinShoppingCartsAsync = (toJoin) => {
        let joinDefer = $q.defer();
        let urlFreezeApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/freeze";

        let params = {
            CartIds: toJoin.map(s => s.OrderId || s.Timestamp),
            HardwareId: $rootScope.modelPos.hardwareId
        };

        $http.post(urlFreezeApi + "/JoinShoppingCarts", params).then((res) => {
            let joined = res.data;
            joined.Items.forEach(i => {
                if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "object") {
                    i.Product.StoreInfos = JSON.stringify(i.Product.StoreInfos);
                }
                if (!i.Product.TaxCategoryId && i.Product.TaxCategory) {
                    if (i.Product.TaxCategory.TaxCategoryId && i.Product.TaxCategory.TaxCategoryId !== 0) {
                        i.Product.TaxCategoryId = i.Product.TaxCategory.TaxCategoryId;
                    } else if (i.Product.TaxCategory.Id && i.Product.TaxCategory.Id !== 0) {
                        i.Product.TaxCategoryId = i.Product.TaxCategory.Id;
                    }
                }
            });
            joinDefer.resolve(joined);
        }, (err) => {
            joinDefer.reject(err);
        });

        return joinDefer.promise;
    };

    //Get tickets by Id, in both freeze and order index
    this.getFreezeAndOrderShoppingCartByIdAsync = (id) => {
        let resultDefer = $q.defer();

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        $rootScope.showLoading();

        if (!id) {
            $rootScope.hideLoading();
            resultDefer.reject("No Id provided");
        } else {
            $http.get(urlFreezeApi + "/shoppingCartById?cartId=" + id).then((freeze) => {
                let freezeSp = freeze.data;
                if (freezeSp) {
                    freezeSp.Items.forEach(i => {
                        if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "string") {
                            i.Product.StoreInfos = JSON.parse(i.Product.StoreInfos);
                        }
                    });
                    $rootScope.hideLoading();
                    resultDefer.resolve(freezeSp);
                } else {
                    $rootScope.remoteDbOrder.rel.find('ShoppingCart', id).then((orderList) => {
                        const result = Enumerable.from(orderList.ShoppingCarts).firstOrDefault();
                        if (result) {
                            result.Items.forEach(i => {
                                if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "string") {
                                    i.Product.StoreInfos = JSON.parse(i.Product.StoreInfos);
                                }
                            });
                            $rootScope.hideLoading();
                            resultDefer.resolve(result);
                        } else {
                            $rootScope.hideLoading();
                            resultDefer.reject("No match for ShoppingCart id : " + id);
                        }
                    }, (err) => {
                        $rootScope.hideLoading();
                        resultDefer.reject("Error getting orders");
                    });
                }
            }, (err) => {
                $rootScope.hideLoading();
                resultDefer.reject("Error getting freeze");
            });
        }
        return resultDefer.promise;
    };

    //Get tickets by Id, in freeze index
    this.getFreezedShoppingCartByIdAsync = (id) => {
        let resultDefer = $q.defer();

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        $rootScope.showLoading();

        if (!id) {
            $rootScope.hideLoading();
            resultDefer.reject();
        } else {
            $http.get(urlFreezeApi + "/shoppingCartById?cartId=" + id).then((freeze) => {
                const sc = freeze.data;
                if (sc) {
                    $rootScope.hideLoading();
                    resultDefer.resolve(sc);
                } else {
                    $rootScope.hideLoading();
                    resultDefer.reject();
                }
            }, () => {
                $rootScope.hideLoading();
                resultDefer.reject();
            });
        }
        return resultDefer.promise;
    };

    this.getFreezedShoppingCartByBarcodeAsync = (barcode) => {
        let resultDefer = $q.defer();

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        $rootScope.showLoading();

        if (!barcode) {
            $rootScope.hideLoading();
            resultDefer.reject("No barcode provided");
        } else {
            $http.get(urlFreezeApi + "/shoppingCartByBarcode?barcode=" + barcode).then((freeze) => {
                let freezeSp = freeze.data;
                if (freezeSp) {
                    freezeSp.Items.forEach(i => {
                        if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "string") {
                            i.Product.StoreInfos = JSON.parse(i.Product.StoreInfos);
                        }
                    });
                    $rootScope.hideLoading();
                    resultDefer.resolve(freezeSp);
                } else {
                    resultDefer.reject("Not found in freeze");
                    // TODO : Rechercher dans orders

                    // $rootScope.dbOrder.rel.find('ShoppingCart', id).then((orders) => {
                    //     const result = Enumerable.from(orders.ShoppingCarts).firstOrDefault();
                    //     if (result) {
                    //         result.Items.forEach(i => {
                    //             if (i.Product.StoreInfos && typeof i.Product.StoreInfos === "string") {
                    //                 i.Product.StoreInfos = JSON.parse(i.Product.StoreInfos);
                    //             }
                    //         });
                    //         $rootScope.hideLoading();
                    //         resultDefer.resolve(result);
                    //     } else {
                    //         $rootScope.hideLoading();
                    //         resultDefer.reject("No match for ShoppingCart id : " + id);
                    //     }
                    // }, (err) => {
                    //     $rootScope.hideLoading();
                    //     resultDefer.reject("Error getting orders");
                    // })
                }
            }, (err) => {
                $rootScope.hideLoading();
                resultDefer.reject("Error getting freeze");
            });
        }
        return resultDefer.promise;
    };

    //Put a ticket in a stand-by
    //When a ticket is 'unfreezed' other POs can't access it
    this.freezeCurrentShoppingCartAsync = () => {
        let freezeDefer = $q.defer();

        if ($rootScope.currentShoppingCart) {
            const freezeCurrent = () => {
                self.freezeShoppingCartAsync($rootScope.currentShoppingCart).then(() => {
                    // if ($rootScope.currentShoppingCartLeft) {
                    //     $rootScope.currentShoppingCartLeft.Discounts = $rootScope.currentShoppingCartLeft.Discounts ? $rootScope.currentShoppingCartLeft.Discounts : [];
                    //     $rootScope.currentShoppingCartLeft.Items = $rootScope.currentShoppingCartLeft.Items ? $rootScope.currentShoppingCartLeft.Items : [];
                    //     //$rootScope.currentShoppingCartLeft = null;
                    //     $rootScope.currentShoppingCartRight = null;
                    // } else {
                    //     $rootScope.clearShoppingCart(false);
                    // }

                    $rootScope.clearOrNextShoppingCart()

                    freezeDefer.resolve();
                }, (msg) => {
                    if (msg && typeof msg === "string") {
                        swal({
                            title: "Oops !",
                            text: $translate.instant(msg)
                        });
                    } else {
                        swal({
                            title: $translate.instant("Erreur de mise en attente !")
                        });
                    }

                    freezeDefer.reject();
                });
            };

            if ($rootScope.borne) {
                freezeCurrent();
            } else {
                if ($rootScope.UserPreset && $rootScope.UserPreset.PrintAutoFreeze && ($rootScope.UserPreset.PrintAutoFreeze.StepProd || $rootScope.UserPreset.PrintAutoFreeze.Prod) ||
                    $rootScope.IziBoxConfiguration.EnableKDS && $rootScope.UserPreset && $rootScope.UserPreset.PrintProdMode && $rootScope.UserPreset.PrintProdMode !== PrintProdMode.PRINT) {
                    let stepToPrint = 0;
                    let shouldPrintItems = $rootScope.currentShoppingCart.Items.filter(i => !i.isPartSplitItem && (i.PrintedQuantity !== i.Quantity || i.PrintedQuantity === 0 || !i.PrintedQuantity));

                    if (shouldPrintItems && shouldPrintItems.length > 0) {
                        let a = shouldPrintItems.map(zpi => zpi.Step);
                        stepToPrint = Math.min(...a);
                    }
                    $rootScope.currentShoppingCart.CurrentStep = stepToPrint;

                    let shouldPrintTicket = shouldPrintItems && shouldPrintItems.length > 0 || $rootScope.currentShoppingCart.ItemsChanged;

                    if ($rootScope.UserPreset && $rootScope.UserPreset.PrintAutoFreeze && $rootScope.UserPreset.PrintAutoFreeze.Prod) {
                        // print prod (ticket bleu)

                        let spClone = angular.copy($rootScope.currentShoppingCart);

                        if (shouldPrintTicket) {
                            printService.printProdShoppingCartAsync($rootScope.currentShoppingCart).then(() => { }, (err) => {
                                console.error(err);
                            });
                        } else {
                            // On affiche l'avertissement seulement si on gere la production avec des imprimante
                            swal({
                                title: $translate.instant("Impression addition"),
                                text: $translate.instant("Ce ticket n'a subi aucune modification. Voulez vous le ré-imprimer ?"),
                                buttons: [$translate.instant("Non"), $translate.instant("Oui")],
                                dangerMode: true,
                                icon: "warning"
                            }).then((confirm) => {
                                if (confirm) {
                                    printService.printProdShoppingCartAsync(spClone).then(() => {
                                        console.log("printed");
                                    }, (err) => {
                                        console.error(err);
                                    });
                                }
                            });
                        }
                    }

                    if ($rootScope.UserPreset && $rootScope.UserPreset.PrintAutoFreeze && $rootScope.UserPreset.PrintAutoFreeze.StepProd || $rootScope.IziBoxConfiguration.EnableKDS) {
                        // Si on a un seul item pas imprimé en prod, on envoie en prod automatiquement
                        if (shouldPrintTicket) {
                            printService.printStepProdCurrentShoppingCartAsync().then(() => { }).catch((err) => {
                                console.error("Erreur impression prod : ", err);
                            }).then(() => {
                                freezeCurrent();
                            });
                        } else {
                            if ($rootScope.currentShoppingCart.TableChanged || $rootScope.currentShoppingCart.LoyaltyChanged) {
                                let whatChanged = "";
                                if ($rootScope.currentShoppingCart.TableChanged && $rootScope.currentShoppingCart.LoyaltyChanged) {
                                    whatChanged = "La table et le client associé à ce ticket ont changé.";
                                }

                                if ($rootScope.currentShoppingCart.TableChanged) {
                                    whatChanged = "La table associée à ce ticket a changé.";
                                }

                                if ($rootScope.currentShoppingCart.LoyaltyChanged) {
                                    whatChanged = "Le client associé à ce ticket a changé.";
                                }

                                swal({
                                    title: $translate.instant("Envoi en production"),
                                    text: $translate.instant(whatChanged + "\r\n Voulez vous le renvoyer en production ?"),
                                    buttons: [$translate.instant("Non"), $translate.instant("Oui")],
                                    dangerMode: true,
                                    icon: "warning"
                                }).then((confirm) => {
                                    if (confirm) {
                                        printService.printStepProdCurrentShoppingCartAsync().then(() => {
                                            console.log("printed");
                                            freezeCurrent();
                                        }, (err) => {
                                            console.error(err);
                                        });
                                    } else {
                                        freezeCurrent();
                                    }
                                });
                            } else {
                                // Sinon si tous les item sont imprimé en prod, on freeze sans envoyé en prod
                                if ($rootScope.currentShoppingCart.ProductionStage === "ready_for_collection") {
                                    $rootScope.currentShoppingCart.DontAutoLoad = true;
                                }
                                freezeCurrent();
                            }
                        }
                    } else {
                        freezeCurrent();
                    }
                } else {
                    freezeCurrent();
                }
            }
        }
        return freezeDefer.promise;
    };

    //Send the ticket in a database shared between POS terminal
    this.freezeShoppingCartAsync = (shoppingCart) => {
        let freezeDefer = $q.defer();

        let urlFreezeApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/freeze";

        // RK : Appeller la fonction d'incrément d'enfant dans le parc
        posService.RKIncrement(shoppingCart);
        shoppingCart.Id = shoppingCart.OrderId || shoppingCart.Timestamp;
        shoppingCart.Timestamp = shoppingCart.Timestamp.toString();

        // On stringifie le store info pour stockage
        $rootScope.stringifyStoreInfos(shoppingCart);

        // Si le shoppingcart est a collected et qu'on le refreeze, on le passe a ready
        if (shoppingCart.ProductionStage === ProductionStages.COLLECTED) {
            shoppingCart.ProductionStage = ProductionStages.READY;
            delete shoppingCart.StageHistory.CollectedAt;
        }

        // On remet le shoppingCart dans le freeze
        stockService.checkStockBufferAsync().then(() => {
            $http.post(urlFreezeApi + "/freezeShoppingCart", shoppingCart).then(() => {
                stockService.moveStockBuffer("HID_" + $rootScope.modelPos.hardwareId, "FRZ_" + shoppingCart.Id).then(() => {
                    //$rootScope.$emit("dbFreezeReplicate");
                    freezeDefer.resolve(true);
                });
            }, (errSave) => {
                console.log("freezeShoppingCartAsync Error");
                console.error(errSave);
                freezeDefer.reject();
            });
        }, (err) => {
            swal({
                title: "Oops",
                text: msg
            });

            console.error(err);
        })

        return freezeDefer.promise;
    };

    this.getUpdDailyTicketValueAsync = (hardwareId, changeValue) => {
        const retDefer = $q.defer();

        try {
            let dtString = localStorage.getItem("DailyTicket");
            let dtObj = null;

            if (dtString) {
                dtObj = JSON.parse(dtString);
                if (dtObj.date !== moment().format("DD/MM/YYYY")) {
                    dtObj = {
                        date: moment().format("DD/MM/YYYY"),
                        count: 0
                    };
                }
            } else {
                dtObj = {
                    date: moment().format("DD/MM/YYYY"),
                    count: 0
                };
            }

            dtObj.count += Number.isInteger(changeValue) ? changeValue : 1;
            localStorage.setItem("DailyTicket", JSON.stringify(dtObj));

            let dailyTicketId = $rootScope.modelPos.posNumber + padLeft(dtObj.count.toString(), 3, "0");
            retDefer.resolve(dailyTicketId);
        } catch (err) {
            console.error(err);
            retDefer.resolve($rootScope.modelPos.posNumber + "001");
        }

        return retDefer.promise;
    };
});