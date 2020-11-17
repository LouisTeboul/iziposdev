app.controller('ModalCustomerInfoController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate, $timeout) {

    $scope.init = function () {
        $scope.model = {
            customerName: "",
            error: ""
        };

        $timeout( () => {
            document.querySelector('#customerName').focus();
        }, 10);
    };

    $scope.ok = function () {
        if ($scope.model.customerName) {
            $scope.model.error = "";
            $rootScope.closeKeyboard();
            $uibModalInstance.close($scope.model.customerName);
        } else {
            $scope.model.error = $translate.instant("Veuillez renseigner le nom du client")
        }

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});