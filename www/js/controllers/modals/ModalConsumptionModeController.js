app.controller('ModalConsumptionModeController', function ($scope, $rootScope, $uibModalInstance, $uibModal, shoppingCartService, ngToast, shoppingCartModel) {

    let deliveryTypeHandler = undefined;

    $scope.DeliveryTypes = DeliveryTypes;

    $scope.init = function () {

        $scope.deliveryType = shoppingCartModel.getDeliveryType();

        deliveryTypeHandler = $scope.$watch('deliveryType', function () {
            shoppingCartModel.setDeliveryType($scope.deliveryType);
        });

        shoppingCartModel.updatePaymentModes();

        $scope.customStyle = {
            'flex-direction' : $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)'
        }
    };

    $scope.$on("$destroy", function () {
        deliveryTypeHandler();
    });

    $scope.setDeliveryType = function (value) {
        $rootScope.isBorneOrderCanceled = false;
        $scope.deliveryType = value;
        $scope.$evalAsync();
        $scope.close();
    };

    $scope.cancelDeliveryType = function () {
        $rootScope.isBorneOrderCanceled = true;
        $scope.close();
    };

    $scope.close = function () {
        $uibModalInstance.close();
    };

    $scope.$on("$destroy", function () {
        deliveryTypeHandler();
    });
});