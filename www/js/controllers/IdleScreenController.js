app.config(function ($stateProvider) {
    $stateProvider
        .state('idleScreen', {
            url: '/idleScreen',
            templateUrl: 'viewsBorne/idleScreen.html'
        })
});

app.controller('IdleScreenController', function ($scope, $rootScope, $location, $q, $mdMedia,borneService) {
    let current = this;
    $scope.mdMedia = $mdMedia;

    $scope.init = function () {
        let el = document.querySelector(".keyboardContainer");
        el.style.display = "none";
    };

    $scope.disableIdle = function () {
        borneService.redirectToHome();
    };
});