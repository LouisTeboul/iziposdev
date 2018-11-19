app.controller('ModalClosePosController', function ($scope, $rootScope, $http, $uibModal, $uibModalInstance, $translate, $q, settingService, shoppingCartService, eventService, cashMovementService, zposService, posPeriodService, closePosParameters, modalStats, posUserService, posService, shoppingCartModel) {
    $scope.closePosParameters = closePosParameters;
    $scope.paymentType = PaymentType;

    let checkLockInterval = null;

    const checkValidateLock = function () {
        //$rootScope.validateLock = true;

        checkLockInterval = setInterval(function () {
            $scope.model.hardwareIdModels.forEach(function (hidMdl) {
                function checkYperiod(ypid) {
                    let checkDefer = $q.defer();
                    let db = $rootScope.remoteDbZPos;
                    db.find({
                        selector: {
                            _id: {$regex: 'ShoppingCart_1_*'},
                            "data.yPeriodId": ypid,
                            "data.Canceled": false
                        }
                    }).then((resTick) => {
                        db.find({
                            selector: {
                                _id: {$regex: 'PaymentValues_2_*'},
                                "data.yPeriodId": ypid
                            }
                        }).then((resPv) => {
                            console.log(resPv.docs[0].data.Count, resTick.docs.length);
                            if (resPv.docs[0].data.Count === resTick.docs.length) {
                                checkDefer.resolve(false);
                            } else {
                                checkDefer.resolve(true);
                            }
                        }, (err) => {
                            console.log(err);
                            clearInterval(checkLockInterval);
                        })
                    });
                    return checkDefer.promise;
                }

                if (hidMdl.ypid) {
                    checkYperiod(hidMdl.ypid).then((res) => {
                        $rootScope.validateLock = res;
                    })
                } else {
                    let db = new PouchDB(`http://${$rootScope.IziBoxConfiguration.LocalIpIziBox}:5984/utils`);
                    db.find({
                        selector: {
                            _id: {$regex: 'YPeriod_2_*'},
                            "data.hardwareId": hidMdl.hid,
                            "data.endDate": null
                        }
                    }).then((res) => {
                        let validArray = [];
                        res.docs.forEach((yp, idx, arr) => {
                            checkYperiod(yp.data.id).then((res) => {
                                validArray.push(res);
                                if (idx === arr.length - 1) {
                                    let testUnlock = (val) => {
                                        return val === false
                                    };
                                    console.log(validArray);
                                    if (validArray.every(testUnlock)) {
                                        $rootScope.validateLock = false;
                                    }
                                }
                            });
                        });
                    }, (err) => {
                        console.log(err);
                    })
                }
            });

            if (!$rootScope.validateLock) {
                clearInterval(checkLockInterval);
            }
        }, 5000);
    };

    $scope.init = function (reload = false, savedModel = {}) {
        $rootScope.validateLock = false;
        // checkValidateLock();
        if (savedModel) {
            function getmatchedPmTotal(hid, paymentType) {
                const matchedHidMdl = Enumerable.from(savedModel).firstOrDefault(function (hidModel) {
                    return hidModel.hid == hid;
                });

                if (matchedHidMdl) {
                    const matchedCm = Enumerable.from(matchedHidMdl.CashMovementLines).firstOrDefault(function (cml) {
                        return cml.PaymentMode.PaymentType == paymentType;
                    });

                    if (matchedCm) {
                        return roundValue(matchedCm.PaymentMode.Total);
                    }
                }
            }
        }

        $scope.model = {
            hardwareIdModels: [],
            emptyCash: false,
            zRecap: [],
            hasAtLeastOneCashMachineWithSeveralService: false,
            closingEnable: posUserService.isEnable('CLOS', true),
            showCloseButton: true
        };

        if (reload) {
            $scope.model.zRecap = [];
        }

        settingService.getPaymentModesAsync().then(function (paymentSetting) {
            const paymentModesAvailable = paymentSetting;
            const dateClose = new Date().toString('dd/MM/yyyy H:mm:ss');

            $scope.closePosValues = {
                HardwareId: $rootScope.PosLog.HardwareId,
                PosUserId: $rootScope.PosUserId,
                Date: dateClose,
                MovementType_Id: 0,
                zPeriodId: closePosParameters.zperiod.id,
                StoreId: $rootScope.IziBoxConfiguration.StoreId,
                CashMovementLines: []
            };

            for (let p of paymentModesAvailable) {
                let addPaymentMode = {
                    PaymentType: p.PaymentType,
                    Value: p.Value,
                    Text: p.Text,
                    Total: 0,
                    IsBalance: p.IsBalance ? true : false
                };

                let lineClosePos = {
                    PaymentMode: addPaymentMode,
                    Count: 0,
                    TotalKnown: 0,
                    CashDiscrepancyYs: 0
                };
                $scope.closePosValues.CashMovementLines.push(lineClosePos);
                $scope.model.zRecap.push(lineClosePos);
            }
            const lineBalance = {
                PaymentMode: {
                    PaymentType: PaymentType.FIDELITE,
                    Value: "Ma Cagnotte",
                    Text: "Ma Cagnotte",
                    Total: 0,
                    IsBalance: true
                },
                Count: 0,
                TotalKnown: 0,
                CashDiscrepancyYs: 0
            };
            $scope.closePosValues.CashMovementLines.push(lineBalance);
            $scope.model.zRecap.push(lineBalance);
            //Ajouter le paiement cagnotte

            switch ($scope.closePosParameters.mode.idMode) {
                case 1:
                    //Fermeture de service
                    //Il n'y a toujours qu'un seul HID
                    posService.getPosNameAsync($scope.closePosParameters.hid).then(function (alias) {
                        let newHidModel = {
                            hid: $scope.closePosParameters.hid,
                            ypid: $scope.closePosParameters.yperiod.id,
                            alias: alias,
                            CashMovementLines: []
                        };

                        $scope.model.hardwareIdModels.push(newHidModel);

                        for (let line of $scope.closePosValues.CashMovementLines) {
                            newHidModel.CashMovementLines.push(clone(line));
                        }

                        posPeriodService.getYPaymentValuesAsync($scope.closePosParameters.yperiod.id).then(function (paymentValues) {
                            if (paymentValues) {
                                for (let l of paymentValues.PaymentLines) {
                                    let lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                        return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                    });

                                    if (lineClose) {
                                        // Pré-renseigner le nombre attendu
                                        lineClose.Count = l.Count;
                                        // Pré-renseigné du montant attendu
                                        lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                        lineClose.TotalKnown = roundValue(l.PaymentMode.Total);
                                    } else {
                                        l.TotalKnown = roundValue(l.PaymentMode.Total);
                                        newHidModel.CashMovementLines.push(l);
                                    }
                                }

                                if (reload) {
                                    //On parcours les Hid model
                                    for (let hidm of $scope.model.hardwareIdModels) {
                                        const currentHid = hidm.hid;
                                        for (let cm of hidm.CashMovementLines) {
                                            const currentPmId = cm.PaymentMode.PaymentType;
                                            if (getmatchedPmTotal(currentHid, currentPmId)) {
                                                cm.PaymentMode.Total = getmatchedPmTotal(currentHid, currentPmId);
                                            }
                                        }
                                    }
                                }

                            }
                        });
                        console.log(newHidModel);
                    });

                    break;


                case 2:
                    //Fermeture de la caisse
                    posService.getPosNameAsync($scope.closePosParameters.hid).then(function (alias) {
                        let newHidModel = {
                            hid: $scope.closePosParameters.hid,
                            alias: alias,
                            CashMovementLines: []
                        };

                        $scope.model.hardwareIdModels.push(newHidModel);

                        for (let line of $scope.closePosValues.CashMovementLines) {
                            newHidModel.CashMovementLines.push(clone(line));
                        }

                        //Vérification si il y a une yPeriod a fermer
                        posPeriodService.getYPeriodAsync($scope.closePosParameters.hid, $rootScope.PosUserId, false).then(function (yPeriod) {

                            if (!yPeriod) {
                                $scope.model.showCloseButton = false;
                                sweetAlert({title: $translate.instant("Toutes les services de cette caisse sont fermés")}, function () {
                                });
                            }

                        }, function () {
                            $scope.model.showCloseButton = false;
                            sweetAlert({title: $translate.instant("Toutes les services de cette caisse sont fermés")}, function () {
                            });
                        });

                        posPeriodService.getZPaymentValuesByHidAsync($scope.closePosParameters.zperiod.id, $scope.closePosParameters.hid).then(function (paymentValues) {
                            if (paymentValues) {
                                for (let l of paymentValues.PaymentLines) {
                                    let lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                        return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                    });

                                    if (lineClose) {
                                        // Pré-renseigner le nombre attendu
                                        lineClose.Count = l.Count;
                                        // Pré-renseigné du montant attendu

                                        lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                        lineClose.TotalKnown = roundValue(l.PaymentMode.Total);
                                    } else {
                                        l.TotalKnown = roundValue(l.PaymentMode.Total);
                                        newHidModel.CashMovementLines.push(l);
                                    }
                                }

                                if (reload) {
                                    //On parcours les Hid model
                                    for (let hidm of $scope.model.hardwareIdModels) {
                                        const currentHid = hidm.hid;
                                        for (let cm of hidm.CashMovementLines) {
                                            const currentPmId = cm.PaymentMode.PaymentType;
                                            if (getmatchedPmTotal(currentHid, currentPmId)) {
                                                cm.PaymentMode.Total = getmatchedPmTotal(currentHid, currentPmId);
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });

                    break;
                case 3:
                    // Fermeture du Z (fermeture journée)
                    // Foreach pour tout les hId de closePosParameters
                    for (let cashmachine of $scope.closePosParameters.hidList) {

                        posService.getPosNameAsync(cashmachine.hid).then(function (alias) {
                            let newHidModel = {
                                hid: cashmachine.hid,
                                alias: alias,
                                CashMovementLines: []
                            };

                            $scope.model.hardwareIdModels.push(newHidModel);

                            for (let line of $scope.closePosValues.CashMovementLines) {
                                newHidModel.CashMovementLines.push(clone(line));
                            }
                            posPeriodService.getZPaymentValuesByHidAsync($scope.closePosParameters.zperiod.id, cashmachine.hid).then(function (paymentValues) {
                                if (paymentValues) {
                                    for (let l of paymentValues.PaymentLines) {
                                        let lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                            return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                        });

                                        if (lineClose) {
                                            // Pré-renseigner le nombre attendu
                                            lineClose.Count = l.Count;
                                            // Pré-renseigner du montant attendu


                                            lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                            lineClose.TotalKnown = roundValue(l.PaymentMode.Total);
                                        } else {
                                            l.TotalKnown = roundValue(l.PaymentMode.Total);
                                            newHidModel.CashMovementLines.push(l);
                                        }
                                        let lineCloseRecap = Enumerable.from($scope.model.zRecap).firstOrDefault(function (x) {
                                            return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                        });
                                        if (lineCloseRecap) {
                                            // Pré-renseigner le nombre attendu
                                            lineCloseRecap.Count += l.Count;
                                            if (lineCloseRecap.PaymentMode.Total) {
                                                lineCloseRecap.PaymentMode.Total += roundValue(l.PaymentMode.Total);
                                            } else {
                                                lineCloseRecap.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                            }
                                            if (lineCloseRecap.TotalKnown) {
                                                lineCloseRecap.TotalKnown += roundValue(l.PaymentMode.Total);
                                            } else {
                                                lineCloseRecap.TotalKnown = roundValue(l.PaymentMode.Total);
                                            }
                                        }
                                    }
                                    // Renseigner ce que le ou les utilisateurs on déjà renseigné lors de la fermeture du(des) services
                                    posPeriodService.getYCountLinesByHidAsync($scope.closePosParameters.zperiod.id, cashmachine.hid).then(function (yPeriodCash) {

                                        if (yPeriodCash) {
                                            newHidModel.nbY = yPeriodCash.nbY;
                                            if (!$scope.model.hasAtLeastOneCashMachineWithSeveralService) {
                                                $scope.model.hasAtLeastOneCashMachineWithSeveralService = yPeriodCash.nbY !== 1;
                                            }

                                            for (let l of yPeriodCash.YCountLines) {
                                                let lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                                    return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                                });

                                                if (lineClose) {
                                                    // Pré-renseigner du montant saisi précédement (somme des services)
                                                    lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                                    // Renseigner du montant saisi précédement (somme des services)
                                                    lineClose.TotalYs = roundValue(l.PaymentMode.Total);
                                                    lineClose.CashDiscrepancyYs = roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                }

                                                let lineCloseRecap = Enumerable.from($scope.model.zRecap).firstOrDefault(function (x) {
                                                    return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                                });

                                                if (lineCloseRecap) {
                                                    // Renseigner du montant saisi précédement (somme des services)
                                                    if (lineCloseRecap.TotalYs) {
                                                        lineCloseRecap.TotalYs += roundValue(l.PaymentMode.Total);
                                                    } else {
                                                        lineCloseRecap.TotalYs = roundValue(l.PaymentMode.Total);
                                                    }
                                                    if (lineCloseRecap.CashDiscrepancyYs) {
                                                        lineCloseRecap.CashDiscrepancyYs += roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                    } else {
                                                        lineCloseRecap.CashDiscrepancyYs = roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                    }
                                                } else {
                                                    l.TotalYs = roundValue(l.PaymentMode.Total);
                                                    l.CashDiscrepancyYs = roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                    $scope.model.zRecap.push(l);
                                                }
                                            }
                                        }
                                        if (reload) {
                                            //On parcours les Hid model
                                            for (let hidm of $scope.model.hardwareIdModels) {
                                                const currentHid = hidm.hid;
                                                for (let cm of hidm.CashMovementLines) {
                                                    const currentPmId = cm.PaymentMode.PaymentType;
                                                    if (getmatchedPmTotal(currentHid, currentPmId)) {
                                                        cm.PaymentMode.Total = getmatchedPmTotal(currentHid, currentPmId);
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                        });
                    }
                    break;
            }
        }, function (err) {
            console.log(err);
        });
    };

    $scope.selectMotif = function (motif) {
        $scope.openPosValues.Motif = motif;
    };

    $scope.editCashValues = function (paymentValue) {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (total) {
            paymentValue.PaymentMode.Total = total;

        }, function () {
        });
    };


    /**
     * Display all tickets related to a cash register
     * Enable user to modify said tickets
     * @param hid
     */
    $scope.correctTickets = function (hid) {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashRegisterShoppingCarts.html',
            controller: 'ModalCashRegisterShoppingCartsController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                hid: function () {
                    return hid;
                },
                zpid: function () {
                    return $scope.closePosParameters.zperiod.id;
                },
                ypid: function () {
                    if ($scope.closePosParameters.yperiod) {
                        return $scope.closePosParameters.yperiod.id;
                    } else {
                        return null;
                    }
                }
            }
        });
        modalInstance.result.then(function () {
            $scope.init(true, $scope.model.hardwareIdModels);
        });
    };

    /**
     * Open the view to manage cash
     */
    $scope.cashManagement = function (hid) {

        if (posUserService.isEnable('CASH')) {

            posPeriodService.getYPeriodAsync(hid, $rootScope.PosUserId, $scope.model.closingEnable, false, true).then(function (yPeriod) {

                if (yPeriod && !yPeriod.endDate) {
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalOpenPos.html',
                        controller: 'ModalOpenPosController',
                        resolve: {
                            openPosParameters: function () {
                                return {
                                    isOpenPos: false,
                                    zPeriodId: yPeriod.zPeriodId,
                                    yPeriodId: yPeriod.id
                                }
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then(function () {
                        $scope.init(true);
                    }, function () {
                    });
                }
                else if (yPeriod && yPeriod.endDate) {
                    $scope.init(true);
                }
            }, function () {
                sweetAlert({title: $translate.instant("Veuillez renseigner le fond de caisse")}, function () {
                });
            });
        }
    };

    $scope.openDrawer = function () {

        //TODO: Log this event
        if (posUserService.isEnable('ODRAW')) {
            const configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox
                + ":" + $rootScope.IziBoxConfiguration.RestPort +
                "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, {timeout: 10000});
        }
    };

    $scope.openZ = function () {
        $uibModalInstance.close();

        $rootScope.modalStatsEnabled = $uibModal.open({
            templateUrl: 'modals/modalStatsPeriod.html',
            controller: 'ModalStatsPeriodController',
            size: 'max',
            resolve: {
                closePosParameters: function () {
                    return $scope.closePosParameters;
                }
            }
        });
    };

    // Fermeture de caisse. Doit purger les tickets
    $scope.ok = function () {
        function closePos() {
            // Clear l'interval
            clearInterval(checkLockInterval);
            $rootScope.validateLock = false;
            //Ferme la modal de stats, qui etait invisible
            modalStats.dismiss();

            let hasGapGlobal = false;
            let hardwareIdModelsWithGap = [];
            for(let hidModel of $scope.model.hardwareIdModels) {
                let hasGapHid = false;
                for(let lines of hidModel.CashMovementLines) {
                    if (!hasGapGlobal) {
                        hasGapGlobal = lines.TotalKnown !== lines.PaymentMode.Total;
                    }
                    if (!hasGapHid) {
                        hasGapHid = lines.TotalKnown !== lines.PaymentMode.Total;
                        if (hasGapHid) {
                            hardwareIdModelsWithGap.push(hidModel);
                        }
                    }
                }
            }

            if (hasGapGlobal) {
                let modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalClosePosJustification.html',
                    controller: 'ModalClosePosJustificationController',
                    size: 'lg',
                    resolve: {
                        justificationParameters: function () {
                            return {
                                closePosParameters: $scope.closePosParameters,
                                hardwareIdModelsWithGap: hardwareIdModelsWithGap
                            }
                        }
                    }
                });
                modalInstance.result.then(function (ret) {

                    if (ret && ret.refresh) {
                        $scope.init(true)
                    }
                    else {
                        checkForFreeze();
                    }

                }, function () {
                });
            }
            else {
                checkForFreeze();
            }

        }

        if ($rootScope.validateLock) {
            swal({
                title: "Fermer la caisse ?",
                text: "Il y a des tickets en cours de syncronisation",
                type: "warning",
                confirmButtonColor: "#d83448",
                confirmButtonText: $translate.instant("Oui"),
                cancelButtonText: $translate.instant("Non"),
                showCancelButton: true,
                closeOnConfirm: true
            }, function (willClose) {
                if (willClose) {
                    setTimeout(closePos, 500);
                }
            });

        } else {
            closePos();
        }
    };

    $scope.detailsServices = function (hid) {
        $uibModal.open({
            templateUrl: 'modals/modalDetailsServicesCount.html',
            controller: 'ModalDetailsServicesCountController',
            size: 'lg',
            resolve: {
                detailsServicesParameters: function () {
                    return {
                        hid: hid,
                        zPeriodId: closePosParameters.zperiod.id
                    }
                }
            },
            backdrop: 'static'
        });
    };

    $scope.cancel = function () {
        clearInterval(checkLockInterval);
        $uibModalInstance.dismiss('cancel');

        setTimeout(function () {
            $rootScope.closeKeyboard();
        }, 500);
    };

    const checkForFreeze = function () {
        shoppingCartService.getFreezedShoppingCartsAsync().then(function (r) {
            closeCashMachine(r.length)
        }, function () {
            closeCashMachine(undefined)
        });
    };

    const closeEventNF = function (updPaymentModes) {
        //Cloture NF
        // Logging the event
        let event = {
            Code: 170,
            Description: "Clotûre de caisse",
            OperatorCode: $rootScope.PosUserId,
            TerminalCode: $rootScope.PosLog.HardwareId,
            Type: "Fonds de caisse",
            Informations: []
        };

        for(let pm of updPaymentModes) {
            event.Informations.push(pm.PaymentMode.Text + "(" + pm.Count + "):" + pm.TotalKnown);
        }

        eventService.sendEvent(event);
    };

    const emptyCashYperiod = function (updPaymentModes) {
        // Si vider le cash, création d'un mouvement fermeture
        if ($scope.model.emptyCash) {
            posPeriodService.emptyCashYPeriodAsync($scope.closePosParameters.yperiod, updPaymentModes).then(function () {
                closeEventNF(updPaymentModes);
                $uibModalInstance.close();
            }, function (err) {
                const message = err ? err : $translate.instant("Erreur lors de la fermeture");
                sweetAlert({title: message}, function () {
                });
            });
        } else {
            closeEventNF(updPaymentModes);
            $uibModalInstance.close();
        }
    };

    const closeCashMachine = function (nbFreeze) {
        if (!$rootScope.modelPos.iziboxConnected) {
            sweetAlert({ title: $translate.instant("La izibox n'est pas accessible") }, function () {
            });
        } else {
            const textFreeze = nbFreeze && nbFreeze > 0 ? "Vous avez " + nbFreeze + " ticket en attente" : "";
            swal({
                title: $translate.instant($scope.closePosParameters.mode.text),
                text: textFreeze,
                type: "info",
                showCancelButton: true,
                confirmButtonColor: "#d83448",
                confirmButtonText: $translate.instant("Oui"),
                cancelButtonText: $translate.instant("Non"),
                closeOnConfirm: true
            }, function () {
                const yperiodId = closePosParameters.yperiod ? $scope.closePosParameters.yperiod.id : null;

                const periodRequest = {
                    ZperiodId: closePosParameters.zperiod.id,
                    YperiodId: yperiodId
                };


                let printMode = null;
                if (yperiodId) {
                    printMode = StatsPrintMode.Y;
                } else {
                    printMode = StatsPrintMode.Z;
                }

                const periodStatsApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/zpos/getPeriodStats";

                shoppingCartModel.clearShoppingCart();

                let updPaymentModes = [];
                switch ($scope.closePosParameters.mode.idMode) {
                    case 1:
                        //Fermeture de service
                        // Récupération des montants saisies pour les stocker dans le yPeriod
                        let hardwareIdModel = Enumerable.from($scope.model.hardwareIdModels).firstOrDefault(function (hidModel) {
                            return hidModel.hid == $scope.closePosParameters.hid;
                        });

                        posPeriodService.closeYPeriodAsync($scope.closePosParameters.yperiod, hardwareIdModel.CashMovementLines, $scope.model.emptyCash).then(function (yPeriodRet) {

                            // Impression du récap :
                            $http.post(periodStatsApiUrl, periodRequest).then((statsAfterClose) => {
                                const closingTicketHtml = zposService.composeStatsHTML(statsAfterClose.data, printMode, $scope.model.hardwareIdModels, false);
                                zposService.printZPosAsync(closingTicketHtml);

                            }, function (err) {
                                const message = $translate.instant("Erreur lors de la récupération des données");
                                sweetAlert({ title: message }, function () {
                                });
                            });

                            // Si vider le cash, création d'un mouvement fermeture
                            emptyCashYperiod(hardwareIdModel.CashMovementLines);

                        }, function (err) {
                            const message = err ? err : $translate.instant("La izibox n'est pas accessible");
                            sweetAlert({ title: message }, function () {
                            });
                        });

                        break;
                    case 2:
                        //Fermeture de caisse
                        let yPeriod = Enumerable.from($scope.closePosParameters.yperiods).firstOrDefault(function (yP) {
                            return yP.hardwareId == $scope.closePosParameters.hid && !yP.endDate;
                        });

                        if (yPeriod) {
                            // Récupération des montants saisies pour les stocker dans le yPeriod
                            let hardwareIdModel = Enumerable.from($scope.model.hardwareIdModels).firstOrDefault(function (hidModel) {
                                return hidModel.hid == $scope.closePosParameters.hid;
                            });
                            posPeriodService.closeYPeriodAsync(yPeriod, hardwareIdModel.CashMovementLines, $scope.model.emptyCash).then(function (yPeriodRet) {

                                // Impression du récap :
                                $http.post(periodStatsApiUrl, periodRequest).then((statsAfterClose) => {
                                    const closingTicketHtml = zposService.composeStatsHTML(statsAfterClose.data, printMode, $scope.model.hardwareIdModels, false);
                                    zposService.printZPosAsync(closingTicketHtml);

                                }, function (err) {
                                    const message = $translate.instant("Erreur lors de la récupération des données");
                                    sweetAlert({ title: message }, function () {
                                    });
                                });

                                // Si vider le cash, création d'un mouvement fermeture
                                emptyCashYperiod(hardwareIdModel.CashMovementLines);
                            }, function (err) {
                                const message = err ? err : $translate.instant("La izibox n'est pas accessible");
                                sweetAlert({ title: message }, function () {
                                });
                            });
                        }

                        break;
                    case 3:
                        //Fermeture de Z

                        // Et on le stock dans la base Zarchive
                        // TODO : Avoir la meme date de fin pour cet ID, et dans le Z
                        // ATTENTION : Vu qu'on imprime avant de cloturer le Z, on a pas la "vrai" date de fermeture
                        // zposService.saveZArchive( $rootScope.IziBoxConfiguration.StoreId + "_" + stats.data.DateStart + "_" + new Date().getTime(), stats.data, closingTicketHtml);

                        // Fermeture de la période
                        posPeriodService.closeZPeriodAsync($scope.closePosParameters.zperiod).then(function (zPeriodRet) {

                            // Impression du récap :
                            $http.post(periodStatsApiUrl, periodRequest).then((statsAfterClose) => {
                                const closingTicketHtml = zposService.composeStatsHTML(statsAfterClose.data, printMode, $scope.model.hardwareIdModels, false);
                                zposService.printZPosAsync(closingTicketHtml);

                            }, function (err) {
                                const message = $translate.instant("Erreur lors de la récupération des données");
                                sweetAlert({ title: message }, function () {
                                });
                            });

                            // Pour chaque caisse faire envoyer au BO les valeurs saisie lors de la fermeture
                            for (let hidModel of $scope.model.hardwareIdModels) {

                                updPaymentModes = [];
                                let closPosVal = clone($scope.closePosValues);

                                // Set the good harwareId
                                closPosVal.HardwareId = hidModel.hid;
                                // Set the value
                                closPosVal.CashMovementLines = hidModel.CashMovementLines;

                                for (let cm of hidModel.CashMovementLines) {
                                    let cmExist = Enumerable.from(updPaymentModes).firstOrDefault(function (pm) {
                                        return pm.PaymentMode.Text == cm.PaymentMode.Text;
                                    });

                                    if (cmExist) {
                                        cmExist.Count += cm.Count;
                                        cmExist.TotalKnown += cm.TotalKnown;
                                    } else {
                                        updPaymentModes.push(clone(cm));
                                    }
                                }

                                cashMovementService.saveMovementAsync(closPosVal).then(function () {
                                    closeEventNF(updPaymentModes);
                                    $uibModalInstance.close();
                                }, function (err) {
                                    const message = err ? err : $translate.instant("Erreur lors de la fermeture");
                                    sweetAlert({ title: message }, function () {
                                    });
                                });
                            }

                        }, function (err) {
                            console.log(err);
                            const message = err ? err : $translate.instant("La izibox n'est pas accessible");
                            sweetAlert({ title: message }, function () {
                            });
                        });

                        break;
                }

                setTimeout(function () {
                    $rootScope.closeKeyboard();
                }, 500);
            }, function () {
            });
        }
    };
});