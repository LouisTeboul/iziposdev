app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogPOS.CategoryTemplate.IZIPASS', {
            url: '/izipass/{id}',
            templateUrl: 'views/CategoryTemplate/IZIPASS.html'
        })
        .state('catalogBorne.CategoryTemplate.IZIPASS', {
            url: '/izipass/{id}',
            templateUrl: 'viewsBorne/CategoryTemplate/IZIPASS.html'
        })
});


app.controller('IZIPASSController', function ($scope, $rootScope, $stateParams, $location, $state, $timeout, $mdMedia, categoryService, productService, pictureService, shoppingCartModel) {
    const self = this;
    $scope.$mdMedia = $mdMedia;
    $scope.reloadProducts = false;

    const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
            $scope.subSubCategories = [];
            // Si il y a eu un changement de produit, on reload les produits de la catégorie
            if (args.id.indexOf('Product') == 0) {
                $scope.reloadProducts = true;
            }
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
        const categoryId = $stateParams.id;
        if ($rootScope.storedCategories['' + categoryId]) {
            $scope.useCache = true;
            $timeout(() => {
                $rootScope.modelPos.categoryLoading = false;
            }, 1);
            checkLoading($rootScope.storedCategories['' + categoryId]);
        } else {
            categoryService.loadCategory(categoryId, $scope.reloadProducts, checkLoading);
        }
    };

    /*$rootScope.$on('deliveryTypeChanged', (event, args) => {
       $scope.deliveryType = args;
       console.log($scope.deliveryType);
    });*/

    const checkLoading = function (storage) {
        if (storage && storage.mainCategory && storage.mainProductsCount === 0 && storage.subProductsCount === 0) {
            $scope.model.category = storage.mainCategory;
            $scope.model.products = storage.mainCategory.products;
            if (storage.subCategories) {
                $scope.model.subCategories = storage.subCategories.sort((a, b) => {
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

    $scope.addToCart = function (idProduct) {
        const product = Enumerable.from($scope.model.products).firstOrDefault(function (p) {
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