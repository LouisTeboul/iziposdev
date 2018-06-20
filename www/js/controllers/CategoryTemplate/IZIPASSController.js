app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogPOS.CategoryTemplate.IZIPASS', {
            url: '/izipass/{id}',
            templateUrl: 'views/CategoryTemplate/IZIPASS.html'
        })
});


app.controller('IZIPASSController', function ($scope, $rootScope, $stateParams, $location, $state, $timeout, $mdMedia, categoryService, productService, pictureService, shoppingCartModel) {
    var self = this;
    $scope.$mdMedia = $mdMedia;

    var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
            $scope.subSubCategories = [];
            $scope.init();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
    });

    $scope.model = {
        category: undefined,
        subCategories: undefined
    };

    $scope.init = function () {
        // $scope.deliveryType = shoppingCartModel.getDeliveryType();
        $scope.useCache = false;
        // Get selected category
        var categoryId = $stateParams.id;
        if ($rootScope.storedCategories['' + categoryId]) {
            $scope.useCache = true;
            $timeout(() => {
                $rootScope.modelPos.categoryLoading = false;
            }, 1);
            checkLoading($rootScope.storedCategories['' + categoryId]);
        } else {
            categoryService.loadCategory(categoryId, checkLoading);
        }
    };

    /*$rootScope.$on('deliveryTypeChanged', (event, args) => {
       $scope.deliveryType = args;
       console.log($scope.deliveryType);
    });*/

    var checkLoading = function (storage) {
        if (storage.mainProducts === 0 && storage.subProducts === 0) {
            $scope.model.category = storage.mainCategory;
            $scope.model.products = storage.mainCategory.products;
            if (storage.subCategories) {
                $scope.model.subCategories = storage.subCategories.sort( (a,b) => {
                    return a.DisplayOrder - b.DisplayOrder;
                });
                storage.subCategories.forEach(function (subCat) {
                    $scope.model.products = $scope.model.products.concat(subCat.products)
                });
            }
            $rootScope.modelPos.categoryLoading = false;
            $rootScope.$evalAsync();
        }
    };

    /*$scope.load = function (categoryId, callback) {
        var storage = {};

        categoryService.getCategoryByIdAsync(categoryId).then(function (category) {
            if (!category.products) {
                // Get products for this category
                productService.getProductForCategoryAsync(categoryId).then(function (results) {
                    if (results) {

                        category.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                        storage.mainProducts = category.products.length;

                        // Pictures
                        Enumerable.from(category.products).forEach(function (p) {
                            pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                var id = Enumerable.from(ids).firstOrDefault();
                                pictureService.getPictureUrlAsync(id).then(function (url) {
                                    if (!url) {
                                        url = 'img/photo-non-disponible.png';
                                    }
                                    p.DefaultPictureUrl = url;

                                    storage.mainProducts--;
                                    callback(storage);
                                });
                            });
                        });
                    }
                }, function (err) {
                    console.log(err);
                });
            }
            else {
                setTimeout(function () {
                    storage.mainProducts = 0;
                    callback(storage);
                }, 1);
            }

            storage.mainCategory = category;


            categoryService.getSubCategoriesByParentAsync(categoryId).then(function (subCategories) {
                //Recupere toutes les sous categories du parent

                if (subCategories.length == 0) {
                    storage.subProducts = 0;
                    callback(storage);
                }

                Enumerable.from(subCategories).forEach(function (subCat) {
                    if (!subCat.products) {
                        productService.getProductForCategoryAsync(subCat.Id).then(function (results) {
                            if (results) {

                                subCat.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                                if (storage.subProducts) {
                                    storage.subProducts += subCat.products.length;
                                } else {
                                    storage.subProducts = subCat.products.length;
                                }

                                // Pictures
                                Enumerable.from(subCat.products).forEach(function (p) {
                                    pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                        var id = Enumerable.from(ids).firstOrDefault();
                                        pictureService.getPictureUrlAsync(id).then(function (url) {
                                            if (!url) {
                                                url = 'img/photo-non-disponible.png';
                                            }
                                            p.DefaultPictureUrl = url;

                                            storage.subProducts--;
                                            callback(storage);
                                        });
                                    });
                                });
                            }
                        }, function (err) {
                            console.log(err);
                        });
                    } else {
                        storage.subProducts = 0;
                        callback(storage);
                    }
                });
                storage.subCategories = subCategories;
            })
        }, function (err) {
            console.log(err);
        });
    };
    */

    $scope.scrollTo = function (elementId) {
        console.log(elementId);
        var updatedItemElem = document.querySelector('#c' + elementId);
        if (updatedItemElem) {
            $("#allCategories").scrollTo(updatedItemElem);
        }
    };

    $scope.addToCart = function (idProduct) {
        var product = Enumerable.from($scope.model.products).firstOrDefault(function (p) {
            return p.Id === idProduct;
        });

        if (product) {
            if (!product.DisableBuyButton) {
                shoppingCartModel.addToCart(product);
            }
        } else {
            console.log("oops, pas de product");
        }
    };


});
