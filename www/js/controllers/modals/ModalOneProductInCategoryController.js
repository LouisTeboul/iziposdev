app.controller('ModalOneProductInCategoryController', function ($scope, $uibModalInstance, $mdMedia, categoryService, productService, pictureService, offerOneProductInCategory, discountOneProductInCategory) {
    $scope.offerOneProductInCategory = offerOneProductInCategory;
    $scope.discountOneProductInCategory = discountOneProductInCategory;

    $scope.mdMedia = $mdMedia;

    $scope.pictureService = pictureService;

    $scope.init = () => {
        //obtains categoryId
        let categoryId = undefined;

        if ($scope.offerOneProductInCategory) {
            let categoryIds = categoryService.getCategoryIdsFromOfferParam(offerOneProductInCategory.OfferParam);
            categoryId = parseInt(Enumerable.from(categoryIds).firstOrDefault());
        } else if ($scope.discountOneProductInCategory) {
            categoryId = $scope.discountOneProductInCategory;
        }

        if (categoryId) {

            categoryService.getCategoriesAsync().then((categories) => {

                let matchingCategory = categories.find(c => c.Id === categoryId);

                if(matchingCategory) {
                    $scope.category = matchingCategory;
                } else {
                    // Si on ne trouve pas la categorie au top level, on cherche dans les sous catégorie

                    let subCats = [];

                    categories.forEach(c => {
                        subCats.push(...c.SubCategories);
                    });

                    let matchingSubCat = subCats.find(sc => sc.Id === categoryId);

                    if(matchingSubCat) {
                        $scope.category = matchingSubCat;
                    }
                }
            });

            //categoryService.getCategoryByIdAsync(categoryId, true).then((category) => {
            //$scope.category = category;

            //Get products for this category
            productService.getProductForCategoryAsync(categoryId).then((results) => {
                if (results) {
                    $scope.products = clone(Enumerable.from(results).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray());
                    for (let p of $scope.products) {
                        let offerPrice = offerOneProductInCategory ? offerOneProductInCategory.OfferParam.Price : 0;
                        p.Price = offerPrice > p.Price ? p.Price : offerPrice;

                        var url = 'img/photo-non-disponible.png';
                        p.DefaultPictureUrl = url;

                        pictureService.loadPictureForProductAsync(p.Id).then((picture) => {
                            if (picture) {
                                p.DefaultPictureUrl = picture.PictureUrl;
                            }
                        });
                    }
                }
            }, (err) => {
                $uibModalInstance.dismiss(err);
            });
            // }, (err) => {
            //     $uibModalInstance.dismiss(err);
            // });
        } else {
            $uibModalInstance.dismiss('cancel');
        }
    };

    $scope.addToSC = (product, forceinbasket, offer) => {
        if (!product.DisableBuyButton  && (!product.ManageInventoryMethodId || product.ManageInventoryMethodId === 1 && product.StockQuantity >= 0)) {
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