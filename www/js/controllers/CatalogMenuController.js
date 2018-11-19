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

app.controller('CatalogMenuController', function ($scope, $rootScope, $state, $mdMedia, categoryService, pictureService, posPeriodService) {
    $scope.$state = $state;
    $scope.$rootScope = $rootScope;
    $scope.mdMedia = $mdMedia;

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
        const currentState = {
            name: $state.current.name,
            id: $state.params.id
        };
        const catalogType = $rootScope.borne ? "catalogBorne." : "catalogPOS.";

        $state.go(catalogType + category.CategoryTemplate.ViewPath, {id: category.Id}).then(function () {
            const newState = {
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

    const initializePosPeriod = function () {
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, false);
    };

    const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('Category') == 0 || args.id.indexOf('Picture') == 0)) {
            initializeCategories();
        }
    });

    $scope.$on("$destroy", function () {
        pouchDBChangedHandler();
    });

    const initializeCategories = function () {
        categoryService.getCategoriesAsync().then(function (categories) {
            const categoriesEnabled = Enumerable.from(categories).where('x=>x.IsEnabled === true').orderBy('x => x.DisplayOrder').toArray();

            for (let cat of categories) {
                pictureService.getPictureUrlAsync(cat.PictureId).then(function (url) {
                    if (!url) {
                        url = 'img/photo-non-disponible.png';
                    }
                    cat.PictureUrl = url;
                });
            }

            $scope.categories = categoriesEnabled;
        }, function (err) {
            console.log(err);
        });
    };
});