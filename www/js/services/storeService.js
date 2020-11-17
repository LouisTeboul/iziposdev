app.service('storeService', function ($rootScope, $q, $http, authService, shoppingCartService) {
    let self = this;
    let cacheStores = {};
    const useCache = false;

    $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status == "Change" && args.id.indexOf('Category') == 0) {
            cacheStores = {};
            $rootScope.storedCategories = {};
        }
    });

    this.setStateStoreAsync = (store, localState, cloudState) => {
        let requestDefer = $q.defer();

        if ($rootScope.modelPos.iziboxStatus.DistantDb && authService.isLogged()) {
            //Appel de l'api smartstore si connecté
            const token = authService.getToken();
            const config = {
                headers: {
                    Authorization: 'Bearer : ' + token
                }
            };
            const closeStoreDistantUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTStore/closestore?storeId=" + store.Id + "&storeCloudClosed=" + cloudState + "&storeLocalClosed=" + localState;

            $http.get(closeStoreDistantUrl, config).then((ret) => {
                requestDefer.resolve(ret.data);
            }, (err) => {
                console.error(err);
                requestDefer.reject(err);
            });
        }
        else {
            const apiURL = $rootScope.APIBaseURL + "/setStoreState";
            const req = {
                storeId: store.Id,
                storeLocalClosed: localState,
                storeCloudClosed: cloudState
            };

            $http.post(apiURL, req).then((ret) => {
                requestDefer.resolve(ret.data);
            }, (err) => {
                console.error(err);
                requestDefer.reject(err);
            });
        }
        return requestDefer.promise;
    };

    this.getTenantInfoAsync = () => {
        let tenantInfoDefer = $q.defer();

        if ($rootScope.modelDb.storesReady) {
            $rootScope.dbStores.allDocs({
                include_docs: true
            }).then((result) => {
                let tenantInfo = [];
                let res = Enumerable.from(result.rows).firstOrDefault();

                if (res) {
                    tenantInfo = res.doc.data.Tenant;
                }
                tenantInfoDefer.resolve(tenantInfo);
            }, (err) => {
                tenantInfoDefer.reject(err);
            });
        }
        else {
            let urlTenantInfos = $rootScope.APIBaseURL + "/getTenantInfo";

            $http.get(urlTenantInfos).then((res) => {
                let tenantInfo = res.data;
                tenantInfoDefer.resolve(tenantInfo);
            }, (err) => {
                tenantInfoDefer.reject(err);
            });
        }
        return tenantInfoDefer.promise;
    };

    this.getStoresAsync = () => {
        let storesDefer = $q.defer();

        if ($rootScope.modelDb.databaseReady) {
            if (useCache && cacheStores && cacheStores.length > 0) {
                storesDefer.resolve(cacheStores);
            }
            else {
                // On recupere les store comp pour avoir les pictures
                $rootScope.dbInstance.allDocs({
                    include_docs: true,
                    startkey: 'Store_',
                    endkey: 'Store_\uffff'
                }).then((result) => {
                    const stores = Enumerable.from(result.rows).where(s => !s.Disabled).orderBy(s => s.DisplayOrder).thenBy(s => s.Name).select(s => s.doc).toArray();
                    const apiURL = $rootScope.APIBaseURL + "/getStoresStates";

                    $http.get(apiURL).then((resStoresStates) => {
                        let storesStates = resStoresStates.data;
                        let enumStoresStates = Enumerable.from(storesStates);

                        for (let store of stores) {
                            let storeState = enumStoresStates.firstOrDefault(s => s.StoreId === store.Id);
                            if (storeState) {
                                store.StoreCloudClosed = storeState.StoreCloudClosed;
                                store.StoreLocalClosed = storeState.StoreLocalClosed;
                            }
                        }
                        cacheStores = stores;
                        storesDefer.resolve(stores);
                    }, (err) => {
                        console.error(err);
                        cacheStores = stores;
                        storesDefer.resolve(stores);
                    });
                }).catch((err) => {
                    storesDefer.reject(err);
                });
            }
        }
        else {
            storesDefer.reject("Database isn't ready !");
        }
        return storesDefer.promise;
    };

    this.reloadStoresAsync = () => {
        let reloadDefer = $q.defer();

        $rootScope.dbStores.allDocs({
            include_docs: true
        }).then((result) => {
            // Un seul doc stores
            let stores = [];
            let res = Enumerable.from(result.rows).firstOrDefault();

            if (res) {
                stores = Enumerable.from(res.doc.data.Stores).where(s => !s.Disabled).toArray();
            }
            let refreshShoppingCart = () => {
                // On actualise les stores avec les nouvelles données
                for (let s of stores) {
                    if (cacheStores) {
                        let matchedStore = cacheStores.find(cs => cs.Id === s.Id);
                        if (matchedStore) {
                            matchedStore.StoreLocalClosed = s.StoreLocalClosed;
                            if (s.StoreLocalClosed) {
                                shoppingCartService.removeItemsFromStore(s);
                            }
                        }
                    }
                }
                // if (useCache) {
                //     cacheCategories.categories = categories;
                // }

                reloadDefer.resolve(cacheStores);
            };
            const apiURL = $rootScope.APIBaseURL + "/getStoresStates";

            $http.get(apiURL).then((resStoresStates) => {
                let storesStates = resStoresStates.data;
                let enumStoresStates = Enumerable.from(storesStates);

                for (let store of stores) {
                    let storeState = enumStoresStates.firstOrDefault(s => s.StoreId === store.Id);
                    if (storeState) {
                        store.StoreCloudClosed = storeState.StoreCloudClosed;
                        store.StoreLocalClosed = storeState.StoreLocalClosed;
                    }
                }
                refreshShoppingCart();
            }, (err) => {
                console.error(err);
                refreshShoppingCart();
            });
        }).catch((err) => {
            reloadDefer.reject(err);
        });
        return reloadDefer.promise;
    };
});