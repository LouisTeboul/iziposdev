app.controller('ModalChooseOfferController', function ($scope, $rootScope, $uibModalInstance, $translate, shoppingCartModel) {

    $scope.defaultValue = '';

    $scope.result = {
        action: undefined, // Discount or Offer
        type: undefined, // For discount, if it's to be applied on a single item, or on the whole line
        montant: 0, // discount amount
        isPercent: true // % or flat ?
    };


    $scope.submitItem = function () {

        if (shoppingCartModel.getCurrentShoppingCart().Discounts.length == 0) {
            $scope.result.type = "item";
            if ($scope.result.action.localeCompare('Offer') != 0) {
                $scope.result.montant = Number(document.querySelector('#txtAmount').textContent);
            }
            $rootScope.closeKeyboard();
            $uibModalInstance.close($scope.result);
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            sweetAlert($translate.instant("Le ticket a déjà une remise !"));
        }
    };

    $scope.submitLine = function () {

        if (shoppingCartModel.getCurrentShoppingCart().Discounts.length == 0) {
            $scope.result.type = "line";
            if ($scope.result.action.localeCompare('Offer') != 0) {
                $scope.result.montant = Number(document.querySelector('#txtAmount').textContent);
            }
            $rootScope.closeKeyboard();
            $uibModalInstance.close($scope.result);
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            sweetAlert($translate.instant("Le ticket a déjà une remise !"));
        }
    };

    $scope.setFocus = function () {

        var focus = setTimeout(function () {
            if (document.querySelector('#txtAmount')) {
                document.querySelector('#txtAmount').focus();
                $rootScope.openKeyboard('numeric', "end-start");
            }
        }, 100);
    };

    $scope.isMode = function () {
        if ($scope.mode)
            return false;
        else
            return true;
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
    };

});