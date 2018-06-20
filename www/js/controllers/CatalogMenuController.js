app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.Categories', {
            url: '/categories',
            templateUrl: 'viewsBorne/categories.html'
        })
        .state('catalogPOS.Categories', {
            url: '/categories',
            templateUrl: 'views/categories.html'
        })
});

app.controller('CatalogMenuController', function ($scope, $rootScope, $state, categoryService, pictureService, posPeriodService, posService, $http, $timeout) {
    $scope.$state = $state;
    $scope.$rootScope = $rootScope;

    $scope.init = function () {
        initializeCategories();
        initializePosPeriod();
        if ($rootScope.modelPos) {
            if ($rootScope.modelPos.aliasCaisse) {
                $scope.CashMachineName = $rootScope.modelPos.aliasCaisse;
            }
            else {
                $scope.CashMachineName = $rootScope.modelPos.hardwareId;
            }

        }
    };

    $scope.navig = function (category) {
        var currentState = {
            name: $state.current.name,
            id: $state.params.id
        };

        $state.go("catalogPOS." + category.CategoryTemplate.ViewPath, { id: category.Id }).then(function (state, event) {
            var newState = {
                name: $state.current.name,
                id: $state.params.id
            };

            if (currentState.name != newState.name || currentState.id != newState.id) {
                $rootScope.modelPos.categoryLoading = true;
            }
        });
    };

    $scope.goToCategories = function () {
        $rootScope.showShoppingCart = false;
        $state.go('catalogPOS.Categories')
    };

    var initializePosPeriod = function () {
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, false);
    };

    var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Category') == 0 || args.id.indexOf('Picture') == 0)) {
            initializeCategories();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
    });

    var initializeCategories = function () {
        categoryService.getCategoriesAsync().then(function (categories) {
            var categoriesEnabled = Enumerable.from(categories).where('x=>x.IsEnabled === true').orderBy('x => x.DisplayOrder').toArray();

            Enumerable.from(categoriesEnabled).forEach(function (c) {
                pictureService.getPictureUrlAsync(c.PictureId).then(function (url) {
                    if (!url) {
                        url = 'img/photo-non-disponible.png';
                    }
                    c.PictureUrl = url;
                });
            });

            $scope.categories = categoriesEnabled;
        }, function (err) {
            console.log(err);
        });
    }
});