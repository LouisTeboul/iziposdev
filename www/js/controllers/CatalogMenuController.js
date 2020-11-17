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
        .state('catalogPOS.Stores', {
            url: '/stores',
            templateUrl: 'views/stores.html'
        })
});

app.controller('CatalogMenuController', function ($scope, $rootScope, $state, $mdMedia, $sce, categoryService, storeService, pictureService, posPeriodService) {
    $scope.$state = $state;
    $scope.$rootScope = $rootScope;
    $scope.mdMedia = $mdMedia;

    $scope.pictureService = pictureService;

    $scope.init = () => {
        if ($rootScope.EnableMultiStore) {
            initializeStores();
        }
        initializeCategories();
        initializePosPeriod();
        if ($rootScope.modelPos) {
            if ($rootScope.modelPos.aliasCaisse) {
                $scope.CashMachineName = $rootScope.modelPos.aliasCaisse;
            } else {
                $scope.CashMachineName = $rootScope.modelPos.hardwareId;
            }
        }
    };

    $scope.navig = (category) => {
        const currentState = {
            name: $state.current.name,
            id: $state.params.id
        };
        const catalogType = $rootScope.borne ? "catalogBorne." : "catalogPOS.";
        $rootScope.currentSelectedCat = category.Id;

        $state.go(catalogType + category.CategoryTemplate.ViewPath, {
            id: category.Id
        }).then(function () {
            const newState = {
                name: $state.current.name,
                id: $state.params.id
            };

            if (currentState.name != newState.name || currentState.id != newState.id) {
                $rootScope.modelPos.categoryLoading = true;
            }
        });
    };

    $scope.goToCategories = () => {
        $rootScope.showShoppingCart = false;
        $state.go('catalogPOS.Categories');
    };

    $scope.goToStores = () => {
        $rootScope.showShoppingCart = false;
        $state.go('catalogPOS.Stores');
    };

    const initializePosPeriod = () => {
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, false, false);
    };

    const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status == "Change" && (args.id.indexOf('Category') == 0 || args.id.indexOf('Picture') == 0)) {
            initializeCategories();
        }
    });

    const storesChangedHandler = $rootScope.$on('dbStoresChange', (event, args) => {
        if (args.status == "Change" && $rootScope.EnableMultiStore) {
            reloadStores();

            if ($rootScope.storeFilter) {
                let storeDocs = null;

                if (args && args.docs) {
                    storeDocs = Enumerable.from(args.docs).firstOrDefault();
                } else if (args && args.change) {
                    storeDocs = Enumerable.from(args.change.docs).firstOrDefault();
                }
                
                if (storeDocs) {
                    let stores = storeDocs.data;

                    // Si ca vient du BO
                    if(stores.Stores) {
                        stores = stores.Stores
                    }

                    let matchingStore = Enumerable.from(stores).firstOrDefault(s => s.Id == $rootScope.storeFilter.Id);
                    if (matchingStore && matchingStore.StoreLocalClosed) {
                        // On redirige si la store actuel est passé en Closed
                        delete $rootScope.storeFilter;
                        if ($rootScope.borne) {
                            $state.go('catalogBorne');
                        } else {
                            $state.go('catalogPOS');
                        }
                    }
                }
            }
        }
    });

    $scope.$on("$destroy", () => {
        pouchDBChangedHandler();
        storesChangedHandler();
    });

    const initializeStores = () => {
        // Recup la liste des stores dans le couchdb
        storeService.getStoresAsync().then((res) => {
            if (res && res.length > 0) {
                let orderedStores = Enumerable.from(res).orderBy(o => o.DisplayOrder).thenBy(o => o.Name).toArray();
                if ($scope.stores) {
                    $scope.$evalAsync(() => {
                        $scope.stores = orderedStores;
                    });
                } else {
                    $scope.stores = orderedStores;
                }
            }
        });
    };

    const reloadStores = () => {
        storeService.reloadStoresAsync().then((res) => {
            if (res && res.length > 0) {
                let orderedStores = Enumerable.from(res).orderBy(o => o.DisplayOrder).thenBy(o => o.Name).toArray();
                if ($scope.stores) {
                    $scope.$evalAsync(() => {
                        $scope.stores = orderedStores;
                    });
                } else {
                    $scope.stores = orderedStores;
                }
            }
        });
    };

    const initializeCategories = () => {
        categoryService.getCategoriesAsync().then((categories) => {
            const categoriesEnabled = Enumerable.from(categories).where(c => c.IsEnabled).orderBy(c => c.DisplayOrder).thenBy(c => c.Name).toArray();
            for (let cat of categories) {
                if (!cat.PictureUrl && !$rootScope.borne) {
                    cat.PictureUrl = 'img/photo-non-disponible.png';
                }

                let pictureUrl = pictureService.getPictureFileUrl(cat.Id, 'Category');
                if (pictureUrl) {
                    let image = new Image();
                    image.src = pictureUrl;
                    image.onload = () => {
                        cat.PictureUrl = pictureUrl;
                    };
                }
            }

            $scope.categories = categoriesEnabled;

            //Sur la borne, on redirige sur la premiere categorie sauf en multistore
            if ($rootScope.borne && !$rootScope.EnableMultiStore) {
                let cat = $scope.categories.find(c => !c.DisabledOnBorne);
                $scope.navig(cat);
            }
        }, (err) => {
            console.error(err);
        });
    };

    $scope.setStoreFilter = (store) => {
        $rootScope.selectedStore = store;
        if (store && !store.StoreLocalClosed) {
            // TODO : Blindage
            let storeCategories = Enumerable.from($scope.categories.filter(c => !c.Mapping || c.Mapping.some(m => m.Store_Id === store.Id && m.Enable)))
                .orderBy(c => c.Displayorder)
                .thenBy(c => c.Name).toArray();

            if (!$rootScope.storeFilter || ($rootScope.storeFilter && $rootScope.storeFilter.Id !== store.Id)) {

                $rootScope.storeFilter = store;
                if (store.StoreShortDescription) {
                    $rootScope.storeFilter.DescriptionHTML = $sce.trustAsHtml(store.StoreShortDescription);
                }

                // Si on change de store, on quitte la categorie ouverte
                // On go sur la premiere categorie du store
                if (store.SmallMenuEnabled) {
                    if ($rootScope.borne) {
                        $state.go('catalogBorne.StoreCategories', {
                            storeId: store.Id
                        });
                    } else {
                        $state.go('catalogPOS.StoreCategories', {
                            storeId: store.Id
                        });
                    }
                } else {
                    if ($rootScope.borne) {
                        $state.go('catalogBorne');
                    } else {
                        $state.go('catalogPOS');
                    }
                    if (storeCategories && storeCategories.length > 0) {
                        let cat = null;
                        if ($rootScope.borne) {
                            cat = storeCategories.find(c => !c.DisabledOnBorne);
                        } else {
                            if (storeCategories.length > 0) {
                                cat = storeCategories[0];
                            }
                        }
                        if (cat) {
                            $scope.navig(cat);
                        }
                    }
                }
            } else if ($state.current.name !== 'catalogBorne.StoreCategories' && $state.current.name !== 'catalogPOS.StoreCategories') {
                // On reclique sur le même store
                // On redirige sur la page du store si on y est pas deja
                if (store.SmallMenuEnabled) {
                    if ($rootScope.borne) {
                        $state.go('catalogBorne.StoreCategories', {
                            storeId: store.Id
                        });
                    } else {
                        $state.go('catalogPOS.StoreCategories', {
                            storeId: store.Id
                        });
                    }
                } else {
                    if ($rootScope.borne) {
                        $state.go('catalogBorne');
                    } else {
                        $state.go('catalogPOS');
                    }
                    if (storeCategories && storeCategories.length > 0) {
                        let cat = storeCategories.find(c => !c.DisabledOnBorne);
                        $scope.navig(cat);
                    }
                }
            }
        }
    };

    $scope.menuIsScrolling = () => {
        let containerHeight = $('.menuItems').height();
        let childrenHeight = 0;
        $('.menuItems').children().each(() => {
            if ($(this).is(':visible')) {
                childrenHeight += $(this).outerHeight();
            }
        });

        let ret = childrenHeight >= containerHeight;
        return ret;
    }
});