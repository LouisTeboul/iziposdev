app.service('productService', ['$rootScope', '$q','settingService','taxesService',
    function ($rootScope, $q, settingService,taxesService) {
        var cacheProductForCategory = {};

        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
                cacheProductForCategory = {};
            }
        });

        this.getProductForCategoryAsync = function (categoryId) {
            var self = this;
            var productsDefer = $q.defer();

            //Obtains all productCategories for this category
            if ($rootScope.modelDb.databaseReady) {

                if (cacheProductForCategory && cacheProductForCategory[categoryId]) {
                    productsDefer.resolve(cacheProductForCategory[categoryId]);
                } else {

                    var key = parseInt(categoryId);
                    $rootScope.dbInstance.allDocs({
                        include_docs: true,
                        startkey: 'ProductCategory_',
                        endkey: 'ProductCategory_\uffff'
                    })
                        .then(function (result) {
                            var productCategories = Enumerable.from(result.rows).where(function (x) {
                                return x.doc.data.CategoryId == key;
                            }).select("x => x.doc.data").toArray();

                        var productIds = Enumerable.from(productCategories).select('x => x.ProductId').toArray();

                        self.getProductByIdsAsync(productIds, productCategories).then(function (products) {

                            if (!cacheProductForCategory) {
                                cacheProductForCategory = {};
                            }

                            cacheProductForCategory[categoryId] = products;

                            productsDefer.resolve(products);
                        }, function (errProducts) {

                        });

                    }).catch(function (err) {
                        
                    });
                }
            }
            return productsDefer.promise;
        }

        this.getProductBySKUAsync = function (gtin) {
            var self = this;
            var productDefer = $q.defer();

            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'Product_',
                endkey: 'Product_\uffff'
            })
                .then(function (result) {
                    var products = Enumerable.from(result.rows).where(function (x) {
                        return gtin == x.doc.data.Gtin && x.doc.data.IsEnabled;
                    }).select("x => x.doc.data").toArray();

                    var productIds = Enumerable.from(products).select("x => x.Id").toArray();

                    if (products) {
                        self.getProductByIdsAsync(productIds, undefined, products).then(function (products) {
                            var product = Enumerable.from(products).firstOrDefault();
                            productDefer.resolve(product);
                        }, function () {
                            productDefer.reject();
                        });
                } else {
                    productDefer.reject();
                }
            }).catch(function (err) {
                productDefer.reject();
            });
            

            return productDefer.promise;
        }

        this.getProductTemplatesByIdsAsync = function (productTemplatesIds) {
            var self = this;
            var productTemplatesDefer = $q.defer();

            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'ProductTemplate_',
                endkey: 'ProductTemplate_\uffff'
            })
                .then(function (result) {
                    var productTemplates = Enumerable.from(result.rows).where(function (x) {
                        return productTemplatesIds.indexOf(x.doc.data.Id) != -1;
                    }).select("x => x.doc.data").toArray();
                productTemplatesDefer.resolve(productTemplates);
            });

            return productTemplatesDefer.promise;
        }

        this.getProductAttributesForProductIdsAsync = function (productIds) {
            var self = this;
            var productAttributesDefer = $q.defer();

            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'ProductAttribute_',
                endkey: 'ProductAttribute_\uffff'
            })
                .then(function (result) {
                    var productAttributes = Enumerable.from(result.rows).where(function (x) {
                        return productIds.indexOf(x.doc.data.ProductId) != -1;
                    }).select("x => x.doc.data").toArray();
                productAttributesDefer.resolve(productAttributes);
            });

            return productAttributesDefer.promise;
        }

        this.getProductCommentsForProductIdsAsync = function (productIds) {
            var self = this;
            var productCommentsDefer = $q.defer();

            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'ProductComment_',
                endkey: 'ProductComment_\uffff'
            })
                .then(function (result) {
                    var productComments = Enumerable.from(result.rows).where(function (x) {
                        return productIds.indexOf(x.doc.data.Product_Id) != -1;
                    }).select("x => x.doc.data").toArray();
                    productCommentsDefer.resolve(productComments);
                });

            return productCommentsDefer.promise;
        }

        this.getProductAttributeValuesForAttributeIdsAsync = function (attributeIds) {
            var self = this;
            var attributeValuesDefer = $q.defer();

            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'ProductAttributeValue_',
                endkey: 'ProductAttributeValue_\uffff'
            })
            .then(function (result) {
                var productAttributeValues = Enumerable.from(result.rows).where(function (x) {
                    return attributeIds.indexOf(x.doc.data.ProductAttributeId) != -1;
                }).select("x => x.doc.data").toArray();

                attributeValuesDefer.resolve(productAttributeValues);
            });

            return attributeValuesDefer.promise;
        }

        this.getProductIndexByIdsAsync = function (productIds,products) {
            var self = this;
            var productDefer = $q.defer();

            if (!products) {
                $rootScope.dbInstance.allDocs({
                    include_docs: true,
                    startkey: 'Product_',
                    endkey: 'Product_\uffff'
                })
                .then(function (result) {
                    var products = Enumerable.from(result.rows).where(function (x) {
                        return productIds.indexOf(x.doc.data.Id) != -1 && x.doc.data.IsEnabled;
                    }).select("x => x.doc.data").toArray();
                    productDefer.resolve(products);
                });
            } else {
                productDefer.resolve(products);
            }

            return productDefer.promise;
        }

        this.getProductByIdsAsync = function (productIds, productCategories,products) {
            var self = this;
            var productsDefer = $q.defer();
            var storeId = $rootScope.IziBoxConfiguration.StoreId;
            var datasProducts = {};

            if (!(Array.isArray(productIds))){
                var tmpProductIds = [];
                tmpProductIds.push(productIds);
                productIds = tmpProductIds;
            }


            self.getProductIndexByIdsAsync(productIds,products).then(function (result) {
                datasProducts.Products = result;
                productIds = Enumerable.from(datasProducts.Products).select('x => x.Id').toArray();
                var templateIds = Enumerable.from(datasProducts.Products).select('x => x.ProductTemplateId').toArray();

                if (storeId != undefined) {
                    //Load storeinfos for products
                    Enumerable.from(datasProducts.Products).forEach(function (p) {
                        p.StoreInfosObject = Enumerable.from(JSON.parse(p.StoreInfos)).firstOrDefault(function (x) {
                            return x.StoreId != undefined && x.StoreId == storeId;
                        });
                    });

                    //Select only products for storeId
                    datasProducts.Products = Enumerable.from(datasProducts.Products).where(function (x) {
                        return x.StoreInfosObject == undefined || x.StoreInfosObject.StoreId == undefined || (x.StoreInfosObject.StoreId == storeId && x.StoreInfosObject.Enable === true);
                    }).toArray();
                }

                //Update properties for storeId
                if (storeId != undefined) {
                    Enumerable.from(datasProducts.Products).forEach(function (x) {
                        if (x.StoreInfosObject != undefined && x.StoreInfosObject.StoreId != undefined && (x.StoreInfosObject.StoreId == storeId)) {
                            //using Store price
                            if (x.StoreInfosObject.StorePrice != undefined) {
                                x.Price = x.StoreInfosObject.StorePrice;
                            }

                            //Buyable
                            if (x.StoreInfosObject.NotAvailable != undefined) {
                                x.DisableBuyButton = x.StoreInfosObject.NotAvailable;
                            }

                            // Printer_id
                            if (x.StoreInfosObject.Printer_Id != undefined) {
                                x.Printer_Id = x.StoreInfosObject.Printer_Id;
                            }
                        }
                    });
                }

                //Obtains all product template Values
                return self.getProductTemplatesByIdsAsync(templateIds);
            })
            .then(function (productTemplates){

                datasProducts.ProductTemplates = productTemplates;

                //Obtains all VAT Values
                return taxesService.getTaxCategoriesAsync();
            })
                
                .then(function (taxCategories) {
                    datasProducts.TaxCategories = taxCategories;
                    // Obtain all productcomments for products
                    return self.getProductCommentsForProductIdsAsync(productIds);
                })
                .then(function (resProductComments)
                {
                    datasProducts.ProductComments = resProductComments;

                    //Obtains all productattributes for products
                    //return $rootScope.dbInstance.rel.find('ProductAttribute');
                    return self.getProductAttributesForProductIdsAsync(productIds);
                })
                
                .then(function (resProductAttributes) {

                    var productAttributes = Enumerable.from(resProductAttributes)
                        //.where(function (x) { return productIds.indexOf(x.ProductId) != -1; })
                        .orderBy('x=>x.DisplayOrder')
                        .toArray();

                    datasProducts.ProductCategories = productCategories;
                    datasProducts.ProductAttributes = productAttributes;

                    if (productAttributes.length > 0) {

                        var productAttributesIds = Enumerable.from(productAttributes).select('x => x.Id').toArray();

                        //obtains all productAttributeValues for productAttributes
                        //$rootScope.dbInstance.rel.find('ProductAttributeValue')
                        self.getProductAttributeValuesForAttributeIdsAsync(productAttributesIds)
                            .then(function (resProductAttributeValues) {

                            var productAttributeValues = Enumerable.from(resProductAttributeValues)
                                //.where(function (x) { return productAttributesIds.indexOf(x.ProductAttributeId) != -1; })
                                .orderBy('x=>x.DisplayOrder')
                                .toArray();

                            for(var i =0; i<productAttributeValues.length;i++)
                            {
                                item = productAttributeValues[i];
                                if (item.IsPreSelected) {
                                    item.Selected = true;                                    
                                }
                            }

                            datasProducts.ProductAttributeValues = productAttributeValues;

                            var linkedProductIds = Enumerable.from(productAttributeValues).select('x => x.LinkedProductId').toArray();

                            //Obtains all linkedproducts with linkedProductIds
                            //$rootScope.dbInstance.rel.find('Product', linkedProductIds)
                                self.getProductIndexByIdsAsync(linkedProductIds)
                                .then(function (resLinkedProducts) {

                                //datasProducts.LinkedProducts = resLinkedProducts.Products;
                                    datasProducts.LinkedProducts = resLinkedProducts;

                                    return self.getProductCommentsForProductIdsAsync(linkedProductIds);
                                })
                                .then(function (resProductComments) {
                                datasProducts.ProductComments = resProductComments;





                                if (storeId != undefined) {
                                    //Load storeinfos for products
                                    Enumerable.from(datasProducts.LinkedProducts).forEach(function (p) {
                                        p.StoreInfosObject = Enumerable.from(JSON.parse(p.StoreInfos)).firstOrDefault(function (x) {
                                            return x.StoreId != undefined && x.StoreId == storeId;
                                        });
                                    });

                                    //Select only products for storeId
                                    datasProducts.LinkedProducts = Enumerable.from(datasProducts.LinkedProducts).where(function (x) {
                                        return x.StoreInfosObject == undefined || x.StoreInfosObject.StoreId == undefined || (x.StoreInfosObject.StoreId == storeId && x.StoreInfosObject.Enable === true);
                                    }).toArray();
                                }

                                //LinkedProductIds enabled
                                linkedProductIds = Enumerable.from(datasProducts.LinkedProducts).select('x => x.Id').toArray();
                                datasProducts.ProductAttributeValues = Enumerable.from(productAttributeValues)
                                    .where(function (x) { return linkedProductIds.indexOf(x.LinkedProductId) != -1; })
                                    .toArray();

                                var products = self.composeProducts(datasProducts);
                                productsDefer.resolve(products);

                            }, function (errLinkedProducts) { });

                        }, function (errProductAttributeValues) { });
                    } else {
                        var products = self.composeProducts(datasProducts);
                        productsDefer.resolve(products);
                    }
                });

            return productsDefer.promise;
        }

        this.composeProducts = function (values) {
            var storeId = $rootScope.IziBoxConfiguration.StoreId;
            var products = [];

            for (var i = 0; i < values.Products.length; i++) {
                var product = values.Products[i];

                if (values.ProductCategories) {
                    var productCategory = Enumerable.from(values.ProductCategories).firstOrDefault('x => x.ProductId === ' + product.Id);
                    product.ProductCategory = productCategory;
                }

                if (product.ProductTemplateId) {
                    productTemplate = Enumerable.from(values.ProductTemplates).firstOrDefault('x=> x.Id == ' + product.ProductTemplateId);
                    product.ProductTemplate = productTemplate;
                }
                if (values.ProductComments) {
                    productComments = Enumerable.from(values.ProductComments).where('x=> x.Product_Id == ' + product.Id).toArray();
                    product.ProductComments = productComments;
                }

                if (values.ProductAttributes) {
                    var productAttributes = Enumerable.from(values.ProductAttributes).where('x => x.ProductId === ' + product.Id).toArray();
                    product.ProductAttributes = productAttributes;

                    if (values.ProductAttributeValues) {
                        for (var j = 0; j < product.ProductAttributes.length; j++) {
                            var productAttribute = product.ProductAttributes[j];
                            var productAttributeValues = Enumerable.from(values.ProductAttributeValues).where('x => x.ProductAttributeId === ' + productAttribute.Id).toArray();
                            productAttribute.ProductAttributeValues = productAttributeValues;

                            if (values.LinkedProducts) {
                                for (var k = 0; k < productAttribute.ProductAttributeValues.length; k++) {
                                    var productAttributeValue = productAttribute.ProductAttributeValues[k];
                                    var linkedProduct = Enumerable.from(values.LinkedProducts).firstOrDefault('x => x.Id === ' + productAttributeValue.LinkedProductId);
                                    if (values.ProductComments) {
                                        productComments = Enumerable.from(values.ProductComments).where('x=> x.Product_Id == ' + productAttributeValue.LinkedProductId).toArray();
                                        linkedProduct.ProductComments = productComments;
                                    }
                                    productAttributeValue.LinkedProduct = linkedProduct;

                                    //productAttributeValue/LinkedProducts Buyable
                                    if (linkedProduct.StoreInfosObject != undefined && linkedProduct.StoreInfosObject.StoreId != undefined && (linkedProduct.StoreInfosObject.StoreId == storeId)) {
                                        //Buyable
                                        if (linkedProduct.StoreInfosObject.NotAvailable != undefined) {
                                            productAttributeValue.DisableBuyButton = linkedProduct.StoreInfosObject.NotAvailable;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                //product.StoreInfosObject = JSON.parse(product.StoreInfos);

                //Obtains VAT
                if (product.TaxCategoryId) {
                    var taxCategory = Enumerable.from(values.TaxCategories).firstOrDefault('x => x.TaxCategoryId === ' + product.TaxCategoryId);
                    if (taxCategory) {
                        //NB : gestion du provider de taxe
                        //product.VAT = taxCategory.ValueObject;
                        //product.altVAT = taxCategory.altVAT;
                        product.TaxCategory = taxCategory;
                    }
                }

                products.push(product);
            }

            return products;
        }

        this.getProductIdsFromOfferParam = function (offerParam) {
            var productIds = [];

            for (var i = 0; i < offerParam.ProductId.length; i++) {
                var productIdName = offerParam.ProductId[i];
                var idxName = productIdName.indexOf("-");

                if (idxName >= 0) {
                    var productId = parseInt(productIdName.substring(0, idxName));
                    productIds.push(productId);
                }
            }

            return productIds;
        }
    }])