/**
 * Modal for managing the customer information
 * We can search a customer - display the customer loyalty information - register a customer - set the mail address for sending ticket by mail
 */
app.controller('ModalClosePosController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService, eventService, cashMovementService, zposService, $translate, posPeriodService, closePosParameters, modalStats, posUserService, posService) {
    $scope.closePosParameters = closePosParameters;


    $scope.init = function () {

        $scope.model = {
            hardwareIdModels: [],
            emptyCash: false
        };



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
                    IsBalance: p.IsBalance
                };

                var lineClosePos = {
                    PaymentMode: addPaymentMode,
                    Count: 0,
                    TotalKnown: 0
                };
                $scope.closePosValues.CashMovementLines.push(lineClosePos);
            });


            switch ($scope.closePosParameters.mode.idMode) {
                case 1:
                    //Fermeture de service
                    //Il n'y a toujours qu'un seul HID
                    posService.getPosNameAsync($scope.closePosParameters.hid).then(function(alias){
                        var newHidModel = {
                            hid: $scope.closePosParameters.hid,
                            ypid: $scope.closePosParameters.yperiod.id,
                            alias : alias,
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
                                    lineClose.PaymentMode.Total = l.PaymentMode.Total;
                                    lineClose.TotalKnown = l.PaymentMode.Total;
                                }
                            });
                        }
                        });
                    });
                    break;


                case 2:
                    //Fermeture de la caisse
                    // Foreach pour tout les hId de closePosParameters
                    posService.getPosNameAsync($scope.closePosParameters.hid).then(function(alias){
                        var newHidModel = {
                            hid: $scope.closePosParameters.hid,
                            alias : alias,
                            CashMovementLines: []
                        };

                        $scope.model.hardwareIdModels.push(newHidModel);
                        Enumerable.from($scope.closePosValues.CashMovementLines).forEach(function (line) {
                            newHidModel.CashMovementLines.push(clone(line));
                        });

                        posPeriodService.getZPaymentValuesAsync($scope.closePosParameters.zperiod.id, $scope.closePosParameters.hid).then(function (paymentValues) {
                            if (paymentValues) {
                                Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                                    var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                        return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                    });

                                if (lineClose) {
                                    // Pré-renseigner le nombre attendu
                                    lineClose.Count = l.Count;
                                    // Pré-renseigné du montant attendu
                                    lineClose.PaymentMode.Total = l.PaymentMode.Total;
                                    lineClose.TotalKnown = l.PaymentMode.Total;
                                }
                            });
                        }
                        });
                    });
                    break;
                case 3:
                    // Fermeture du Z (fermeture journée)
                    // Foreach pour tout les hId de closePosParameters
                    Enumerable.from($scope.closePosParameters.hidList).forEach(function (cashmachine) {

                        posService.getPosNameAsync(cashmachine.hid).then(function(alias){
                            var newHidModel = {
                                hid: cashmachine.hid,
                                alias: alias,
                                CashMovementLines: []
                            };

                            $scope.model.hardwareIdModels.push(newHidModel);

                            Enumerable.from($scope.closePosValues.CashMovementLines).forEach(function (line) {
                                newHidModel.CashMovementLines.push(clone(line));
                            });

                            posPeriodService.getZPaymentValuesByHidAsync($scope.closePosParameters.zperiod.id,cashmachine.hid).then(function (paymentValues) {
                                if (paymentValues) {
                                    Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                                        var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                            return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                        });

                                    if (lineClose) {
                                        // Pré-renseigner le nombre attendu
                                        lineClose.Count = l.Count;
                                        // Pré-renseigner du montant attendu
                                        lineClose.PaymentMode.Total = l.PaymentMode.Total;
                                        lineClose.TotalKnown = l.PaymentMode.Total;
                                    }
                                });
                            }
                        });

                        // Renseigner ce que le ou les utilisateurs on déjà renseigné lors de la fermeture du(des) services 
                            posPeriodService.getYCountLinesByHidAsync($scope.closePosParameters.zperiod.id, cashmachine.hid).then(function (yPeriodCash) {
                                Enumerable.from(yPeriodCash.YCountLines).forEach(function (l) {
                                var lineClose = Enumerable.from(newHidModel.CashMovementLines).firstOrDefault(function (x) {
                                    return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
                                });

                                if (lineClose) {
                                    // Renseigner du montant affiché précédement
                                    lineClose.PaymentMode.TotalYs = l.PaymentMode.Total;
                                }
                            });
                        });
                    });
                    });
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
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (total) {
            paymentValue.PaymentMode.Total = total;

        }, function () { });
    };


    /**
     * Display all tickets related to a cash register
     * Enable user to modify said tickets
     * @param hid
     */
    $scope.correctTickets = function(hid) {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashRegisterShoppingCarts.html',
            controller: 'ModalCashRegisterShoppingCartsController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                hid: function () {
                    return hid;
                },
                zpid: function() {
                    return $scope.closePosParameters.zperiod.id;
                },
                ypid: function() {
                    if($scope.closePosParameters.yperiod){
                        return $scope.closePosParameters.yperiod.id;
                    } else{
                        return {};
                    }
                }

            },

        });


        modalInstance.result.then(function () {
            $scope.init();
        });
    };


    $scope.openDrawer = function () {
        /**
		 * TODO: Log this event
         */
        if (posUserService.isEnable('ODRAW')) {
            var configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, { timeout: 10000 });
        }
    };

    // Fermeture de caisse. Doit purger les tickets
    $scope.ok = function () {
        //Ferme la modal de stats, qui etait invisible
        modalStats.dismiss();

        swal({ title: $translate.instant($scope.closePosParameters.mode.text), text: "", type: "warning", showCancelButton: true, confirmButtonColor: "#d83448", confirmButtonText: $translate.instant("Oui"), cancelButtonText: $translate.instant("Non"), closeOnConfirm: true },
            function () {

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
                                posPeriodService.emptyCashYPeriod($scope.closePosParameters.yperiod, hardwareIdModel.CashMovementLines);
                            }
                        });

                        
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
                                    posPeriodService.emptyCashYPeriod(yPeriod, hardwareIdModel.CashMovementLines);
                                }
                            });
                        }
                        
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

                            cashMovementService.saveMovementAsync(closPosVal);
                        });

                        // Fermeture de la période
                        posPeriodService.closeZPeriodAsync($scope.closePosParameters.zperiod);
                        break;
                }

                //TODO Cloture NF
                //// Logging the event
                //var event = {
                //    Code: 170,
                //    Description: "Clotûre de caisse",
                //    OperatorCode: $rootScope.PosUserId,
                //    TerminalCode: $rootScope.PosLog.HardwareId,
                //    Type: "Fonds de caisse",
                //    Informations: ["todo", "todo2"]
                //};

                //eventService.sendEvent(event);

                $uibModalInstance.close();

                setTimeout(function () {
                    $rootScope.closeKeyboard();
                    $rootScope.closeKeyboard();
                }, 500);
            }, function () { });
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
    }
    $scope.cancel = function () {
        //Restore la visibilité de la modal de stats
        $rootScope.showStats = true;
        $uibModalInstance.dismiss('cancel');

        setTimeout(function () {
            $rootScope.closeKeyboard();
            $rootScope.closeKeyboard();
        }, 500);
    }

});