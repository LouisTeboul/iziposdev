app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.CategoryTemplate', {
            url: '/categoryTemplate',
            templateUrl: 'views/categoryTemplate.html'
        })
        .state('catalogPOS.CategoryTemplate', {
            url: '/categoryTemplate',
            templateUrl: 'views/categoryTemplate.html'
        })
});

app.controller('CategoryTemplateController', function ($scope, $rootScope, $location) {
    $scope.init = function () {

    }
});