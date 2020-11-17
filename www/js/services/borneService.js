app.service('borneService', function ($rootScope, $location, $uibModal, $uibModalStack, posPeriodService, posLogService, printService, orderService, paymentService) {
    const self = this;

    this.redirectToHome = () => {
        if ($rootScope.borne) {
            delete $rootScope.storeFilter;
            posLogService.getHardwareIdAsync().then(function (result) {
                posPeriodService.getYPeriodAsync(result, undefined, false, false).then(function (periodPair) {
                    $rootScope.isPMREnabled = false;
                    if (!angular.equals(periodPair.YPeriod, {})) {
                        $rootScope.borneEventLoaded = false;

                        if ($rootScope.IziBoxConfiguration.UseFID && $rootScope.borneFid && $rootScope.Logged) {
                            //let modalConnection = document.querySelector("#modalConstumptionOpen");
                            $uibModal.open({
                                templateUrl: 'modals/modalConnectionMode.html',
                                controller: 'ModalConnectionController',
                                backdrop: false,
                                keyboard: false,
                                size: 'lg',
                                windowClass: 'mainModals'
                            });
                        } else {
                            let modalConsumption = document.querySelector("#modalConstumptionOpen");
                            if (!modalConsumption) {
                                $uibModal.open({
                                    templateUrl: 'modals/modalConsumptionMode.html',
                                    controller: 'ModalConsumptionModeController',
                                    size: 'lg',
                                    backdrop: false,
                                    windowClass: 'mainModals'
                                });
                            }
                        }

                        $location.path("/catalog");
                    } else {
                        $location.path("/borneClosed");
                    }

                    $rootScope.hideLoading();
                }, (err) => {
                    console.error(err);
                    if ($rootScope.borne) {
                        $location.path("/borneClosed");
                    }
                });
            });
        } else {
            $location.path("/catalog");
        }
    };

    this.closeBorne = () => {
        $uibModalStack.dismissAll();
        $location.path("/borneClosed");
    };

    $rootScope.$on('iziboxConnected', (event, isConnected) => {
        if (!isConnected && $rootScope.borne) {
            self.closeBorne();
        }
    });
});