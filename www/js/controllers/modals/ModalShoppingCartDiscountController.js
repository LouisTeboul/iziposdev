app.controller('ModalShoppingCartDiscountController', function ($scope, $rootScope, $uibModalInstance, $translate, discountService, paymentService) {

    let configuredFreeInputDiscount = null;

    $scope.init = () => {

        $scope.errorMessage = undefined;
        $scope.freeInput = new ShoppingCartDiscount(null, "Remise libre", 1, false, false);

        $scope.selectedPreset = null;

        $scope.presetDiscounts = [];
        // Récupère tous les discounts
        discountService.getAllDiscountsAsync().then((discounts) => {
            // garde seulement les discount preset
            $scope.presetDiscounts = discounts.filter(d => d.DiscountTypeId === DiscountType.PRESET);

            configuredFreeInputDiscount = discounts.find(d => d.DiscountTypeId === DiscountType.FREEINPUT);
            if (configuredFreeInputDiscount) {

                let discountValue = configuredFreeInputDiscount.UsePercentage ? configuredFreeInputDiscount.DiscountPercentage : configuredFreeInputDiscount.DiscountAmount;
                $scope.freeInput = new ShoppingCartDiscount(configuredFreeInputDiscount.Id, configuredFreeInputDiscount.DiscountName, discountValue, configuredFreeInputDiscount.UsePercentage, false);
            }
        });
    };

    $scope.setFocus = () => {
        const loadAmount = () => {
            if ($("#txtAmount").length) {
                document.querySelector('#txtAmount').focus();
            } else {
                window.requestAnimationFrame(loadAmount);
            }
        };
        loadAmount();
    };

    $scope.selectPreset = (discount) => {
        let alreadySelected = $scope.selectedPreset && $scope.selectedPreset.Id === discount.Id;
        if (alreadySelected) {
            $scope.selectedPreset = null;

        } else {
            $scope.selectedPreset = discount;
        }
    }

    const addDiscountToCart = (discount) => {

        discountService.addShoppingCartDiscount(discount);
        $uibModalInstance.close();

    }

    const validateDiscount = (discount) => {
        let valid = false;
        let hasDiscountedItems;

        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items && $rootScope.currentShoppingCart.Items.length > 0) {
            for (let item of $rootScope.currentShoppingCart.Items) {
                hasDiscountedItems = item.DiscountET > 0 || item.DiscountIT > 0;
            }
            // Check if the user has already selected payments modes
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                paymentService.removeAllPayments();
            }

            if (!hasDiscountedItems) {
                const totalDiscount = parseFloat($scope.freeInput.Value);
                if (isNaN(totalDiscount) || totalDiscount === 0) {
                    $scope.errorMessage = $translate.instant("Valeur non valide");
                } else {
                    if (discount.IsPercent) {
                        if (totalDiscount > 100) {
                            $scope.errorMessage = $translate.instant("Impossible de faire une remise supérieur à 100% !");
                        } else {
                            $scope.errorMessage = undefined;
                            valid = true;
                        }
                    } else {
                        if (totalDiscount >= $rootScope.currentShoppingCart.Total) {
                            $scope.errorMessage = $translate.instant("Impossible de faire une remise supérieur à la valeur du ticket !");
                        } else {
                            $scope.errorMessage = undefined;
                            valid = true;
                        }
                    }
                }
            } else {
                $rootScope.closeKeyboard();
                $uibModalInstance.dismiss('cancel');
                swal({
                    title: $translate.instant("Un produit du ticket a déjà une remise !")
                });
            }
        } else {
            $uibModalInstance.dismiss('No items');
        }

        return valid;
    };

    $scope.validFreeInput = () => {
        $rootScope.closeKeyboard();
        if(validateDiscount($scope.freeInput)) {
            addDiscountToCart($scope.freeInput);
        }
    };

    $scope.validPreset = () => {
        if ($scope.selectedPreset) {
            const discountObj = {
                Value: $scope.selectedPreset.UsePercentage ? $scope.selectedPreset.DiscountPercentage : $scope.selectedPreset.DiscountAmount,
                IsPercent: $scope.selectedPreset.UsePercentage,
                DiscountId: $scope.selectedPreset.Id
            }

            if (validateDiscount(discountObj)) {
                addDiscountToCart(discountObj);
            }
        }
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };
});