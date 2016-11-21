app.service('storeMapService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        this.getStoreMapAsync = function () {
            var self = this;
            var valueDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
            	$rootScope.dbInstance.get('StoreMap_1_0000000000000000').then(function (values) {
            		valueDefer.resolve(values);
                }, function (err) {
                	valueDefer.reject(err);
                });
            } else {
            	valueDefer.reject("Database isn't ready !");
            }

            return valueDefer.promise;
        }
    }])