app.controller('ModalOneProductInCategoryController', function ($scope, $rootScope, $uibModalInstance, categoryService, productService, pictureService, shoppingCartModel, offerOneProductInCategory) {
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
                        for(let p of $scope.products) {
                            const offerPrice = offerOneProductInCategory.OfferParam.Price;
                            p.Price = offerPrice > p.Price ? p.Price : offerPrice;
                            pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                const id = pictureService.getCorrectPictureId(ids);
                                if(id !== -1) {
                                    pictureService.getPictureUrlAsync(id).then(function (url) {
                                        if (!url) {
                                            url = 'img/photo-non-disponible.png';
                                        }
                                        p.DefaultPictureUrl = url;
                                    });
                                }
                            });
                        }
                    }

                }, function (err) {
                    $uibModalInstance.dismiss(err);
                });

            }, function (err) {
                $uibModalInstance.dismiss(err);
            });

        } else {
            $uibModalInstance.dismiss('cancel');
        }
    };

    $scope.addToCart = function (product, forceinbasket, offer) {
        if (!product.DisableBuyButton) {
            // Si le produit en question est une formule
            if (product.ProductAttributes.length > 0) {
                shoppingCartModel.addToCart(product, false, $scope.offerOneProductInCategory, undefined, true);
            } else {
                shoppingCartModel.addToCart(product, true, $scope.offerOneProductInCategory);
            }

            $uibModalInstance.close('ok');
        }
    };

    $scope.ok = function () {
        $uibModalInstance.close('ok');
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
});