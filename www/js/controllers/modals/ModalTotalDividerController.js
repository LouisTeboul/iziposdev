app.controller('ModalTotalDividerController', function ($scope, $rootScope, $uibModalInstance, $translate) {
    $scope.valueDivider = 2;

    $scope.init = () => {
    };

    $scope.ok = () => {
        $rootScope.closeKeyboard();
        const totalDividerValue = parseInt($scope.valueDivider);

        if (totalDividerValue > 100) {
            $scope.errorMessage = $translate.instant("La valeur doit être inférieur à 100");
        } else if (isNaN(totalDividerValue) || totalDividerValue <= 0 || !Number.isInteger(totalDividerValue)) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
        } else {
            $uibModalInstance.close(totalDividerValue);
        }
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };
});