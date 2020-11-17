app.controller('ModalManualBarcodeController', function ($scope, $rootScope, $uibModalInstance) {
    $scope.barcode = "";

    $scope.init = () => {
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.close($scope.barcode);
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();

        $uibModalInstance.dismiss('cancel');
    };
});