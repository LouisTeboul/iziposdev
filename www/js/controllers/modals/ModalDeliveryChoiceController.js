app.controller('ModalDeliveryChoiceController', function ($scope, $rootScope, $uibModalInstance, $uibModal, shoppingCartService, ngToast, parameter, shoppingCartModel) {

    var deliveryTypeHandler = undefined;

    //Indique si on imprime le ticket ou non
    $scope.printTicket = parameter;

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
        $scope.close();

    };

    $scope.close = function () {
        if ($scope.printTicket) {
            shoppingCartModel.validShoppingCart(true);
            shoppingCartModel.setDeliveryType($scope.deliveryType);
        } else {
            shoppingCartModel.validShoppingCart();
            shoppingCartModel.setDeliveryType($scope.deliveryType);
        }
        $uibModalInstance.close();
    };

    $scope.cancel = function(){
        $uibModalInstance.dismiss("cancel");
    };

    $scope.$on("$destroy", function () {
        if (deliveryTypeHandler) deliveryTypeHandler();
    });


});