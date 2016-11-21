app.controller('ModalManualBarcodeController', function ($scope, $rootScope, $uibModalInstance) {
    var video;

    $scope.barcode = "";

    $scope.init = function () {
        setTimeout(function () {
            var txtBarcode = document.getElementById("txtBarcode");
            if (txtBarcode) {
            	txtBarcode.focus();
            }

        }, 250);

    }

    $scope.ok = function () {
    	$rootScope.closeKeyboard();
        $uibModalInstance.close($scope.barcode);
    }

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();

        $uibModalInstance.dismiss('cancel');
    }
});