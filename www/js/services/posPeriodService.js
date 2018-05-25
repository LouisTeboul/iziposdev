app.service('posPeriodService', ['$http', '$rootScope', '$q', '$uibModal', 'posLogService', 'uuid2', 'cashMovementService', 'settingService',
    function ($http, $rootScope, $q, $uibModal, posLogService, uuid2, cashMovementService, settingService) {
        var current = this;
        var _daemonPeriodStarted = false;

        this.initPeriodListener = function () {
            $rootScope.$on('iziboxConnected', function (event, isConnected) {
                if (isConnected) {
                    current.getYPeriodAsync($rootScope.modelPos.hardwareId, undefined, false, false);
                }
            });
        };


        this.stopPeriodDaemon = function () {
            _daemonPeriodStarted = false;
        };

        /** Check the availability of the Period*/
        this.startPeriodDaemon = function () {
            var timerRepeat = 10000;
            if ($rootScope.IziBoxConfiguration.LocalIpIziBox && !_daemonPeriodStarted) {

                _daemonPeriodStarted = true;

                var periodDaemon = function () {
                    setTimeout(function () {
                        current.getYPeriodAsync($rootScope.modelPos.hardwareId, undefined, false, false).then(function (yp) {
                            $rootScope.currentYPeriod = yp;
                            if (_daemonPeriodStarted) periodDaemon();
                        }, function () {
                            $rootScope.currentYPeriod = null;
                            if (_daemonPeriodStarted) periodDaemon();
                        })
                    }, timerRepeat);
                };

                periodDaemon();
            }
        };

        /// <summary>
        /// Obtains (and optionnaly create) the current ZPeriod
        /// </summary>
        /// <param name="create">If true, ZPeriod is created if not exists</param>
        /// <returns>Current ZPeriod</returns>
        this.getZPeriodAsync = function (create) {
            var retDefer = $q.defer();

            var urlApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period";

            if (create) {
                urlApi += "/getzperiodorcreate";
            } else {
                urlApi += "/getzperiod";
            }

            urlApi += "?hardwareid=" + $rootScope.modelPos.hardwareId + "&userid=" + $rootScope.PosUserId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId;

            $http.get(urlApi, { timeout: 5000 }).
                success(function (res) {
                    retDefer.resolve(res);
                }).
                error(function () {
                    retDefer.reject("Izibox API getzperiod error");
                });

            return retDefer.promise;
        };


        this.getAllYPeriodAsync = function (hardwareId) {
            var retDefer = $q.defer();

            if (jQuery.isEmptyObject(hardwareId)) {
                retDefer.resolve(false);
                return retDefer.promise;
            }

            var urlApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/GetAllYPeriods?hardwareid=" + hardwareId;

            $http.get(urlApi, { timeout: 5000 }).
                success(function (res) {
                    retDefer.resolve(res);
                }).
                error(function () {
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
        this.getYPeriodAsync = function (hardwareId, userId, create, forceOpenPopupEditMode, forceOpenService) {
            var retDefer = $q.defer();

            if (!userId) userId = 0;
            var isOwnPeriod = hardwareId == $rootScope.modelPos.hardwareId ? true : false;

            if (!$rootScope.modelPos.iziboxConnected) {
                retDefer.resolve({});
            }

            var successGetYPeriod = function () {
                if (isOwnPeriod && !$rootScope.modelPos.isPosOpen) {
                    $rootScope.modelPos.isPosOpen = true;
                    console.log("Pos opened");
                }
                
            };

            var errorGetYPeriod = function () {
                if (isOwnPeriod) {
                    $rootScope.modelPos.isPosOpen = false;
                }
                console.log("Pos closed : forceopen cancelled");
            };

            //var urlYPeriodApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/GETYPERIODANDZCREATE?hardwareid=" + hardwareId + "&userid=" + userId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId;
            var urlYPeriodApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/GETYPERIOD?hardwareid=" + hardwareId + "&userid=" + userId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId;

            $http.get(urlYPeriodApi, { timeout: 5000 }).
                success(function (periodPair) {

                    var currentYPeriod = undefined;
                    var currentZPeriod = undefined;

                    if (periodPair) {
                        currentYPeriod = periodPair.YPeriod;
                        currentZPeriod = periodPair.ZPeriod;
                    }

                    var urlYPeriodClosedApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/LastYPeriod?hardwareid=" + hardwareId;
                    $http.get(urlYPeriodClosedApi, { timeout: 5000 }).
                        success(function (previousYperiodButClosed) {
                            if (!currentYPeriod) {

                                if (create == undefined || create) {

                                    var yPeriodId = uuid2.newguid();
                                    var zPeriodId = currentZPeriod ? currentZPeriod.zPeriodId : uuid2.newguid();

                                    var urlCreateYPeriodApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/CreateYPeriod?hardwareid=" + hardwareId + "&userid=" + userId + "&storeid=" + $rootScope.IziBoxConfiguration.StoreId + "&zperiodid=" + zPeriodId + "&yperiodid=" + yPeriodId;
                                    // Ouverture forcée de service avec montant théorique du service précédent si il y en a un
                                    if (forceOpenService) {
                                        $http.get(urlCreateYPeriodApi, { timeout: 5000 }).
                                            success(function (periodPair) {
                                                currentYPeriod = periodPair.YPeriod;
                                                currentZPeriod = periodPair.ZPeriod;

                                                successGetYPeriod();


                                                var totalKnown = 0;
                                                if (previousYperiodButClosed && !previousYperiodButClosed.emptyCash) {

                                                    var cashPaymentModePrevious = Enumerable.from(previousYperiodButClosed.YCountLines).firstOrDefault(function (x) {
                                                        return x.PaymentMode.PaymentType == PaymentType.ESPECE;
                                                    });
                                                    if (cashPaymentModePrevious) {
                                                        totalKnown = cashPaymentModePrevious.TotalKnown;
                                                    }
                                                    // Crééer le motif négatif isSytem "Fin de service" du montant espèce du précédent yPeriod dans le yPeriod précédent
                                                    current.emptyCashYPeriodAsync(previousYperiodButClosed, previousYperiodButClosed.YCountLines).then(function (paymentValues) {
                                                        //Appel après la création de la fermeture du service précédent pour que la date du motif de l'ouverture du service soit après le motif de fermeture du service précédent
                                                        current.forceOpenCashMachineAsync(currentYPeriod, totalKnown).then(function (yPeriod) {
                                                            retDefer.resolve(yPeriod);
                                                        });
                                                    });
                                                }
                                                else {
                                                    current.forceOpenCashMachineAsync(currentYPeriod, totalKnown).then(function (yPeriod) {
                                                        retDefer.resolve(yPeriod);
                                                    });
                                                }
                                            }).
                                            error(function () {
                                                errorGetYPeriod();
                                                retDefer.reject("Izibox API CreateYPeriod error");
                                            });
                                    }
                                    else {

                                        var modalInstance = $uibModal.open({
                                            templateUrl: 'modals/modalOpenPos.html',
                                            controller: 'ModalOpenPosController',
                                            resolve: {
                                                openPosParameters: function () {
                                                    return {
                                                        isOpenPos: true,
                                                        previousYPeriod: previousYperiodButClosed,
                                                        zPeriodId: zPeriodId,
                                                        yPeriodId: yPeriodId
                                                    }
                                                }
                                            },
                                            backdrop: 'static'
                                        });

                                        modalInstance.result.then(function () {
                                            $http.get(urlCreateYPeriodApi, { timeout: 5000 }).
                                                success(function (yPeriod) {
                                                    successGetYPeriod();
                                                    retDefer.resolve(yPeriod);
                                                }).
                                                error(function () {
                                                    errorGetYPeriod();
                                                    retDefer.reject("Izibox API CreateYPeriod error");
                                                });

                                        }, function () {
                                            errorGetYPeriod();
                                            retDefer.reject();
                                        });
                                    }
                                } else {
                                    errorGetYPeriod();
                                    console.log("Pos closed : yperiod not exist or closed");
                                    retDefer.reject();
                                }
                            }
                            else if (forceOpenPopupEditMode) {
                                var modalInstance = $uibModal.open({
                                    templateUrl: 'modals/modalOpenPos.html',
                                    controller: 'ModalOpenPosController',
                                    resolve: {
                                        openPosParameters: function () {
                                            return {
                                                isOpenPos: true,
                                                previousYPeriod: previousYperiodButClosed,
                                                zPeriodId: zPeriod.id,
                                                yPeriodId: currentYPeriod.id,
                                                editMode: true
                                            }
                                        }
                                    },
                                    backdrop: 'static'
                                });

                                modalInstance.result.then(function () {
                                    successGetYPeriod();
                                    retDefer.resolve(yPeriod);
                                }, function () {
                                    errorGetYPeriod();
                                    retDefer.reject();
                                });
                            }
                            else {
                                successGetYPeriod();
                                retDefer.resolve(currentYPeriod);
                            }
                        }).
                        error(function () {
                            retDefer.reject("Izibox API LastYPeriod error");
                        });
                }).
                error(function (errGetYperiod) {
                    retDefer.reject("Izibox API GetYPeriod error");
                });

            return retDefer.promise;
        };

        this.closeYPeriodAsync = function (yPeriod, CashMovementLines, emptyCash) {
            var funcDefer = $q.defer();
            console.log(yPeriod);
            var isOwnPeriod = yPeriod.HardwareId == $rootScope.modelPos.hardwareId ? true : false;

            var urlApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period";

            if (!yPeriod.endDate) {

                var closeYPeriodRequest = {
                    actionPeriod: "CLOSEYPERIODBYID",
                    yperiodid: yPeriod.id,
                    yPeriodCount: {
                        emptyCash: emptyCash,
                        YCountLines: CashMovementLines
                    }
                };

                $http.post(urlApi, closeYPeriodRequest, { timeout: 5000 }).success(function (yPeriod) {
                    if (isOwnPeriod) {
                        $rootScope.modelPos.isPosOpen = false;
                    }
                    funcDefer.resolve(yPeriod);
                })
                .error(function (errSave) {
                    funcDefer.reject(errSave);
                });

            } else {
                funcDefer.reject("YPeriod : " + yPeriod.id + " already closed");
            }

            return funcDefer.promise;
        };

        this.closeZPeriodAsync = function (zPeriod) {
            var funcDefer = $q.defer();

            var isOwnPeriod = zPeriod.HardwareId == $rootScope.modelPos.hardwareId ? true : false;

            var urlApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/CLOSEZPERIODBYID?zperiodid=" + zPeriod.id;

            if (!zPeriod.endDate) {
                $http.get(urlApi, { timeout: 5000 }).success(function (zPeriod) {
                    if (isOwnPeriod) {
                        $rootScope.modelPos.isPosOpen = false;
                    }
                    funcDefer.resolve(zPeriod);
                }).error(function (errSave) {
                    funcDefer.reject(errSave);
                });
            } else {
                funcDefer.reject("ZPeriod : " + zPeriod.id + " already closed");
            }

            return funcDefer.promise;
        };

        this.emptyCashYPeriodAsync = function (yPeriod, cashMovementLines) {
            var funcDefer = $q.defer();

            if (yPeriod) {

                var updPaymentModesPrevious = [];
                var updCashMovementPrevious = [];

                if (cashMovementLines) {

                    var paymentCash = Enumerable.from(cashMovementLines).firstOrDefault(function (l) {
                        return l.PaymentMode.PaymentType == PaymentType.ESPECE;
                    });

                    if (paymentCash) {
                        // Crééer le motif négatif isSytem "Fin de service" du montant espèce yPeriod
                        cashMovementService.getMovementTypeCloseServiceAsync().then(function (motif) {

                            var newPaymentModePrevious = clone(paymentCash);

                            newPaymentModePrevious.PaymentMode.Total = newPaymentModePrevious.TotalKnown;

                            updPaymentModesPrevious.push(newPaymentModePrevious);

                            // Négatif seulement pour les infos du couchDB en partant du théorique
                            var newCashMovementPrevious = clone(newPaymentModePrevious.PaymentMode);
                            newCashMovementPrevious.Total = newCashMovementPrevious.Total * (-1);

                            updCashMovementPrevious.push(newCashMovementPrevious);

                            var dateOpen = yPeriod.endDate ? new Date(yPeriod.endDate).toString('dd/MM/yyyy H:mm:ss') : new Date().toString('dd/MM/yyyy H:mm:ss');

                            var openPosValuesPrevious = {
                                HardwareId: yPeriod.hardwareId,
                                PosUserId: yPeriod.userId,
                                Date: dateOpen,
                                MovementType_Id: motif.id,
                                zPeriodId: yPeriod.zPeriodId,
                                yPeriodId: yPeriod.id,
                                StoreId: $rootScope.IziBoxConfiguration.StoreId,
                                CashMovementLines: updPaymentModesPrevious
                            };


                            // Pour stoker l'historique des mouvements
                            var cashMovementPrevious = {
                                CashMovementLines: updCashMovementPrevious,
                                Date: openPosValuesPrevious.Date,
                                MovementType_Id: openPosValuesPrevious.MovementType_Id,
                                PosUserId: openPosValuesPrevious.PosUserId
                            };

                            // Mise a jour du PaymentValue du yPeriod 
                            current.updatePaymentValuesAsync(openPosValuesPrevious.yPeriodId, openPosValuesPrevious.zPeriodId, openPosValuesPrevious.HardwareId, updCashMovementPrevious, undefined, cashMovementPrevious).then(function (paymentValues) {

                                // Send to BO
                                cashMovementService.saveMovementAsync(openPosValuesPrevious).then(function (cashmovement) {
                                    funcDefer.resolve(cashmovement);
                                }, function (errSave) {
                                    funcDefer.reject(errSave);
                                });
                            }, function (errSave) {
                                funcDefer.reject(errSave);
                            });
                        }, function () {
                            funcDefer.reject("MovementTypeCloseService not found");
                        });
                    }
                    else {
                        funcDefer.reject("paymentCash : Is empty");
                    }
                }
                else {
                    funcDefer.reject("cashMovementLines : Is empty");
                }
            }
            else {
                funcDefer.reject("yPeriod : Is empty");
            }

            return funcDefer.promise;
        };

        this.getYCountLinesByHidAsync = function (zPeriodId, hardwareId) {
            var yCountLinesDefer = $q.defer();

            var urlApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/GETALLYPERIODS?hardwareId=" + hardwareId;

            $http.get(urlApi, { timeout: 5000 }).success(function (resYPeriods) {
                var yPeriodCash = {
                    zPeriodId: zPeriodId,
                    YCountLines: [],
                    nbY: 0
                };

                var yPeriodTotals = Enumerable.from(resYPeriods).orderBy("x => x.startDate").toArray();
                var yPeriods = [];
                var nbYPeriodCosed = 0;
                Enumerable.from(yPeriodTotals).forEach(function (yPeriod) {
                    if (yPeriod.zPeriodId == zPeriodId && yPeriod.hardwareId == hardwareId) {
                        if (yPeriod.endDate) {
                            ++nbYPeriodCosed;
                        }
                        yPeriods.push(yPeriod);
                    }
                });
                var indexYPeriod = 0;
                Enumerable.from(yPeriods).forEach(function (yPeriod) {

                    ++yPeriodCash.nbY;
                    ++indexYPeriod;

                    Enumerable.from(yPeriod.YCountLines).forEach(function (cm) {

                        // For cash payment we only take the last yPeriod
                        if (cm.PaymentMode.PaymentType !== PaymentType.ESPECE || indexYPeriod == nbYPeriodCosed) {
                            var line = Enumerable.from(yPeriodCash.YCountLines).firstOrDefault(function (l) {
                                return l.PaymentMode.Value == cm.PaymentMode.Value && l.PaymentMode.PaymentType == cm.PaymentMode.PaymentType;
                            });

                            if (line) {
                                line.Count = line.Count + cm.Count;
                                line.TotalKnown = line.TotalKnown + cm.TotalKnown;
                                line.PaymentMode.Total = roundValue(line.PaymentMode.Total + cm.PaymentMode.Total);
                            } else {
                                line = {
                                    Count: cm.Count,
                                    TotalKnown: cm.TotalKnown,
                                    PaymentMode: clone(cm.PaymentMode)
                                };

                                yPeriodCash.YCountLines.push(line);
                            }
                        }
                    });
                });

                yCountLinesDefer.resolve(yPeriodCash);
            }).error(function (erryPeriod) {
                yCountLinesDefer.reject(erryPeriod);
            });

            return yCountLinesDefer.promise;
        };

        this.getYCountLinesDetailsByHidAsync = function (zPeriodId, hardwareId) {
            var yCountLinesDefer = $q.defer();

            var urlApi = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/period/GETALLYPERIODS?hardwareId=" + hardwareId;

            $http.get(urlApi, { timeout: 5000 }).success(function (resYPeriods) {
                var yPeriodCashDetails = {
                    zPeriodId: zPeriodId,
                    yPeriods: []
                };

                Enumerable.from(resYPeriods).forEach(function (yPeriod) {
                    if (yPeriod.zPeriodId == zPeriodId && yPeriod.hardwareId == hardwareId) {
                        yPeriodCashDetails.yPeriods.push(clone(yPeriod));
                    }
                });

                yCountLinesDefer.resolve(yPeriodCashDetails);
            }).error(function (erryPeriod) {
                yCountLinesDefer.reject(erryPeriod);
            });

            return yCountLinesDefer.promise;
        };

        this.getZPaymentValuesByHidAsync = function (zPeriodId, hardwareId) {
            var paymentValuesDefer = $q.defer();

            var db = $rootScope.remoteDbZPos;

            db.rel.find('PaymentValues').then(function (resPaymentValues) {
                var zPaymentValues = {
                    zPeriodId: zPeriodId,
                    PaymentLines: []
                };

                var paymentValuesCollection = Enumerable.from(resPaymentValues.AllPaymentValues).forEach(function (pv) {
                    if (pv.zPeriodId == zPeriodId && pv.hardwareId == hardwareId) {
                        Enumerable.from(pv.PaymentLines).forEach(function (p) {
                            var line = Enumerable.from(zPaymentValues.PaymentLines).firstOrDefault(function (l) {
                                return l.PaymentMode.Value == p.PaymentMode.Value && l.PaymentMode.PaymentType == p.PaymentMode.PaymentType;
                            });

                            if (line) {
                                line.Count = line.Count + p.Count;
                                line.PaymentMode.Total = roundValue(line.PaymentMode.Total + p.PaymentMode.Total);
                            } else {
                                line = {
                                    Count: p.Count,
                                    PaymentMode: clone(p.PaymentMode)
                                };

                                zPaymentValues.PaymentLines.push(line);
                            }
                        });
                    }
                });

                // Recuperer les montants cagnottes dans la vue pour le z et le Hid
                $rootScope.remoteDbZPos.query("zpos/balanceByzPeriodAndHid", {
                    startkey: [zPeriodId, hardwareId],
                    endkey: [zPeriodId, hardwareId],
                    reduce: true,
                    group: true
                }).then(function (resBalance) {
                    var balanceByPeriod = {
                        PaymentMode: {
                            PaymentType: PaymentType.FIDELITE,
                            Text: "Ma Cagnotte",
                            Total: resBalance.rows[0] ? resBalance.rows[0].value : 0,
                            Value: "Ma Cagnotte",
                        }

                    };
                    if (zPaymentValues) {
                        zPaymentValues.PaymentLines.push(balanceByPeriod);
                    }
                    paymentValuesDefer.resolve(zPaymentValues);
                });

            }, function (errPV) {
                paymentValuesDefer.reject(errPV);
            });

            return paymentValuesDefer.promise;
        };

        this.getZPaymentValuesAsync = function (zPeriodId) {
            var paymentValuesDefer = $q.defer();

            var db = $rootScope.remoteDbZPos;

            db.rel.find('PaymentValues').then(function (resPaymentValues) {
                var zPaymentValues = {
                    zPeriodId: zPeriodId,
                    PaymentLines: []
                };

                var paymentValuesCollection = Enumerable.from(resPaymentValues.AllPaymentValues).forEach(function (pv) {
                    if (pv.zPeriodId == zPeriodId) {
                        Enumerable.from(pv.PaymentLines).forEach(function (p) {
                            var line = Enumerable.from(zPaymentValues.PaymentLines).firstOrDefault(function (l) {
                                return l.PaymentMode.Value == p.PaymentMode.Value && l.PaymentMode.PaymentType == p.PaymentMode.PaymentType;
                            });

                            if (line) {
                                line.Count = line.Count + p.Count;
                                line.PaymentMode.Total = roundValue(line.PaymentMode.Total + p.PaymentMode.Total);
                            } else {
                                line = {
                                    Count: p.Count,
                                    PaymentMode: clone(p.PaymentMode)
                                };

                                zPaymentValues.PaymentLines.push(line);
                            }
                        });
                    }
                });

                paymentValuesDefer.resolve(zPaymentValues);

            }, function (errPV) {
                paymentValuesDefer.reject(errPV);
            });

            return paymentValuesDefer.promise;
        };

        /**
         * Get the cash in hand value
         */
        this.getYPaymentValuesAsync = function (yPeriodId, notAddLoyalty) {
            var paymentValuesDefer = $q.defer();

            var db = $rootScope.remoteDbZPos;
            current.getZPeriodAsync(false).then(function (zp) {
                db.rel.find('PaymentValues', yPeriodId).then(function (resPaymentValues) {
                    var paymentValues = Enumerable.from(resPaymentValues.AllPaymentValues).firstOrDefault();
                    // Recuperer les montant cagnotte dans la vue
                    db.query("zpos/balanceByPeriod", {
                        startkey: [zp.id, yPeriodId],
                        endkey: [zp.id, yPeriodId],
                        reduce: true,
                        group: true
                    }).then(function (resBalance) {
                        var balanceByPeriod = {
                            PaymentMode: {
                                PaymentType: PaymentType.FIDELITE,
                                Text: "Ma Cagnotte",
                                Total: resBalance.rows[0] ? resBalance.rows[0].value : 0,
                                Value: "Ma Cagnotte",
                            }

                        };
                        if (paymentValues && !notAddLoyalty) {
                            paymentValues.PaymentLines.push(balanceByPeriod);
                        }
                        paymentValuesDefer.resolve(paymentValues);
                    });

                }, function (errPV) {
                    paymentValuesDefer.reject(errPV);
                });
            }, function (errZP) {
                paymentValuesDefer.reject(errZP);
            });


            return paymentValuesDefer.promise;
        };

        /**
         * Update the cash in hand value
         * @param newPaymentValues New values
         * @param oldPaymentValues Previous values
         */
        this.updatePaymentValuesAsync = function (yPeriodId, zPeriodId, hardwareId, newPaymentValues, oldPaymentValues, cashMovement) {
            var updateDefer = $q.defer();

            this.getYPaymentValuesAsync(yPeriodId, true).then(function (paymentValues) {

                if (!paymentValues) {
                    paymentValues = {
                        zPeriodId: zPeriodId,
                        yPeriodId: yPeriodId,
                        hardwareId: hardwareId,
                        id: yPeriodId
                    };
                }

                paymentValues.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

                if (!paymentValues.PaymentLines) {
                    paymentValues.PaymentLines = [];
                }

                if (oldPaymentValues) {
                    Enumerable.from(oldPaymentValues).forEach(function (p) {
                        var line = Enumerable.from(paymentValues.PaymentLines).firstOrDefault(function (l) {
                            return l.PaymentMode.Value == p.Value && l.PaymentMode.PaymentType == p.PaymentType;
                        });

                        if (line) {
                            line.Count = line.Count - 1;
                            line.PaymentMode.Total = roundValue(line.PaymentMode.Total - p.Total);
                            if (line.Count == 0) {
                                var idxLine = paymentValues.PaymentLines.indexOf(line);
                                if (idxLine != -1) {
                                    paymentValues.PaymentLines.splice(idxLine, 1);
                                }
                            }
                        }
                    });
                }

                if (newPaymentValues) {
                    Enumerable.from(newPaymentValues).forEach(function (p) {
                        var line = Enumerable.from(paymentValues.PaymentLines).firstOrDefault(function (l) {
                            return l.PaymentMode.Value == p.Value && l.PaymentMode.PaymentType == p.PaymentType;
                        });

                        if (line) {
                            line.Count = line.Count + 1;
                            line.PaymentMode.Total = roundValue(line.PaymentMode.Total + p.Total);
                        } else {
                            line = {
                                Count: 1,
                                PaymentMode: clone(p)
                            };

                            paymentValues.PaymentLines.push(line);
                        }
                    });
                }

                // Si c'est un movement d'espèce, on stock l'information
                if (cashMovement) {
                    if (!paymentValues.CashMovements) {
                        paymentValues.CashMovements = [];
                    }
                    paymentValues.CashMovements.push(cashMovement);
                }
                // BUG: document update conflict - that prevents us from using the most recent pouchdb version
                // TODO: Check for a solution
                // https://github.com/pouchdb/pouchdb/issues/1691

                $rootScope.remoteDbZPos.rel.save('PaymentValues', paymentValues).then(function () {
                    updateDefer.resolve(paymentValues);
                }, function (errSave) {
                    updateDefer.reject(errSave);
                })
            }, function (errPV) {
                updateDefer.reject(errPV);
            });

            return updateDefer.promise;
        };

        /**
         * Replace the cash in hand value, From Open Pos
         * @param newPaymentValues New values
         */
        this.replacePaymentValuesAsync = function (yPeriodId, zPeriodId, hardwareId, newPaymentValues, cashMovement) {
            var updateDefer = $q.defer();
            this.getYPaymentValuesAsync(yPeriodId).then(function (paymentValues) {

                if (!paymentValues) {
                    paymentValues = {
                        zPeriodId: zPeriodId,
                        yPeriodId: yPeriodId,
                        hardwareId: hardwareId,
                        id: yPeriodId
                    };
                }

                paymentValues.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

                if (!paymentValues.PaymentLines) {
                    paymentValues.PaymentLines = [];
                }

                if (newPaymentValues) {
                    Enumerable.from(newPaymentValues).forEach(function (p) {
                        var line = Enumerable.from(paymentValues.PaymentLines).firstOrDefault(function (l) {
                            return l.PaymentMode.Value == p.Value && l.PaymentMode.PaymentType == p.PaymentType;
                        });

                        if (line) {
                            line.Count = 1;
                            line.PaymentMode = clone(p);
                        } else {
                            line = {
                                Count: 1,
                                PaymentMode: clone(p)
                            };

                            paymentValues.PaymentLines.push(line);
                        }
                    });
                }

                // Si c'est un movement d'espèce, on stock l'information
                if (cashMovement) {
                    if (!paymentValues.CashMovements) {
                        paymentValues.CashMovements = [];
                    }
                    paymentValues.CashMovements.push(cashMovement);
                }

                // BUG: document update conflict - that prevents us from using the most recent pouchdb version
                // TODO: Check for a solution
                // https://github.com/pouchdb/pouchdb/issues/1691
                $rootScope.remoteDbZPos.rel.save('PaymentValues', paymentValues).then(function () {
                    updateDefer.resolve(paymentValues);
                }, function (errSave) {
                    updateDefer.reject(errSave);
                })
            }, function (errPV) {
                updateDefer.reject(errPV);
            });

            return updateDefer.promise;
        };

        this.getYperiodFromZperiodAsync = function (zpid) {

            var ypzDefer = $q.defer();
            var ypz = [];

            current.getAllYPeriodAsync('*').then(function (yPeriods) {
                var dateNow = new Date();

                Enumerable.from(yPeriods).firstOrDefault(function (yPeriod) {
                    var isValidYPeriod = false;
                    isValidYPeriod = dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId === zpid;

                    if (isValidYPeriod) {
                        ypz.push(yPeriod);
                    }
                });

                ypzDefer.resolve(ypz);
            }, function () {
                ypzDefer.reject();
            });

            return ypzDefer.promise;
        };


        this.forceOpenCashMachineAsync = function (currentYPeriod, totalKnown) {

            var forceDefert = $q.defer();
            settingService.getPaymentModesAsync().then(function (paymentSetting) {

                var paymentModesAvailable = paymentSetting;

                var cashPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (x) {
                    return x.PaymentType == PaymentType.ESPECE;
                });

                if (cashPaymentMode) {
                    // Crééer le motif positif isSytem "Ouverture de service" du montant espèce yPeriod
                    cashMovementService.getMovementTypeOpenServiceAsync().then(function (motif) {

                        var dateOpen = new Date().toString('dd/MM/yyyy H:mm:ss');

                        var openPosValues = {
                            HardwareId: currentYPeriod.hardwareId,
                            PosUserId: $rootScope.PosUserId,
                            Date: dateOpen,
                            MovementType_Id: motif.id,
                            zPeriodId: currentYPeriod.zPeriodId,
                            yPeriodId: currentYPeriod.yPeriodId,
                            StoreId: $rootScope.IziBoxConfiguration.StoreId,
                            CashMovementLines: []
                        };

                        var addPaymentMode = {
                            PaymentType: cashPaymentMode.PaymentType,
                            Value: cashPaymentMode.Value,
                            Text: cashPaymentMode.Text,
                            Total: totalKnown,
                            IsBalance: cashPaymentMode.IsBalance
                        };

                        var lineOpenPos = {
                            PaymentMode: addPaymentMode
                        };

                        openPosValues.CashMovementLines.push(lineOpenPos);

                        // Send to BO
                        cashMovementService.saveMovementAsync(openPosValues);

                        var updPaymentModes = [];

                        var newPaymentMode = clone(openPosValues.CashMovementLines[0].PaymentMode);

                        newPaymentMode.Total = roundValue(parseFloat(newPaymentMode.Total).toFixed(2));

                        updPaymentModes.push(newPaymentMode);

                        // Pour stoker l'historique des mouvements
                        var cashMovement = {
                            CashMovementLines: updPaymentModes,
                            Date: openPosValues.Date,
                            MovementType_Id: openPosValues.MovementType_Id,
                            PosUserId: openPosValues.PosUserId
                        };


                        current.updatePaymentValuesAsync(currentYPeriod.yPeriodId, currentYPeriod.zPeriodId, currentYPeriod.hardwareId, updPaymentModes, undefined, cashMovement).then(function (paymentMode) {

                            // Ouverture de la modale OpenPos en mode "Gestion des espèces"
                            var modalInstance = $uibModal.open({
                                templateUrl: 'modals/modalOpenPos.html',
                                controller: 'ModalOpenPosController',
                                resolve: {
                                    openPosParameters: function () {
                                        return {
                                            isOpenPos: false,
                                            previousYPeriod: undefined,
                                            zPeriodId: currentYPeriod.zPeriodId,
                                            yPeriodId: currentYPeriod.yPeriodId,
                                            forceOpen: true
                                        }
                                    }
                                },
                                backdrop: 'static'
                            });

                            modalInstance.result.then(function () {

                                console.log("on force la fermeture");
                                current.forceCloseYPeriodAsync(currentYPeriod).then(function (yPeriod) {

                                    forceDefert.resolve(yPeriod);
                                }, function () {

                                    console.log("Erreur après ouverture Forcé");
                                    forceDefert.reject(errSave);
                                });
                            }, function () {

                                console.log("Erreur après ouverture Forcé");
                                forceDefert.reject(errSave);
                            });
                        });

                    }, function (errSave) {

                        console.log("Force Open : No cashMovement type 'Ouverture de service' ");
                        forceDefert.reject(errSave);
                    });
                }
                else {
                    console.log("Force Open : No paymentsMode Cash");
                    forceDefert.reject(errSave);
                }
            }, function (errSave) {

                console.log("Force Open : No paymentsMode");
                forceDefert.reject(errSave);
            });

            return forceDefert.promise;

        }

        this.forceCloseYPeriodAsync = function (currentYPeriod) {

            var forceCloseDefert = $q.defer();

            var CashMovementLines = [];

            settingService.getPaymentModesAsync().then(function (paymentSetting) {

                Enumerable.from(paymentSetting).forEach(function (p) {
                    var addPaymentMode = {
                        PaymentType: p.PaymentType,
                        Value: p.Value,
                        Text: p.Text,
                        Total: 0,
                        IsBalance: p.IsBalance ? true : false
                    };

                    var lineClosePos = {
                        PaymentMode: addPaymentMode,
                        Count: 0,
                        TotalKnown: 0,
                        CashDiscrepancyYs: 0
                    };

                    CashMovementLines.push(lineClosePos);
                });

                // Get the PaymentValue of the yPeriod
                current.getYPaymentValuesAsync(currentYPeriod.yPeriodId).then(function (paymentValues) {
                    if (paymentValues) {

                        Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                            var lineClose = Enumerable.from(CashMovementLines).firstOrDefault(function (x) {
                                return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                            });
                            if (lineClose) {
                                // Renseigner le nombre attendu
                                lineClose.Count = l.Count;
                                // Renseigné du montant attendu
                                lineClose.PaymentMode.Total = l.PaymentMode.Total;
                                lineClose.TotalKnown = l.PaymentMode.Total;
                            }
                        });
                        current.closeYPeriodAsync(currentYPeriod, CashMovementLines, false).then(function (yPeriod) {
                            // Si vider le cash, création d'un mouvement fermeture
                            //posPeriodService.emptyCashYPeriodAsync($scope.closePosParameters.yperiod, hardwareIdModel.CashMovementLines).then(function () {

                            //});

                            forceCloseDefert.resolve(yPeriod);

                        }, function (errSave) {

                            console.log("Force close service : Error durring yClose");
                            forceCloseDefert.reject(errSave);
                        });

                    }
                    else {
                        console.log("Force close service : No PaymentValue for the yPeriod");
                        forceCloseDefert.reject(errSave);
                    }
                }, function (errSave) {

                    console.log("Force close service : Error when Get the PaymentValue of the yPeriod");
                    forceCloseDefert.reject(errSave);
                });
            }, function (errSave) {

                console.log("Force close service : No paymentMode");
                forceCloseDefert.reject(errSave);
            });

            return forceCloseDefert.promise;

        }
    }]);