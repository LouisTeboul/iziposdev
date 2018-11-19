app.controller('ModalChooseOfferController', function ($scope, $rootScope, $uibModalInstance, $translate, shoppingCartModel) {

    $scope.defaultValue = '';

    $scope.result = {
        action: undefined, // Discount or Offer
        type: undefined, // For discount, if it's to be applied on a single item, or on the whole line
        montant: 0, // discount amount
        isPercent: true // % or flat ?
    };


    $scope.submitItem = function () {

        let currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        if (currentShoppingCart.Discounts.length === 0) {
            $scope.result.type = "item";
            if ($scope.result.action.localeCompare('Offer') !== 0) {
                $scope.result.montant = Number(document.querySelector('#txtAmount').textContent);
            }
            $rootScope.closeKeyboard();
            // Check if the user has already selected payments modes
            if (currentShoppingCart.PaymentModes && currentShoppingCart.PaymentModes.length > 0) {
                shoppingCartModel.removeAllPayments();
            }
            $uibModalInstance.close($scope.result);
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            sweetAlert($translate.instant("Le ticket a déjà une remise !"));
        }
    };

    $scope.submitLine = function () {

        let currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        if (currentShoppingCart.Discounts.length === 0) {
            $scope.result.type = "line";
            if ($scope.result.action.localeCompare('Offer') !== 0) {
                $scope.result.montant = Number(document.querySelector('#txtAmount').textContent);
            }
            $rootScope.closeKeyboard();
            // Check if the user has already selected payments modes
            if (currentShoppingCart.PaymentModes && currentShoppingCart.PaymentModes.length > 0) {
                shoppingCartModel.removeAllPayments();
            }
            $uibModalInstance.close($scope.result);
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            sweetAlert($translate.instant("Le ticket a déjà une remise !"));
        }
    };

    $scope.setFocus = function () {

        setTimeout(function () {
            if (document.querySelector('#txtAmount')) {
                document.querySelector('#txtAmount').focus();
                $rootScope.openKeyboard('decimal', "end-start");
            }
        }, 100);
    };

    $scope.isMode = function () {
        return !$scope.mode;
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
    };

});