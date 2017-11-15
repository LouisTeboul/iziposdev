app.controller('ModalShoppingCartSplitController', function ($scope, $rootScope, $uibModalInstance, $uibModal, defaultValue, shoppingCartModel,posService) {
    $scope.errorMessage = undefined;
    $scope.value = defaultValue;
    $scope.result = {
        "nb" : 1
    };

    $scope.init = function () {
        $scope.currentShoppingCartOut = cloneShoppingCart(shoppingCartModel.getCurrentShoppingCartOut() || shoppingCartModel.createShoppingCartOut());
        $scope.currentShoppingCartIn = cloneShoppingCart(shoppingCartModel.getCurrentShoppingCartIn() || shoppingCartModel.createShoppingCartIn());

        if($scope.currentShoppingCartOut.TableNumber){
            $scope.currentShoppingCartIn.TableNumber = $scope.currentShoppingCartOut.TableNumber;
        }

        if($scope.currentShoppingCartOut.Discounts.length > 0){
            $scope.currentShoppingCartIn.Discounts = [];
        }
    };

    $scope.sendToIn = function (item) {
        shoppingCartModel.addItemTo($scope.currentShoppingCartIn, $scope.currentShoppingCartOut, item);
    };

    $scope.splitToIn = function (item){

        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalSplitItem.html',
            controller: 'ModalSplitItemController',
            backdrop: 'static',
            resolve: {
                defaultValue: function () {
                    return true;
                },
                itemPrice: function(){
                    return item.PriceIT;
                }
            }
        });

        modalInstance.result.then(function (result) {
        	console.log(item.splittedAmount);

        	if(result <= item.PriceIT - item.splittedAmount - item.DiscountIT) {
                shoppingCartModel.splitItemTo($scope.currentShoppingCartIn, $scope.currentShoppingCartOut, item, result);
                shoppingCartModel.calculateTotalFor($scope.currentShoppingCartOut);
                shoppingCartModel.calculateTotalFor($scope.currentShoppingCartIn);
			}
			else {
        	    // Afficher une erreur
            }

        }, function () {
            console.log('Erreur');
        });

	};


    $scope.splitToOut = function(itemIn) {
    	//on cherche a match une partie de produit split avec son parent
		//Pour cela, on utilise les hashkey
		//Si les hashkey sont identique, on regroupe les deux items

		Enumerable.from($scope.currentShoppingCartOut.Items).forEach(function(itemOut){
			if(itemOut.hashkey == itemIn.hashkey && itemOut.isPartSplitItem){
				itemOut.splittedAmount += itemIn.splittedAmount + itemIn.Product.Price;
                shoppingCartModel.removeItemFrom($scope.currentShoppingCartIn, itemIn);
                console.log(itemOut);
                if(itemOut.splittedAmount == 0) {
                    itemOut.isPartSplitItem = false;
				}
			}
            shoppingCartModel.calculateTotalFor($scope.currentShoppingCartOut);
            shoppingCartModel.calculateTotalFor($scope.currentShoppingCartIn);
		});
	};

    $scope.sendToOut = function (item) {
    	if(item.isPartSplitItem == true){
            this.splitToOut(item);
		} else {
            shoppingCartModel.addItemTo($scope.currentShoppingCartOut,$scope.currentShoppingCartIn, item);
		}

    };


    $scope.ok = function () {
    	if ($scope.currentShoppingCartIn.Items.length > 0) {
    	    //Si le nb de couvert du ticket split est superieur au nb de couvert du ticket d'origine
            if($scope.result.nb == $scope.currentShoppingCartOut.TableCutleries
                && $scope.currentShoppingCartOut.Items.length > 0){

                $scope.errorMessage = "Le ticket d'origine doit être vide pour transferer tout les couverts au ticket secondaire";

            } else {
                if($scope.result.nb > $scope.currentShoppingCartOut.TableCutleries){

                    $scope.errorMessage = "Le nombre de couvert dans le ticket secondaire doit être inferieur ou égal au ticket d'origine";


                } else {
                    $scope.currentShoppingCartIn.TableCutleries = $scope.result.nb;
                    $scope.currentShoppingCartOut.TableCutleries -= $scope.result.nb;

                    console.log($scope.currentShoppingCartOut, $scope.currentShoppingCartIn);
                    shoppingCartModel.setCurrentShoppingCartIn($scope.currentShoppingCartIn);
                    shoppingCartModel.setCurrentShoppingCartOut($scope.currentShoppingCartOut);
                    shoppingCartModel.setCurrentShoppingCart($scope.currentShoppingCartIn);
                    $uibModalInstance.close($scope.value);
                }
            }

    		
    	} else {
    		shoppingCartModel.setCurrentShoppingCartIn(undefined);
    		shoppingCartModel.setCurrentShoppingCartOut(undefined);
    		shoppingCartModel.setCurrentShoppingCart($scope.currentShoppingCartOut);
            $uibModalInstance.close($scope.value);
    	}


        
    };

    $scope.cancel = function () {
        var hdid = $scope.currentShoppingCartOut.HardwareId;

        posService.getUpdDailyTicketAsync(hdid, -1);

        $scope.currentShoppingCartIn = undefined;
        $scope.currentShoppingCartOut = undefined;

        $uibModalInstance.close($scope.value);
    };

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