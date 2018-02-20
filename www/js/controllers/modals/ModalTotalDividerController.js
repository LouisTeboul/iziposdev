app.controller('ModalTotalDividerController', function ($scope, $rootScope, $uibModalInstance, currentTotalDivider, $translate) {
    $scope.valueDivider = currentTotalDivider;

    $scope.init = function () {
        setTimeout(function () {
            var txtDivider = document.getElementById("txtDivider");
            if (txtDivider) {
                txtDivider.focus();
            }
        }, 500);
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        var totalDividerValue = parseInt($scope.valueDivider);

<<<<<<< HEAD
        if (isNaN(totalDividerValue) || totalDividerValue <= 0 || !Number.isInteger(totalDividerValue)) {
=======
        if (isNaN(totalDividerValue) || totalDividerValue <= 0) {
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
            $scope.errorMessage = $translate.instant("Valeur non valide");
        } else {
            $uibModalInstance.close(totalDividerValue);
        }
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});