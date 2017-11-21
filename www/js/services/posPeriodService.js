app.service('posPeriodService', ['$http', '$rootScope', '$q', '$uibModal', 'posLogService', 'uuid2', 'cashMovementService',
    function ($http, $rootScope, $q, $uibModal, posLogService, uuid2, cashMovementService) {
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

                            $rootScope.remoteDbReplicate.rel.save('ZPeriod', currentZPeriod).then(function () {
                                console.log("Replicate Open ZPeriod : success");
                            }, function (errRep) {
                                console.error("Replicate Open ZPeriod : "+errRep)
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
        this.getYPeriodAsync = function (hardwareId, userId, create, forceOpenPopupEditMode) {
            var retDefer = $q.defer();
            var isOwnPeriod = hardwareId == $rootScope.modelPos.hardwareId ? true : false;

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
                                    if(isOwnPeriod) {
                                        $rootScope.modelPos.isPosOpen = true;
                                    }
                                    console.log("Pos opened");
                                    retDefer.resolve(currentYPeriod);
                                }, function (errSave) {
                                    if(isOwnPeriod) {
                                        $rootScope.modelPos.isPosOpen = false;
                                    }
                                    console.log("Pos closed : error save yPeriod");
                                    retDefer.reject(errSave);
                                });
                            }, function () {
                                if(isOwnPeriod) {
                                    $rootScope.modelPos.isPosOpen = false;
                                }
                                console.log("Pos closed : cancelled");
                                retDefer.reject();
                            });
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
                if(isOwnPeriod) {
                    $rootScope.modelPos.isPosOpen = false;
                }
                console.log("Pos closed : error read yPeriod");
                retDefer.reject(errGet);
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
                                console.error("Replicate Close ZPeriod : " + errRep)
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

        this.emptyCashYPeriod = function (yPeriod, cashMovementLines) {
            var funcDefer = $q.defer();

            if (yPeriod) {

                var updPaymentModesPrevious = [];
                var updCashMovementPrevious = [];

                if (cashMovementLines) {

                    var paymentCash = Enumerable.from(cashMovementLines).firstOrDefault(function (l) {
                        return l.PaymentMode.PaymentType == 1;
                    });

                    if (paymentCash) {
                        // Crééer le motif négatif isSytem "Fin de service" du montant espèce yPeriod
                        cashMovementService.getMovementTypeCloseServiceAsync().then(function (motif) {

                            var newPaymentModePrevious = clone(paymentCash);

                            updPaymentModesPrevious.push(newPaymentModePrevious);

                            // Négatif seulement pour les infos du couchDB
                            var newCashMovementPrevious = clone(newPaymentModePrevious.PaymentMode);
                            newCashMovementPrevious.Total = newCashMovementPrevious.Total * (-1);

                            updCashMovementPrevious.push(newCashMovementPrevious);

                            var dateOpen = new Date().toString('dd/MM/yyyy H:mm:ss');

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


                            // Send to BO
                            cashMovementService.saveMovementAsync(openPosValuesPrevious);

                            // Pour stoker l'historique des mouvements
                            var cashMovementPrevious = {
                                CashMovementLines: updCashMovementPrevious,
                                Date: openPosValuesPrevious.Date,
                                MovementType_Id: openPosValuesPrevious.MovementType_Id,
                                PosUserId: openPosValuesPrevious.PosUserId
                            };

                            // Mise a jour du PaymentValue du yPeriod 
                            current.updatePaymentValuesAsync(openPosValuesPrevious.yPeriodId, openPosValuesPrevious.zPeriodId, openPosValuesPrevious.HardwareId, updCashMovementPrevious, undefined, cashMovementPrevious).then(function (paymentValues) {
                                funcDefer.resolve(paymentValues);
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

                Enumerable.from(resYPeriods.YPeriods).forEach(function (yPeriod) {
                    if (yPeriod.zPeriodId == zPeriodId && yPeriod.hardwareId == hardwareId) {

                        ++yPeriodCash.nbY;

                        Enumerable.from(yPeriod.YCountLines).forEach(function (cm) {
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
                        });
                    }
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
                            PaymentType: 9,
                            Text: "Cagnotte",
                            Total: resBalance.rows[0] ? resBalance.rows[0].value : 0,
                            Value: "Cagnotte",
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
        this.getYPaymentValuesAsync = function (yPeriodId) {
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
                                PaymentType : 9,
                                Text : "Cagnotte",
                                Total : resBalance.rows[0] ?resBalance.rows[0].value : 0,
                                Value: "Cagnotte",
                            }

                        };
                        if(paymentValues){
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

    }]);