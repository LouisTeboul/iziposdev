app.controller('ModalPickPaymentModeController', function ($scope, $rootScope, $uibModalInstance, pmAvailable, paymentService) {
    $scope.init = () => {
        let countCB = 0;
        $scope.pmAvailable = pmAvailable.filter(paymentMode => {
            if (paymentMode.PaymentType === 2 && $rootScope.borneCB) {
                countCB++;
            }
            return (
                !$rootScope.borne
                || paymentMode.PaymentType === PaymentType.EASYTRANSAC && $rootScope.currentShoppingCart.Total >= $rootScope.IziBoxConfiguration.MinPaymentEasyTransac && $rootScope.borneEasyTransac
                || paymentMode.IsBalance && $rootScope.borneBalance
                || paymentMode.PaymentType === PaymentType.CB && $rootScope.borneCB && countCB === 1
                || paymentMode.PaymentType === PaymentType.ENCOMPTE && $rootScope.borneCB
                || paymentMode.PaymentType === 18 && $rootScope.borneCBTR
                || paymentMode.PaymentType === PaymentType.ESPECE && $rootScope.borneEspece && window.glory
            );
        });

        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row'
        };
        $scope.customBackground = {
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size': 'cover'
        };
    };

    $scope.selectPm = (pm) => {
        if ($rootScope.currentShoppingCart.Residue > 0) {
            // Attention à la fonction d'arrondi
            $uibModalInstance.close(false);
            if ($rootScope.borne && pm.PaymentType === PaymentType.CB) {
                pm.Text = "CB Borne";
                pm.Value = "CB-BORNE";
            }
            paymentService.selectPaymentMode(pm, null, $rootScope.IziPosConfiguration.IsDirectPayment);
        }
    };
    $scope.payAtPos = () => {
        $uibModalInstance.close(true);
    };

    $scope.ok = () => {
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };
});