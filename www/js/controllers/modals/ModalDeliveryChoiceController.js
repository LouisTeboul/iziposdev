app.controller('ModalDeliveryChoiceController', function ($scope, $rootScope, $uibModalInstance, $uibModal, shoppingCartService, ngToast, parameter, shoppingCartModel) {

    var deliveryTypeHandler = undefined;
    $scope.parameter = parameter;

    $scope.DeliveryTypes = DeliveryTypes;

    $scope.init = function () {
        $scope.deliveryType = shoppingCartModel.getDeliveryType();

        deliveryTypeHandler = $scope.$watch('deliveryType', function () {
            shoppingCartModel.setDeliveryType($scope.deliveryType);
        });
    };

    $scope.setDeliveryType = function (value) {
        $scope.deliveryType = value;       
        $scope.$evalAsync();
    };

    $scope.close = function () {
        if ($scope.parameter) {
            shoppingCartModel.validShoppingCart(true);
            shoppingCartModel.setDeliveryType(0);
        } else {
            shoppingCartModel.validShoppingCart();
            shoppingCartModel.setDeliveryType(0);
        }
        $uibModalInstance.close();
    };

    $scope.$on("$destroy", function () {
        if (deliveryTypeHandler) deliveryTypeHandler();    
    });


});