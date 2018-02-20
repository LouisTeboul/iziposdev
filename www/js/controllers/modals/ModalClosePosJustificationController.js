app.controller('ModalClosePosJustificationController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService, eventService, cashMovementService, zposService, $translate, posPeriodService, justificationParameters, posUserService, posService) {
    $scope.justificationParameters = justificationParameters;


    $scope.init = function () {


    };

    /**
     * Display all tickets related to a cash register
     * Enable user to modify said tickets
     * @param hid
     */
    $scope.correctTickets = function (hid) {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashRegisterShoppingCarts.html',
            controller: 'ModalCashRegisterShoppingCartsController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                hid: function () {
                    return hid;
                },
                zpid: function () {
                    return $scope.justificationParameters.closePosParameters.zperiod.id;
                },
                ypid: function () {
                    if ($scope.justificationParameters.closePosParameters.yperiod) {
                        return $scope.justificationParameters.closePosParameters.yperiod.id;
                    } else {
                        return {};
                    }
                }

            },

        });


        modalInstance.result.then(function () {
            var param = {
                refresh: true
            };
            $uibModalInstance.close(param);
        });
    };

    /**
     * Open the view to manage cash
     */
    $scope.cashManagement = function (hid) {

        if (posUserService.isEnable('CASH')) {

            var createPeriodIfNeadeed = posUserService.isEnable('CLOS', true);

            posPeriodService.getYPeriodAsync(hid, $rootScope.PosUserId, createPeriodIfNeadeed, false, true).then(function (yPeriod) {

                if (yPeriod && !yPeriod.endDate) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalOpenPos.html',
                        controller: 'ModalOpenPosController',
                        resolve: {
                            openPosParameters: function () {
                                return {
                                    isOpenPos: false,
                                    zPeriodId: yPeriod.zPeriodId,
                                    yPeriodId: yPeriod.id
                                }
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then(function () {
                        var param = {
                            refresh: true
                        };
                        $uibModalInstance.close(param);

                    }, function () {
                    });
                }
                else if (yPeriod && yPeriod.endDate) {
                    var param = {
                        refresh: true
                    };
                    $uibModalInstance.close(param);
                }
            }, function () {
                sweetAlert({title: $translate.instant("Veuillez renseigner le fond de caisse")}, function () {
                });
            });
        }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }

    $scope.ok = function () {
        $uibModalInstance.close();
    }
});