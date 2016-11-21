app.controller('ModalCustomerController', function ($scope, $rootScope, $uibModalInstance,shoppingCartService) {
    var current = this; 
    


    $scope.init = function () {

        $scope.searchResults = [];
    }

    $scope.searchForCustomer = function (query) {
        shoppingCartService.searchForCustomerAsync(query).then(function (res) {
            $scope.searchResults = res;
        }, function () {
            $scope.searchResults = [];
        });
    };


    $scope.ok = function () {
    }

    $scope.close = function () {
        $uibModalInstance.close();
    }

});