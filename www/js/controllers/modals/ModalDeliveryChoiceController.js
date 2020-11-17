app.controller('ModalDeliveryChoiceController', function ($scope, $rootScope, $timeout, $uibModalInstance, paymentService, parameter) {
    let deliveryTypeHandler = undefined;

    //Indique si on imprime le ticket ou non
    $scope.printTicket = parameter;

    $scope.DeliveryType = DeliveryType;

    $scope.init = () => {
        $scope.deliveryType = $rootScope.currentDeliveryType;

        deliveryTypeHandler = $scope.$watch('deliveryType', () => {
            $rootScope.currentDeliveryType = $scope.deliveryType;
            if ($rootScope.currentShoppingCart) {
                $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
            }
            $rootScope.$emit('deliveryTypeChanged');
        });
    };

    $scope.switchChange = function (arg) {
        console.log(arg);
    };

    $scope.setDeliveryType = function (value) {
        $scope.deliveryType = value;
        $timeout(function () {
            $scope.close();
        }, 200);
    };

    $scope.close = () => {
        $rootScope.currentDeliveryType = $scope.deliveryType;
        if ($rootScope.currentShoppingCart) {
            $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
        }
        $rootScope.$emit('deliveryTypeChanged');
        paymentService.validShoppingCart($scope.printTicket);
        $uibModalInstance.close();
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss("cancel");
    };

    $scope.$on("$destroy", function () {
        if (deliveryTypeHandler) deliveryTypeHandler();
    });
});