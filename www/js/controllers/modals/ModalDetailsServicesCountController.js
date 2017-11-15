app.controller('ModalDetailsServicesCountController', function ($scope, $rootScope, $uibModalInstance, posPeriodService, detailsServicesParameters) {
    
    $scope.detailsServicesParameters = detailsServicesParameters;
    $scope.model = {
        yPeriodsModels: []
    };

    $scope.init = function () {
        
        // Renseigner ce que le ou les utilisateurs on déjà renseigné lors de la fermeture du(des) services 
        posPeriodService.getYCountLinesDetailsByHidAsync(detailsServicesParameters.zPeriodId, detailsServicesParameters.hid).then(function (yPeriodsDetails) {
            Enumerable.from(yPeriodsDetails.yPeriods).forEach(function (yp) {

                $scope.model.yPeriodsModels.push(yp);
            });
        });

    };
    
    $scope.printDate = function (yp) {
        return dateFormat(yp.startDate);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});