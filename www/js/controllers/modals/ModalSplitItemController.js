app.controller('ModalSplitItemController', function ($scope, $rootScope, $uibModalInstance, defaultValue, item) {
    $scope.defaultValue = defaultValue;
    $scope.item = item;
    console.log(item);
    $scope.errorMessage = undefined;

    $scope.result = {
        montant: 0,
        part: 0
    };

    $scope.init = () => {
        $scope.setFocusPart();
    };

    $scope.setFocusMontant = () => {
        const loadSplit = () => {
            if ($("#splitAmount").length) {
                document.querySelector('#splitAmount').focus();
            } else {
                window.requestAnimationFrame(loadSplit);
            }
        };
        loadSplit();
    };

    $scope.setFocusPart = () => {
        const loadSplit = () => {
            if ($("#splitPart").length) {
                document.querySelector('#splitPart').focus();
            } else {
                window.requestAnimationFrame(loadSplit);
            }
        };
        loadSplit();
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.okMontant = () => {
        $rootScope.closeKeyboard();
        $scope.result.montant = Number($scope.result.montant);
        if ($scope.result.montant > 0) {
            if ($scope.result.montant < $scope.item.PriceIT) {
                $uibModalInstance.close({
                    montant: $scope.result.montant
                });
            } else {
                $scope.errorMessageMontant = "Le prix renseigné doit être inférieur au prix de l'article.";
            }
        } else {
            $scope.errorMessagePart = "Veuillez insérer un prix positif.";
        }
    };

    $scope.okPart = () => {
        $rootScope.closeKeyboard();
        $scope.result.part = Number($scope.result.part);
        if (Number.isInteger($scope.result.part) && $scope.result.part > 1 && $scope.result.part < 100) {
            $uibModalInstance.close({
                nbPart: $scope.result.part,
                montant: $scope.item.PriceIT / $scope.result.part
            });
        } else {
            $scope.errorMessagePart = "Veuillez insérer un nombre entier supérieur à 1 et inférieur à 100.";
        }
    };
});