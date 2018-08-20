app.controller('ModalPickPaymentModeController', function ($scope, $rootScope, $uibModal, $uibModalInstance, pmAvailable, shoppingCartModel) {

    $scope.init = function () {
        $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
        $scope.pmAvailable = pmAvailable.filter(paymentMode => {
            return ((paymentMode.PaymentType === 7 && $scope.currentShoppingCart.Total >= $rootScope.IziBoxConfiguration.MinPaymentEasyTransac)
            || paymentMode.IsBalance
            || (paymentMode.PaymentType === 2 && $rootScope.borneCB ))
        });

    };

    $scope.selectPm = function(pm) {
        if ($scope.currentShoppingCart.Residue > 0) {
            // Attention à la fonction d'arrondi
            $uibModalInstance.close(false);
            shoppingCartModel.selectPaymentMode(pm, undefined, $rootScope.IziPosConfiguration.IsDirectPayment);
        }
    };
    $scope.payAtPos = function() {
        $uibModalInstance.close(true);
    };

    $scope.ok = function () {

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});