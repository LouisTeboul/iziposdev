app.config(function ($stateProvider) {
    $stateProvider
        .state('catalog.ProductTemplate', {
            url: '/productTemplate',
            templateUrl: 'views/productTemplate.html'
        })
})

app.controller('ProductTemplateController', function ($scope, $rootScope, $location) {
    $scope.init = function () {
    
    }
})