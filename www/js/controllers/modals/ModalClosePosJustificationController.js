app.controller('ModalClosePosJustificationController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService, eventService, cashMovementService, zposService, $translate, posPeriodService, justificationParameters, posUserService) {
    $scope.justificationParameters = justificationParameters;

    $scope.init = function () {
        $scope.model = {
            cashManagementDisable: false
        };
    };

    /**
     * Display all tickets related to a cash register
     * Enable user to modify said tickets
     * @param hid
     */
    $scope.correctTickets = function (hid) {
        let modalInstance = $uibModal.open({
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
                        return null;
                    }
                }
            },
        });

        modalInstance.result.then(function () {
            const param = {
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
            const createPeriodIfNeadeed = posUserService.isEnable('CLOS', true);

            $scope.model.cashManagementDisabled = true;

            posPeriodService.getYPeriodAsync(hid, $rootScope.PosUserId, false, true).then(function (periodPair) {
                function callOpenPosModal(YPeriod, forceOpen) {
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalOpenPos.html',
                        controller: 'ModalOpenPosController',
                        resolve: {
                            openPosParameters: function () {
                                return {
                                    isOpenPos: false,
                                    zPeriodId: YPeriod.zPeriodId,
                                    yPeriodId: YPeriod.id,
                                    forceOpen: forceOpen
                                };
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then(function () {
                        $scope.model.cashManagementDisabled = false;
                        const param = {
                            refresh: true
                        };
                        $uibModalInstance.close(param);
                    }, function () {
                        $scope.model.cashManagementDisabled = false;
                    });
                }

                if (!periodPair.YPeriod) {
                    if (createPeriodIfNeadeed) {
                        // ForceOpen
                        var openPosValues = {
                            HardwareId: hid,
                            PosUserId: $rootScope.PosUserId,
                            zPeriodId: periodPair.ZPeriod ? periodPair.ZPeriod.zPeriodId : undefined,
                            StoreId: $rootScope.IziBoxConfiguration.StoreId,
                            CashMovementLines: []
                        };

                        posPeriodService.CreateOrUpdateYPeriodAsync(openPosValues, undefined, true).then((periodPair) => {
                            callOpenPosModal(periodPair.YPeriod, true);
                        }, () => {
                            console.log("Error in force open Y");
                            swal({ title: $translate.instant("Veuillez renseigner le fond de caisse") });
                        });
                    } else {
                        $scope.model.cashManagementDisabled = false;
                    }
                }
                else if (periodPair.YPeriod && !periodPair.YPeriod.endDate) {
                    callOpenPosModal(periodPair.YPeriod, false);
                } else if (periodPair.YPeriod && periodPair.YPeriod.endDate) {
                    $scope.model.cashManagementDisabled = false;
                    const param = {
                        refresh: true
                    };
                    $uibModalInstance.close(param);
                }
            }, () => {
                $scope.model.cashManagementDisabled = false;
                swal({ title: $translate.instant("Veuillez renseigner le fond de caisse") });
            });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.ok = () => {
        $uibModalInstance.close();
    };
});