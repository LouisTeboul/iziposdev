app.service('categoryService', ['$rootScope', '$q', 'productService', 'pictureService',
    function ($rootScope, $q, productService, pictureService) {

        var cacheCategories = {
            categories: undefined,
            subCategories: {}
        };

        var useCache = true;

        var self = this;

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
            var self = this;
            var categoriesDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                if (useCache && cacheCategories.categories && cacheCategories.categories.length > 0) {
                    categoriesDefer.resolve(cacheCategories.categories);
                } else {
                    $rootScope.dbInstance.rel.find('Category').then(function (results) {
                        //Filter pour n'avoir que les catégories de plus haut niveau (qui n'ont pas de parent)
                        results.Categories = results.Categories.filter(cat => cat.ParentCategoryId == 0);
                        var categories = self.composeCategories(results);
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
            var self = this;
            var subCategoriesDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                if (useCache && cacheCategories.subCategories[parentId]) {
                    subCategoriesDefer.resolve(cacheCategories.subCategories[parentId]);
                } else {
                    $rootScope.dbInstance.createIndex({
                        index: {
                            fields: ['data.ParentCategoryId', 'data.IsEnabled']
                        }
                    }).then(function (result) {
                        $rootScope.dbInstance.find({
                            selector:
                                {
                                    '_id': {$regex: 'Category_1_*'},
                                    'data.ParentCategoryId': parseInt(parentId),
                                    'data.IsEnabled': true
                                },
                            fields: ['data']
                        }).then(function (res) {
                            var results = {
                                Categories: []
                            };

                            results.Categories = Enumerable.from(res.docs).select(function (doc) {
                                return doc.data;
                            }).toArray();

                            var subCategories = self.composeCategories(results);

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
            var self = this;
            var categoryDefer = $q.defer();
            var id = parseInt(idStr);

            if ($rootScope.modelDb.databaseReady) {
                if (useCache && cacheCategories.categories) {
                    var category = Enumerable.from(cacheCategories.categories).firstOrDefault(function (x) {
                        return x.Id == id;
                    });
                    categoryDefer.resolve(category);

                } else {
                    $rootScope.dbInstance.rel.find('Category', id).then(function (results) {
                        var categories = self.composeCategories(results);
                        var category = Enumerable.from(categories).firstOrDefault();
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

            var categories = [];

            for (var i = 0; i < values.Categories.length; i++) {
                var category = values.Categories[i];

                var categoryTemplate = undefined;
                var categoryPicture = undefined;

                if (category.CategoryTemplateId) {
                    categoryTemplate = Enumerable.from(values.CategoryTemplates).firstOrDefault('x=> x.Id == ' + category.CategoryTemplateId);
                }

                if (category.PictureId) {
                    categoryPicture = Enumerable.from(values.Pictures).firstOrDefault('x=> x.Id == ' + category.PictureId);
                }


                category.CategoryTemplate = categoryTemplate;
                category.Picture = categoryPicture;
                if (category.Mapping) {
                    var res = Enumerable.from(category.Mapping).any('x=>x.Store_Id==' + $rootScope.IziBoxConfiguration.StoreId);
                    if (!res) {
                        category.IsEnabled = false;
                    }
                }

                categories.push(category);
            }

            return categories;
        };

        this.getCategoryIdsFromOfferParam = function (offerParam) {
            var categoryIds = [];

            if (offerParam && offerParam.CategoryId) {
                for (var i = 0; i < offerParam.CategoryId.length; i++) {
                    var categoryIdName = offerParam.CategoryId[i];
                    var idxName = categoryIdName.indexOf("-");

                    if (idxName >= 0) {
                        var categoryId = parseInt(categoryIdName.substring(0, idxName));
                        categoryIds.push(categoryId);
                    }
                }
            }

            return categoryIds;
        };

        this.loadCategory = function (categoryId, callback) {
            var storage = {};

            self.getCategoryByIdAsync(categoryId).then(function (category) {
                storage.mainCategory = category;
                if (!category.products) {
                    // Get products for this category
                    productService.getProductForCategoryAsync(categoryId).then(function (results) {
                        if (results) {

                            category.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();
                            storage.mainProducts = category.products.length;

                            // Pictures
                            for(let p of category.products) {
                                pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                    const id = pictureService.getCorrectPictureId(ids);
                                    if(id !== -1) {
                                        pictureService.getPictureUrlAsync(id).then(function (url) {
                                            if (!url) {
                                                url = 'img/photo-non-disponible.png';
                                            }
                                            p.DefaultPictureUrl = url;

                                            storage.mainProducts--;
                                            callback(storage);
                                        });
                                    }
                                });
                            }
                        }
                    }, function (err) {
                        console.log(err);
                    });
                }
                else {
                    setTimeout(function () {
                        storage.mainProducts = 0;
                        callback(storage);
                    }, 1);
                }

                self.getSubCategoriesByParentAsync(categoryId).then(function (subCategories) {
                    //Recupere toutes les sous categories du parent

                    if (subCategories.length == 0) {
                        storage.subProducts = 0;
                        callback(storage);
                    }

                    Enumerable.from(subCategories).forEach(function (subCat) {
                        if (!subCat.products) {
                            productService.getProductForCategoryAsync(subCat.Id).then(function (results) {
                                if (results) {

                                    subCat.products = Enumerable.from(results).orderBy('x => x.ProductCategory.DisplayOrder').toArray();

                                    if (storage.subProducts) {
                                        storage.subProducts += subCat.products.length;
                                    } else {
                                        storage.subProducts = subCat.products.length;
                                    }

                                    // Pictures
                                    Enumerable.from(subCat.products).forEach(function (p) {
                                        pictureService.getPictureIdsForProductAsync(p.Id).then(function (ids) {
                                            const id = pictureService.getCorrectPictureId(ids);
                                            if(id !== -1) {
                                                pictureService.getPictureUrlAsync(id).then(function (url) {
                                                    if (!url) {
                                                        url = 'img/photo-non-disponible.png';
                                                    }
                                                    p.DefaultPictureUrl = url;

                                                    storage.subProducts--;
                                                    callback(storage);
                                                });
                                            }
                                        });
                                    });
                                }
                            }, function (err) {
                                console.log(err);
                            });
                        } else {
                            storage.subProducts = 0;
                            callback(storage);
                        }
                    });
                    storage.subCategories = subCategories;
                })
            }, function (err) {
                console.log(err);
            });
        };

        this.getCache = function () {
            return cacheCategories;
        };

    }]);