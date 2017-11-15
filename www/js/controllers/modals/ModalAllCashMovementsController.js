app.controller('ModalAllCashMovementsController', function ($scope, $rootScope, $uibModal, $uibModalInstance, cashMovementService, posLogService, posPeriodService, posUserService) {
    $scope.model = {
        allCashMovements : undefined,
        allCashMovementsTypes : undefined,
        allCashMovementsTypes : undefined,
        allPosUsers : undefined
    };

    $scope.init = function () {

        cashMovementService.getAllMovementTypesAsync().then(function (cm) {
            $scope.model.allCashMovementsTypes = cm;
        });

        posUserService.getPosUsersAsync().then(function (pu){
            $scope.model.allPosUsers = pu;
        });
        // get Y
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, null, false).then(function (yp) {
            // Query couchdb et recupere tout les cash movement lines
            posPeriodService.getYPaymentValuesAsync(yp.id).then(function (p) {
                $scope.model.allCashMovements = p.CashMovements;
            });
        });
    };

    // Match l'id du mouvement avec son nom
    $scope.getMovementName = function(movementType){
        var matchMvt = Enumerable.from($scope.model.allCashMovementsTypes).firstOrDefault(function(cmt){
            return cmt.Id == movementType
        });
        return matchMvt.Name;
    };

    // Match l'id de l'utilisateur avec son nom
    $scope.getPosUserName = function(userId){
        var matchPu = Enumerable.from($scope.model.allPosUsers).firstOrDefault(function(pu){
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