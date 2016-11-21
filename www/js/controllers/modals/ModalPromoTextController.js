app.controller('ModalPromoTextController', function ($scope, $rootScope, $uibModalInstance, offerPromoText) {
    $scope.offerPromoText = offerPromoText;
    

    $scope.ok = function () {
        $uibModalInstance.close('ok');
    }

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});