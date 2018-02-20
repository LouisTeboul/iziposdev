app.controller('ModalSplitItemController', function ($scope, $rootScope, $uibModalInstance, defaultValue, item) {

    $scope.defaultValue = defaultValue;
    $scope.item = item;
    console.log(item);
    $scope.errorMessage = undefined;

    $scope.result = {
        montant : 0,
        part : 0,
    };
    $scope.init = function () {

        $scope.setFocusMontant();

    };

    $scope.setMode= function(mode){
        switch(mode){
            case "PART":
                $scope.setFocusPart();
                break;
            case "MONTANT":
                $scope.setFocusMontant();
                break;
            default :
                break;
        }

    };


    $scope.setFocusMontant = function () {
        console.log("focus montant");

        setTimeout(function () {
            if (document.querySelector('#splitAmount')) {
                document.querySelector('#splitAmount').focus();
                $rootScope.openKeyboard('decimal', "end-start");
            }
        }, 100);
    };

    $scope.setFocusPart = function () {
        console.log("focus part");

        setTimeout(function () {
            if (document.querySelector('#splitPart')) {
                document.querySelector('#splitPart').focus();
                $rootScope.openKeyboard('numeric', "end-start");
            }
        }, 100);
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };


    $scope.okMontant = function () {
        console.log("montant", $scope.result.montant);
        $rootScope.closeKeyboard();
        if ($scope.result.montant > 0) {
            if ($scope.result > $scope.item.PriceIT) {
                $scope.errorMessageMontant = "Le prix renseigné est supérieur au prix de l'article"
            } else {
                $uibModalInstance.close({
                    montant : $scope.result.montant
                });
            }

        }

    };

    $scope.okPart = function () {
        console.log("part", $scope.result.part);
        $rootScope.closeKeyboard();
        if ($scope.result.part > 0) {

            $uibModalInstance.close({
                nbPart : $scope.result.part,
                montant : $scope.item.PriceIT / $scope.result.part,
                makeParts : true,
            });

        }

    };

});