app.service('categoryService', ['$rootScope', '$q', 'productService', 'pictureService',
    function ($rootScope, $q, productService, pictureService) {

        let cacheCategories = {
            categories: undefined,
            subCategories: {}
        };

        const useCache = true;

        let self = this;

        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status == "Change" && args.id.indexOf('Category') == 0) {
                cacheCategories = {
                    categories: undefined,
                    subCategories: {}
                };
                $rootScope.storedCategories = {};
            }
        });

        this.getCategoriesAsync = function () {
            self = this;
            let categoriesDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                if (useCache && cacheCategories.categories && cacheCategories.categories.length > 0) {
                    categoriesDefer.resolve(cacheCategories.categories);
                } else {
                    $rootScope.dbInstance.rel.find('Category').then(function (results) {
                        //Filter pour n'avoir que les catégories de plus haut niveau (qui n'ont pas de parent)
                        results.Categories = results.Categories.filter(cat => cat.ParentCategoryId == 0);
                        const categories = self.composeCategories(results);
                        if (useCache) {
                            cacheCategories.categories = categories;
                        }

                        categoriesDefer.resolve(categories);
                    }, function (err) {
                    });
                }
            } else {
                categoriesDefer.reject("Database isn't ready !");
            }
            return categoriesDefer.promise;
        };

        this.getSubCategoriesByParentAsync = function (parentId) {
            self = this;
            let subCategoriesDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                if (useCache && cacheCategories.subCategories[parentId]) {
                    subCategoriesDefer.resolve(cacheCategories.subCategories[parentId]);
                } else {
                    $rootScope.dbInstance.createIndex({
                        index: {
                            fields: ['data.ParentCategoryId', 'data.IsEnabled']
                        }
                    }).then(function () {
                        $rootScope.dbInstance.find({
                            selector:
                                {
                                    '_id': {$regex: 'Category_1_*'},
                                    'data.ParentCategoryId': parseInt(parentId),
                                    'data.IsEnabled': true
                                },
                            fields: ['data']
                        }).then(function (res) {
                            let results = {
                                Categories: []
                            };

                            results.Categories = Enumerable.from(res.docs).select(function (doc) {
                                return doc.data;
                            }).toArray();

                            const subCategories = self.composeCategories(results);

                            if (useCache) {
                                cacheCategories.subCategories[parentId] = subCategories;
                            }

                            subCategoriesDefer.resolve(subCategories);
                        });
                    }).catch(function (err) {

                    });
                }


                //$rootScope.dbInstance.rel.find('Category').then(function (results) {
                //    //Filter pour n'avoir que les sous catégories du parent précisé
                //    //Qui sont enable
                //    results.Categories = results.Categories.filter(subCat => subCat.ParentCategoryId == parentId && subCat.IsEnabled);
                //    var subCategories = self.composeCategories(results);
                //    subCategoriesDefer.resolve(subCategories);
                //}, function (err) {
                //});
            } else {
                subCategoriesDefer.reject("Database isn't ready !");
            }

            return subCategoriesDefer.promise;

        };

        this.getCategoryByIdAsync = function (idStr) {
            self = this;
            let categoryDefer = $q.defer();
            const id = parseInt(idStr);

            if ($rootScope.modelDb.databaseReady) {
                if (useCache && cacheCategories.categories) {
                    const category = Enumerable.from(cacheCategories.categories).firstOrDefault(function (x) {
                        return x.Id == id;
                    });
                    categoryDefer.resolve(category);

                } else {
                    $rootScope.dbInstance.rel.find('Category', id).then(function (results) {
                        const categories = self.composeCategories(results);
                        const category = Enumerable.from(categories).firstOrDefault();
                        categoryDefer.resolve(category);

                    }, function (err) {
                    });
                }
            } else {
                categoryDefer.reject("Database isn't ready !");
            }

            return categoryDefer.promise;
        };

        this.composeCategories = function (values) {

            let categories = [];

            for (let i = 0; i < values.Categories.length; i++) {
                let category = values.Categories[i];

                let categoryTemplate = undefined;
                let categoryPicture = undefined;

                if (category.CategoryTemplateId) {
                    categoryTemplate = Enumerable.from(values.CategoryTemplates).firstOrDefault('x=> x.Id == ' + category.CategoryTemplateId);
                }

                if (category.PictureId) {
                    categoryPicture = Enumerable.from(values.Pictures).firstOrDefault('x=> x.Id == ' + category.PictureId);
                }


                category.CategoryTemplate = categoryTemplate;
                category.Picture = categoryPicture;
                if (category.Mapping) {
                    const res = Enumerable.from(category.Mapping).any('x=>x.Store_Id==' + $rootScope.IziBoxConfiguration.StoreId);
                    if (!res) {
                        category.IsEnabled = false;
                    }
                }

                categories.push(category);
            }

            return categories;
        };

        this.getCategoryIdsFromOfferParam = function (offerParam) {
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

        this.loadCategory = function (categoryId, reloadProducts, callback) {
            let storage = {};

            self.getCategoryByIdAsync(categoryId).then(function (category) {
                storage.mainCategory = category;
                if (category && (!category.products || reloadProducts)) {
                    // Get products for this category
                    productService.getProductForCategoryAsync(categoryId).then(function (results) {
                        if (results) {

                            category.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();
                            storage.mainProductsCount = category.products.length;

                            // Pictures
                            for (let p of category.products) {


                                pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                    const id = pictureService.getCorrectPictureId(ids);
                                    pictureService.getPictureUrlAsync(id).then(function (url) {
                                        if (!url) {
                                            url = 'img/photo-non-disponible.png';
                                        }
                                        p.DefaultPictureUrl = url;

                                        storage.mainProductsCount--;
                                        callback(storage);
                                    }, function (err) {
                                        console.log(err);
                                        });
                                }, function (err) {
                                    console.log(err);
                                });
                            }
                        }
                    }, function (err) {
                        console.log(err);
                    });
                } else {
                    setTimeout(function () {
                        storage.mainProductsCount = 0;
                        callback(storage);
                    }, 1);
                }

                self.getSubCategoriesByParentAsync(categoryId).then(function (subCategories) {
                    //Recupere toutes les sous categories du parent

                    if (subCategories.length === 0) {
                        storage.subProductsCount = 0;
                        callback(storage);
                    }

                    for (let subCat of subCategories) {
                        if (!subCat.products) {
                            productService.getProductForCategoryAsync(subCat.Id).then(function (results) {
                                if (results) {

                                    subCat.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                                    if (storage.subProductsCount) {
                                        storage.subProductsCount += subCat.products.length;
                                    } else {
                                        storage.subProductsCount = subCat.products.length;
                                    }

                                    // Pictures
                                    for (let p of subCat.products) {
                                        pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                            const id = pictureService.getCorrectPictureId(ids);
                                            pictureService.getPictureUrlAsync(id).then(function (url) {
                                                if (!url) {
                                                    url = 'img/photo-non-disponible.png';
                                                }
                                                p.DefaultPictureUrl = url;

                                                storage.subProductsCount--;
                                                callback(storage);
                                            }, function (err) {
                                                console.log(err);
                                            });
                                        }, function (err) {
                                            console.log(err);
                                        });
                                    }
                                }
                            }, function (err) {
                                console.log(err);
                            });
                        } else {
                            storage.subProductsCount = 0;
                            callback(storage);
                        }
                    }
                    storage.subCategories = subCategories;
                }, function (err) {
                    console.log(err);
                });
            }, function (err) {
                console.log(err);
            });
        };

        this.getCache = function () {
            return cacheCategories;
        };

    }]);