app.controller('ModalOpenAdminController', function ($scope, $rootScope, $modalInstance) {


    $scope.ok = function () {
        $modalInstance.close('ok');
    }

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    }
});