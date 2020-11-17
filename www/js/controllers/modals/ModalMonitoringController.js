app.controller('ModalMonitoringController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $http, $timeout, posPeriodService) {

    $scope.openPeriod = function(hid){
        posPeriodService.getYPeriodAsync(hid, $rootScope.PosUserId ? $rootScope.PosUserId : null, true, false).then(function (periodPair) {
            console.log(periodPair);
        });
    };

    $scope.close = function () {
        $uibModalInstance.dismiss('close');
    };
});

