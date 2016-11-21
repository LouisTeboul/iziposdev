app.service('authService', ['$rootScope', '$q','$http',
    function ($rootScope, $q,$http) {

        //$rootScope.PosLog.HardwareId
        var token = null;
        var logged = false;

        // HarwareId found event
        $rootScope.$watch('PosLog.HardwareId', function () {
            if ($rootScope.PosLog && $rootScope.PosLog.HardwareId) {
                $http({
                    method: 'POST',
                    url: $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/login',
                    data: 'grant_type=password&username=HardwareId:' + $rootScope.PosLog.HardwareId + '&password='
                }).then(function successCallback(response) {
                    console.log(response);
                    token = response.data;
                    logged = true;
                }, function errorCallback(response) {
                    console.log(response);
                    logged = false;
                });
            }
        });

        this.getToken = function (){
            return token;
        }
        this.isLogged = function () {
            return logged;
        }

        this.login = function () {
            if ($rootScope.PosLog && $rootScope.PosLog.HardwareId) {                
                $http({
                    method: 'POST',
                    url: $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/login',
                    data: 'grant_type=password&username=HardwareId:' + $rootScope.PosLog.HardwareId + '&password='
                }).then(function successCallback(response) {
                    console.log(response);
                    token = response.data;
                    logged = true;
                }, function errorCallback(response) {
                    console.log(response);
                    logged = false;
                });
            }
        }
    }
]);