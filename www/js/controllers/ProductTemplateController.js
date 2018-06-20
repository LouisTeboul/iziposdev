app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.ProductTemplate', {
            url: '/productTemplate',
            templateUrl: 'views/productTemplate.html'
        })
        .state('catalogPOS.ProductTemplate', {
            url: '/productTemplate',
            templateUrl: 'views/productTemplate.html'
        })
});

app.controller('ProductTemplateController', function ($scope, $rootScope, $location) {
    $scope.init = function () {    
    }
});