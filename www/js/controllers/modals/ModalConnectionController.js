app.controller('ModalConnectionController', function ($scope, $rootScope, $uibModalInstance, $uibModal, shoppingCartService, ngToast, shoppingCartModel, $timeout, $uibModalStack, $translate) {

    let loyaltyChangedHandler = undefined;
    let modalConsumption = undefined;
    let borneUsedByCustomer = undefined;

    $scope.DeliveryTypes = DeliveryTypes;
    $scope.connexionModal = undefined;

    $scope.init = function () {

        let el = document.querySelector(".keyboardContainer");
        el.style.display = "flex";

        if (borneUsedByCustomer) {
            $timeout(function () {
                document.querySelector("#txtBarcode").focus();
                document.querySelector("#txtValue > span").innerHTML = "";
            }, 500);
        }
        borneUsedByCustomer = false;
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
            modalConsumption = $uibModal.open({
                templateUrl: 'modals/modalConsumptionMode.html',
                controller: 'ModalConsumptionModeController',
                size: 'lg',
                backdrop: 'static'
            });
        }
        modalConsumption.result.then(() => {
            if ($rootScope.isBorneOrderCanceled) {
                $uibModal.open({
                    templateUrl: 'modals/modalConnectionMode.html',
                    controller: 'ModalConnectionController',
                    size: 'lg',
                    backdrop: 'static'
                });
            } else {
                shoppingCartModel.createShoppingCart();
            }
        }, function () {
        });
    };

    $scope.closeConnexion = function () {
        delete $rootScope.currentPage;
        $uibModal.open({
            templateUrl: 'modals/modalConnectionMode.html',
            controller: 'ModalConnectionController',
            backdrop: 'static',
            keyboard: false,
            size: 'lg'
        });
        $timeout(function () {
            $uibModalInstance.dismiss('cancel');
        }, 250);
    };

    $scope.redirectToCustomer = function () {
        if ($rootScope.borne) {
            const top = $uibModalStack.getTop();
            $uibModal.open({
                templateUrl: 'modals/modalCustomerBorneVertical.html',
                controller: 'ModalCustomerBorneController',
                backdrop: 'static',
                size: 'lg'
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
            borneUsedByCustomer = true;
            const top = $uibModalStack.getTop();
            $scope.connexionModal = $uibModal.open({
                templateUrl: 'modals/modalConnectionBorne.html',
                controller: 'ModalConnectionController',
                backdrop: 'static',
                size: 'lg'
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