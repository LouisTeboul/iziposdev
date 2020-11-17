app.controller('ModalTypePriceController', function ($scope, $rootScope, $uibModalInstance, currentPrice, minPrice, maxPrice, $translate, $filter) {
    let currencyFormat = $filter('CurrencyFormat');
    $scope.valuePrice = currentPrice;
    $scope.min = minPrice;
    $scope.max = maxPrice;

    $scope.init = () => {
    };

    $scope.ok = () => {
        const newValue = parseFloat($scope.valuePrice);

        if (isNaN(newValue)) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
        } else if (newValue < minPrice || newValue > maxPrice) {
            $scope.errorMessage = $translate.instant("Le prix doit être compris entre ");
            $scope.errorPrices = currencyFormat(minPrice) + " " + $translate.instant("et") + " " + currencyFormat(maxPrice);
        } else {
            $uibModalInstance.close(newValue);
        }

        $rootScope.closeKeyboard();
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
        $rootScope.closeKeyboard();
    };
});