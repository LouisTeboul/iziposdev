app.controller('ModalSplitItemController', function ($scope, $rootScope, $uibModalInstance, defaultValue, itemPrice) {

    $scope.defaultValue = defaultValue;
    $scope.itemPrice = itemPrice;
    $scope.errorMessage = undefined;

    $scope.result = 0;

    $scope.init = function(){
        $scope.setFocus();
    };


    $scope.setFocus = function(){
        console.log("focus");

        setTimeout(function(){
            if(document.querySelector('#splitAmount')){
                document.querySelector('#splitAmount').focus();
                $rootScope.openKeyboard('decimal', "end-start");
            }
        }, 100);
    };


    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.ok = function(){
        $rootScope.closeKeyboard();
        if($scope.result > 0) {
            if($scope.result > $scope.itemPrice){
                $scope.errorMessage = "Le prix renseigné est supérieur au prix de l'article"
            } else {
                $uibModalInstance.close($scope.result);
            }

        }

    };

});