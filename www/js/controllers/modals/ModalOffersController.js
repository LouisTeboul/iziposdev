app.controller('ModalOffersController', function ($scope, $rootScope, $uibModalInstance, offers, relevantOffers) {
    $scope.offers = Enumerable.from(offers).orderByDescending("o => o.OfferObjectId").toArray();
    $scope.relevantOffers = Enumerable.from(relevantOffers).orderByDescending("o => o.OfferObjectId").toArray();

    $scope.selectOffer = function (offer) {
        $uibModalInstance.close(offer);
    }

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});