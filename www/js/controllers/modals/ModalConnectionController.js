app.controller('ModalConnectionController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $mdMedia, shoppingCartService, ngToast, shoppingCartModel, $timeout, $uibModalStack, $translate) {

    let loyaltyChangedHandler = undefined;
    let modalConsumption = undefined;

    $scope.mdMedia = $mdMedia;
    $scope.DeliveryTypes = DeliveryTypes;
    $scope.connexionModal = undefined;

    $scope.init = function () {
        let el = document.querySelector(".keyboardContainer");
        el.style.display = "flex";
        $scope.customStyle = {
            'flex-direction' : $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)'
        };

        if ($rootScope.borneUsedByCustomer) {
            $timeout(function () {
                $('#txtBarcode #txtValue.textfieldBorne').trigger('click');
                let el = document.querySelector("#txtValue .tfBorneText");
                if(el) {
                    el.innerHTML = "N° de carte";
                }
            }, 250);
        }
        $rootScope.borneUsedByCustomer = false;

        loyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', () => {
            console.log("Client connecté");
            $scope.close();
        });

        shoppingCartModel.updatePaymentModes();
    };

    $scope.close = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.close();
        if (!modalConsumption) {
            if(!$rootScope.isCustomerLog) {
                modalConsumption = $uibModal.open({
                    templateUrl: 'modals/modalConsumptionMode.html',
                    controller: 'ModalConsumptionModeController',
                    size: 'lg',
                    backdrop: 'static',
                    windowClass: 'mainModals'
                });

                $rootScope.isCustomerLog = true;

                modalConsumption.result.then(() => {
                    if ($rootScope.isBorneOrderCanceled) {
                        $uibModal.open({
                            templateUrl: 'modals/modalConnectionMode.html',
                            controller: 'ModalConnectionController',
                            size: 'lg',
                            backdrop: 'static',
                            windowClass: 'mainModals'
                        });
                    } else {
                        shoppingCartModel.createShoppingCart();
                    }
                }, function () {
                });
            }
        }
    };

    $scope.closeConnexion = function () {
        delete $rootScope.currentPage;
        $uibModal.open({
            templateUrl: 'modals/modalConnectionMode.html',
            controller: 'ModalConnectionController',
            backdrop: 'static',
            keyboard: false,
            size: 'lg',
            windowClass: 'mainModals'
        });
        $timeout(function () {
            $uibModalInstance.dismiss('cancel');
        }, 250);
    };

    $scope.redirectToCustomer = function () {
        if ($rootScope.borne) {
            const top = $uibModalStack.getTop();
            $uibModal.open({
                templateUrl: 'modals/modalRegisterFid.html',
                controller: 'ModalRegisterFid',
                backdrop: 'static',
                size: 'lg',
                windowClass: 'mainModals'
            });
            $timeout(function () {
                if (top) {
                    $uibModalStack.dismiss(top.key);
                }
            }, 250);
        }
    };

    $scope.redirectToConnection = function () {
        if ($rootScope.borne) {
            $rootScope.borneUsedByCustomer = true;
            const top = $uibModalStack.getTop();
            $scope.connexionModal = $uibModal.open({
                templateUrl: 'modals/modalScanFidCard.html',
                controller: 'ModalConnectionController',
                backdrop: 'static',
                size: 'lg',
                windowClass: 'mainModals'
            });
            $timeout(function () {
                if (top) {
                    $uibModalStack.dismiss(top.key);
                }
            }, 250);
        }
    };

    $scope.setLanguage = function (codeLng) {
        window.localStorage.setItem("CurrentLanguage", codeLng);
        $translate.use(codeLng);
    };
});