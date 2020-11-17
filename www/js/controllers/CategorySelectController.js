app.controller('CategorySelectController', function ($scope, $rootScope, $state, $mdMedia, categoryService) {
    $scope.$state = $state;
    $scope.$rootScope = $rootScope;
    $scope.mdMedia = $mdMedia;

    $scope.init = function () {
        initializeCategories();
    };

    $scope.navig = function (category) {
        const currentState = {
            name: $state.current.name,
            id: $state.params.id
        };
        const catalogType = $rootScope.borne ? "catalogBorne." : "catalogPOS.";
        $rootScope.currentSelectedCat = category.Id;

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
        $state.go('catalogPOS.Categories');
    };

    // const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
    //     if (args.status == "Change" && (args.id.indexOf('Category') == 0 || args.id.indexOf('Picture') == 0)) {
    //         initializeCategories();
    //     }
    // });

    // $scope.$on("$destroy", function () {
    //     pouchDBChangedHandler();
    // });

    const initializeCategories = () => {
        categoryService.getCategoriesAsync().then(function (categories) {
            const categoriesEnabled = Enumerable.from(categories).where(c => c.IsEnabled).orderBy(c => c.DisplayOrder).thenBy(c => c.Name).toArray();
            // for (let cat of categories) {
            //     if (!cat.PictureUrl) {
            //         cat.PictureUrl = 'img/photo-non-disponible.png';
            //     }
            // }
            $scope.categories = categoriesEnabled;

        }, function (err) {
            console.error(err);
        });
    };

    $scope.isCategoryVisible = function(category) {
        let ret = false;
        if($scope.storeFilter) {
            if(category.Mapping) {
                ret = category.Mapping.some(m => m.Store_Id === $rootScope.storeFilter.Id && m.Enable);
            } else {
                ret = true;
            }
        }
        return ret;
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
});