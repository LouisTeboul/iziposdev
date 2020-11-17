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
                    posService.getPosNameAsync(yp.hardwareId).then(function (alias) {
                        var p = yp.PaymentValues;
                        if (p) {
                            p.CashMovements[0].alias = alias ? alias : yp.hardwareId;
                            $scope.model.allCashMovements.push(p.CashMovements);
                        }
                    });
                }
            });
        } else { //not all
            posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, null, false, false).then(function (periodPair) {
                $scope.model.allCashMovements = periodPair.YPeriod.PaymentValues.CashMovements;
            });
        }

    };

    // Match l'id du mouvement avec son nom
    $scope.getMovementName = function (movementType) {
        var matchMvt = Enumerable.from($scope.model.allCashMovementsTypes).firstOrDefault(function (cmt) {
            return cmt.Id === movementType;
        });
        if(matchMvt) {
            return matchMvt.Name;
        } else {
            return null;
        }
        
    };

    // Match l'id de l'utilisateur avec son nom
    $scope.getPosUserName = function (userId) {
        if(userId !== -1) {
            var matchPu = Enumerable.from($scope.model.allPosUsers).firstOrDefault(function (pu) {
                return pu.Id === userId;
            });
            if(matchPu) {
                return matchPu.Name;
            } else {
                return null;
            }
            
        } else {
            return null;
        }

    };

    $scope.ok = function () {

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
});