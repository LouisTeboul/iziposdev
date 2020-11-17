app.controller('ModalDiscountCartItemController', function ($scope, $rootScope, $uibModalInstance) {
    $scope.errorMessage = undefined;
    $scope.result = {
        value: 0,
        isPercent: true
    };

    $scope.init = () => {
        const loadAmount = () => {
            if ($("#txtAmount").length) {
                document.querySelector('#txtAmount').focus();
            } else {
                window.requestAnimationFrame(loadAmount);
            }
        };
        loadAmount();
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        let totalDiscount = parseFloat($scope.result.value);

        if (isNaN(totalDiscount)) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
        } else {
            $scope.errorMessage = undefined;
            $uibModalInstance.close($scope.result);
        }
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});