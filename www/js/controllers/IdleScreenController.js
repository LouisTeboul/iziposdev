app.config(function ($stateProvider) {
    $stateProvider
        .state('idleScreen', {
            url: '/idleScreen',
            templateUrl: 'viewsBorne/idleScreen.html'
        })
});


app.controller('IdleScreenController', function ($scope, $rootScope, $location, $q, borneService) {
    var current = this;

    $scope.init = function () {
        var el = document.getElementsByClassName("keyboardContainer")[0];
        el.style.display = "none";
    };

    $scope.disableIdle = function () {
        borneService.redirectToHome();
    }
});