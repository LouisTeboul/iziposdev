app.service('cashMovementService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        /** Save the cash movement to BO */
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

        /**
         * Get movement types
         * */
        this.getMovementTypesAsync = function (openPosParameters) {
            var cashMovementTypesDefer = $q.defer();
            
            $rootScope.dbInstance.rel.find('CashMovementType').then(function (resMovementTypes) {
                var cashMovementTypes = [];
                if (openPosParameters.isOpenPos) {
                    if (openPosParameters.previousYPeriod) {
                        // When Open the Pos, and a previous yPeriod exist, whe only add open service movement type
                        Enumerable.from(resMovementTypes.CashMovementTypes).forEach(function (cmt) {
                            if (!cmt.IsCashFunds && cmt.CashIn && cmt.IsSystem && cmt.DisplayOnCashMachine) {
                                cashMovementTypes.push(cmt);
                            }
                        });
                    }
                    else {
                        // When Open the Pos, We only add the IsCashFunds movement type
                        Enumerable.from(resMovementTypes.CashMovementTypes).forEach(function (cmt) {
                            if (cmt.IsCashFunds && cmt.CashIn && cmt.IsSystem && cmt.DisplayOnCashMachine) {
                                cashMovementTypes.push(cmt);
                            }
                        });
                    }
                }
                // Otherwise, we only add the other movement types
                else {
                    Enumerable.from(resMovementTypes.CashMovementTypes).forEach(function (cmt) {
                        if (!cmt.IsCashFunds && !cmt.IsSystem && cmt.DisplayOnCashMachine) {
                            cashMovementTypes.push(cmt);
                        }
                    });
                }
                cashMovementTypesDefer.resolve(cashMovementTypes);
            }, function (err) {
                cashMovementTypesDefer.reject(err);
            });

            return cashMovementTypesDefer.promise;
        };


        this.getAllMovementTypesAsync = function () {
            var cashMovementTypesDefer = $q.defer();

            $rootScope.dbInstance.rel.find('CashMovementType').then(function (resMovementTypes) {
                var cashMovementTypes = [];
                Enumerable.from(resMovementTypes.CashMovementTypes).forEach(function (cmt) {
                    cashMovementTypes.push(cmt);

                });
                cashMovementTypesDefer.resolve(cashMovementTypes);
            }, function (err) {
                cashMovementTypesDefer.reject(err);
            });

            return cashMovementTypesDefer.promise;
        };

        /**
         * Get close service movement 
         * */
        this.getMovementTypeCloseServiceAsync = function () {
            var cashMovementTypesDefer = $q.defer();

            $rootScope.dbInstance.rel.find('CashMovementType').then(function (resMovementTypes) {
                var cashMovementType = undefined;

                Enumerable.from(resMovementTypes.CashMovementTypes).forEach(function (cmt) {
                    if (!cmt.CashIn && cmt.IsSystem && cmt.DisplayOnCashMachine) {
                        cashMovementType = cmt;
                    }
                });
                
                cashMovementTypesDefer.resolve(cashMovementType);
            }, function (err) {
                cashMovementTypesDefer.reject(err);
            });

            return cashMovementTypesDefer.promise;
        }

        /**
         * Get open service movement 
         * */
        this.getMovementTypeOpenServiceAsync = function () {
            var cashMovementTypesDefer = $q.defer();

            $rootScope.dbInstance.rel.find('CashMovementType').then(function (resMovementTypes) {
                var cashMovementType = undefined;

                Enumerable.from(resMovementTypes.CashMovementTypes).forEach(function (cmt) {
                    if (cmt.CashIn && cmt.IsSystem && cmt.DisplayOnCashMachine) {
                        cashMovementType = cmt;
                    }
                });

                cashMovementTypesDefer.resolve(cashMovementType);
            }, function (err) {
                cashMovementTypesDefer.reject(err);
            });

            return cashMovementTypesDefer.promise;
        }
        // TODO : everything related to cash movement should be done here

        // open drawer authorisation  & log


        // entrée et sortie de caisse 

        // modifier les moyens de paiements 

        // gerer les devises 

        // autorisation en 
    }]);