app.controller('ModalAllCashMovementsController', function ($scope, $rootScope, $uibModal, $uibModalInstance, cashMovementService, posLogService, posPeriodService, posUserService, posService) {
    $scope.model = {
        allCashMovements: [],
        allCashMovementsTypes: undefined,
        allPosUsers: undefined,
        closingEnable: posUserService.isEnable('CLOS', true)
    };

    $scope.init = function () {

        console.log($scope.model.closingEnable);

        cashMovementService.getAllMovementTypesAsync().then(function (cm) {
            $scope.model.allCashMovementsTypes = cm;
        });

        posUserService.getPosUsersAsync().then(function (pu) {
            $scope.model.allPosUsers = pu;
        });
        // get Y
        // Si c'est le gérant on recup toutes les YPeriod du Z
        if ($scope.model.closingEnable) { //all
            posPeriodService.getAllYPeriodAsync('*').then(function (yperiods) {
                console.log(yperiods);
                for(let yp of yperiods) {
                    posPeriodService.getYPaymentValuesAsync(yp.id).then(function (p) {
                        posService.getPosNameAsync(p.hardwareId).then(function (alias) {
                            console.log(p);
                            p.CashMovements[0].alias = alias ? alias : p.hardwareId;
                            $scope.model.allCashMovements.push(p.CashMovements);
                            console.log($scope.model.allCashMovements);
                        });

                    });
                }
            });
        } else { //not all
            posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, null, false).then(function (yp) {
                // Query couchdb et recupere tout les cash movement lines
                posPeriodService.getYPaymentValuesAsync(yp.id).then(function (p) {
                    console.log(p);
                    $scope.model.allCashMovements = p.CashMovements;
                });
            });
        }

    };

    // Match l'id du mouvement avec son nom
    $scope.getMovementName = function (movementType) {
        var matchMvt = Enumerable.from($scope.model.allCashMovementsTypes).firstOrDefault(function (cmt) {
            return cmt.Id == movementType
        });
        return matchMvt.Name;
    };

    // Match l'id de l'utilisateur avec son nom
    $scope.getPosUserName = function (userId) {
        var matchPu = Enumerable.from($scope.model.allPosUsers).firstOrDefault(function (pu) {
            return pu.Id == userId;
        });
        return matchPu.Name;
    };

    $scope.ok = function () {

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});