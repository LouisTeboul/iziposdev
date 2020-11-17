app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogPOS.StoreCategories', {
            url: '/storeCategories/{storeId}',
            templateUrl: 'views/CategoryTemplate/StoreCategories.html'
        })
        .state('catalogBorne.StoreCategories', {
            url: '/storeCategories/{storeId}',
            templateUrl: 'viewsBorne/CategoryTemplate/StoreCategories.html'
        });
});

app.controller('StoreCategoriesController', function ($scope, $rootScope, $q, $stateParams, $mdMedia, categoryService, productService, stockService) {
    const self = this;
    $scope.mdMedia = $mdMedia;

    const productReloadHandler = $rootScope.$on("productReload", (event, args) => {
        if (args) {
            //console.log(args);
            args.forEach((a) => {
                // Pour chaque produit qui a changé
                // On cherche l'element html qui lui correspond
                let productQuantity = $(`#sq${a.ProductId}`);
                if (productQuantity) {
                    let stockQuantity = Number(productQuantity.text());

                    let productButton = $(`#pb${a.ProductId}`);

                    let divPrice = productButton.find("#productPrice");
                    let priceType = divPrice.attr("type");

                    let criticalStock = productButton.find("#criticalStock");

                    let outOfStockPrice = productButton.find("#outOfStock");
                    let productBox = productButton.find(".productboxIZIPASS");
                    let typePrice = productButton.find("#typePrice");
                    let fixedPrice = productButton.find("#fixedPrice");
                    let stockQuantityEl = productButton.find(`#sq${a.ProductId}`);

                    // On verifie si il reste du stock
                    if (stockQuantity - stockService.getBufferStockForProductId(a.ProductId) <= 0) {
                        // Dans le cas ou on n'a plus de stock, on desactive la case
                        if (productBox) {
                            productBox.addClass("disabled productIPDisabled");
                            criticalStock.addClass("ng-scope ng-hide");
                            stockQuantityEl.addClass("ng-hide");

                            outOfStockPrice.removeClass("ng-scope ng-hide");
                            switch (priceType) {
                                case "employeeType":
                                    typePrice.addClass("ng-scope ng-hide");
                                    break;
                                case "fixed":
                                    fixedPrice.addClass("ng-scope ng-hide");
                                    break;
                            }
                        }
                    } else {
                        if (productBox) {
                            productBox.removeClass("disabled productIPDisabled");
                            criticalStock.removeClass("ng-scope ng-hide");
                            stockQuantityEl.removeClass("ng-hide");

                            outOfStockPrice.addClass("ng-scope ng-hide");
                            switch (priceType) {
                                case "employeeType":
                                    typePrice.removeClass("ng-scope ng-hide");
                                    break;
                                case "fixed":
                                    fixedPrice.removeClass("ng-scope ng-hide");
                                    break;
                            }
                        }
                    }
                }
            });

            // Si un product modifié
        }
    });

    // OK
    const categoryReloadHandler = $rootScope.$on("categoryReload", (event, args) => {
        console.log($scope.model);
        let allCatIds = [];
        if ($scope.model.category) {
            if ($scope.model.category && $scope.model.category.SubCategories) {
                allCatIds = $scope.model.category.SubCategories.map(sc => sc.Id);
            }
            allCatIds.push($scope.model.category.Id);

            let intersec = args.filter(v => -1 !== allCatIds.indexOf(v));
            if (intersec && intersec.length > 0) {
                $scope.reloadContent(intersec);
            }
        }
    });

    $scope.$on("$destroy", function () {
        productReloadHandler();
        categoryReloadHandler();
    });

    $scope.changes = {};
    /*
    {int idCat : {products : bool}}
    */
    $scope.model = {
        storeId: undefined,
        categories: [],
        pictures: {}
    };

    $scope.init = function () {
        if ($rootScope.storeFilter && $rootScope.storeFilter.BackGroundPictureUrl) {
            const loadStorePicture = () => {
                if ($("#storePicture").length) {
                    $("#storePicture").removeClass('hiding');
                    $("#storePicture").fadeIn(300);
                } else {
                    window.requestAnimationFrame(loadStorePicture);
                }
            };
            loadStorePicture();
        }

        // Get selected category
        let storeId = $stateParams.storeId;
        $scope.model.storeId = storeId;
        categoryService.getCategoriesForStoreIdAsync(storeId).then((categories) => {
            categories.filter(c => c.IsEnabled).forEach((category) => {
                productService.getProductForCategoryAsync(category.Id).then(function (products) {
                    category.products = Enumerable.from(products).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();

                    var subCatCount = category.SubCategories.length;

                    if (subCatCount > 0) {
                        category.SubCategories = Enumerable.from(category.SubCategories).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                        category.SubCategories.forEach(function (subCategory) {
                            productService.getProductForCategoryAsync(subCategory.Id).then(function (sProducts) {
                                subCategory.products = Enumerable.from(sProducts).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                                --subCatCount;
                            }, function () {
                                --subCatCount;
                            });
                        });
                    } else {
                        $scope.model.categories.push(category);
                    }

                    $scope.model.category = {
                        "Name": $rootScope.storeFilter.Name,
                        "SubCategories": $scope.model.categories
                    };
                });
            });
        });
    };

    const reloadMultipleCategoriesAsync = (categoriesIds) => {
        let reloadMultipleCategoriesDefer = $q.defer();
        let reloadedCategories = [];
        let processedCategories = 0;
        categoriesIds.forEach((catId) => {
            reloadCategoryAsync(catId).then((reloadedCat) => {
                reloadedCategories.push(reloadedCat);
                processedCategories++;
                if (processedCategories === categoriesIds.length) {
                    reloadMultipleCategoriesDefer.resolve(reloadedCategories);
                }
            });
        });

        return reloadMultipleCategoriesDefer.promise;
    };

    const reloadCategoryAsync = (categoryId) => {
        let reloadCategoryDefer = $q.defer();
        categoryService.getCategoryByIdAsync(categoryId).then((category) => {
            productService.getProductForCategoryAsync(categoryId).then(function (products) {
                category.products = Enumerable.from(products).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                if (category.SubCategories.length > 0) {
                    let subcatProcessed = 0;
                    category.SubCategories.forEach(function (subCategory) {
                        productService.getProductForCategoryAsync(subCategory.Id).then(function (sProducts) {
                            subCategory.products = Enumerable.from(sProducts).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                            subcatProcessed++;
                            if (subcatProcessed === category.SubCategories.length) {
                                reloadCategoryDefer.resolve(category);
                            }
                        });
                    });
                } else {
                    reloadCategoryDefer.resolve(category);
                }
            });
        });

        return reloadCategoryDefer.promise;
    };

    $scope.reloadContent = function (categoriesToReload) {
        // On check si la category a reload est dans le model
        if ($scope.model.category) {
            reloadMultipleCategoriesAsync(categoriesToReload).then((newCategories) => {
                // On remplace les categories du model par les nouvelles
                newCategories.forEach((cat) => {
                    // On cherche la category dans le model
                    let matchedModelcat = $scope.model.category.SubCategories.find(sc => sc.Id === cat.Id);
                    // On remplace ces produits
                    matchedModelcat.products = cat.products;
                    $scope.$evalAsync();
                });
            });
        }
    };

    $scope.scrollTo = function (elementId) {
        console.log(elementId);
        const updatedItemElem = document.querySelector('#c' + elementId);
        if (updatedItemElem) {
            const top = updatedItemElem.offsetTop;
            $('#allCategories').animate({
                scrollTop: top - 175
            }, 200);
        }
    };

    $scope.openDesc = function (productId, categoryId) {
        let product = undefined;
        let currentCat = undefined;
        if ($scope.model.category.Id === categoryId) {
            currentCat = $scope.model.category;
        } else {
            for (let cat of $scope.model.category.SubCategories) {
                if (cat.Id === categoryId) {
                    currentCat = cat;
                    break;
                }
            }
        }

        if (currentCat) {
            product = Enumerable.from(currentCat.products).firstOrDefault(function (p) {
                return p.Id === productId;
            });
        }
        // event.preventDefault();

        if (product) {
            let desc = product.ShortDescription || product.FullDescription;
            if (desc) {
                swal({
                    title: product.Name,
                    text: stripHtml(desc),
                    buttons: ["Retour", "Ajouter"],
                    className: "Custom_Cancel",
                    timer: 10000
                }).then((confirm) => {
                    if (confirm) {
                        $scope.addToSC(currentCat.Id, product.Id);
                    }
                });
            }
        }
    };

    $scope.addToSC = (idCategory, idProduct) => {
        let product = undefined;
        let currentCat = undefined;
        if ($scope.model.category.Id === idCategory) {
            currentCat = $scope.model.category;
        } else {
            for (let cat of $scope.model.category.SubCategories) {
                if (cat.Id === idCategory) {
                    currentCat = cat;
                    break;
                }
            }
        }

        if (currentCat) {
            product = Enumerable.from(currentCat.products).firstOrDefault((p) => {
                return p.Id === idProduct;
            });
        }

        if (product) {
            let clonedProduct = angular.copy(product);
            if (!(clonedProduct.DisableBuyButton ||
                (clonedProduct.ManageInventoryMethodId === 1 && clonedProduct.StockQuantity === 0 ||
                    (clonedProduct.ManageInventoryMethodId === 1 && clonedProduct.StockQuantity - stockService.getBufferStockForProductId(clonedProduct.Id) <= 0)))) {
                if ($rootScope.EnableMultiStore && $rootScope.storeFilter) {
                    clonedProduct.StoreId = $rootScope.storeFilter.Id;
                }
                $rootScope.addToCart(clonedProduct);
            }
        } else {
            console.log("oops, pas de product");
        }
    };
});