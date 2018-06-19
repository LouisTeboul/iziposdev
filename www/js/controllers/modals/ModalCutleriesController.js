app.controller('ModalCutleriesController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate, $timeout, initCutleries) {

    $scope.init = function () {
        $scope.model = {
            cutleries: initCutleries,
            error: ""
        };

        $timeout( () => {
            document.querySelector('#nbCutleries').focus();
        }, 10);
    };

    $scope.ok = function () {
        if ($scope.model.cutleries > 0) {
            $scope.model.error = "";
            $rootScope.closeKeyboard();
            $uibModalInstance.close($scope.model.cutleries);
        } else {
            $scope.model.error = $translate.instant("Veuillez entrer un nombre de couvert supérieur à 0")
        }

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});