app.controller('ModalCutleriesController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate, $timeout, initCutleries) {

    $scope.init = () => {
        $scope.model = {
            cutleries: initCutleries,
            error: ""
        };

        $timeout( () => {
            document.querySelector('#nbCutleries').focus();
        }, 10);
    };

    $scope.ok = () => {
        $scope.model.cutleries = Number($scope.model.cutleries);
        if ($scope.model.cutleries > 0) {
            if (Number.isInteger($scope.model.cutleries)) {
                if ($scope.model.cutleries < 100) {
                    $scope.model.error = "";
                    $rootScope.closeKeyboard();
                    $uibModalInstance.close($scope.model.cutleries);
                } else {
                    $scope.model.error = $translate.instant("Veuillez entrer un nombre de couverts inférieurs à 100");
                }
            } else {
                $scope.model.error = $translate.instant("Veuillez entrer un nombre de couverts entier");
            }
        } else {
            $scope.model.error = $translate.instant("Veuillez entrer un nombre de couverts supérieurs à 0");
        }
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    }
});