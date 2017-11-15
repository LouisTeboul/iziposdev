/**
 * Service used for application authentification
 * used for booking
 */
app.service('authService', ['$rootScope', '$q','$http',
    function ($rootScope, $q,$http) {

        var token = null;
        var logged = false;

        /**
         * Event : If we have an hardwareId we can log
         */
        $rootScope.$watch('PosLog.HardwareId', function () {
            if ($rootScope.PosLog && $rootScope.PosLog.HardwareId) {
                $http({
                    method: 'POST',
                    url: $rootScope.IziBoxConfiguration.UrlSmartStoreApi + 'v2/login',
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

        /**
         * Get Authentification token
         * @returns {*}
         */
        this.getToken = function (){
            return token;
        };

        /**
         * Is the application logged
         * @returns {boolean}
         */
        this.isLogged = function () {
            return logged;
        };

        /**
         * Log the application
         */
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