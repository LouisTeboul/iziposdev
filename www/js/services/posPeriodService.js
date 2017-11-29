app.service('posPeriodService', ['$http', '$rootScope', '$q', '$uibModal', 'posLogService', 'uuid2', 'cashMovementService', 'settingService',
    function ($http, $rootScope, $q, $uibModal, posLogService, uuid2, cashMovementService, settingService) {
        var current = this;

        this.initPeriodListener = function () {
            $rootScope.$on('dbUtilsUpdated', function (event, args) {
                current.getYPeriodAsync($rootScope.modelPos.hardwareId,undefined,false,false);
            });
        };

        /// <summary>
        /// Obtains (and optionnaly create) the current ZPeriod
        /// </summary>
        /// <param name="create">If true, ZPeriod is created if not exists</param>
        /// <returns>Current ZPeriod</returns>
        this.getZPeriodAsync = function (create) {
            var retDefer = $q.defer();

            $rootScope.remoteDbUtils.rel.find('ZPeriod').then(function (res) {
                var dateNow = new Date();
                var currentZPeriod = Enumerable.from(res.ZPeriods).firstOrDefault(function (zPeriod) {
                    var isValidZPeriod = false;

                    isValidZPeriod = !zPeriod.endDate && dateNow > new Date(zPeriod.startDate);

                    return isValidZPeriod;
                });

                if (!currentZPeriod) {

                    if (create == undefined || create) {
                        var guid = uuid2.newguid();
                        currentZPeriod = {
                            id: guid,
                            zPeriodId: guid,
                            hardwareId: $rootScope.modelPos.hardwareId,
                            storeId: $rootScope.IziBoxConfiguration.StoreId,
                            startDate: dateNow,
                            endDate: undefined
                        };

                        $rootScope.remoteDbUtils.rel.save('ZPeriod', currentZPeriod).then(function (resSave) {
                            var currentZPeriod = resSave.ZPeriods[0];

                            var repZPeriod = clone(currentZPeriod);
                            repZPeriod.rev = undefined;

                            $rootScope.remoteDbReplicate.rel.save('ZPeriod', repZPeriod).then(function () {
                                console.log("Replicate Open ZPeriod : success");
                            }, function (errRep) {
                                console.error("Replicate Open ZPeriod : ");
                                console.error(errRep);
                            });
                            retDefer.resolve(currentZPeriod);
                        }, function (errSave) {
                            retDefer.reject(errSave);
                        });
                    } else {
                        retDefer.reject('???');
                    }
                } else {
                    retDefer.resolve(currentZPeriod);
                }
            }, function (errGet) {
                retDefer.reject(errGet);
            });

            return retDefer.promise;
        };


        this.getAllYPeriodAsync = function (hardwareId) {
            var retDefer = $q.defer();

            if(jQuery.isEmptyObject(hardwareId)){
                retDefer.resolve(false);
                return retDefer.promise;
            }

            this.getZPeriodAsync(false).then(function (zPeriod) {

                $rootScope.remoteDbUtils.rel.find('YPeriod').then(function (res) {
                    var dateNow = new Date();

                    var allYPeriod = [];

                    Enumerable.from(res.YPeriods).forEach(function (yPeriod) {
                        var isValidYPeriod = false;


                        if(hardwareId == "*"){
                            isValidYPeriod = dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId === zPeriod.id;
                        } else {
                            isValidYPeriod = yPeriod.hardwareId === hardwareId && dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId === zPeriod.id;
                        }

                        if(isValidYPeriod) {
                            allYPeriod.push(yPeriod);
                        }

                    });

                    //Trier les periodes par date croissante
                    allYPeriod.sort(function(a,b){
                        // Turn your strings into dates, and then subtract them
                        // to get a value that is either negative, positive, or zero.
                        return new Date(a.startDate) - new Date(b.startDate);
                    });
                    retDefer.resolve(allYPeriod);

                }, function (errGet) {
                    retDefer.reject(errGet);
                });
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
            var isOwnPeriod = hardwareId == $rootScope.modelPos.hardwareId ? true : false;

            if (!$rootScope.modelPos.iziboxConnected) {
                retDefer.resolve({});
            }

            this.getZPeriodAsync(create).then(function (zPeriod) {

                $rootScope.remoteDbUtils.rel.find('YPeriod').then(function (res) {
                    var dateNow = new Date();

                    var currentYPeriod = Enumerable.from(res.YPeriods).firstOrDefault(function (yPeriod) {
                        var isValidYPeriod = false;

                        isValidYPeriod = !yPeriod.endDate && yPeriod.hardwareId === hardwareId && dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId === zPeriod.id;

                        return isValidYPeriod;
                    });

                    var previousYperiodButClosed = undefined;
                    Enumerable.from(res.YPeriods).forEach(function (yPeriod) {
                        if (yPeriod.endDate && yPeriod.hardwareId === hardwareId && dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId === zPeriod.id) {

                            if (!previousYperiodButClosed) {
                                previousYperiodButClosed = yPeriod;
                            }
                            else if (previousYperiodButClosed.endDate < yPeriod.endDate) {
                                previousYperiodButClosed = yPeriod;
                            }
                        }

                    });

                    if (!currentYPeriod) {

                        if (create == undefined || create) {

                            var guid = uuid2.newguid();
                            currentYPeriod = {
                                id: guid,
                                yPeriodId: guid,
                                zPeriodId: zPeriod.id,
                                startDate: dateNow,
                                endDate: undefined,
                                hardwareId: hardwareId,
                                userId: userId
                            };

                            // Ouverture forcée de service avec montant théorique du service précédent si il y en a un
                            if (forceOpenService) {
                                $rootScope.remoteDbUtils.rel.save('YPeriod', currentYPeriod).then(function (resSave) {
                                    if (isOwnPeriod) {
                                        $rootScope.modelPos.isPosOpen = true;
                                    }
                                    console.log("Pos opened");


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
                                }, function (errSave) {
                                    if (isOwnPeriod) {
                                        $rootScope.modelPos.isPosOpen = false;
                                    }
                                    console.error("Pos closed : error save yPeriod");
                                    console.error(errSave);
                                    retDefer.reject(errSave);
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
                                                zPeriodId: zPeriod.id,
                                                yPeriodId: currentYPeriod.id
                                            }
                                        }
                                    },
                                    backdrop: 'static'
                                });

                                modalInstance.result.then(function () {
                                    $rootScope.remoteDbUtils.rel.save('YPeriod', currentYPeriod).then(function (resSave) {
                                        if (isOwnPeriod) {
                                            $rootScope.modelPos.isPosOpen = true;
                                        }
                                        console.log("Pos opened");
                                        retDefer.resolve(resSave);
                                    }, function (errSave) {
                                        if (isOwnPeriod) {
                                            $rootScope.modelPos.isPosOpen = false;
                                        }
                                        console.error("Pos closed : error save yPeriod");
                                        console.error(errSave);
                                        retDefer.reject(errSave);
                                    });
                                }, function () {
                                    if (isOwnPeriod) {
                                        $rootScope.modelPos.isPosOpen = false;
                                    }
                                    console.log("Pos closed : cancelled");
                                    retDefer.reject();
                                });
                            }
                        } else {
                            if(isOwnPeriod) {
                                $rootScope.modelPos.isPosOpen = false;
                            }
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
                    }
                    else {
                        if(isOwnPeriod) {
                            $rootScope.modelPos.isPosOpen = true;
                        }
                        console.log("Pos opened");
                        retDefer.resolve(currentYPeriod);
                    }
                }, function (errGet) {
                    if(isOwnPeriod) {
                        $rootScope.modelPos.isPosOpen = false;
                    }
                    console.log("Pos closed : forceopen cancelled");
                    retDefer.reject(errGet);
                });
            }, function (errGet) {

                if (errGet.code == "ETIMEDOUT") {
                    retDefer.resolve({});
                } else {
                    if (isOwnPeriod) {
                        $rootScope.modelPos.isPosOpen = false;
                    }
                    console.error("Pos closed : error read yPeriod");
                    console.error(errGet);
                    retDefer.reject(errGet);
                }
            });
            return retDefer.promise;
        };

        this.closeYPeriodAsync = function (yPeriod, CashMovementLines, emptyCash) {
            var funcDefer = $q.defer();
            console.log(yPeriod);
            var isOwnPeriod = yPeriod.HardwareId == $rootScope.modelPos.hardwareId ? true : false;

            if (!yPeriod.endDate) {
                $rootScope.remoteDbUtils.rel.find('YPeriod', yPeriod.id).then(function (resYPeriod) {
                    if (resYPeriod.YPeriods.length > 0) {
                        var currentYPeriod = resYPeriod.YPeriods[0];
                        currentYPeriod.endDate = new Date();
                        currentYPeriod.YCountLines = CashMovementLines;
                        currentYPeriod.emptyCash = emptyCash;
                        $rootScope.remoteDbUtils.rel.save('YPeriod', currentYPeriod).then(function () {
                            if(isOwnPeriod){
                                $rootScope.modelPos.isPosOpen = false;
                            }
                            funcDefer.resolve(currentYPeriod);
                        }, function (errSave) {
                            funcDefer.reject(errSave);
                        });
                    }
                }, function () {
                    funcDefer.reject("YPeriod not found");
                });
            } else {
                funcDefer.reject("YPeriod : " + yPeriod.id + " already closed");
            }

            return funcDefer.promise;
        };

        this.purgeZPeriodAsync = function (zPeriod) {
            this.getYperiodFromZperiodAsync(zPeriod.zPeriodId).then(function (yPeriods) {
                Enumerable.from(yPeriods).forEach(function (yPeriod) {
                    $rootScope.remoteDbUtils.rel.del('YPeriod', yPeriod);
                });
                $rootScope.remoteDbUtils.rel.del('ZPeriod', zPeriod);
            });
        };

        this.closeZPeriodAsync = function (zPeriod) {
            var funcDefer = $q.defer();

            var isOwnPeriod = zPeriod.HardwareId == $rootScope.modelPos.hardwareId ? true : false;

            if (!zPeriod.endDate) {
                $rootScope.remoteDbUtils.rel.find('ZPeriod', zPeriod.id).then(function (resZPeriod) {
                    if (resZPeriod.ZPeriods.length > 0) {
                        var currentZPeriod = resZPeriod.ZPeriods[0];
                        currentZPeriod.endDate = new Date();
                        $rootScope.remoteDbUtils.rel.save('ZPeriod', currentZPeriod).then(function () {
                            var ZPeriodRep = clone(currentZPeriod);
                            ZPeriodRep.rev = undefined;
                            $rootScope.dbReplicate.rel.save('ZPeriod', ZPeriodRep).then(function () {
                                console.log("Replicate Close ZPeriod : success");
                                current.purgeZPeriodAsync(currentZPeriod);
                            }, function (errRep) {
                                console.error("Replicate Close ZPeriod : ");
                                console.error(errRep);
                            });

                            if(isOwnPeriod){
                                $rootScope.modelPos.isPosOpen = false;
                            }
                            funcDefer.resolve(currentZPeriod);
                        }, function (errSave) {
                            funcDefer.reject(errSave);
                        });
                    }
                }, function () {
                    funcDefer.reject("ZPeriod not found");
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

            var db = $rootScope.remoteDbUtils;

            db.rel.find('YPeriod').then(function (resYPeriods) {
                var yPeriodCash = {
                    zPeriodId: zPeriodId,
                    YCountLines: [],
                    nbY: 0
                };

                var yPeriodTotals = Enumerable.from(resYPeriods.YPeriods).orderBy("x => x.startDate").toArray();
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
            }, function (erryPeriod) {
                yCountLinesDefer.reject(erryPeriod);
            });

            return yCountLinesDefer.promise;
        };

        this.getYCountLinesDetailsByHidAsync = function (zPeriodId, hardwareId) {
            var yCountLinesDefer = $q.defer();

            var db = $rootScope.remoteDbUtils;

            db.rel.find('YPeriod').then(function (resYPeriods) {
                var yPeriodCashDetails = {
                    zPeriodId: zPeriodId,
                    yPeriods: []
                };

                Enumerable.from(resYPeriods.YPeriods).forEach(function (yPeriod) {
                    if (yPeriod.zPeriodId == zPeriodId && yPeriod.hardwareId == hardwareId) {
                        yPeriodCashDetails.yPeriods.push(clone(yPeriod));
                    }
                });

                yCountLinesDefer.resolve(yPeriodCashDetails);
            }, function (erryPeriod) {
                yCountLinesDefer.reject(erryPeriod);
            });

            return yCountLinesDefer.promise;
        };

        this.getZPaymentValuesByHidAsync = function (zPeriodId,hardwareId) {
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
            current.getZPeriodAsync(false).then(function(zp){
                db.rel.find('PaymentValues', yPeriodId).then(function (resPaymentValues) {
                    console.log(resPaymentValues);
                    var paymentValues = Enumerable.from(resPaymentValues.AllPaymentValues).firstOrDefault();
                    // Recuperer les montant cagnotte dans la vue
                    console.log(zp.id, yPeriodId);
                    $rootScope.remoteDbZPos.query("zpos/balanceByPeriod", {
                        startkey: [zp.id, yPeriodId],
                        endkey: [zp.id, yPeriodId],
                        reduce: true,
                        group: true
                    }).then(function(resBalance){
                        var balanceByPeriod = {
                            PaymentMode: {
                                PaymentType: PaymentType.FIDELITE,
                                Text : "Ma Cagnotte",
                                Total : resBalance.rows[0] ?resBalance.rows[0].value : 0,
                                Value: "Ma Cagnotte",
                            }

                        };
                        if (paymentValues && !notAddLoyalty){
                            paymentValues.PaymentLines.push(balanceByPeriod);
                        }
                        paymentValuesDefer.resolve(paymentValues);
                    });

                }, function (errPV) {
                    paymentValuesDefer.reject(errPV);
                });
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



        this.getDateYPeriodAsync = function (zpid, ypid){
            var datePeriodDefer = $q.defer();
            var datePeriod = {};
            $rootScope.remoteDbUtils.rel.find('YPeriod').then(function (res) {
                var dateNow = new Date();

                Enumerable.from(res.YPeriods).firstOrDefault(function (yPeriod) {
                    var isValidYPeriod = false;
                    isValidYPeriod = yPeriod.id == ypid && dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId == zpid;
                    if(isValidYPeriod){
                        datePeriod.start = yPeriod.startDate;
                        datePeriod.end = yPeriod.endDate;
                    }
                });

                datePeriodDefer.resolve(datePeriod);


            });

            return datePeriodDefer.promise;
        };


        this.getYperiodFromZperiodAsync = function(zpid){

            var ypzDefer = $q.defer();
            var ypz = [];

            $rootScope.remoteDbUtils.rel.find('YPeriod').then(function (res) {
                var dateNow = new Date();

                Enumerable.from(res.YPeriods).firstOrDefault(function (yPeriod) {
                    var isValidYPeriod = false;
                    isValidYPeriod = dateNow > new Date(yPeriod.startDate) && yPeriod.zPeriodId === zpid;

                    if(isValidYPeriod){
                        ypz.push(yPeriod);
                    }
                });

                ypzDefer.resolve(ypz);
            });

            return ypzDefer.promise ;
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
                                            forceOpen : true
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
                        IsBalance: p.IsBalance ? true : false,
                        cashDiscrepancyYs: 0
                    };

                    var lineClosePos = {
                        PaymentMode: addPaymentMode,
                        Count: 0,
                        TotalKnown: 0
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