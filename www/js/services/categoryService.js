app.service('categoryService', function ($rootScope, $q) {
    const self = this;
    const useCache = false;

    let cacheCategories = {
        categories: undefined,
        subCategories: {}
    };

    $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && args.id.indexOf('Category') == 0) {
            cacheCategories = {
                categories: undefined,
                subCategories: {}
            };
            $rootScope.storedCategories = {};
        }
    });

    this.getCategoriesAsync = () => {
        let categoriesDefer = $q.defer();

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            if (useCache && cacheCategories.categories && cacheCategories.categories.length > 0) {
                categoriesDefer.resolve(cacheCategories.categories);
            } else {
                $rootScope.dbInstance.allDocs({
                    include_docs: true,
                    startkey: 'Category_',
                    endkey: 'Category_\uffff'
                }).then((result) => {
                    var categories = result.rows.map((row) => {
                        // Store Mapping
                        // En mode multistore, on ne tient pas compte du StoreMapping
                        if (row.doc.Mapping && !$rootScope.EnableMultiStore) {
                            const res = row.doc.Mapping.find(x => x.Store_Id == $rootScope.IziBoxConfiguration.StoreId);
                            if (!res || res && !res.Enable) {
                                row.doc.IsEnabled = false;
                            }
                        }
                        return row.doc;
                    });

                    if (useCache) {
                        cacheCategories.categories = categories;
                    }

                    categoriesDefer.resolve(categories);
                }).catch((err) => {
                    categoriesDefer.reject(err);
                });
            }
        } else {
            categoriesDefer.reject("Database isn't ready !");
        }
        return categoriesDefer.promise;
    };

    this.getCategoriesForStoreIdAsync = (storeId) => {
        let categoriesDefer = $q.defer();

        if ($rootScope.modelDb.databaseReady) {
            if (useCache && cacheCategories.categories && cacheCategories.categories.length > 0) {
                categoriesDefer.resolve(cacheCategories.categories);
            } else {
                $rootScope.dbInstance.allDocs({
                    include_docs: true,
                    startkey: 'Category_',
                    endkey: 'Category_\uffff'
                }).then((result) => {
                    let categories = result.rows.map((row) => {
                        // Store Mapping
                        if (row.doc.Mapping) {
                            const res = row.doc.Mapping.find(x => x.Store_Id == storeId);
                            if (!res || res && !res.Enable) {
                                row.doc.IsEnabled = false;
                            }
                        }
                        return row.doc;
                    });

                    categoriesDefer.resolve(categories);
                }).catch((err) => {
                    categoriesDefer.reject(err);
                });
            }
        } else {
            categoriesDefer.reject("Database isn't ready !");
        }
        return categoriesDefer.promise;
    };

    this.getCategoryByIdAsync = (idStr, forFidOffer = false) => {
        let categoryDefer = $q.defer();
        let id = parseInt(idStr);

        if ($rootScope.modelDb.databaseReady) {
            if (useCache && cacheCategories.categories) {
                let category = cacheCategories.categories.find(x.Id === id);
                categoryDefer.resolve(category);
            } else {
                $rootScope.dbInstance.get('Category_' + padLeft(id, 16)).then((category) => {
                    if (category.SubCategories) {
                        category.SubCategories = category.SubCategories.filter(sc => {
                            // Store Mapping
                            if (sc.UsedInLoyalty && forFidOffer) {
                                return true;
                            } else if (sc.Mapping) {
                                const res = sc.Mapping.find(x => x.Store_Id == $rootScope.IziBoxConfiguration.StoreId);
                                if (!res || res && !res.Enable) {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        });
                    }

                    categoryDefer.resolve(category);
                }, (err) => {
                    console.error(err);
                    categoryDefer.reject(err);
                });
            }
        } else {
            categoryDefer.reject("Database isn't ready !");
        }

        return categoryDefer.promise;
    };

    this.getCategoryIdsFromOfferParam = (offerParam) => {
        let categoryIds = [];

        if (offerParam && offerParam.CategoryId) {
            for (let i = 0; i < offerParam.CategoryId.length; i++) {
                let categoryIdName = offerParam.CategoryId[i];
                const idxName = categoryIdName.indexOf("-");

                if (idxName >= 0) {
                    const categoryId = parseInt(categoryIdName.substring(0, idxName));
                    categoryIds.push(categoryId);
                }
            }
        }

        return categoryIds;
    };

    this.getCache = () => {
        return cacheCategories;
    };
});