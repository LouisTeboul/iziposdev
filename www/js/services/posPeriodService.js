app.service('posPeriodService', function ($http, $rootScope, $q, $uibModal, $translate, uuid2) {
    const self = this;

    /// <summary>
    /// Obtains (and optionnaly create) the current ZPeriod
    /// </summary>
    /// <param name="create">If true, ZPeriod is created if not exists</param>
    /// <returns>Current ZPeriod</returns>
    this.getZPeriodAsync = (create) => {
        var retDefer = $q.defer();

        var urlApi = $rootScope.APIBaseURL + "/period";

        if (create) {
            urlApi += "/getzperiodorcreate";
        } else {
            urlApi += "/getzperiod";
        }

        urlApi += "?hardwareid=" + $rootScope.modelPos.hardwareId + "&userid=" + $rootScope.PosUserId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId;

        $http.get(urlApi, { timeout: 30000 }).success((res) => {
            retDefer.resolve(res);
        }).error(() => {
            retDefer.reject("Izibox API getzperiod error");
        });

        return retDefer.promise;
    };

    this.getAllYPeriodAsync = (hardwareId) => {
        var retDefer = $q.defer();

        if (jQuery.isEmptyObject(hardwareId)) {
            retDefer.resolve(false);
            return retDefer.promise;
        }

        var urlApi = $rootScope.APIBaseURL + "/period/GetAllYPeriods?hardwareid=" + hardwareId;

        $http.get(urlApi, { timeout: 30000 }).success((res) => {
            retDefer.resolve(res);
        }).error(() => {
            retDefer.reject("Izibox API GetAllYPeriods error");
        });
        return retDefer.promise;
    };

    /// <summary>
    /// Obtains (and optionnaly create) the current YPeriod for this POS
    /// </summary>
    /// <param name="hardwareId">HardwareId of POS</param>
    /// <param name="userId">UserId for creation</param>
    /// <param name="create">If true, YPeriod is created if not exists</param>
    /// <returns>Current YPeriod</returns>
    this.getYPeriodAsync = (hardwareId, userId, create, forceOpenService) => {
        var retDefer = $q.defer();

        if (!userId) userId = 0;
        var isOwnPeriod = hardwareId === $rootScope.modelPos.hardwareId;

        if (!$rootScope.modelPos.iziboxConnected) {
            retDefer.reject("Pas de connexion à la Izibox");
        }

        var successGetYPeriod = () => {
            if (isOwnPeriod && !$rootScope.modelPos.isPosOpen) {
                $rootScope.modelPos.isPosOpen = true;
                console.log("Pos opened");
            }
        };

        var errorGetYPeriod = () => {
            if (isOwnPeriod) {
                $rootScope.modelPos.isPosOpen = false;
            }
            console.log("Pos closed : forceopen cancelled");
        };

        //var urlYPeriodApi = $rootScope.APIBaseURL + "/period/GETYPERIODANDZCREATE?hardwareid=" + hardwareId + "&userid=" + userId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId;
        if($rootScope.IziBoxConfiguration && $rootScope.IziBoxConfiguration.StoreId) {
            var urlYPeriodApi = $rootScope.APIBaseURL + "/period/GETYPERIOD?hardwareid=" + hardwareId + "&userid=" + userId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId;

            $http.get(urlYPeriodApi, { timeout: 30000 }).success((periodPair) => {
                var currentYPeriod = undefined;
                var currentZPeriod = undefined;
    
                if (periodPair) {
                    currentYPeriod = periodPair.YPeriod;
                    currentZPeriod = periodPair.ZPeriod;
                }
    
                var returnPeriodPair = {
                    YPeriod: currentYPeriod,
                    ZPeriod: currentZPeriod
                };
                // Le Y Période n'existe pas
                if (!currentYPeriod) {
                    if (create) {
                        var urlYPeriodClosedApi = $rootScope.APIBaseURL + "/period/LastYPeriod?hardwareid=" + hardwareId;
                        $http.get(urlYPeriodClosedApi, { timeout: 30000 }).success((previousYperiodButClosed) => {
                            var modalInstance;
                            var yPeriodId = uuid2.newguid();
                            var zPeriodId = currentZPeriod ? currentZPeriod.zPeriodId : uuid2.newguid();
    
                            if (!$rootScope.borne) {
                                modalInstance = $uibModal.open({
                                    templateUrl: 'modals/modalOpenPos.html',
                                    controller: 'ModalOpenPosController',
                                    resolve: {
                                        openPosParameters: () => {
                                            return {
                                                isOpenPos: true,
                                                previousYPeriod: previousYperiodButClosed,
                                                zPeriodId: zPeriodId,
                                                zPeriod: currentZPeriod,
                                                yPeriodId: yPeriodId,
                                                hardwareId: hardwareId
                                            };
                                        }
                                    },
                                    backdrop: 'static'
                                });
    
                                modalInstance.result.then((periodPair) => {
                                    if (periodPair) {
                                        console.log(periodPair);
                                        successGetYPeriod();
                                        retDefer.resolve(periodPair);
                                    } else {
                                        errorGetYPeriod();
                                        swal({
                                            title: $translate.instant("Une erreur est survenue lors de l'ouverture de la periode."),
                                            buttons: [$translate.instant("Ok"), false]
                                        });
                                        retDefer.reject("Error in the modal modalOpenPos");
                                    }
                                }, () => {
                                    errorGetYPeriod();
                                    retDefer.reject("Error in the modal modalOpenPos");
                                });
                            }
                        }).error(() => {
                            retDefer.reject("Izibox API LastYPeriod error");
                        });
                    } else {
                        errorGetYPeriod();
                        console.log("Pos closed : yperiod not exist or closed");
    
                        // We return at least the ZPeriod if exist
                        if (forceOpenService) {
                            retDefer.resolve(returnPeriodPair);
                        }
                        else {
                            retDefer.reject("Pos closed : yperiod not exist or closed");
                        }
                    }
                }
                // Le Y Période existe
                else {
                    successGetYPeriod();
                    retDefer.resolve(returnPeriodPair);
                }
            }).error((errGetYperiod) => {
                retDefer.reject("Izibox API GetYPeriod error");
            });
        } else {
            retDefer.reject("Pas de IziboxConfiguration ou StoreId");
        }


        return retDefer.promise;
    };

    this.CreateOrUpdateYPeriodAsync = (openPosValues, cashMovementType, forceOpen) => {
        var funcDefer = $q.defer();

        var isOwnPeriod = openPosValues.HardwareId === $rootScope.modelPos.hardwareId ? true : false;

        var urlApi = $rootScope.APIBaseURL + "/period";

        if (!openPosValues.zPeriodId) {
            openPosValues.zPeriodId = uuid2.newguid();
        }
        var CreateOrUpdateYPeriodRequest = {
            actionPeriod: "CREATEORUPDATEYPERIOD",
            yperiodid: openPosValues.yPeriodId,
            zperiodid: openPosValues.zPeriodId,
            cashMovementOpen: {
                CashMovementLines: openPosValues.CashMovementLines,
                CashMovementType: cashMovementType,
                ForceOpen: forceOpen
            },
            storeId: openPosValues.StoreId,
            userId: openPosValues.PosUserId,
            hardwareId: openPosValues.HardwareId
        };

        $http.post(urlApi, CreateOrUpdateYPeriodRequest, { timeout: 30000 }).success((periodPair) => {
            if (isOwnPeriod) {
                $rootScope.modelPos.isPosOpen = true;
                console.log("Pos opened");
            }
            funcDefer.resolve(periodPair);
        })
            .error((errSave) => {
                funcDefer.reject(errSave);
            });

        return funcDefer.promise;
    };

    this.closeYPeriodAsync = (yPeriod, CashMovementLines, closPosVal) => {
        var funcDefer = $q.defer();
        console.log(yPeriod);
        var isOwnPeriod = yPeriod.HardwareId === $rootScope.modelPos.hardwareId ? true : false;

        var urlApi = $rootScope.APIBaseURL + "/period";

        if (!yPeriod.endDate) {
            var closeYPeriodRequest = {
                actionPeriod: "CLOSEYPERIOD",
                yperiodid: yPeriod.id,
                yPeriodCount: {
                    YCashMovementLines: CashMovementLines
                },
                storeId: closPosVal.StoreId,
                userId: closPosVal.PosUserId,
                hardwareId: closPosVal.HardwareId
            };

            $http.post(urlApi, closeYPeriodRequest, { timeout: 30000 }).success((yPeriod) => {
                if (isOwnPeriod) {
                    $rootScope.modelPos.isPosOpen = false;
                }
                funcDefer.resolve(yPeriod);
            })
                .error((errSave) => {
                    funcDefer.reject(errSave);
                });
        } else {
            funcDefer.reject("YPeriod : " + yPeriod.id + " already closed");
        }

        return funcDefer.promise;
    };

    this.closeZPeriodAsync = (zPeriod, hardwareIdModels, closPosVal) => {
        var funcDefer = $q.defer();

        if (zPeriod && closPosVal) {
            var isOwnPeriod = zPeriod.HardwareId === $rootScope.modelPos.hardwareId ? true : false;

            var urlApi = $rootScope.APIBaseURL + "/period";

            if (!zPeriod.endDate) {
                var closeZPeriodRequest = {
                    actionPeriod: "CLOSEZPERIODBYID",
                    zperiodid: zPeriod.id,
                    hardwareIdsCashMovementClose: hardwareIdModels,
                    storeId: closPosVal.StoreId,
                    userId: closPosVal.PosUserId,
                    hardwareId: closPosVal.HardwareId
                };
                $http.post(urlApi, closeZPeriodRequest, { timeout: 60000 }).success((statsAfterClose) => {
                    if (isOwnPeriod) {
                        $rootScope.modelPos.isPosOpen = false;
                    }
                    funcDefer.resolve(statsAfterClose);
                }).error((errSave) => {
                    funcDefer.reject(errSave);
                });
            } else {
                funcDefer.reject("ZPeriod : " + zPeriod.id + " already closed");
            }
        }
        else {
            funcDefer.reject("No ZPeriod or no closPosVal");
        }
        return funcDefer.promise;
    };

    this.getZPeriodRecapAsync = (paymentModesAvailable) => {
        var retDefer = $q.defer();

        var urlApi = $rootScope.APIBaseURL + "/getZPeriodRecap";

        var getZpEriodRecapRequest = {
            paymentModesAvailable: paymentModesAvailable
        };
        $http.post(urlApi, getZpEriodRecapRequest, { timeout: 30000 }).success((res) => {
            retDefer.resolve(res);
        }).error(() => {
            retDefer.reject("Izibox API GetZPeriodRecap error");
        });

        return retDefer.promise;
    };

    this.getYCountLinesDetailsByHidAsync = (zPeriodId, hardwareId) => {
        var yCountLinesDefer = $q.defer();

        self.getAllYPeriodAsync(hardwareId).then((resYPeriods) => {
            var yPeriodCashDetails = {
                zPeriodId: zPeriodId,
                yPeriods: []
            };

            Enumerable.from(resYPeriods).forEach((yPeriod) => {
                if (yPeriod.zPeriodId === zPeriodId && yPeriod.hardwareId === hardwareId) {
                    yPeriodCashDetails.yPeriods.push(clone(yPeriod));
                }
            });

            yCountLinesDefer.resolve(yPeriodCashDetails);
        }, (erryPeriod) => {
            yCountLinesDefer.reject(erryPeriod);
        });

        return yCountLinesDefer.promise;
    };

    this.getPaymentValuesAsync = (zPeriodId, yPeriodId, hardwareId) => {
        var retDefer = $q.defer();

        if (!zPeriodId && !yPeriodId && !hardwareId) {
            retDefer.reject("Wrong API parameters getPaymentValues at least one of zPeriodId, yPeriodId, hardwareId has to be informed");
        }
        else {
            var urlApi = $rootScope.APIBaseURL + "/period/getpaymentvalues";

            urlApi += "?zperiodid=" + (zPeriodId ? zPeriodId : "");
            urlApi += "&yperiodid=" + (yPeriodId ? yPeriodId : "");
            urlApi += "&hardwareid=" + (hardwareId ? hardwareId : "");

            $http.get(urlApi, { timeout: 30000 }).success((res) => {
                retDefer.resolve(res);
            }).error(() => {
                retDefer.reject("Izibox API getPaymentValues error");
            });
        }
        return retDefer.promise;
    };

    //Get the cash in hand value
    this.getYPaymentValuesAsync = (yPeriodId) => {
        var paymentValuesDefer = $q.defer();

        self.getZPeriodAsync(false).then((zp) => {
            if (zp) {
                self.getPaymentValuesAsync(undefined, yPeriodId, undefined).then((resPaymentValues) => {
                    paymentValuesDefer.resolve(resPaymentValues);
                }, (errPV) => {
                    paymentValuesDefer.reject(errPV);
                });
            } else {
                paymentValuesDefer.resolve();
            }
        }, (errZP) => {
            paymentValuesDefer.reject(errZP);
        });

        return paymentValuesDefer.promise;
    };

    this.editShoppingCartPaymentModesAsync = (shoppingCart, oldPaymentModes) => {
        var funcDefer = $q.defer();

        var urlApi = $rootScope.APIBaseURL + "/editShoppingCartPaymentModes";

        var editPaymentModeRequest = {
            ShoppingCart: shoppingCart,
            OldPaymentModes: oldPaymentModes
        };
        $http.post(urlApi, editPaymentModeRequest, { timeout: 30000 }).success((ret) => {
            funcDefer.resolve(ret);
        }).error((errSave) => {
            funcDefer.reject(errSave);
        });

        return funcDefer.promise;
    };
});