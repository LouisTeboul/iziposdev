app.controller('ModalOpenPosController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService,cashMovementService,zposService,$translate) {

    $scope.init = function () {
        
        cashMovementService.getMovementTypesAsync().then(function (motifs) {
            $scope.motifs = motifs;
        });

        $scope.model = {
            motif: null,
            total: 0
        }

        zposService.getPaymentValuesAsync().then(function (paymentValues) {
            if (paymentValues) {
                var total = 0;
                Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
                    total = roundValue(total + l.PaymentMode.Total);
                });

                $scope.model.total = total;
            }
        });

        settingService.getPaymentModesAsync().then(function (paymentSetting) {

            var paymentModesAvailable = paymentSetting.ValueObject;

            var cashPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (x) {
                return x.PaymentType == PaymentType.ESPECE;
            });

            var dateOpen = new Date().toString('dd/MM/yyyy H:mm:ss');

            $scope.openPosValues = {
                HardwareId: $rootScope.PosLog.HardwareId,
                PosUserId: $rootScope.PosUserId,
                Date: dateOpen,
                MovementType_Id: 0,
                CashMovementLines: []
            }

            var addPaymentMode = {
                PaymentType: cashPaymentMode.PaymentType,
                Value: cashPaymentMode.Value,
                Text: cashPaymentMode.Text,
                Total: 0,
                IsBalance: cashPaymentMode.IsBalance
            };

            var lineOpenPos = {
                PaymentMode: addPaymentMode
            }

            $scope.openPosValues.CashMovementLines.push(lineOpenPos);

        }, function (err) {
            console.log(err);
        });


    }

    $scope.selectMotif = function (motif) {
        $scope.model.motif = motif;
    }

    $scope.editCashValues = function () {


        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (total) {
            $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = roundValue(parseFloat(total));
    
        }, function () {
        
        });
    }

    $scope.ok = function () {


        if ($scope.model.motif && $scope.model.motif != null) {
            $scope.openPosValues.MovementType_Id = $scope.model.motif.Id;
            cashMovementService.saveMovementAsync($scope.openPosValues);

            var updPaymentModes = [];

            var newPaymentMode = clone($scope.openPosValues.CashMovementLines[0].PaymentMode);

            newPaymentMode.Total = roundValue(parseFloat(newPaymentMode.Total));

            if (!$scope.model.motif.CashIn) {
                newPaymentMode.Total = newPaymentMode.Total * (-1);
            }

            updPaymentModes.push(newPaymentMode);

            zposService.updatePaymentValuesAsync(updPaymentModes);

            $uibModalInstance.close();
        } else {
            sweetAlert({ title: $translate.instant("Veuillez renseigner le motif") }, function () {
              
            });            
        }
    }

    $scope.cancel = function () {
   
        $uibModalInstance.dismiss('cancel');
    }
});