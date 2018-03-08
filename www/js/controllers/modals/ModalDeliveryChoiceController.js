app.controller('ModalDeliveryChoiceController', function ($scope, $rootScope, $timeout, $uibModalInstance, $uibModal, shoppingCartService, ngToast, parameter, shoppingCartModel) {

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

    $scope.switchChange = function (arg) {
        console.log(arg);
    };

    $scope.setDeliveryType = function (value) {
        $scope.deliveryType = value;
        $timeout(function(){
            $scope.close();
        },200)

    };

    $scope.close = function () {

        shoppingCartModel.setDeliveryType($scope.deliveryType);
        shoppingCartModel.validShoppingCart($scope.printTicket);
        $uibModalInstance.close();
    };

    $scope.cancel = function(){
        $uibModalInstance.dismiss("cancel");
    };

    $scope.$on("$destroy", function () {
        if (deliveryTypeHandler) deliveryTypeHandler();
    });


});