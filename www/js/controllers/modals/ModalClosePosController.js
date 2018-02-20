app.controller('ModalClosePosController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService, shoppingCartService, eventService, cashMovementService, zposService, $translate, posPeriodService, closePosParameters, modalStats, posUserService, posService, $http) {
    $scope.closePosParameters = closePosParameters;
    $scope.paymentType = PaymentType;
<<<<<<< HEAD

    $scope.init = function (reload = false, savedModel = {}) {
=======
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87

        /*
        if (savedModel) {
            console.log(savedModel);

<<<<<<< HEAD
            function getmatchedPmTotal(hid, paymentType) {
                var matchedHidMdl = Enumerable.from(savedModel).firstOrDefault(function (hidModel) {
                    return hidModel.hid == hid;
                });
=======
        $scope.model = {
            hardwareIdModels: [],
            emptyCash: false,
            zRecap: [],
            hasAtLeastOneCashMachineWithSeveralService: false,
            closingEnable: posUserService.isEnable('CLOS', true),
            showCloseButton: true
        };
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87

                if (matchedHidMdl) {
                    var matchedCm = Enumerable.from(matchedHidMdl.CashMovementLines).firstOrDefault(function (cml) {
                        return cml.PaymentMode.PaymentType == paymentType;
                    });

                    if (matchedCm) {
                        return matchedCm.PaymentMode.Total;
                    }
                }
            }

        }
        */

        $scope.model =
            {
                hardwareIdModels: [],
                emptyCash: false,
                zRecap: [],
                hasAtLeastOneCashMachineWithSeveralService: false,
                closingEnable: posUserService.isEnable('CLOS', true),
                showCloseButton: true
            };

        /*
        if (reload) {
            $scope.model.zRecap = [];
        }
        */

        settingService.getPaymentModesAsync().then(function (paymentSetting) {

            var paymentModesAvailable = paymentSetting;
            var dateClose = new Date().toString('dd/MM/yyyy H:mm:ss');

            $scope.closePosValues = {
                HardwareId: $rootScope.PosLog.HardwareId,
                PosUserId: $rootScope.PosUserId,
                Date: dateClose,
                MovementType_Id: 0,
                zPeriodId: closePosParameters.zperiod.id,
                StoreId: $rootScope.IziBoxConfiguration.StoreId,
                CashMovementLines: []
            };

            Enumerable.from(paymentModesAvailable).forEach(function (p) {
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
                $scope.closePosValues.CashMovementLines.push(lineClosePos);
                $scope.model.zRecap.push(lineClosePos);
            });
            var lineBalance = {
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
                        var newHidModel = {
                            hid: $scope.closePosParameters.hid,
                            ypid: $scope.closePosParameters.yperiod.id,
                            alias: alias,
                            CashMovementLines: []
                        };


                        $scope.model.hardwareIdModels.push(newHidModel);

                        Enumerable.from($scope.closePosValues.CashMovementLines).forEach(function (line) {
                            newHidModel.CashMovementLines.push(clone(line));
                        });

                        posPeriodService.getYPaymentValuesAsync($scope.closePosParameters.yperiod.id).then(function (paymentValues) {
                            if (paymentValues) {

                                Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {

                                    var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                        return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                    });

                                    if (lineClose) {
                                        // Pré-renseigner le nombre attendu
                                        lineClose.Count = l.Count;
                                        // Pré-renseigné du montant attendu
                                        lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                        lineClose.TotalKnown = roundValue(l.PaymentMode.Total);
                                    }
                                    else {
                                        l.TotalKnown = roundValue(l.PaymentMode.Total);
                                        newHidModel.CashMovementLines.push(l);
                                    }
                                });
                            }
                        });
                        console.log(newHidModel);
                    });
                    /*
                    if(reload){
                        //On parcours les Hid model
                        Enumerable.from($scope.model.hardwareIdModels).forEach(function(hidm){
                            var currentHid = hidm.hid;
                            Enumerable.from(hidm.CashMovementLines).forEach(function(cm){
                                var currentPmId = cm.PaymentMode.PaymentType;
                                if(getmatchedPmTotal(currentHid, currentPmId)){
                                    cm.PaymentMode.Total = getmatchedPmTotal(currentHid, currentPmId);
                                }
                            })

                        });
                    }
                    */
                    break;


                case 2:
                    //Fermeture de la caisse
                    posService.getPosNameAsync($scope.closePosParameters.hid).then(function (alias) {
                        var newHidModel = {
                            hid: $scope.closePosParameters.hid,
                            alias: alias,
                            CashMovementLines: []
                        };

                        $scope.model.hardwareIdModels.push(newHidModel);

                        Enumerable.from($scope.closePosValues.CashMovementLines).forEach(function (line) {
                            newHidModel.CashMovementLines.push(clone(line));
                        });

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
                                Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                                    var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                        return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                    });

                                    if (lineClose) {
                                        // Pré-renseigner le nombre attendu
                                        lineClose.Count = l.Count;
                                        // Pré-renseigné du montant attendu
<<<<<<< HEAD

=======
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                                        lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                        lineClose.TotalKnown = roundValue(l.PaymentMode.Total);
                                    }
                                    else {
                                        l.TotalKnown = roundValue(l.PaymentMode.Total);
                                        newHidModel.CashMovementLines.push(l);
                                    }
                                });
                            }
                        });
                    });
                    /*
                    if (reload) {
                        //On parcours les Hid model
                        Enumerable.from($scope.model.hardwareIdModels).forEach(function (hidm) {
                            var currentHid = hidm.hid;
                            Enumerable.from(hidm.CashMovementLines).forEach(function (cm) {
                                var currentPmId = cm.PaymentMode.PaymentType;
                                if (getmatchedPmTotal(currentHid, currentPmId)) {
                                    cm.PaymentMode.Total = getmatchedPmTotal(currentHid, currentPmId);
                                }
                            })

                        });
                    }
                    */
                    break;
                case 3:
                    // Fermeture du Z (fermeture journée)
                    // Foreach pour tout les hId de closePosParameters
                    Enumerable.from($scope.closePosParameters.hidList).forEach(function (cashmachine) {

                        posService.getPosNameAsync(cashmachine.hid).then(function (alias) {
                            var newHidModel = {
                                hid: cashmachine.hid,
                                alias: alias,
                                CashMovementLines: []
                            };


                            $scope.model.hardwareIdModels.push(newHidModel);

                            Enumerable.from($scope.closePosValues.CashMovementLines).forEach(function (line) {
                                newHidModel.CashMovementLines.push(clone(line));
                            });

                            posPeriodService.getZPaymentValuesByHidAsync($scope.closePosParameters.zperiod.id, cashmachine.hid).then(function (paymentValues) {
                                if (paymentValues) {
                                    Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                                        var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                            return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                        });

                                        if (lineClose) {
                                            // Pré-renseigner le nombre attendu
                                            lineClose.Count = l.Count;
                                            // Pré-renseigner du montant attendu
<<<<<<< HEAD


                                            lineClose.PaymentMode.Total = l.PaymentMode.Total;
=======
                                            // lineClose.PaymentMode.Total = l.PaymentMode.Total;
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                                            lineClose.TotalKnown = roundValue(l.PaymentMode.Total);
                                        }
                                        else {
                                            l.TotalKnown = roundValue(l.PaymentMode.Total);
                                            newHidModel.CashMovementLines.push(l);
                                        }
                                        var lineCloseRecap = Enumerable.from($scope.model.zRecap).firstOrDefault(function (x) {
                                            return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                        });
                                        if (lineCloseRecap) {
                                            // Pré-renseigner le nombre attendu
                                            lineCloseRecap.Count += l.Count;
                                            if (lineCloseRecap.PaymentMode.Total) {
                                                lineCloseRecap.PaymentMode.Total += roundValue(l.PaymentMode.Total);
                                            }
                                            else {
                                                lineCloseRecap.PaymentMode.Total = roundValue(l.PaymentMode.Total);
                                            }
                                            if (lineCloseRecap.TotalKnown) {
                                                lineCloseRecap.TotalKnown += roundValue(l.PaymentMode.Total);
                                            }
                                            else {
                                                lineCloseRecap.TotalKnown = roundValue(l.PaymentMode.Total);
                                            }
                                        }

                                    });
                                    // Renseigner ce que le ou les utilisateurs on déjà renseigné lors de la fermeture du(des) services 
                                    posPeriodService.getYCountLinesByHidAsync($scope.closePosParameters.zperiod.id, cashmachine.hid).then(function (yPeriodCash) {
<<<<<<< HEAD

                                        if (yPeriodCash) {
                                            newHidModel.nbY = yPeriodCash.nbY;
                                            if (!$scope.model.hasAtLeastOneCashMachineWithSeveralService) {
                                                $scope.model.hasAtLeastOneCashMachineWithSeveralService = yPeriodCash.nbY !== 1;
                                            }

=======

                                        if (yPeriodCash) {
                                            newHidModel.nbY = yPeriodCash.nbY;
                                            if (!$scope.model.hasAtLeastOneCashMachineWithSeveralService) {
                                                $scope.model.hasAtLeastOneCashMachineWithSeveralService = yPeriodCash.nbY !== 1;
                                            }

>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                                            Enumerable.from(yPeriodCash.YCountLines).forEach(function (l) {
                                                var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                                    return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                                });

                                                if (lineClose) {
                                                    // Pré-renseigner du montant saisi précédement (somme des services)
                                                    lineClose.PaymentMode.Total = roundValue(l.PaymentMode.Total);
<<<<<<< HEAD
=======

>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                                                    // Renseigner du montant saisi précédement (somme des services)
                                                    lineClose.TotalYs = roundValue(l.PaymentMode.Total);
                                                    lineClose.CashDiscrepancyYs = roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                }

                                                var lineCloseRecap = Enumerable.from($scope.model.zRecap).firstOrDefault(function (x) {
                                                    return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                                });

                                                if (lineCloseRecap) {
                                                    // Renseigner du montant saisi précédement (somme des services)
                                                    if (lineCloseRecap.TotalYs) {
                                                        lineCloseRecap.TotalYs += roundValue(l.PaymentMode.Total);
                                                    }
                                                    else {
                                                        lineCloseRecap.TotalYs = roundValue(l.PaymentMode.Total);
                                                    }
                                                    if (lineCloseRecap.CashDiscrepancyYs) {
                                                        lineCloseRecap.CashDiscrepancyYs += roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                    }
                                                    else {
                                                        lineCloseRecap.CashDiscrepancyYs = roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                    }
                                                }
                                                else {
                                                    l.TotalYs = roundValue(l.PaymentMode.Total);
                                                    l.CashDiscrepancyYs = roundValue(l.PaymentMode.Total - l.TotalKnown);
                                                    $scope.model.zRecap.push(l);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    });
<<<<<<< HEAD
                    /*
                    if (reload) {
                        //On parcours les Hid model
                        Enumerable.from($scope.model.hardwareIdModels).forEach(function (hidm) {
                            var currentHid = hidm.hid;
                            Enumerable.from(hidm.CashMovementLines).forEach(function (cm) {
                                var currentPmId = cm.PaymentMode.PaymentType;
                                if (getmatchedPmTotal(currentHid, currentPmId)) {
                                    cm.PaymentMode.Total = getmatchedPmTotal(currentHid, currentPmId);
                                }
                            })

                        });
                    }
                    */
=======
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                    break;
            }


        }, function (err) {
            console.log(err);
        });
    };

    $scope.reloadTickets = function () {

    };

    $scope.selectMotif = function (motif) {
        $scope.openPosValues.Motif = motif;
    };

    $scope.editCashValues = function (paymentValue) {
        var modalInstance = $uibModal.open({
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
        var modalInstance = $uibModal.open({
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
                        return {};
                    }
                }

            },

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
                    var modalInstance = $uibModal.open({
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
<<<<<<< HEAD
                        $scope.init(true);
=======
                        $scope.init();
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                    }, function () {
                    });
                }
                else if (yPeriod && yPeriod.endDate) {
<<<<<<< HEAD
                    $scope.init(true);
=======
                    $scope.init();
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                }
            }, function () {
                sweetAlert({title: $translate.instant("Veuillez renseigner le fond de caisse")}, function () {
                });
            });
        }
    };

    $scope.openDrawer = function () {
        /**
         * TODO: Log this event
         */
        if (posUserService.isEnable('ODRAW')) {
            var configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, {timeout: 10000});
        }
    };

    $scope.openZ = function () {
        $uibModalInstance.close();

        $uibModal.open({
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
        //Ferme la modal de stats, qui etait invisible
        modalStats.dismiss();

        var hasGapGlobal = false;
        var hardwareIdModelsWithGap = [];
        Enumerable.from($scope.model.hardwareIdModels).forEach(function (hidModel) {
            var hasGapHid = false;
            Enumerable.from(hidModel.CashMovementLines).forEach(function (lines) {

                if (!hasGapGlobal) {
                    hasGapGlobal = lines.TotalKnown !== lines.PaymentMode.Total;
                }
                if (!hasGapHid) {
                    hasGapHid = lines.TotalKnown !== lines.PaymentMode.Total;
                    if (hasGapHid) {
                        hardwareIdModelsWithGap.push(hidModel);
                    }
                }
            })

        });
        if (hasGapGlobal) {
            var modalInstance = $uibModal.open({
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
<<<<<<< HEAD
                    $scope.init(true)
=======
                    $scope.init()
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
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
    };

    $scope.detailsServices = function (hid) {
        var modalInstance = $uibModal.open({
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
        $uibModalInstance.dismiss('cancel');

<<<<<<< HEAD
        /*
=======
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
        $uibModal.open({
            templateUrl: 'modals/modalYperiodPick.html',
            controller: 'ModalYperiodPickController',
            size: 'lg',
            backdrop: 'static'
        });
<<<<<<< HEAD
        */
=======
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87

        setTimeout(function () {
            $rootScope.closeKeyboard();
            $rootScope.closeKeyboard();
        }, 500);
    };

<<<<<<< HEAD
    var checkForFreeze = function () {
        var nbFreeze = undefined;
        shoppingCartService.getFreezedShoppingCartsAsync().then(function (r) {
            closeCashMachine(r.length)
        }, function (err) {
=======
    var checkForFreeze = function(){
        var nbFreeze = undefined;
        shoppingCartService.getFreezedShoppingCartsAsync().then(function(r){
            closeCashMachine(r.length)
        }, function(err){
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
            closeCashMachine(undefined)
        });
    };

    var closeCashMachine = function (nbFreeze) {
<<<<<<< HEAD
        var textFreeze = nbFreeze && nbFreeze > 0 ? "Vous avez " + nbFreeze + " ticket en attente" : "";
=======
        var textFreeze = nbFreeze && nbFreeze >0 ? "Vous avez " + nbFreeze + " ticket en attente" : "";
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
        swal({
                title: $translate.instant($scope.closePosParameters.mode.text),
                text: textFreeze,
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d83448",
                confirmButtonText: $translate.instant("Oui"),
                cancelButtonText: $translate.instant("Non"),
                closeOnConfirm: true
            },
            function () {
                var updPaymentModes = [];

                switch ($scope.closePosParameters.mode.idMode) {
                    case 1:
                        //Fermeture de service
                        // Récupération des montants saisies pour les stocker dans le yPeriod
                        var hardwareIdModel = Enumerable.from($scope.model.hardwareIdModels).firstOrDefault(function (hidModel) {
                            return hidModel.hid == $scope.closePosParameters.hid;
                        });

                        posPeriodService.closeYPeriodAsync($scope.closePosParameters.yperiod, hardwareIdModel.CashMovementLines, $scope.model.emptyCash).then(function () {
                            // Si vider le cash, création d'un mouvement fermeture
                            if ($scope.model.emptyCash) {
                                posPeriodService.emptyCashYPeriodAsync($scope.closePosParameters.yperiod, hardwareIdModel.CashMovementLines);
                            }
                        });

                        updPaymentModes = hardwareIdModel.CashMovementLines;

                        break;
                    case 2:
                        //Fermeture de caisse
                        var yPeriod = Enumerable.from($scope.closePosParameters.yperiods).firstOrDefault(function (yP) {
                            return yP.hardwareId == $scope.closePosParameters.hid && !yP.endDate;
                        });

                        if (yPeriod) {
                            // Récupération des montants saisies pour les stocker dans le yPeriod
                            var hardwareIdModel = Enumerable.from($scope.model.hardwareIdModels).firstOrDefault(function (hidModel) {
                                return hidModel.hid == $scope.closePosParameters.hid;
                            });
                            posPeriodService.closeYPeriodAsync(yPeriod, hardwareIdModel.CashMovementLines, $scope.model.emptyCash).then(function () {
                                // Si vider le cash, création d'un mouvement fermeture
                                if ($scope.model.emptyCash) {
                                    posPeriodService.emptyCashYPeriodAsync(yPeriod, hardwareIdModel.CashMovementLines);
                                }
                            });
                        }

                        updPaymentModes = hardwareIdModel.CashMovementLines;

                        break;
                    case 3:
                        //Fermeture de Z

                        // Pour chaque caisse faire envoyer au BO les valeurs saisie lors de la fermeture
                        Enumerable.from($scope.model.hardwareIdModels).forEach(function (hidModel) {

                            var closPosVal = clone($scope.closePosValues);

                            // Set the good harwareId
                            closPosVal.HardwareId = hidModel.hid;
                            // Set the value
                            closPosVal.CashMovementLines = hidModel.CashMovementLines;

                            Enumerable.from(hidModel.CashMovementLines).forEach(function (cm) {
                                var cmExist = Enumerable.from(updPaymentModes).firstOrDefault(function (pm) {
                                    return pm.PaymentMode.Text == cm.PaymentMode.Text;
                                });

                                if (cmExist) {
                                    cmExist.Count += cm.Count;
                                    cmExist.TotalKnown += cm.TotalKnown;
                                } else {
                                    updPaymentModes.push(clone(cm));
                                }
                            });

                            cashMovementService.saveMovementAsync(closPosVal);
                        });

                        // Fermeture de la période
                        posPeriodService.closeZPeriodAsync($scope.closePosParameters.zperiod);
                        break;
                }

                //Cloture NF
                // Logging the event
                var event = {
                    Code: 170,
                    Description: "Clotûre de caisse",
                    OperatorCode: $rootScope.PosUserId,
                    TerminalCode: $rootScope.PosLog.HardwareId,
                    Type: "Fonds de caisse",
                    Informations: []
                };

<<<<<<< HEAD

                Enumerable.from(updPaymentModes).forEach(function (pm) {
                    event.Informations.push(pm.PaymentMode.Text + "(" + pm.Count + "):" + pm.TotalKnown);
=======
               
                Enumerable.from(updPaymentModes).forEach(function (pm) {
                    event.Informations.push(pm.PaymentMode.Text+ "(" + pm.Count + "):" + pm.TotalKnown);
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
                });

                eventService.sendEvent(event);

                $uibModalInstance.close();

                setTimeout(function () {
                    $rootScope.closeKeyboard();
                    $rootScope.closeKeyboard();
                }, 500);
            }, function () {
            });
    }
});