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
        var updatedItemElem = document.querySelector('#c' + elementId);
        if (updatedItemElem) {
            var top = updatedItemElem.offsetTop;
            $('#allCategories').animate({
                scrollTop: top - 175
            }, 200);
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
