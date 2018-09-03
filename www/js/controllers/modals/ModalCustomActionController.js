/**
 * Modal for selecting a loyalty custom action
 */
app.controller('ModalCustomActionController', function ($scope, $rootScope, $q, $uibModalInstance, $uibModal, shoppingCartService, ngToast, shoppingCartModel) {

    $scope.init = function () {
        $scope.isUsingAction = true;
        $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
    };

    $scope.close = function () {
        $uibModalInstance.close();
    };

    $scope.selectAction = function (value) {
        $scope.currentShoppingCart.customerLoyalty.SelectedCustomAction = value;
        $rootScope.$emit("customerLoyaltyChanged", $scope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
        $scope.$evalAsync();
        $uibModalInstance.close();
    };

    $scope.clearCustomAction = function () {
        $scope.currentShoppingCart.customerLoyalty.SelectedCustomAction = null;
        $rootScope.$emit("customerLoyaltyChanged", $scope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
        $uibModalInstance.close();
    };

    $scope.ok = function () {
        $scope.currentShoppingCart.customerLoyalty.SelectedCustomAction = JSON.parse($('#actionSelect').val());
        $rootScope.$emit("customerLoyaltyChanged", $scope.currentShoppingCart.customerLoyalty);
        $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
        $scope.$evalAsync();
        $uibModalInstance.close();
    }
});