app.config(function ($stateProvider) {
    $stateProvider
        .state('borneClosed', {
            url: '/borneClosed',
            templateUrl: 'viewsBorne/borneClosed.html'
        })
});


app.controller('BorneClosedController', function ($scope, $rootScope, $interval, $q, posPeriodService, posLogService, borneService) {
    var current = this;

    $scope.init = function () {
        posLogService.getHardwareIdAsync().then(function(result){
            posPeriodService.getYPeriodAsync(result, undefined, false).then(function (YPeriod) {
                if(!angular.equals(YPeriod, {})) {
                    borneService.redirectToHome();
                }
            })
        });
    };
});