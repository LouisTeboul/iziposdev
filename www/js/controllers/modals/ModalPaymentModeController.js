app.controller('ModalPaymentModeController', function ($scope, $rootScope, shoppingCartModel, $uibModalInstance, paymentMode, maxValue,$translate,$filter) {
	var current = this;
	var currencyFormat = $filter('CurrencyFormat');

    $scope.paymentMode = paymentMode;
    $scope.errorMessage = undefined;
    $scope.value = paymentMode.Total + "";
    $scope.valueKeyboard = "";

    $scope.init = function () {
        if (maxValue == undefined) {
            maxValue = 99999;
        }

        $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();


        setTimeout(function () {
            var txtAmount = document.getElementById("txtAmount");
            if (txtAmount) {
                txtAmount.focus();              
            }

        }, 100);
    }

    $scope.removeTicketResto = function (tkResto) {
        shoppingCartModel.removeTicketRestaurant(tkResto);
        $scope.value = paymentMode.Total + "";
    }

    $scope.remove = function () {
        $scope.value = 0;
        $scope.ok();
    }

    $scope.calculate = function () {
        try {
            var newValue = Math.round(eval($scope.value) * 100) / 100;

            if (!isNaN(newValue)) {
                $scope.value = newValue;
            }
        } catch (err) {

        }
    }

    $scope.ok = function () {
        $scope.calculate();

        var totalPayment = parseFloat($scope.value);

        if (isNaN(totalPayment)) {
            $scope.errorMessage = $translate.instant("Montant non valide");
        } else if(maxValue != undefined && totalPayment > maxValue){
        	$scope.errorMessage = $translate.instant("Le montant ne peut pas dépasser") + " " + currencyFormat(maxValue);
        } else {
            $scope.errorMessage = undefined;
            $scope.paymentMode.Total = totalPayment;
            $uibModalInstance.close($scope.paymentMode);

            setTimeout(function () {
            	$rootScope.closeKeyboard();
            	$rootScope.closeKeyboard();
            }, 500);

        }

        $scope.$evalAsync();
    }

    $scope.cancel = function () {
    	$uibModalInstance.dismiss('cancel');
    	
    	setTimeout(function () {
    		$rootScope.closeKeyboard();
    		$rootScope.closeKeyboard();
    	}, 500);
    }

});