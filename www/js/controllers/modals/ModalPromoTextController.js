app.controller('ModalPromoTextController', function ($scope, $rootScope, $uibModalInstance, offerPromoText, shoppingCartModel) {
    $scope.offerPromoText = offerPromoText;

    $scope.ok = function () {
        $uibModalInstance.close('ok');
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.useOfferText = function (offerText) {
        shoppingCartModel.useOfferText(offerText);
        $uibModalInstance.close('ok');
    }
});