app.controller('ModalOpenPosController', function ($scope, $rootScope, $uibModal,$http, $uibModalInstance, settingService, eventService, cashMovementService, posPeriodService,posUserService,$translate,openPosParameters) {
    $scope.openPosParameters = openPosParameters;

    $scope.init = function () {  

        $scope.model = {
            motif: null,
            total: 0,
            message: null
        };

        cashMovementService.getMovementTypesAsync($scope.openPosParameters).then(function (motifs) {
            $scope.motifs = motifs;

            console.log($scope.openPosParameters.previousYPeriod);

            if ($scope.motifs.length == 0) {
                if ($scope.openPosParameters.isOpenPos) {
                    if ($scope.openPosParameters.previousYPeriod){
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type ouverture de service dans le BO, merci";
                    }
                    else {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type fonds de caisse dans le BO, merci";
                    }
                }
                else {
                    $scope.model.message = "Vous devez d&eacute;finir au moins un mouvement de caisse d'entrï¿½e, sortie dans le BO, merci";
                }
            } else if ($scope.openPosParameters.isOpenPos) {
                $scope.model.motif = motifs[0];
            }
        });



        if ($scope.openPosParameters.previousYPeriod && !$scope.openPosParameters.previousYPeriod.emptyCash && !$scope.openPosParameters.editMode) {
            var total = 0;
            // Get the amout "cash" count in the previous yPeriod
            Enumerable.from($scope.openPosParameters.previousYPeriod.YCountLines).forEach(function (l) {
                // Cash only
                if (l.PaymentMode && l.PaymentMode.PaymentType == 1) {
                    total = roundValue(total + l.PaymentMode.Total);
                }
            });
            $scope.model.total = total;
        }
        else {
            posPeriodService.getYPaymentValuesAsync($scope.openPosParameters.yPeriodId).then(function (paymentValues) {
                if (paymentValues) {
                    var total = 0;
                    Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                        // Cash only
                        if (l.PaymentMode && l.PaymentMode.PaymentType == 1) {
                            total = roundValue(total + l.PaymentMode.Total);
                        }
                    });
                    $scope.model.total = total;
                }
            });
        }

        settingService.getPaymentModesAsync().then(function (paymentSetting) {

            var paymentModesAvailable = paymentSetting;

            var cashPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (x) {
                return x.PaymentType == PaymentType.ESPECE; // Attention !!!!
            });

            var dateOpen = new Date().toString('dd/MM/yyyy H:mm:ss'); //TODO: bug formatage

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

            var addPaymentMode = {
                PaymentType: cashPaymentMode.PaymentType,
                Value: cashPaymentMode.Value,
                Text: cashPaymentMode.Text,
                Total: 0,
                IsBalance: cashPaymentMode.IsBalance
            };

            var lineOpenPos = {
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
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (total) {
            $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = roundValue(parseFloat(total)).toFixed(2);    
        }, function () {});
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
        if (!$scope.openPosParameters.editMode) {
            if ($scope.model.motif && $scope.model.motif != null) {
                $scope.openPosValues.MovementType_Id = $scope.model.motif.Id;

                if ($scope.openPosParameters.previousYPeriod && !$scope.openPosParameters.previousYPeriod.emptyCash ) {
                    var previousYperiodButClosed = $scope.openPosParameters.previousYPeriod;
                    if (previousYperiodButClosed) {

                        // Crééer le motif négatif isSytem "Fin de service" du montant espèce du précédent yPeriod dans le yPeriod précédent
                        posPeriodService.emptyCashYPeriod(previousYperiodButClosed, previousYperiodButClosed.YCountLines);

                    }
                }

                // Send to BO
                $scope.openPosValues.Date = new Date().toString('dd/MM/yyyy H:mm:ss');
                cashMovementService.saveMovementAsync($scope.openPosValues);

                var updPaymentModes = [];

                var newPaymentMode = clone($scope.openPosValues.CashMovementLines[0].PaymentMode);

                newPaymentMode.Total = roundValue(parseFloat(newPaymentMode.Total).toFixed(2));

                if (!$scope.model.motif.CashIn && !$scope.model.motif.IsCashFunds) {
                    newPaymentMode.Total = newPaymentMode.Total * (-1);
                }

                updPaymentModes.push(newPaymentMode);

                // Pour stoker l'historique des mouvements
                var cashMovement = {
                    CashMovementLines: updPaymentModes,
                    Date: $scope.openPosValues.Date,
                    MovementType_Id: $scope.openPosValues.MovementType_Id,
                    PosUserId: $scope.openPosValues.PosUserId
                };

                if ($scope.model.motif.IsCashFunds) {

                    posPeriodService.replacePaymentValuesAsync($scope.openPosParameters.yPeriodId, $scope.openPosParameters.zPeriodId, $rootScope.PosLog.HardwareId, updPaymentModes, cashMovement);
                }
                else {

                    posPeriodService.updatePaymentValuesAsync($scope.openPosParameters.yPeriodId, $scope.openPosParameters.zPeriodId, $rootScope.PosLog.HardwareId, updPaymentModes, undefined, cashMovement);

                }

                // Logging the event
                if ($scope.model.motif.IsCashFunds) {
                    var event = {
                        Code: 170,
                        Description: "Ouverture de caisse",
                        OperatorCode: $rootScope.PosUserId,
                        Type: "Fonds de caisse",
                        TerminalCode: $rootScope.PosLog.HardwareId,
                        Informations: ["todo", "todo2"]
                    };

                    eventService.sendEvent(event);
                }
                $uibModalInstance.close();
            }
            else {
                sweetAlert({ title: $translate.instant("Veuillez renseigner le motif") }, function () { });
            }
        }
        else {
            sweetAlert({ title: $translate.instant("Impossible de modifier le fonds de caisse, periode en cours, utilisez le menu gestion des especes") }, function () { });
        }
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

    $scope.cancel = function () {   
        $uibModalInstance.dismiss('cancel');
    }
});