app.service('deliveryService', function ($rootScope, $q, $uibModal, $translate, loyaltyService, paymentService, posService, storeMapService) {
    let self = this;

    $rootScope.currentDeliveryType = DeliveryType.FORHERE;

    this.getDeliveryPartnersAsync = function () {
        let partnerDefer = $q.defer();

        $rootScope.dbInstance.allDocs({
            include_docs: true,
            startkey: 'DeliveryPartner',
            endkey: 'DeliveryPartner\uffff'
        }).then(function (result) {
            let docs = result.rows.map(r => r.doc);
            partnerDefer.resolve(docs);
            console.log(result);
        }, (err) => {
            console.error(err);
            partnerDefer.reject();
        });

        return partnerDefer.promise;
    };

    this.editDeliveryInfos = (fromButton = false, dt = null) => {
        if (!$rootScope.currentShoppingCart) {
            $rootScope.createShoppingCart();
        }

        //On ouvre la modal de commande
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalEditDeliveryInfo.html',
            controller: 'ModalEditDeliveryInfoController',
            resolve: {
                fromButton: () => fromButton,
                existing: () => {
                    return {
                        timeGoal: $rootScope.currentShoppingCart.DatePickup ? $rootScope.currentShoppingCart.DatePickup : "",
                        commentaire: $rootScope.currentShoppingCart.ExtraInfos ? $rootScope.currentShoppingCart.ExtraInfos : "",
                        customer: $rootScope.currentShoppingCart.customerLoyalty ? $rootScope.currentShoppingCart.customerLoyalty : "",
                        deliveryType: dt ? dt : "",
                        deliveryPartner: $rootScope.currentShoppingCart.DeliveryPartner ? $rootScope.currentShoppingCart.DeliveryPartner : "",
                        deliveryAddress: $rootScope.currentShoppingCart.deliveryAddress ? $rootScope.currentShoppingCart.deliveryAddress : ""
                    };
                }
            }
        });
        modalInstance.result.then((result) => {
            if (!$rootScope.currentShoppingCart) {
                $rootScope.createShoppingCart();
            }
            if (result) {
                $rootScope.currentShoppingCart.Origin = ShoppingCartOrigins.FREEZE;
                if (!$rootScope.currentShoppingCart.StageHistory) {
                    $rootScope.currentShoppingCart.StageHistory = {};
                }
                $rootScope.currentShoppingCart.StageHistory.RecievedAt = Date.now();

                // On stock les infos de retour dans le currentShoppingCart
                if (result.timeGoal) {
                    $rootScope.currentShoppingCart.DatePickup = result.timeGoal.date.toString("dd/MM/yyyy HH:mm");
                    $rootScope.currentShoppingCart.TimeOffset = {
                        hours: result.timeGoal.hours,
                        minutes: result.timeGoal.minutes
                    };
                }
                if (result.deliveryPartner) {
                    if (result.deliveryPartner.LinkedPaymentTypeIds) {
                        paymentService.addPaymentTypes(result.deliveryPartner.LinkedPaymentTypeIds);
                    }
                    $rootScope.currentShoppingCart.DeliveryPartnerId = result.deliveryPartner.Id;
                    $rootScope.currentShoppingCart.DeliveryPartner = result.deliveryPartner;
                    if ($rootScope.currentShoppingCart.DeliveryType !== DeliveryType.DELIVERY) {
                        $rootScope.currentDeliveryType = DeliveryType.DELIVERY;
                        $rootScope.$emit('deliveryTypeChanged');
                        $rootScope.currentShoppingCart.DeliveryType = DeliveryType.DELIVERY;
                        $rootScope.$evalAsync();
                    }
                    // TODO : Filtrer les moyens de paiement pour ne laisser que ceux du partenaire selectionn�
                } else {
                    delete $rootScope.currentShoppingCart.DeliveryPartnerId;
                    delete $rootScope.currentShoppingCart.DeliveryPartner;
                    paymentService.updatePaymentModes();
                }
                if (result.deliveryAddress) {
                    $rootScope.currentShoppingCart.deliveryAddress = result.deliveryAddress;
                    if ($rootScope.currentShoppingCart.DeliveryType !== DeliveryType.DELIVERY) {
                        $rootScope.currentDeliveryType = DeliveryType.DELIVERY;
                        $rootScope.$emit('deliveryTypeChanged');
                        if ($rootScope.currentDeliveryType) {
                            $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                        }
                        $rootScope.currentShoppingCart.DeliveryType = DeliveryType.DELIVERY;
                    }
                }
                if (result.extraInfos) {
                    $rootScope.currentShoppingCart.ExtraInfos = result.extraInfos;
                }
                if (result.customerLoyalty) {
                    loyaltyService.removeAllLoyalties();
                    $rootScope.currentShoppingCart.Barcode = result.customerLoyalty.Barcodes[0].Barcode;
                    $rootScope.currentShoppingCart.customerLoyalty = result.customerLoyalty;
                    loyaltyService.calculateLoyalty();
                    $rootScope.$emit("customerLoyaltyChanged", result.customerLoyalty);
                }
            } else {
                console.log('clear');
                delete $rootScope.currentShoppingCart.DatePickup;
                delete $rootScope.currentShoppingCart.deliveryAddress;
                delete $rootScope.currentShoppingCart.TimeOffset;
                delete $rootScope.currentShoppingCart.ExtraInfos;
                loyaltyService.removeAllLoyalties();
                delete $rootScope.currentShoppingCart.customerLoyalty;
                delete $rootScope.currentShoppingCart.Barcode;
                loyaltyService.calculateLoyalty();
            }
        });
    };

    this.setDeliveryType = (value, calculate = true) => {
        $rootScope.currentDeliveryType = value;
        if ($rootScope.currentShoppingCart) {
            $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
        }
        $rootScope.$emit('deliveryTypeChanged');
    };

    this.removeDeliveryInfos = () => {
        if ($rootScope.currentShoppingCart) {
            delete $rootScope.currentShoppingCart.DatePickup;
            delete $rootScope.currentShoppingCart.deliveryAddress;
            delete $rootScope.currentShoppingCart.TimeOffset;
            delete $rootScope.currentShoppingCart.ExtraInfos;
        }
    };

    //Modal for the loyalty 'custom action' choice
    this.openModalDelivery = (boolValue) => {
        // Force the choice delivery on ticket validation
        if ($rootScope.IziBoxConfiguration.ForceDeliveryChoice) {
            $uibModal.open({
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

    this.upgradeCurrentShoppingCartAndDeliveryType = (shoppingCart) => {
        if(!shoppingCart && $rootScope.currentShoppingCart) {
            shoppingCart = $rootScope.currentShoppingCart;
        }
        // Set the new HarwareId
        shoppingCart.HardwareIdCreation = shoppingCart.HardwareId;
        shoppingCart.HardwareId = $rootScope.modelPos.hardwareId;
        if (shoppingCart.CurrentStep) {
            shoppingCart.CurrentStep = 0;
        }

        if ($rootScope.modelPos && $rootScope.modelPos.aliasCaisse) {
            shoppingCart.AliasCaisse = $rootScope.modelPos.aliasCaisse;
        }
        let lastLock = $rootScope.currentShoppingCart ? $rootScope.currentShoppingCart.FreezeLockedBy : null;
        $rootScope.currentShoppingCart = shoppingCart;
        if (lastLock) {
            $rootScope.currentShoppingCart.FreezeLockedBy = lastLock;
        }
        self.setDeliveryType(shoppingCart.DeliveryType);

        paymentService.calculateTotal();
        loyaltyService.calculateLoyalty();

        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
    };

    this.selectTableNumberAsync = () => {
        const selectTableDefer = $q.defer();
        let currentTableNumber;

        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.TableNumber) {
            currentTableNumber = $rootScope.currentShoppingCart.TableNumber;
        }
        let currentTableId;

        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.TableId) {
            currentTableId = $rootScope.currentShoppingCart.TableId;
        }
        let currentTableCutleries;

        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.TableCutleries) {
            currentTableCutleries = $rootScope.currentShoppingCart.TableCutleries;
        }
        let modalInstance;

        const resultSelectTable = () => {
            modalInstance.result.then((tableValues) => {
                $rootScope.currentDeliveryType = 0;
                if ($rootScope.currentShoppingCart) {
                    $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                }
                $rootScope.$emit('deliveryTypeChanged');

                const updateSelectedTable = (tableValues) => {
                    self.getFreezedShoppingCartByTableNumberAsync(tableValues.tableId, tableValues.tableNumber).then(() => {
                        swal({
                            title: $translate.instant("Cette table existe déjà") + "..."
                        });
                        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                        selectTableDefer.resolve();
                    }, () => {
                        $rootScope.currentShoppingCart.TableNumber = tableValues.tableNumber;
                        $rootScope.currentShoppingCart.TableId = tableValues.tableId;
                        $rootScope.currentShoppingCart.TableCutleries = tableValues.tableCutleries;
                        $rootScope.currentShoppingCart.TableChanged = true;
                        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                        selectTableDefer.reject();
                    });
                };

                if (!$rootScope.currentShoppingCart) {
                    self.getFreezedShoppingCartByTableNumberAsync(tableValues.tableId, tableValues.tableNumber).then((sc) => {
                        posService.unfreezeShoppingCartAsync(sc).then((unfreezedSp) => {
                            $rootScope.currentShoppingCart = unfreezedSp;
                            $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                            selectTableDefer.resolve();
                        }, () => {
                            selectTableDefer.reject();
                        });
                    }, (err) => {
                        updateSelectedTable(tableValues);
                    });
                } else {
                    updateSelectedTable(tableValues);
                }
            }, () => {
                selectTableDefer.reject();
            });
        };

        const showTable = () => {
            modalInstance = $uibModal.open({
                templateUrl: 'modals/modalTable.html',
                controller: 'ModalTableController',
                resolve: {
                    currentTableNumber: () => {
                        return currentTableNumber;
                    },
                    currentTableCutleries: () => {
                        return currentTableCutleries;
                    }
                },
                size: 'sm',
                backdrop: 'static'
            });
            resultSelectTable();
        };

        const showTablePlan = (storeMap) => {
            modalInstance = $uibModal.open({
                templateUrl: 'modals/modalTablePlan.html',
                controller: 'ModalTablePlanController',
                resolve: {
                    currentStoreMap: () => {
                        return storeMap;
                    },
                    currentTableNumber: () => {
                        return currentTableNumber;
                    },
                    currentTableCutleries: () => {
                        return currentTableCutleries;
                    },
                    currentTableId: () => {
                        return currentTableId;
                    }
                },
                size: 'full',
                backdrop: 'static'
            });
            resultSelectTable();
        };

        storeMapService.getStoreMapAsync().then((storeMap) => {
            if (storeMap && storeMap.data && storeMap.data.length > 0 && $rootScope.UserPreset && $rootScope.UserPreset.TablePlan) {
                showTablePlan(storeMap);
            } else {
                showTable();
            }
        }, () => {
            showTable();
        });

        return selectTableDefer.promise;
    };

    //Get freezed tickets by table number
    this.getFreezedShoppingCartByTableNumberAsync = (TableId, TableNumber) => {
        let resultDefer = $q.defer();
        $rootScope.showLoading();

        if (!TableId && !TableNumber) {
            $rootScope.hideLoading();
            resultDefer.reject();
            $rootScope.createShoppingCart();
        } else {
            posService.getFreezeShoppingCartsAsync().then((shoppingCarts) => {
                $rootScope.hideLoading();
                let result = shoppingCarts.find((sc) => {
                    return TableId ? sc.TableId === TableId : sc.TableNumber === TableNumber;
                });
                if (result) {
                    result.Discounts = result.Discounts ? result.Discounts : [];
                    result.Items = result.Items ? result.Items : [];
                    resultDefer.resolve(result);
                } else {
                    resultDefer.reject();
                    $rootScope.createShoppingCart();
                }
            }, (err) => {
                $rootScope.hideLoading();
                resultDefer.reject(err);
                $rootScope.createShoppingCart();
            });
        }
        return resultDefer.promise;
    };
});