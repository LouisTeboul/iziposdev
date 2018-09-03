app.controller('ModalOpenPosController', function ($scope, $rootScope, $uibModal, $http, $uibModalInstance, settingService, eventService, cashMovementService, posPeriodService, posUserService, $translate, openPosParameters) {
    $scope.openPosParameters = openPosParameters;

    $scope.init = function () {

        $scope.model = {
            motif: null,
            total: 0,
            totalKnown: 0,
            message: null,
            validateDisabled: false
        };

        cashMovementService.getMovementTypesAsync($scope.openPosParameters).then(function (motifs) {

            $scope.motifs = motifs;

            if ($scope.motifs.length == 0) {
                if ($scope.openPosParameters.isOpenPos) {
                    if ($scope.openPosParameters.previousYPeriod) {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type ouverture de service dans le BO, merci";
                    }
                    else {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type fonds de caisse dans le BO, merci";
                    }
                }
                else {
                    $scope.model.message = "Vous devez d&eacute;finir au moins un mouvement de caisse d'entr&eacute;e, sortie dans le BO, merci";
                }
            } else if ($scope.openPosParameters.isOpenPos) {
                $scope.model.motif = motifs[0];
            }
        });


        if ($scope.openPosParameters.previousYPeriod && !$scope.openPosParameters.previousYPeriod.emptyCash && !$scope.openPosParameters.editMode) {
            let total = 0;
            let totalKnown = 0;
            // Get the amout "cash" count in the previous yPeriod
            for(let l of $scope.openPosParameters.previousYPeriod.YCountLines) {
                // Cash only
                if (l.PaymentMode && l.PaymentMode.PaymentType == PaymentType.ESPECE) {
                    total = roundValue(total + l.PaymentMode.Total);
                    totalKnown = roundValue(totalKnown + l.TotalKnown);
                }
            }
            $scope.model.total = total;
            $scope.model.totalKnown = totalKnown;
        }
        else {
            posPeriodService.getYPaymentValuesAsync($scope.openPosParameters.yPeriodId).then(function (paymentValues) {
                if (paymentValues) {
                    let total = 0;
                    for(let l of paymentValues.PaymentLines) {
                        // Cash only
                        if (l.PaymentMode && l.PaymentMode.PaymentType == PaymentType.ESPECE) {
                            total = roundValue(total + l.PaymentMode.Total);
                        }
                    }
                    $scope.model.total = total;
                    $scope.model.totalKnown = total;
                }
            });
        }

        settingService.getPaymentModesAsync().then(function (paymentSetting) {

            let paymentModesAvailable = paymentSetting;

            let cashPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (x) {
                return x.PaymentType == PaymentType.ESPECE;
            });

            const dateOpen = new Date().toString('dd/MM/yyyy H:mm:ss'); //TODO: bug formatage

            $scope.openPosValues = {
                HardwareId: $rootScope.PosLog.HardwareId,
                PosUserId: $rootScope.PosUserId,
                Date: dateOpen,
                MovementType_Id: 0,
                zPeriodId: $scope.openPosParameters.zPeriodId,
                yPeriodId: $scope.openPosParameters.yPeriodId,
                StoreId: $rootScope.IziBoxConfiguration.StoreId,
                CashMovementLines: []
            };

            const addPaymentMode = {
                PaymentType: cashPaymentMode.PaymentType,
                Value: cashPaymentMode.Value,
                Text: cashPaymentMode.Text,
                Total: 0,
                IsBalance: cashPaymentMode.IsBalance
            };

            const lineOpenPos = {
                PaymentMode: addPaymentMode
            };

            $scope.openPosValues.CashMovementLines.push(lineOpenPos);

        }, function (err) {
            console.log(err);
        });
    };

    $scope.selectMotif = function (motif) {
        $scope.model.motif = motif;
    };

    $scope.editCashValues = function () {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (total) {
            $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = roundValue(parseFloat(total)).toFixed(2);
        }, function () {
        });
    };

    $scope.openRecap = function () {
        $uibModal.open({
            templateUrl: 'modals/modalAllCashMovements.html',
            controller: 'ModalAllCashMovementsController',
            size: 'lg',
            backdrop: 'static',

        });
    };

    $scope.ok = function () {
        if (!$rootScope.modelPos.iziboxConnected) {
            sweetAlert({ title: $translate.instant("La izibox n'est pas accessible") }, function () {
            });
        }
        else {
            if (!$scope.openPosParameters.editMode) {
                if ($scope.model.motif && $scope.model.motif != null) {
                    $scope.model.validateDisabled = true;
                    $scope.openPosValues.MovementType_Id = $scope.model.motif.Id;

                    if ($scope.openPosParameters.previousYPeriod && !$scope.openPosParameters.previousYPeriod.emptyCash) {
                        const previousYperiodButClosed = $scope.openPosParameters.previousYPeriod;
                        if (previousYperiodButClosed) {

                            // Créer le motif négatif isSytem "Fin de service" du montant espèce du précédent yPeriod dans le yPeriod précédent
                            posPeriodService.emptyCashYPeriodAsync(previousYperiodButClosed, previousYperiodButClosed.YCountLines).then(function () {
                                //Appel aprés la création de la fermeture du service précédent pour que la date du motif de l'ouverture du service soit aprés le motif de fermeture du service pr�c�dent
                                $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = $scope.model.totalKnown;
                                openCashMachine();
                            });
                        }
                    }
                    else {
                        openCashMachine();
                    }
                }
                else {
                    sweetAlert({ title: $translate.instant("Veuillez renseigner le motif") }, function () {
                    });
                }
            }
            else {
                sweetAlert({ title: $translate.instant("Impossible de modifier le fonds de caisse, periode en cours, utilisez le menu gestion des especes") }, function () {
                });
            }
        }
    };

    $scope.openDrawer = function () {
        /**
         * TODO: Log this event
         */
        if (posUserService.isEnable('ODRAW')) {
            const configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, {timeout: 10000});
        }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    const openCashMachine = function () {

        $scope.openPosValues.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

        let updPaymentModes = [];

        let newPaymentMode = clone($scope.openPosValues.CashMovementLines[0].PaymentMode);

        newPaymentMode.Total = roundValue(parseFloat(newPaymentMode.Total).toFixed(2));

        if (!$scope.model.motif.CashIn && !$scope.model.motif.IsCashFunds) {
            newPaymentMode.Total = newPaymentMode.Total * (-1);
        }

        updPaymentModes.push(newPaymentMode);

        // Pour stoker l'historique des mouvements
        let cashMovement = {
            CashMovementLines: updPaymentModes,
            Date: $scope.openPosValues.Date,
            MovementType_Id: $scope.openPosValues.MovementType_Id,
            PosUserId: $scope.openPosValues.PosUserId
        };

        if ($scope.model.motif.IsCashFunds) {

            posPeriodService.replacePaymentValuesAsync($scope.openPosParameters.yPeriodId, $scope.openPosParameters.zPeriodId, $rootScope.PosLog.HardwareId, updPaymentModes, cashMovement).then(function ()  {
                $scope.model.validateDisabled = false;
                // Send to BO
                cashMovementService.saveMovementAsync($scope.openPosValues);
                $uibModalInstance.close();
            }, function (err) {
                $scope.model.validateDisabled = false;
                if(err) {
                    sweetAlert({ title: $translate.instant("La izibox n'est pas accessible") }, function () {
                    });
                }

            });
        }
        else {

            posPeriodService.updatePaymentValuesAsync($scope.openPosParameters.yPeriodId, $scope.openPosParameters.zPeriodId, $rootScope.PosLog.HardwareId, updPaymentModes, undefined, cashMovement).then(function () {
                $scope.model.validateDisabled = false;
                // Send to BO
                cashMovementService.saveMovementAsync($scope.openPosValues);
                $uibModalInstance.close();
            }, function (err) {
                $scope.model.validateDisabled = false;
                let message = err ? err : $translate.instant("La izibox n'est pas accèssible");
                sweetAlert({ title: message }, function () {
                });
            });
        }

        // Logging the event
        if ($scope.model.motif.IsCashFunds) {
            let event = {
                Code: 170,
                Description: "Ouverture de caisse",
                OperatorCode: $rootScope.PosUserId,
                Type: "Fonds de caisse",
                TerminalCode: $rootScope.PosLog.HardwareId,
                Informations: []
            };

            for(let pm of updPaymentModes) {
                event.Informations.push(pm.Text + ":" + pm.Total);
            }
            eventService.sendEvent(event);
        }
    }
});

app.controller('ModalOpenPosController', function ($scope, $rootScope, $uibModal, $http, $uibModalInstance, settingService, eventService, cashMovementService, posPeriodService, posUserService, $translate, openPosParameters) {
    $scope.openPosParameters = openPosParameters;

    $scope.init = function () {

        $scope.model = {
            motif: null,
            total: 0,
            totalKnown: 0,
            message: null,
            validateDisabled: false
        };

        cashMovementService.getMovementTypesAsync($scope.openPosParameters).then(function (motifs) {

            $scope.motifs = motifs;

            if ($scope.motifs.length == 0) {
                if ($scope.openPosParameters.isOpenPos) {
                    if ($scope.openPosParameters.previousYPeriod) {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type ouverture de service dans le BO, merci";
                    }
                    else {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type fonds de caisse dans le BO, merci";
                    }
                }
                else {
                    $scope.model.message = "Vous devez d&eacute;finir au moins un mouvement de caisse d'entr&eacute;e, sortie dans le BO, merci";
                }
            } else if ($scope.openPosParameters.isOpenPos) {
                $scope.model.motif = motifs[0];
            }
        });


        if ($scope.openPosParameters.previousYPeriod && !$scope.openPosParameters.previousYPeriod.emptyCash && !$scope.openPosParameters.editMode) {
            let total = 0;
            let totalKnown = 0;
            // Get the amout "cash" count in the previous yPeriod
            for(let l of $scope.openPosParameters.previousYPeriod.YCountLines) {
                // Cash only
                if (l.PaymentMode && l.PaymentMode.PaymentType == PaymentType.ESPECE) {
                    total = roundValue(total + l.PaymentMode.Total);
                    totalKnown = roundValue(totalKnown + l.TotalKnown);
                }
            }
            $scope.model.total = total;
            $scope.model.totalKnown = totalKnown;
        }
        else {
            posPeriodService.getYPaymentValuesAsync($scope.openPosParameters.yPeriodId).then(function (paymentValues) {
                if (paymentValues) {
                    let total = 0;
                    for(let l of paymentValues.PaymentLines) {
                        // Cash only
                        if (l.PaymentMode && l.PaymentMode.PaymentType == PaymentType.ESPECE) {
                            total = roundValue(total + l.PaymentMode.Total);
                        }
                    }
                    $scope.model.total = total;
                    $scope.model.totalKnown = total;
                }
            });
        }

        settingService.getPaymentModesAsync().then(function (paymentSetting) {

            let paymentModesAvailable = paymentSetting;

            let cashPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (x) {
                return x.PaymentType == PaymentType.ESPECE;
            });

            const dateOpen = new Date().toString('dd/MM/yyyy H:mm:ss'); //TODO: bug formatage

            $scope.openPosValues = {
                HardwareId: $rootScope.PosLog.HardwareId,
                PosUserId: $rootScope.PosUserId,
                Date: dateOpen,
                MovementType_Id: 0,
                zPeriodId: $scope.openPosParameters.zPeriodId,
                yPeriodId: $scope.openPosParameters.yPeriodId,
                StoreId: $rootScope.IziBoxConfiguration.StoreId,
                CashMovementLines: []
            };

            const addPaymentMode = {
                PaymentType: cashPaymentMode.PaymentType,
                Value: cashPaymentMode.Value,
                Text: cashPaymentMode.Text,
                Total: 0,
                IsBalance: cashPaymentMode.IsBalance
            };

            const lineOpenPos = {
                PaymentMode: addPaymentMode
            };

            $scope.openPosValues.CashMovementLines.push(lineOpenPos);

        }, function (err) {
            console.log(err);
        });
    };

    $scope.selectMotif = function (motif) {
        $scope.model.motif = motif;
    };

    $scope.editCashValues = function () {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (total) {
            $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = roundValue(parseFloat(total)).toFixed(2);
        }, function () {
        });
    };

    $scope.openRecap = function () {
        $uibModal.open({
            templateUrl: 'modals/modalAllCashMovements.html',
            controller: 'ModalAllCashMovementsController',
            size: 'lg',
            backdrop: 'static',

        });
    };

    $scope.ok = function () {
        if (!$rootScope.modelPos.iziboxConnected) {
            sweetAlert({ title: $translate.instant("La izibox n'est pas accessible") }, function () {
            });
        }
        else {
            if (!$scope.openPosParameters.editMode) {
                if ($scope.model.motif && $scope.model.motif != null) {
                    $scope.model.validateDisabled = true;
                    $scope.openPosValues.MovementType_Id = $scope.model.motif.Id;

                    if ($scope.openPosParameters.previousYPeriod && !$scope.openPosParameters.previousYPeriod.emptyCash) {
                        let previousYperiodButClosed = $scope.openPosParameters.previousYPeriod;
                        if (previousYperiodButClosed) {

                            // Créer le motif négatif isSytem "Fin de service" du montant espèce du précédent yPeriod dans le yPeriod précédent
                            posPeriodService.emptyCashYPeriodAsync(previousYperiodButClosed, previousYperiodButClosed.YCountLines).then(function () {
                                //Appel aprés la création de la fermeture du service précédent pour que la date du motif de l'ouverture du service soit aprés le motif de fermeture du service pr�c�dent
                                $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = $scope.model.totalKnown;

                                openCashMachine();
                            });
                        }
                    }
                    else {
                        openCashMachine();
                    }
                }
                else {
                    sweetAlert({ title: $translate.instant("Veuillez renseigner le motif") }, function () {
                    });
                }
            }
            else {
                sweetAlert({ title: $translate.instant("Impossible de modifier le fonds de caisse, periode en cours, utilisez le menu gestion des especes") }, function () {
                });
            }
        }
    };

    $scope.openDrawer = function () {
        /**
         * TODO: Log this event
         */
        if (posUserService.isEnable('ODRAW')) {
            let configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, {timeout: 10000});
        }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    const openCashMachine = function () {

        $scope.openPosValues.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

        let updPaymentModes = [];

        let newPaymentMode = clone($scope.openPosValues.CashMovementLines[0].PaymentMode);

        newPaymentMode.Total = roundValue(parseFloat(newPaymentMode.Total).toFixed(2));

        if (!$scope.model.motif.CashIn && !$scope.model.motif.IsCashFunds) {
            newPaymentMode.Total = newPaymentMode.Total * (-1);
        }

        updPaymentModes.push(newPaymentMode);

        // Pour stoker l'historique des mouvements
        let cashMovement = {
            CashMovementLines: updPaymentModes,
            Date: $scope.openPosValues.Date,
            MovementType_Id: $scope.openPosValues.MovementType_Id,
            PosUserId: $scope.openPosValues.PosUserId
        };

        if ($scope.model.motif.IsCashFunds) {

            posPeriodService.replacePaymentValuesAsync($scope.openPosParameters.yPeriodId, $scope.openPosParameters.zPeriodId, $rootScope.PosLog.HardwareId, updPaymentModes, cashMovement).then(function () {
                $scope.model.validateDisabled = false;
                // Send to BO
                cashMovementService.saveMovementAsync($scope.openPosValues);
                $uibModalInstance.close();
            }, function (err) {
                $scope.model.validateDisabled = false;
                if(err) {
                    sweetAlert({ title: $translate.instant("La izibox n'est pas accessible") }, function () {
                    });
                }
            });
        }
        else {

            posPeriodService.updatePaymentValuesAsync($scope.openPosParameters.yPeriodId, $scope.openPosParameters.zPeriodId, $rootScope.PosLog.HardwareId, updPaymentModes, undefined, cashMovement).then(function () {
                $scope.model.validateDisabled = false;
                // Send to BO
                cashMovementService.saveMovementAsync($scope.openPosValues);
                $uibModalInstance.close();
            }, function (err) {
                $scope.model.validateDisabled = false;
                const message = err ? err : $translate.instant("La izibox n'est pas accèssible");
                sweetAlert({ title: message }, function () {
                });
            });

        }

        // Logging the event
        if ($scope.model.motif.IsCashFunds) {
            let event = {
                Code: 170,
                Description: "Ouverture de caisse",
                OperatorCode: $rootScope.PosUserId,
                Type: "Fonds de caisse",
                TerminalCode: $rootScope.PosLog.HardwareId,
                Informations: []
            };

            for(let pm of updPaymentModes) {
                event.Informations.push(pm.Text + ":" + pm.Total);
            }

            eventService.sendEvent(event);
        }
    }
});