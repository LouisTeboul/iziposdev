app.config(function ($stateProvider) {
    $stateProvider
        .state('borneClosed', {
            url: '/borneClosed',
            templateUrl: 'viewsBorne/borneClosed.html'
        })
});


app.controller('BorneClosedController', function ($scope, $rootScope, $interval, $q, $mdMedia, posPeriodService, posLogService, borneService) {
    let current = this;

    $scope.init = function () {
        posLogService.getHardwareIdAsync().then(function (result) {

            posPeriodService.getYPeriodAsync(result, undefined, false, false).then(function (periodPair) {
                if (!periodPair || !angular.equals(periodPair.YPeriod, {})) {
                    borneService.redirectToHome();
                }
            });
        });

        $scope.customStyle = {
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size' : 'cover',
            'align-items': $rootScope.borne && $rootScope.borneVertical ? 'center' : 'flex-start',
            'padding-left': $rootScope.borne && $rootScope.borneVertical ? '0px' :
                ($mdMedia('min-width: 800px') ? '250px' : '100px')
        };
    };
});