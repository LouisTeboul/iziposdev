app.controller('ModalManualBarcodeController', function ($scope, $rootScope, $uibModalInstance) {

    $scope.barcode = "";

    $scope.init = function () {
        setTimeout(function () {
            const txtBarcode = document.getElementById("txtBarcode");
            if (txtBarcode) {
                txtBarcode.focus();
            }

        }, 250);

    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.close($scope.barcode);
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();

        $uibModalInstance.dismiss('cancel');
    }
});