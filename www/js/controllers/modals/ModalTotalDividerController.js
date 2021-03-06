﻿app.controller('ModalTotalDividerController', function ($scope, $rootScope, $uibModalInstance, currentTotalDivider, $translate) {
    $scope.valueDivider = currentTotalDivider;

    $scope.init = function () {
        setTimeout(function () {
            const txtDivider = document.getElementById("txtDivider");
            if (txtDivider) {
                txtDivider.focus();
            }
        }, 500);
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        const totalDividerValue = parseInt($scope.valueDivider);

        if (isNaN(totalDividerValue) || totalDividerValue <= 0 || !Number.isInteger(totalDividerValue)) {
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