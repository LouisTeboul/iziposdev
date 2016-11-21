app.controller('ModalShoppingCartSplitController', function ($scope, $rootScope, $uibModalInstance, defaultValue, shoppingCartModel) {
    $scope.errorMessage = undefined;
    $scope.value = defaultValue;

    $scope.init = function () {
        $scope.currentShoppingCartOut = cloneShoppingCart(shoppingCartModel.getCurrentShoppingCartOut() || shoppingCartModel.createShoppingCartOut());
        $scope.currentShoppingCartIn = cloneShoppingCart(shoppingCartModel.getCurrentShoppingCartIn() || shoppingCartModel.createShoppingCartIn());
    }

    $scope.sendToIn = function (item) {

        shoppingCartModel.addItemTo($scope.currentShoppingCartIn, $scope.currentShoppingCartOut, item);

    }

    $scope.sendToOut = function (item) {

        shoppingCartModel.addItemTo($scope.currentShoppingCartOut,$scope.currentShoppingCartIn, item);

    }


    $scope.ok = function () {

    	if ($scope.currentShoppingCartIn.Items.length > 0) {
    		shoppingCartModel.setCurrentShoppingCartIn($scope.currentShoppingCartIn);
    		shoppingCartModel.setCurrentShoppingCartOut($scope.currentShoppingCartOut);
    		shoppingCartModel.setCurrentShoppingCart($scope.currentShoppingCartIn);
    		
    	} else {
    		shoppingCartModel.setCurrentShoppingCartIn(undefined);
    		shoppingCartModel.setCurrentShoppingCartOut(undefined);
    		shoppingCartModel.setCurrentShoppingCart($scope.currentShoppingCartOut);
    	}

    	$uibModalInstance.close($scope.value);
        
    }

    $scope.cancel = function () {
        $scope.currentShoppingCartIn = undefined;
        $scope.currentShoppingCartOut = undefined;

        $uibModalInstance.close($scope.value);
    }

    var cloneShoppingCart = function (shoppingCart) {
    	var ret = clone(shoppingCart);

    	var cloneItemsArray = [];

    	Enumerable.from(shoppingCart.Items).forEach(function (item) {
    		if (item.Quantity > 0) {
    			cloneItemsArray.push(clone(item));
    		}
    	});

    	ret.Items = cloneItemsArray;

    	ret.Discounts = [];

    	if (shoppingCart.Discounts && shoppingCart.Discounts.length > 0) {
    		Enumerable.from(shoppingCart.Discounts).forEach(function (d) {
    			var newDiscount = clone(d);
    			newDiscount.Total = 0;
    			ret.Discounts.push(newDiscount);
    		});
    	}

    	return ret;
    }
});