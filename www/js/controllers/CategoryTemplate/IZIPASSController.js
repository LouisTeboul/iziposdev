app.config(function ($stateProvider) {
    $stateProvider
        .state('catalog.CategoryTemplate.IZIPASS', {
            url: '/izipass/{id}',
            templateUrl: 'views/CategoryTemplate/IZIPASS.html'
        })
});


app.controller('IZIPASSController', function ($scope, $rootScope, $stateParams, $location, $state, categoryService, productService, pictureService) {
    var self = this;

    var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
            $scope.subSubCategories = [];
            $scope.init();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
    });

    $scope.init = function () {
        // Get selected category
        var categoryId = $stateParams.id;
        categoryService.getCategoryByIdAsync(categoryId).then(function (category) {
            $scope.category = category;

            // Get products for this category
            productService.getProductForCategoryAsync(categoryId).then(function (results) {
                if (results) {

                    $scope.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                    // Pictures
                    Enumerable.from($scope.products).forEach(function (p) {
                        pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                            var id = Enumerable.from(ids).firstOrDefault();
                            pictureService.getPictureUrlAsync(id).then(function (url) {
                                if (!url) {
                                    url = 'img/photo-non-disponible.png';
                                }
                                p.DefaultPictureUrl = url;
                                $scope.$evalAsync();
                            });
                        });
                    });
                }
            }, function (err) {
                console.log(err);
            });


            categoryService.getSubCategoriesByParentAsync(categoryId).then(function (subCategories) {
                //Recupere toutes les sous categories du parent
                $scope.subCategories = subCategories;

                Enumerable.from($scope.subCategories).forEach(function (subCat) {


                    categoryService.getSubCategoriesByParentAsync(subCat.Id).then(function (subSubCategories) {
                        //Recupere toutes les sous categories du parent
                        if(subSubCategories) {
                            Enumerable.from(subSubCategories).forEach(function(c){
                                $scope.subSubCategories.push(c);
                            });
                            subCat.subCategories = subSubCategories;

                            Enumerable.from(subSubCategories).forEach(function (subCat) {

                                productService.getProductForCategoryAsync(subCat.Id).then(function (results) {
                                    if (results) {

                                        subCat.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                                        // Pictures
                                        Enumerable.from(subCat.products).forEach(function (p) {
                                            pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                                var id = Enumerable.from(ids).firstOrDefault();
                                                pictureService.getPictureUrlAsync(id).then(function (url) {
                                                    if (!url) {
                                                        url = 'img/photo-non-disponible.png';
                                                    }
                                                    p.DefaultPictureUrl = url;
                                                    $scope.$evalAsync();
                                                });
                                            });
                                        });
                                    }
                                }, function (err) {
                                    console.log(err);
                                });


                            })
                        }

                    });

                    productService.getProductForCategoryAsync(subCat.Id).then(function (results) {
                        if (results) {

                            subCat.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                            // Pictures
                            Enumerable.from(subCat.products).forEach(function (p) {
                                pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                    var id = Enumerable.from(ids).firstOrDefault();
                                    pictureService.getPictureUrlAsync(id).then(function (url) {
                                        if (!url) {
                                            url = 'img/photo-non-disponible.png';
                                        }
                                        p.DefaultPictureUrl = url;
                                        $scope.$evalAsync();
                                    });
                                });
                            });
                        }
                    }, function (err) {
                        console.log(err);
                    });
                })
            })

        }, function (err) {
            console.log(err);
        });
    };


    $scope.scrollTo = function (elementId) {
        var updatedItemElem = document.querySelector('#c' + elementId);
        if (updatedItemElem) {
            $("#allCategories").scrollTo(updatedItemElem);
        }
    };
});