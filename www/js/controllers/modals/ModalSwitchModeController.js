app.controller('ModalSwitchModeController', function ($scope, $rootScope, $uibModalInstance, lossTypeService, posUserService, pictureService, shoppingCartService) {
    $scope.LossDisabled = !posUserService.isEnable('LOSS', true);
    $scope.EmplMealDisabled = !posUserService.isEnable('EMPMEAL', true);

    $scope.init = function () {
        $scope.lossTypes = [
            {
                Name: "Pertes",
                IsVisible: true,
                PictureURL: "img/broken-bottle.png"
            }
        ];

        lossTypeService.getLossTypesAsync().then((res) => {
            if (res && res.length > 0) {
                $scope.lossTypes = res;
                for (let type of $scope.lossTypes) {
                    if (type.PictureId && !type.PictureURL) {
                        pictureService.getPictureByIdAsync(type.PictureId).then((resPicture) => {
                            if (resPicture.PictureUrl) {
                                type.PictureURL = resPicture.PictureUrl;
                            }
                        }, (err) => {
                            console.error(err);
                        });
                    }
                }
            }
        });
    };

    const clearAndGetNewShoppingCart = (isLoss, isEmployeeMeal) => {
        $rootScope.clearShoppingCart();
        $rootScope.createShoppingCart(isLoss, isEmployeeMeal);
    };

    $scope.chooseLoss = (lossType) => {
        if (posUserService.isEnable('LOSS')) {
            clearAndGetNewShoppingCart(true, false);

            $rootScope.currentShoppingCart.IsEmployeeMeal = false;
            $rootScope.currentShoppingCart.IsLoss = true;
            if (lossType.Id || lossType.Id === 0) {
                $rootScope.currentShoppingCart.LossTypeId = lossType.Id;
            }
            $rootScope.currentShoppingCart.LossTypeName = lossType.Name;

            $uibModalInstance.close();
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    $scope.chooseEmployeeMeal = () => {
        if (posUserService.isEnable('EMPMEAL')) {
            clearAndGetNewShoppingCart(false, true);

            $rootScope.currentShoppingCart.IsEmployeeMeal = true;
            $rootScope.currentShoppingCart.IsLoss = false;

            $uibModalInstance.close();
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };
});