app.config(function ($stateProvider) {
    $stateProvider
        .state('catalog.CategoryTemplate.IZIPASS', {
            url: '/izipass/{id}',
            templateUrl: 'views/CategoryTemplate/IZIPASS.html'
        })
})


app.controller('IZIPASSController', function ($scope, $rootScope, $stateParams,$location,$state, categoryService, productService, pictureService) {
    var self = this;


    var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
            $scope.init();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
    });

    $scope.init = function () {
        
        //Get selected category
        var categoryId = $stateParams.id;
        categoryService.getCategoryByIdAsync(categoryId).then(function (category) {
            var c = new Category(category);

            $scope.category = category;

            //Get products for this category
            productService.getProductForCategoryAsync(categoryId).then(function (results) {
                if (results) {

                    $scope.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                    //Pictures
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

                //$rootScope.hideLoading();

            }, function (err) {
               // $rootScope.hideLoading();
            });
        }, function (err) {
            //$rootScope.hideLoading();
        });
    };

});