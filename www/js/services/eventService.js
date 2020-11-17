/**
 *  Service for dispatching event to the izibox for logging
 */
app.service('eventService', function ($http, $rootScope, $q) {
    //Send an event for logging in the JET
    this.sendEvent = function (eventPos) {
        var logDefer = $q.defer();

        var eventApiUrl = $rootScope.APIBaseURL + "/logEvent";

        $http.post(eventApiUrl, eventPos, { timeout: 10000 }).
            success(function () {
                logDefer.resolve(eventPos);
            }).
            error(function () {
                logDefer.reject("Logging error");
            });

        return logDefer.promise;
    };
});