app.controller('ModalPromoTextController', function ($scope, $rootScope, $uibModalInstance, offerPromoText, discountService) {
    $scope.offerPromoText = offerPromoText;

    $scope.ok = () => {
        $uibModalInstance.close('ok');
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.useOfferText = (offerText) => {
        discountService.useOfferText(offerText);
        $uibModalInstance.close('ok');
    };
});