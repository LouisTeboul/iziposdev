app.controller('ModalShoppingCartDiscountController', function ($scope, $rootScope, $uibModalInstance, defaultValue,$translate) {
	$scope.errorMessage = undefined;
	$scope.result = {
		value : defaultValue,
		isPercent : true
	}

    $scope.init = function () {
        setTimeout(function () {
            var txtAmount = document.getElementById("txtAmount");
            if (txtAmount) {
            	txtAmount.focus();
            }

        }, 100);
    }

    $scope.ok = function () {
    	$rootScope.closeKeyboard();
        var totalDiscount = parseFloat($scope.result.value);

        if (isNaN(totalDiscount)) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
        } else {
            $scope.errorMessage = undefined;
            $uibModalInstance.close($scope.result);
        }
    }

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});