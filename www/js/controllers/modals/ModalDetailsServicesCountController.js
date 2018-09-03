app.controller('ModalDetailsServicesCountController', function ($scope, $rootScope, $uibModalInstance, posPeriodService, detailsServicesParameters) {

    $scope.detailsServicesParameters = detailsServicesParameters;
    $scope.model = {
        yPeriodsModels: []
    };
    $scope.paymentType = PaymentType;

    $scope.init = function () {

        // Renseigner ce que le ou les utilisateurs on déjà renseigné lors de la fermeture du(des) services 
        posPeriodService.getYCountLinesDetailsByHidAsync(detailsServicesParameters.zPeriodId, detailsServicesParameters.hid).then(function (yPeriodsDetails) {

            let yPeriods = Enumerable.from(yPeriodsDetails.yPeriods).orderBy("x => x.startDate").toArray();

            for(let yp of yPeriods) {
                for(let ypl of yp.YCountLines) {
                    ypl.cashDiscrepancy = 0;
                    if (ypl.PaymentMode) {
                        ypl.cashDiscrepancy = ypl.PaymentMode.Total - ypl.TotalKnown;
                    }
                }
                $scope.model.yPeriodsModels.push(yp);
            }
        });
    };

    $scope.printDate = function (yp) {
        return dateFormat(yp.startDate);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});