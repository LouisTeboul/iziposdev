/**
 * Modal for selecting a loyalty custom action
 */
app.controller('ModalCustomActionController', function ($scope, $rootScope, $uibModalInstance, shoppingCartService) {
    $scope.init = function () {
        $scope.isUsingAction = true;
    };

    $scope.close = function () {
        $uibModalInstance.close();
    };

    $scope.selectAction = function (value) {
        $rootScope.currentShoppingCart.customerLoyalty.SelectedCustomAction = value;
        $rootScope.$emit("customerLoyaltyChanged", $rootScope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
        $scope.$evalAsync();
        $uibModalInstance.close();
    };

    $scope.clearCustomAction = function () {
        $rootScope.currentShoppingCart.customerLoyalty.SelectedCustomAction = null;
        $rootScope.$emit("customerLoyaltyChanged", $rootScope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
        $uibModalInstance.close();
    };

    $scope.ok = function () {
        $rootScope.currentShoppingCart.customerLoyalty.SelectedCustomAction = JSON.parse($('#actionSelect').val());
        $rootScope.$emit("customerLoyaltyChanged", $rootScope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
        $scope.$evalAsync();
        $uibModalInstance.close();
    }
});