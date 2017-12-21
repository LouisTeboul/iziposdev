/**
 *  Service for dispatching event to the izibox for logging
 */
app.service('eventService', ["$http", "$rootScope", "$q",
    function ($http, $rootScope, $q) {
        /**
         * Send an event for logging in the JET
         * @param logEvent An event to log in the Jet
         */
        this.sendEvent = function(logEvent){

            var logDefer = $q.defer();

            var eventApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/log";

            $http.post(eventApiUrl, logEvent, { timeout: 10000 }).
            success(function () {
                logDefer.resolve(logEvent);
            }).
            error(function () {
                logDefer.reject("Logging error");
            });

            return logDefer.promise;
        };
    }
]);


