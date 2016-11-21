app.config(function ($stateProvider) {
    $stateProvider
        .state('catalog.CategoryTemplate', {
            url: '/categoryTemplate',
            templateUrl: 'views/categoryTemplate.html'
        })
})

app.controller('CategoryTemplateController', function ($scope, $rootScope, $location) {
    $scope.init = function () {
    
    }
})