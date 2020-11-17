app.controller('ModalShoppingCartNoteController', function ($scope, $rootScope, $uibModalInstance, $translate, $mdSidenav) {

    $scope.init = () => {
        $scope.quantity = 1;
        $scope.errorMessage = "";
    };

    $scope.ok = () => {
        $rootScope.closeKeyboard();

        const nbNote = parseInt($scope.quantity);

        if (isNaN(nbNote) || nbNote <= 0) {
            $scope.errorMessage = $translate.instant("Saisissez le nombre de repas");
        } else {
            $mdSidenav('drawerMenuDiv').close();
            $uibModalInstance.close(nbNote);
        }
    };

    $scope.cancel = () => {
        $mdSidenav('drawerMenuDiv').close();
        $uibModalInstance.dismiss('cancel');
        $rootScope.closeKeyboard();
    };
});