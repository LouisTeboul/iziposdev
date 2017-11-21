app.controller('ModalShoppingCartNoteController', function ($scope, $rootScope, $uibModalInstance,$translate) {
    var current = this;

    $scope.valueKeyboard = "";
    $scope.value = "";
    $scope.errorMessage = undefined;

    $scope.init = function () {

    	setTimeout(function () {
    		var txtNbNote = document.getElementById("txtNbNote");
    		if (txtNbNote) {
    			txtNbNote.focus();
    		}

    	}, 1000);
    }

    $scope.ok = function () {
    	$rootScope.closeKeyboard();
        var nbNote = parseInt($scope.value);

        if (isNaN(nbNote)) {
            $scope.errorMessage = $translate.instant("Saisissez le nombre de repas");
        } else {
            $scope.errorMessage = undefined;
            $uibModalInstance.close(nbNote);
        }
    }

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }

});