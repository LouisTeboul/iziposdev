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

        $scope.customStyle = {
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'align-items': $rootScope.borne && $rootScope.borneVertical ? 'center' : 'flex-start',
            'padding-left': $rootScope.borne && $rootScope.borneVertical ? '0px' : '250px'
        }
    };
});