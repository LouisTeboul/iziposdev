app.controller('ModalShoppingCartDiscountController', function ($scope, $rootScope, $uibModalInstance, defaultValue, $translate, shoppingCartModel) {
    $scope.errorMessage = undefined;
    $scope.result = {
        value: defaultValue,
        isPercent: true
    };

    $scope.init = function () {
        setTimeout(function () {
            const txtAmount = document.getElementById("txtAmount");
            if (txtAmount) {
                txtAmount.focus();
            }

        }, 100);
    };

    $scope.setFocus = function () {
        setTimeout(function () {
            document.querySelector('#txtAmount').focus();
            $rootScope.openKeyboard('decimal', "end-start");
        }, 30);
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();

        let currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
        let hasDiscountedItems;

        for(let item of currentShoppingCart.Items) {
            hasDiscountedItems = item.DiscountET > 0 || item.DiscountIT > 0;
        }
        // Check if the user has already selected payments modes
        if (currentShoppingCart.PaymentModes && currentShoppingCart.PaymentModes.length > 0) {
            shoppingCartModel.removeAllPayments();
        }

        if (!hasDiscountedItems) {
            const totalDiscount = parseFloat($scope.result.value);
            if (isNaN(totalDiscount)) {
                $scope.errorMessage = $translate.instant("Valeur non valide");
            } else {
                if ($scope.result.isPercent) {

                    if (totalDiscount > 100) {
                        $scope.errorMessage = $translate.instant("Impossible de faire une remise supérieur à la 100% !");
                    } else {
                        $scope.errorMessage = undefined;
                        $uibModalInstance.close($scope.result);
                    }

                } else {
                    if (totalDiscount > currentShoppingCart.Total) {
                        $scope.errorMessage = $translate.instant("Impossible de faire une remise supérieur à la valeur du ticket !");
                    } else {
                        $scope.errorMessage = undefined;
                        $uibModalInstance.close($scope.result);
                    }

                }


            }
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            sweetAlert($translate.instant("Un produit du ticket a déjà une remise !"));
        }

    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});