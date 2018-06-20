app.service('borneService', ['$rootScope', '$q', '$location', 'posPeriodService', 'posLogService', '$uibModal',
    function ($rootScope, $q, $location, posPeriodService, posLogService, $uibModal) {

        this.redirectToHome = function () {
            if ($rootScope.borne) {
                posLogService.getHardwareIdAsync().then(function (result) {
                    posPeriodService.getYPeriodAsync(result, undefined, false).then(function (YPeriod) {
                        if (!angular.equals(YPeriod, {})) {
                            var modalInstance = $uibModal.open({
                                templateUrl: 'modals/modalConnection.html',
                                controller: 'ModalConnectionController',
                                backdrop: 'static',
                                keyboard :false,
                                size: 'lg'
                            });
                            $location.path("/catalog");
                        } else {
                            $location.path("/borneClosed");
                        }
                        $rootScope.hideLoading();
<<<<<<< HEAD
                    })
=======
                    });
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
                });
            } else {
                $location.path("/catalog");
            }
        }
    }]);