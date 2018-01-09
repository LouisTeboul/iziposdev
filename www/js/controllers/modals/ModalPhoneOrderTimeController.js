
app.controller('ModalPhoneOrderTimeController', function ($scope, $rootScope, $q, $http, $uibModalInstance, $uibModal, $translate, currentTimeOffset) {

    var current = this;

    var currentTimeHours = Math.floor(currentTimeOffset/60);
    var currentTimeMinutes = currentTimeOffset % 60;




    $scope.init = function () {
        var d = new Date();
        d.setHours( 14 );
        d.setMinutes( 0 );
        $scope.model = {
            heure : currentTimeHours,
            minute : currentTimeMinutes,
            date : new Date(),
            minDate: new Date(),
            dateOpen : false,
            agendaTime : d,
        };

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


    $scope.openDate = function() {
        $scope.model.dateOpen = true;
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