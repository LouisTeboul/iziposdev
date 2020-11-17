app.controller('ModalBipperController', function ($scope, $rootScope, $uibModalInstance) {
    $scope.valueBipper = $rootScope.currentShoppingCart ? $rootScope.currentShoppingCart.BipperNumber : null;

    $scope.init = () => {

    };

    $scope.ok = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.close($scope.valueBipper);
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});