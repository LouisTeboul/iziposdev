app.controller('ModalConnectionController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $mdMedia, $timeout, $uibModalStack, paymentService) {
    let loyaltyChangedHandler;
    let modalConsumption;

    $scope.mdMedia = $mdMedia;
    $scope.DeliveryType = DeliveryType;

    $scope.init = function () {
        let el = document.querySelector(".keyboardContainer");
        el.style.display = "flex";
        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size': 'cover'
        };

        $timeout(function () {
            $('#txtBarcode #txtValue.textfieldBorne').trigger('click');
            let el = document.querySelector("#txtValue .tfBorneText");
            if (el) {
                el.innerHTML = "N&deg; de carte";
            }
        }, 250);

        loyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', () => {
            console.log("Client connecté");
            $scope.close();
        });

        paymentService.updatePaymentModes();
    };

    $scope.close = () => {
        $rootScope.closeKeyboard();
        if (!modalConsumption) {
            if (!$rootScope.isCustomerLog) {
                modalConsumption = $uibModal.open({
                    templateUrl: 'modals/modalConsumptionMode.html',
                    controller: 'ModalConsumptionModeController',
                    size: 'lg',
                    backdrop: false,
                    windowClass: 'mainModals'
                });

                $rootScope.isCustomerLog = true;

                modalConsumption.result.then(() => {
                    if ($rootScope.isBorneOrderCanceled) {
                        $uibModal.open({
                            templateUrl: 'modals/modalConnectionMode.html',
                            controller: 'ModalConnectionController',
                            size: 'lg',
                            backdrop: false,
                            windowClass: 'mainModals'
                        });
                    }
                }, (err) => {
                });
            }
        }
        setTimeout(() => {
            $uibModalInstance.close();
        }, 250);
    };

    $scope.closeConnexion = () => {
        delete $rootScope.currentPage;
        $uibModal.open({
            templateUrl: 'modals/modalConnectionMode.html',
            controller: 'ModalConnectionController',
            backdrop: 'static',
            keyboard: false,
            size: 'lg',
            windowClass: 'mainModals'
        });
        $timeout(() => {
            $uibModalInstance.dismiss('cancel');
        }, 250);
    };

    $scope.redirectToCustomer = () => {
        if ($rootScope.borne) {
            const top = $uibModalStack.getTop();
            $uibModal.open({
                templateUrl: 'modals/modalRegisterFid.html',
                controller: 'ModalRegisterFid',
                backdrop: 'static',
                size: 'lg',
                windowClass: 'mainModals'
            });
            $timeout(() => {
                if (top) {
                    $uibModalStack.dismiss(top.key);
                }
            }, 250);
        }
    };

    $scope.redirectToConnection = () => {
        if ($rootScope.borne) {
            const top = $uibModalStack.getTop();
            let connexionModal = $uibModal.open({
                templateUrl: 'modals/modalScanFidCard.html',
                controller: 'ModalConnectionController',
                backdrop: 'static',
                size: 'lg',
                windowClass: 'mainModals'
            });
            connexionModal.result.then(() => {
                $rootScope.closeKeyboard();
            });

            $timeout(() => {
                if (top) {
                    $uibModalStack.dismiss(top.key);
                }
            }, 1000);
        }
    };
});