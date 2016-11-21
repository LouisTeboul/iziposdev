app.controller('ModalTypePriceController', function ($scope, $rootScope, $uibModalInstance, currentPrice, minPrice, maxPrice, $translate, $filter) {
	var currencyFormat = $filter('CurrencyFormat');
	$scope.valuePrice = currentPrice;

    $scope.init = function () {
        setTimeout(function () {
            var txtPrice = document.getElementById("txtPrice");
            if (txtPrice) {
                txtPrice.focus();
            }

        }, 100);
    }


    $scope.ok = function () {

        var newValue = parseFloat($scope.valuePrice);

        if (isNaN(newValue)) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
        } else if (newValue < minPrice || newValue > maxPrice) {
        	$scope.errorMessage = $translate.instant("Le prix doit être compris entre ") + currencyFormat(minPrice) + " " + $translate.instant("et") + " " + currencyFormat(maxPrice);
        } else {
        	$uibModalInstance.close(newValue);
        }

        setTimeout(function () {
        	$rootScope.closeKeyboard();
        	$rootScope.closeKeyboard();
        }, 500);
    }

    $scope.cancel = function () {
    	$uibModalInstance.dismiss('cancel');
    	setTimeout(function () {
    		$rootScope.closeKeyboard();
    		$rootScope.closeKeyboard();
    	}, 500);
    }
});