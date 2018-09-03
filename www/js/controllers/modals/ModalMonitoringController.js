app.controller('ModalMonitoringController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $http, $timeout, posPeriodService) {

    let registerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/registeredDevices";

    $scope.init = function () {
        updateListDaemon()
    };

    function updateListDaemon() {
        $http.get(registerApiUrl)
            .then(function (res) {
                if(res.data != $scope.onlineDevices) {
                    $scope.onlineDevices = res.data;
                    const d = new Date();
                    $scope.lastUpdateTime = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
                    $scope.$evalAsync();
                }
                $timeout(updateListDaemon, 10000);
            }, function () {
                $timeout(updateListDaemon, 10000);
            })
    }

    $scope.openPeriod = function(hid){
        posPeriodService.getYPeriodAsync(hid, $rootScope.PosUserId ? $rootScope.PosUserId : null, true, false, false).then(function(res){
            console.log(res);
        })
    };

    $scope.close = function () {
        $uibModalInstance.dismiss('close');
    }
});

