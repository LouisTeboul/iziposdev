app.controller('ModalPostPaymentController', function ($scope, $rootScope, $translate, $mdMedia, $location, $uibModalStack) {
    $scope.mdMedia = $mdMedia;
    $scope.ticketID = $rootScope.currentShoppingCart.dailyTicketId;
    $scope.bipperNumber = $rootScope.currentShoppingCart.BipperNumber;

    let redirectTimeout = null;

    $scope.init = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Residue > 0) {
            // Dans le cas ou la commande est payé
            if ($rootScope.borneToBePaidText) {
                $scope.postPaymentText = $rootScope.borneToBePaidText;
            } else {
                $scope.postPaymentText = $translate.instant("Prenez votre reçu et dirigez-vous au comptoir pour régler votre commande");
            }
        } else {
            if ($rootScope.bornePaidText) {
                $scope.postPaymentText = $rootScope.bornePaidText;
            } else {
                $scope.postPaymentText = $translate.instant("Prenez votre reçu et recuperez votre commande.");
            }
        }

        $scope.itemName = "Bipper";
        if ($rootScope.currentShoppingCart) {
            switch ($rootScope.currentShoppingCart.DeliveryType) {
                case DeliveryType.FORHERE:
                    if ($rootScope.borneForHereCollectLabel) {
                        $scope.itemName = $rootScope.borneForHereCollectLabel;
                    }
                    break;
                case DeliveryType.TAKEOUT:
                    if ($rootScope.borneTakeawayCollectLabel) {
                        $scope.itemName = $rootScope.borneTakeawayCollectLabel;
                    }
                    break;
            }
        }


        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size': 'cover'
        };

        $rootScope.isCustomerLog = false;

        redirectTimeout = setTimeout(() => {
            redirectToIdle();
        }, 16000);
    };

    $scope.screenClick = () => {
        clearTimeout(redirectTimeout);
        redirectToIdle();
    };

    const redirectToIdle = () => {
        if ($rootScope.borneReadyNext) {
            $rootScope.clearShoppingCart();
            $location.path("/idleScreen");
            $rootScope.borneReadyNext = false;
            $uibModalStack.dismissAll();
        } else {
            setTimeout(() => {
                redirectToIdle();
            }, 2000);
        }
    }
});