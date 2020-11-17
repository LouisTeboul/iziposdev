app.controller('ModalConsumptionModeController', function ($scope, $rootScope, $uibModalInstance, $mdMedia, paymentService) {
    let deliveryTypeHandler = undefined;

    $scope.mdMedia = $mdMedia;
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

        paymentService.updatePaymentModes();

        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size': 'cover'
        };
    };

    $scope.$on("$destroy", function () {
        deliveryTypeHandler();
    });

    $scope.setDeliveryType = function (value) {
        delete $rootScope.storeFilter;
        $rootScope.isBorneOrderCanceled = false;
        $scope.deliveryType = value;
        $scope.$evalAsync();
        $scope.close();
    };

    $scope.cancelDeliveryType = function () {
        $rootScope.isBorneOrderCanceled = true;
        $rootScope.isCustomerLog = false;
        $scope.close();
    };

    $scope.close = function () {
        $rootScope.createShoppingCart();
        $uibModalInstance.close();
    };

    $scope.$on("$destroy", function () {
        deliveryTypeHandler();
    });
});