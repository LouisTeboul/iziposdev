app.controller('ModalOneProductInCategoryController', function ($scope, $rootScope, $uibModalInstance,categoryService,productService,pictureService,shoppingCartModel, offerOneProductInCategory) {
    $scope.offerOneProductInCategory = offerOneProductInCategory;
    
    $scope.init = function () {
        //obtains categoryIds
        var categoryIds = categoryService.getCategoryIdsFromOfferParam(offerOneProductInCategory.OfferParam);
        if (categoryIds) {
            var categoryId = parseInt(Enumerable.from(categoryIds).firstOrDefault());

            $scope.category = categoryService.getCategoryByIdAsync(categoryId).then(function (category) {
                $scope.category = category;

                //Get products for this category
                productService.getProductForCategoryAsync(categoryId).then(function (results) {
                    if (results) {

                        $scope.products = clone(Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray());

                        Enumerable.from($scope.products).forEach(function (p) {
                            var offerPrice = offerOneProductInCategory.OfferParam.Price;
                            p.Price = offerPrice > p.Price ? p.Price : offerPrice;
                            pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                var id = Enumerable.from(ids).firstOrDefault();
                                pictureService.getPictureUrlAsync(id).then(function (url) {
                                    if (!url) {
                                        url = 'img/photo-non-disponible.png';
                                    }
                                    p.DefaultPictureUrl = url;
                                });
                            });
                        });
                    }

                }, function (err) {
                    $uibModalInstance.dismiss(err);
                });

            }, function (err) {
                $uibModalInstance.dismiss(err);
            });;

            
            
        } else {
            $uibModalInstance.dismiss('cancel');
        }
    }

    $scope.addToCart = function (product, forceinbasket, offer) {
        shoppingCartModel.addToCart(product, true, $scope.offerOneProductInCategory);
        $uibModalInstance.close('ok');
    }

    $scope.ok = function () {
        $uibModalInstance.close('ok');
    }

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});