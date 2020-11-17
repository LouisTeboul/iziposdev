app.controller('ModalDetailsServicesCountController', function ($scope, $rootScope, $uibModalInstance, posPeriodService, detailsServicesParameters) {

    $scope.detailsServicesParameters = detailsServicesParameters;
    $scope.dateFormat = dateFormat;

    $scope.model = {
        yPeriodsModels: []
    };
    $scope.paymentType = PaymentType;

    $scope.init = function () {

        const processDetails = (yPeriodsDetails) => {
            let yPeriods = Enumerable.from(yPeriodsDetails.yPeriods).where("x => x.endDate").orderBy("x => x.startDate").toArray();

            for(let yp of yPeriods) {
                for (let ypl of yp.YCashMovementLines) {
                    ypl.cashDiscrepancy = 0;
                    if (ypl.PaymentMode) {
                        ypl.cashDiscrepancy = ypl.PaymentMode.Total - ypl.TotalKnown;
                    }
                }
                if(!$scope.model.selectedYPeriod) {
                    $scope.model.selectedYPeriod = yp;
                }
                $scope.model.yPeriodsModels.push(yp);
            }
            console.log($scope.model.yPeriodsModels);
        };

        // Renseigner ce que le ou les utilisateurs on déjà renseigné lors de la fermeture du(des) services

        if(!detailsServicesParameters.yPeriod && detailsServicesParameters.hid) {

            // Si on ne precise pas de periode, on recup le details de toutes les periode de l'HID
            posPeriodService.getYCountLinesDetailsByHidAsync(detailsServicesParameters.zPeriodId, detailsServicesParameters.hid).then(function(yPeriodsDetails) {
                processDetails(yPeriodsDetails);
            });
        } else if(detailsServicesParameters.yPeriod) {
            // Si on précise une période, on affiche le comptage de cette derniere
            processDetails({yPeriods : [detailsServicesParameters.yPeriod]})
        }
    };

    $scope.selectYPeriod = function (yp) {
        $scope.model.selectedYPeriod = yp;
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});