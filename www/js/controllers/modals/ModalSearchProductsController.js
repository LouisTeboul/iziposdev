app.controller('ModalSearchProductsController', function ($scope, $uibModalInstance, $mdMedia, pictureService, products) {
    $scope.products = products;
    $scope.mdMedia = $mdMedia;
    $scope.pictureService = pictureService;

    $scope.init = () => {
        $scope.category = {
            Name: "Recherche"
        };

        for (let p of $scope.products) {
            let url = "img/photo-non-disponible.png";
            p.DefaultPictureUrl = url;

            pictureService.loadPictureForProductAsync(p.Id).then((picture) => {
                if (picture) {
                    p.DefaultPictureUrl = picture.PictureUrl;
                }
            });
        }
    };

    $scope.addToSC = (product) => {
        let productIsDisabled = product.DisableBuyButton || (product.ManageInventoryMethodId === 1 && product.StockQuantity === 0)
        if (!productIsDisabled) {
            $uibModalInstance.close(product);
        }
    };

    $scope.ok = () => {
        $uibModalInstance.close('ok');
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };
});