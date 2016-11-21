app.service('cashMovementService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        this.saveMovementAsync = function (move) {
            var self = this;
            var cashMovementDefer = $q.defer();

            $rootScope.dbReplicate.rel.save('CashMovement', move).then(function () {
                cashMovementDefer.resolve(move);
            }, function (errSave) {
                cashMovementDefer.reject(errSave);
            });

            return cashMovementDefer.promise;
        }

        this.getMovementTypesAsync = function () {
            var cashMovementTypesDefer = $q.defer();
            
            $rootScope.dbInstance.rel.find('CashMovementType').then(function (resMovementTypes) {
                cashMovementTypesDefer.resolve(resMovementTypes.CashMovementTypes);
            }, function (err) {
                cashMovementTypesDefer.reject(err);
            });

            return cashMovementTypesDefer.promise;
        }
    }])