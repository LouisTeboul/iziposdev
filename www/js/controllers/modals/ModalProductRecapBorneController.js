app.controller('ModalProductRecapBorneController', function ($scope, $rootScope, $uibModalInstance, shoppingCart, pictureService, productService, stockService, $mdMedia) {

    $scope.init = () => {
        $scope.stockService = stockService;
        $scope.shoppingCart = shoppingCart;
        $scope.mdMedia = $mdMedia;
        LoadRateFid();
    };

    const LoadRateFid = () => {
        if ($rootScope.loyaltyClasses && $rootScope.loyaltyClasses.length > 0) {
            $scope.objectFidClassAction = $rootScope.loyaltyClasses.map(classes => {
                let objectFidClassAction = {};

                objectFidClassAction.Name = classes.Name;

                for (let actions of classes.LoyaltyActions) {
                    if (actions.LoyaltyEventId == 4) {
                        for (let trigger of actions.TriggerObjects) {
                            if (trigger.TriggerClassId == 7) {
                                let rateJson = JSON.parse(trigger.ConfigParam);
                                $scope.rateBalance = rateJson.EvalScript.replace("value", shoppingCart.Total);
                                $scope.addBalance = eval($scope.rateBalance);
                                objectFidClassAction.RateBalance = $scope.addBalance;
                            }
                        }
                    }
                    if (actions.LoyaltyEventId == 1) {
                        for (let trigger of actions.TriggerObjects) {
                            if (trigger.TriggerClassId == 2) {
                                let balanceValueJson = JSON.parse(trigger.ConfigParam);
                                $scope.ValueBalance = balanceValueJson.Value;
                                objectFidClassAction.ValueBalance = $scope.ValueBalance;
                            }
                        }
                    }
                }
                return objectFidClassAction;
            });
        }
    };

    $scope.validBorneSummary = () => {
        if (shoppingCart.Items != null && shoppingCart.Items.length > 0) {
            $uibModalInstance.close();
        } else {
            $uibModalInstance.dismiss();
        }
    };

    $scope.cancelBorneSummary = () => {
        $uibModalInstance.dismiss();
    };

    $scope.getPicture = (idProduct) => {
        return pictureService.getPictureFileUrl(idProduct, 'Product');
    };

    $scope.decrementQuantity = (cartItem) => {
        if (cartItem.Quantity > 1) {
            productService.decrementQuantity(cartItem);
        }
        LoadRateFid();
    };

    $scope.incrementQuantity = (cartItem) => {
        if (cartItem.stockQuantity && cartItem.stockQuantity > 0) {
            productService.incrementQuantity(cartItem);
        }

        LoadRateFid();
    };

    $scope.removeItem = (cartItem) => {
        productService.removeItem(cartItem);
        LoadRateFid();
    };
});