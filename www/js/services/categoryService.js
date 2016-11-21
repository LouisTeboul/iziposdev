app.service('categoryService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        var cacheCategories = undefined;

        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status == "Change" && args.id.indexOf('Category') == 0) {
                cacheCategories = undefined;
            }
        });

        this.getCategoriesAsync = function () {
            var self = this;
            var categoriesDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                if (cacheCategories) {
                    categoriesDefer.resolve(cacheCategories);
                } else {
                    $rootScope.dbInstance.rel.find('Category').then(function (results) {
                        var categories = self.composeCategories(results);
                        cacheCategories = categories;
                        categoriesDefer.resolve(categories);
                    }, function (err) {
                    });
                }
            } else {
                categoriesDefer.reject("Database isn't ready !");
            }

            return categoriesDefer.promise;
        }

        this.getCategoryByIdAsync = function (idStr) {
            var self = this;
            var categoryDefer = $q.defer();
            var id = parseInt(idStr);

            if ($rootScope.modelDb.databaseReady) {
                if (cacheCategories) {
                    var category = Enumerable.from(cacheCategories).firstOrDefault(function (x) {
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
        }

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
                if (category.Mapping)
                {
                    var res = Enumerable.from(category.Mapping).any('x=>x.Store_Id==' + $rootScope.IziBoxConfiguration.StoreId);
                    if(!res)
                    {
                        category.IsEnabled = false;
                    }
                }             

                categories.push(category);
            }

            return categories;
        }

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
        }

    }])