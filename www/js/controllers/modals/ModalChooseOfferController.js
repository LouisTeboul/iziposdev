app.controller('ModalChooseOfferController', function ($scope, $rootScope, $uibModalInstance, $translate, $mdMedia, paymentService, product) {
    $scope.defaultValue = '';
    $scope.mdMedia = $mdMedia;

    $scope.result = {
        action: undefined, // Discount or Offer
        type: undefined, // For discount, if it's to be applied on a single item, or on the whole line
        montant: 0, // discount amount
        isPercent: true // % or flat ?
    };

    $scope.submitItem = () => {
        if ($rootScope.currentShoppingCart.Discounts.length === 0) {
            $scope.result.type = "item";
            if ($scope.result.action !== 'Offer') {
                $scope.result.montant = Number(document.querySelector('#txtAmount').textContent);
            }
            $rootScope.closeKeyboard();
            // Check if the user has already selected payments modes
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                paymentService.removeAllPayments();
            }
            $uibModalInstance.close($scope.result);
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            swal({ title: $translate.instant("Le ticket a déjà une remise !") });
        }
    };

    $scope.submitLine = () => {
        if ($rootScope.currentShoppingCart.Discounts.length === 0) {
            $scope.result.type = "line";
            if ($scope.result.action !== 'Offer') {
                $scope.result.montant = Number(document.querySelector('#txtAmount').textContent);
            }
            $rootScope.closeKeyboard();
            // Check if the user has already selected payments modes
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                paymentService.removeAllPayments();
            }
            $uibModalInstance.close($scope.result);
        } else {
            $rootScope.closeKeyboard();
            $uibModalInstance.dismiss('cancel');
            swal({ title: $translate.instant("Le ticket a déjà une remise !") });
        }
    };

    $scope.setFocus = () => {
        const loadOffer = () => {
            if ($("#txtAmount").length) {
                document.querySelector('#txtAmount').focus();
            } else {
                window.requestAnimationFrame(loadOffer);
            }
        };
        loadOffer();
    };

    $scope.checkType = () => {
        if (product.Product && product.Product.SaleUnit || product.Quantity === 1) {
            $scope.submitLine();
        }
    };

    $scope.isMode = () => {
        return !$scope.mode;
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.ok = () => {
        $rootScope.closeKeyboard();
    };
});