app.config(function ($stateProvider) {
    $stateProvider.state('catalogPOS.CategoryTemplate.IZIPASS', {
        url: '/izipass/{id}',
        templateUrl: 'views/CategoryTemplate/IZIPASS.html'
    }).state('catalogBorne.CategoryTemplate.IZIPASS', {
        url: '/izipass/{id}',
        templateUrl: 'viewsBorne/CategoryTemplate/IZIPASS.html'
    });
});

app.controller('IZIPASSController', function ($scope, $rootScope, $stateParams, $mdMedia, categoryService, productService, stockService) {
    const self = this;
    $scope.mdMedia = $mdMedia;

    const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', (event, args) => {
        const listenChanges = (catId) => {
            let paddedCatId = padLeft(catId, 16);
            // Category Change
            if (args.results.find(r => r.id.includes('Category_' + paddedCatId))) {
                // Si il y a eu un changement de produit, on reload les produits de la catégorie
                $scope.changes[catId] = { products: false };
                $scope.reloadContent();
            }
            // Product change
            if (args.results.find(r => r.id.includes('Product_' + paddedCatId))) {
                $scope.changes[catId] = { products: true };
                $scope.reloadContent();
            }
        };

        listenChanges($scope.model.categoryId);
        $scope.model.category.SubCategories.forEach((sc) => {
            listenChanges(sc.Id);
        });
    });

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

                    let criticalStock = productButton.find("#criticalStock")

                    let outOfStockPrice = productButton.find("#outOfStock");
                    let productBox = productButton.find(".productboxIZIPASS");
                    let typePrice = productButton.find("#typePrice");
                    let fixedPrice = productButton.find("#fixedPrice");
                    let stockQuantityEl = productButton.find(`#sq${a.ProductId}`);

                    // On verifie si il reste du stock
                    if (stockQuantity - stockService.getBufferStockForProductId(a.ProductId) <= 0) {
                        // Dans le cas ou on n'a plus de sotck, on desactive la case
                        if (productBox) {
                            productBox.addClass("disabled productIPDisabled");
                            criticalStock.addClass("ng-scope ng-hide");
                            stockQuantityEl.addClass("ng-hide");
                            outOfStockPrice.removeClass("ng-hide");
                            switch (priceType) {
                                case "employeeType":
                                    typePrice.addClass("ng-hide");
                                    break;
                                case "fixed":
                                    fixedPrice.addClass("ng-hide");
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
        }
        else {
            // Si pas d'argument, on passe tous les produits de la catégorie en stock
        }
    });

    const categoryReloadHandler = $rootScope.$on("categoryReload", (event, args) => {
        if($scope.model.category) {
            console.log($scope.model);
            let allCatIds = [];
            if ($scope.model.category.SubCategories) {
                allCatIds = $scope.model.category.SubCategories.map(sc => sc.Id);
            }
            allCatIds.push($scope.model.category.Id);
    
            let intersec = args.filter(v => -1 !== allCatIds.indexOf(v));
            if (intersec && intersec.length > 0) {
                $scope.reloadContent(intersec);
            }
        }
    });

    $scope.$on("$destroy", () => {
        pouchDBChangedHandler();
        productReloadHandler();
        categoryReloadHandler();
    });

    $scope.changes = {};
    /*
    {int idCat : {products : bool}}
    */
    $scope.model = {
        categoryId: undefined,
        category: undefined,
        pictures: {}
    };

    $scope.init = () => {
        // Get selected category
        let categoryId = $stateParams.id;
        $scope.model.categoryId = categoryId;
        if ($rootScope.currentSelectedCat) {
            categoryId = $rootScope.currentSelectedCat;
        }

        categoryService.getCategoryByIdAsync(categoryId).then((category) => {
            let categoryLoaded = (count) => {
                if (count <= 0) {
                    $scope.model.category = category;
                }
            };

            productService.getProductForCategoryAsync(category.Id).then((products) => {
                category.products = Enumerable.from(products).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();

                let subCatCount = category.SubCategories.length;

                if (subCatCount > 0) {
                    category.SubCategories.forEach((subCategory) => {
                        productService.getProductForCategoryAsync(subCategory.Id).then((sProducts) => {
                            subCategory.products = Enumerable.from(sProducts).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                            categoryLoaded(--subCatCount);
                        }, () => {
                            categoryLoaded(--subCatCount);
                        });
                    });
                } else {
                    categoryLoaded(0);
                }
            });
        });
    };

    $scope.reloadContent = () => {
        categoryService.getCategoryByIdAsync($scope.model.categoryId).then((category) => {
            // On ne reload les produits seulement si un changement a été effectué sur un produit de cette catégorie
            // if ($scope.changes[category.Id] && $scope.changes[category.Id].products) {
            productService.getProductForCategoryAsync(category.Id).then((products) => {
                category.products = Enumerable.from(products).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                if (category.SubCategories.length > 0) {
                    category.SubCategories.forEach((subCategory) => {
                        // On ne reload les produits seulement si un changement a été effectué sur un produit de cette catégorie
                        // if ($scope.changes[subCategory.Id] && $scope.changes[subCategory.Id].products) {
                        productService.getProductForCategoryAsync(subCategory.Id).then((sProducts) => {
                            subCategory.products = Enumerable.from(sProducts).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();
                            $scope.model.category = category;
                        });
                    });
                } else {
                    $scope.model.category = category;
                }
            });
        });
    };

    $scope.scrollTo = (elementId) => {
        console.log(elementId);
        const updatedItemElem = document.querySelector('#c' + elementId);
        if (updatedItemElem) {
            const top = updatedItemElem.offsetTop;
            $('#allCategories').animate({
                scrollTop: top - 175
            }, 200);
        }
    };

    $scope.openDesc = (productId, categoryId) => {
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
            product = Enumerable.from(currentCat.products).firstOrDefault((p) => {
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
                    buttons: ["Retour", "Ajouter"]
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
            if (!(clonedProduct.DisableBuyButton
                || (clonedProduct.ManageInventoryMethodId === 1 && clonedProduct.StockQuantity === 0
                    || (clonedProduct.ManageInventoryMethodId === 1 && clonedProduct.StockQuantity - stockService.getBufferStockForProductId(clonedProduct.Id) <= 0)))) {
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