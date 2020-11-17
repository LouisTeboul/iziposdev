app.controller('ModalAddToBalanceController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate, mode, customerBalance) {

    $scope.init = function () {
        $scope.model = {
            amountToCredit : 0,
            error : "",
        };

        switch(mode) {
            case 'CREDIT':
                $scope.modalTitle = "Crediter la cagnotte";
                break;
            case 'DEBIT':
                $scope.modalTitle = "Debiter la cagnotte";
                break;
        }
    };

    $scope.ok = function () {
        $scope.model.error = "";
        let amount = Number.parseFloat($scope.model.amountToCredit);
        if( isNaN(amount) ) {
            $scope.model.error = $translate.instant("Veuillez renseignez un nombre");
        } else {
            switch(mode) {
                case 'CREDIT':
                    if(amount >= 0) {
                        $uibModalInstance.close(amount);
                    } else {
                        $scope.model.error = $translate.instant("Veuillez renseignez un montant supérieur à 0");
                    }
                    break;
                case 'DEBIT':
                    if(amount > 0) {
                        amount *= -1;
                    }
                    // Check si le montant du debit est > au total de la cagnotte
                    if(Math.abs(amount) <= customerBalance.Value) {
                        $uibModalInstance.close(amount);
                    } else {
                        $scope.model.error = $translate.instant("Veuillez renseignez un montant inférieur à la cagnotte du client");
                    }

                    break;
            }

        }

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});