
app.controller('ModalPhoneOrderTimeController', function ($scope, $rootScope, $q, $http, $uibModalInstance, $uibModal, $translate) {

    var current = this;

    $scope.init = function () {
        $scope.model = {};


    };

    $scope.multipleOfFive = function(){
        var arr = [];
        for(var i = 0; i <= 11 ; i++ ){
            arr.push(i*5);
        }
        return arr;
    };

    $scope.selectHeure = function(h){
        $scope.model.heure = h;
        console.log($scope.model)
    };

    $scope.selectMinute = function(m){
        $scope.model.minute = m;
        console.log($scope.model)
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        if(!$scope.model.heure) $scope.model.heure = 0;
        if(!$scope.model.minute) $scope.model.minute = 0;
        $uibModalInstance.close($scope.model);
    };

    $scope.close = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };




});