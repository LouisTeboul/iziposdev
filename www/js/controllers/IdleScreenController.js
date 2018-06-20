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
<<<<<<< HEAD
        var el = document.getElementsByClassName("keyboardContainer")[0];
=======
        var el = document.querySelector(".keyboardContainer");
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        el.style.display = "none";
    };

    $scope.disableIdle = function () {
        borneService.redirectToHome();
    }
});