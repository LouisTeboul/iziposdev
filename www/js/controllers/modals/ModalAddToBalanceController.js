app.controller('ModalAddToBalanceController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate) {

    $scope.init = function () {
        $scope.model = {
            amountToCredit : 0,
            error : "",
        }
    };

    $scope.ok = function () {
        $scope.model.error = "";
        if( typeof $scope.model.amountToCredit === "number") {
            $uibModalInstance.close($scope.model.amountToCredit);
        } else {
            $scope.model.error = $translate.instant("Veuillez renseignez un nombre");
        }

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});