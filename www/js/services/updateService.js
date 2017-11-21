app.service('updateService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        /** Get the new version info it there is one */
        this.getUpdateAsync = function () {
            var updateDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                $rootScope.dbInstance.rel.find('Update',1).then(function (results) {
                    var update = Enumerable.from(results.Updates).firstOrDefault();
                    updateDefer.resolve(update);
                }, function (err) {
                    updateDefer.reject(err);
                });
            } else {
                updateDefer.reject("Database isn't ready !");
            }
            return updateDefer.promise;
        }
    }]);