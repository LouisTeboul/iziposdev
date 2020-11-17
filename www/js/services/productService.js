app.service('productService', function ($rootScope, $q, $timeout, $translate, $uibModal, $mdMedia, taxesService, stockService, posUserService, loyaltyService, paymentService) {
    let self = this;
    let useCache = false;
    let indexedProducts;
    let fuseSearch;

    let currentPossibleMenus = [];
    let currentItems = [];
    this.ReloadSelected = false;

    $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status == "Change" && (args.id.indexOf('Product') == 0 || args.id.indexOf('Category') == 0)) {
            stockService.cacheProductForCategory = {};
            $rootScope.storedCategories = {};
        }
    });

    //Get Product by id - CAUTION: The function do more than it is specified is in name
    $rootScope.getProductByIdsAsync = (productIds, productCategories) => {
        let productsDefer = $q.defer();
        let storeId = $rootScope.IziBoxConfiguration.StoreId;
        let datasProducts = {};

        if (!Array.isArray(productIds)) {
            let tmpProductIds = [];
            tmpProductIds.push(productIds);
            productIds = tmpProductIds;
        }

        self.getProductIndexByIdsAsync(productIds).then((result) => {
            datasProducts.Products = result;
            productIds = Enumerable.from(datasProducts.Products).select(p => p.Id).toArray();
            let templateIds = Enumerable.from(datasProducts.Products).where(p => p.ProductTemplate).select(p => p.ProductTemplate.Id).toArray();

            if (storeId != undefined) {
                //Load storeinfos for products
                // Enumerable.from(datasProducts.Products).forEach((p) => {
                //     p.StoreInfosObject = Enumerable.from(p.StoreInfos).firstOrDefault((x) => {
                //         return x.StoreId != undefined && x.StoreId == storeId;
                //     });
                // });

                //Select only products for storeId
                datasProducts.Products = Enumerable.from(datasProducts.Products).where((x) => {
                    return x.StoreInfos == undefined || x.StoreInfos.StoreId == undefined || (x.StoreInfos.StoreId == storeId && x.StoreInfos.Enable);
                }).toArray();
            }

            //Update properties for storeId
            if (storeId != undefined) {
                Enumerable.from(datasProducts.Products).forEach((x) => {
                    if (x.StoreInfos != undefined && x.StoreInfos.StoreId != undefined && (x.StoreInfos.StoreId == storeId)) {
                        //using Store price
                        if (x.StoreInfos.StorePrice != undefined) {
                            x.Price = x.StoreInfos.StorePrice;
                        }
                        /*

                        // special store price for takeaway
                        if (x.StoreInfosObject.StoreTakeawayPrice != undefined) {
                            x.TakeawayPrice = x.StoreInfosObject.StoreTakeawayPrice;
                        } else {
                            // default to regular price
                            x.TakeawayPrice = x.StoreInfosObject.StorePrice;
                        }

                        // special store price for delivery
                        if (x.StoreInfosObject.StoreDeliveryPrice != undefined) {
                            x.DeliveryPrice = x.StoreInfosObject.StoreDeliveryPrice;
                        } else {
                            // default to regular price
                            x.DeliveryPrice = x.StoreInfosObject.StorePrice;
                        }
                        */

                        //Buyable
                        if (x.StoreInfos.NotAvailable != undefined) {
                            x.DisableBuyButton = x.StoreInfos.NotAvailable;
                        }

                        // Printer_id
                        if (x.StoreInfos.Printer_Id != undefined) {
                            x.Printer_Id = x.StoreInfos.Printer_Id;
                        }
                    }
                });
            }

            // Obtains all product template Values
            return self.getProductTemplatesByIdsAsync(templateIds);
        }).then((productTemplates) => {
            datasProducts.ProductTemplates = productTemplates;

            //Obtains all VAT Values
            return taxesService.getTaxCategoriesAsync();
        }).then((taxCategories) => {
            datasProducts.TaxCategories = taxCategories;
            // Obtain all productcomments for products
            return self.getProductCommentsForProductIdsAsync(productIds);
        }).then((resProductComments) => {
            datasProducts.ProductComments = resProductComments;

            //Obtains all productattributes for products
            //return $rootScope.dbInstance.rel.find('ProductAttribute');
            return self.getProductAttributesForProductIdsAsync(productIds);
        }).then((resProductAttributes) => {
            let productAttributes = Enumerable.from(resProductAttributes).orderBy(pa => pa.DisplayOrder).thenBy(pa => pa.Name).toArray();
            //.where((x) => { return productIds.indexOf(x.ProductId) != -1; })

            datasProducts.ProductCategories = productCategories;
            datasProducts.ProductAttributes = productAttributes;

            if (productAttributes.length > 0) {
                let productAttributesIds = productAttributes.map(x => x.Id);

                //obtains all productAttributeValues for productAttributes
                //$rootScope.dbInstance.rel.find('ProductAttributeValue')
                self.getProductAttributeValuesForAttributeIdsAsync(productAttributesIds).then((resProductAttributeValues) => {
                    let productAttributeValues = Enumerable.from(resProductAttributeValues).orderBy(x => x.DisplayOrder).thenBy(x => x.Name).toArray();
                    //.where((x) => { return productAttributesIds.indexOf(x.ProductAttributeId) != -1; })

                    for (let i = 0; i < productAttributeValues.length; i++) {
                        item = productAttributeValues[i];
                        if (item.IsPreSelected) {
                            item.Selected = true;
                        }
                    }

                    datasProducts.ProductAttributeValues = productAttributeValues;

                    let linkedProductIds = Enumerable.from(productAttributeValues).select('x => x.LinkedProductId').toArray();

                    //Obtains all linkedproducts with linkedProductIds
                    //$rootScope.dbInstance.rel.find('Product', linkedProductIds)
                    self.getProductIndexByIdsAsync(linkedProductIds).then((resLinkedProducts) => {
                        //datasProducts.LinkedProducts = resLinkedProducts.Products;
                        datasProducts.LinkedProducts = resLinkedProducts;

                        return self.getProductCommentsForProductIdsAsync(linkedProductIds);
                    }).then((resProductComments) => {
                        if (datasProducts.ProductComments.length > 0) {
                            let newProductComments = datasProducts.ProductComments.concat(resProductComments);

                            datasProducts.ProductComments = newProductComments;
                        } else {
                            datasProducts.ProductComments = resProductComments;
                        }

                        if (storeId != undefined) {
                            //Load storeinfos for products

                            // Enumerable.from(datasProducts.LinkedProducts).forEach((p) => {
                            //     p.StoreInfosObject = Enumerable.from(p.StoreInfos).firstOrDefault((x) => {
                            //         return x.StoreId != undefined && x.StoreId == storeId;
                            //     });
                            // });

                            //Select only products for storeId
                            datasProducts.LinkedProducts = Enumerable.from(datasProducts.LinkedProducts).where((x) => {
                                return x.StoreInfos == undefined || x.StoreInfos.StoreId == undefined || (x.StoreInfos.StoreId == storeId && x.StoreInfos.Enable);
                            }).toArray();
                        }

                        //LinkedProductIds enabled
                        linkedProductIds = Enumerable.from(datasProducts.LinkedProducts).select('x => x.Id').toArray();
                        datasProducts.ProductAttributeValues = Enumerable.from(productAttributeValues).where((x) => {
                            return linkedProductIds.includes(x.LinkedProductId) || x.LinkedProductId === 0;
                        }).toArray();

                        //datasProducts.ProductAttributeValues = productAttributeValues;
                        //let products = self.composeProducts(datasProducts);

                        productsDefer.resolve(datasProducts.Products);
                    }, (errLinkedProducts) => { });
                }, (errProductAttributeValues) => { });
            } else {
                //let products = self.composeProducts(datasProducts);
                productsDefer.resolve(datasProducts.Products);
            }
        });

        return productsDefer.promise;
    };

    this.indexProducts = (products) => {
        indexedProducts = Enumerable.from(products).select(p => {
            return { Id: p.Id, Name: p.Name, Gtin: p.Gtin };
        }).distinct(p => p.Id).toArray();

        let fuseOptions = {
            shouldSort: true,
            includeScore: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: [
                "Name",
                "Gtin"
            ]
        };
        fuseSearch = new Fuse(indexedProducts, fuseOptions); // "list" is the item array
    };

    this.loadMenus = () => {
        for (let menu of $rootScope.menusData) {
            let newMenu = {
                Id: menu.Id,
                Categories: []
            };
            let errorProduct = true;

            for (let pAttr of menu.ProductAttributes) {
                // TODO : Il faut pouvoir gerer les attribut checkbox, seulement quand le min = max
                // || pAttr.Type === checkbox &&  (pAttr.Min && pAttr.Max && pAttr.Min === pAttr.Max)
                if (pAttr.IsRequired && pAttr.Type === 2) {
                    errorProduct = false;
                    newMenu.Categories.push({
                        Required: true,
                        Products: pAttr.ProductAttributeValues.map(pav => {
                            return pav.LinkedProduct && pav.LinkedProduct.Id ? pav.LinkedProduct.Id : errorProduct = true;
                        })
                    });
                } else if (pAttr.Type === 2) {
                    newMenu.Categories.push({
                        Required: false,
                        Products: pAttr.ProductAttributeValues.map(pav => {
                            return pav.LinkedProduct && pav.LinkedProduct.Id ? pav.LinkedProduct.Id : errorProduct = true;
                        })
                    });
                }
            }
            if (newMenu.Categories.length > 0 && !errorProduct && !$rootScope.menusDataProducts.find(p => p.Id === newMenu.Id)) {
                $rootScope.menusDataProducts.push(newMenu);
            }
        }
    };

    this.searchProductAsync = (searchName) => {
        let productDefer = $q.defer();

        let matchingProducts;

        if (fuseSearch) {
            matchingProducts = fuseSearch.search(searchName);
        }

        if (matchingProducts && matchingProducts.length > 0) {
            let resultEnum = Enumerable.from(matchingProducts);

            let resultMinScore = resultEnum.min(x => x.score);
            let result = resultEnum.where(x => x.score <= resultMinScore).toArray();

            console.log("SearchProduct", result);

            let resultIds = Enumerable.from(result).select(x => x.item.Id).toArray();

            if (resultIds && resultIds.length > 0) {
                //getProductIndexByIdsAsync
                $rootScope.getProductByIdsAsync(resultIds).then((products) => {
                    // On ne garde que les produits qui sont lié a une catégorie publié
                    let productsWithCategory = products.filter(p => (p.CategoryId && p.CategoryId != 0) || p.UsedInLoyalty);

                    let distinctProduct = Enumerable.from(productsWithCategory).distinct(p => p.Id).toArray();
                    productDefer.resolve(distinctProduct);
                }, () => {
                    productDefer.reject();
                });
            } else {
                productDefer.reject();
            }
        } else {
            // Aucun produit ne match
            productDefer.reject();
        }

        return productDefer.promise;
    };

    //Get the product for a category
    this.getProductForCategoryAsync = (categoryId) => {
        let productsDefer = $q.defer();

        //Obtains all productCategories for this category
        if ($rootScope.modelDb.databaseReady) {
            if (useCache && stockService.cacheProductForCategory && stockService.cacheProductForCategory[categoryId]) {
                productsDefer.resolve(stockService.cacheProductForCategory[categoryId]);
            } else {
                let key = padLeft(categoryId, 16);
                $rootScope.dbInstance.allDocs({
                    include_docs: true,
                    startkey: 'Product_' + key + '_',
                    endkey: 'Product_' + key + '_\uffff'
                }).then((result) => {
                    let products = Enumerable.from(result.rows).select((row) => {
                        return row.doc;
                    }).toArray();

                    if (useCache) {
                        if (!stockService.cacheProductForCategory) {
                            stockService.cacheProductForCategory = {};
                        }
                        stockService.cacheProductForCategory[categoryId] = products;
                    }

                    // En multistore, on a plusieurs StoreInfo. On choisit celui qui s'applique par rapport au StoreFilter courant
                    if ($rootScope.EnableMultiStore && $rootScope.storeFilter.Id) {
                        products.map(p => {
                            if (p.StoreInfos) {
                                let relevantStoreInfo = p.StoreInfos.find(si => si.StoreId === $rootScope.storeFilter.Id);
                                if (relevantStoreInfo) {
                                    p.Price = relevantStoreInfo.StorePrice;
                                    p.DisableBuyButton = relevantStoreInfo.DisableBuyButton;
                                    p.IsEnabled = relevantStoreInfo.Enable;
                                } else {
                                    p.IsEnabled = false;
                                }
                            }
                            return p;
                        });
                    }

                    let enabledProducts = products.filter(p => p.IsEnabled);
                    productsDefer.resolve(enabledProducts);
                }).catch((err) => {
                    console.error(err);
                });
            }
        }

        return productsDefer.promise;
    };

    //Get product by gtin - the name is wrong TODO: fix
    this.getProductBySKUAsync = (gtin) => {
        let productDefer = $q.defer();

        let result = fuseSearch.search(gtin).find(r => r.score === 0);
        console.log("SearchGtin", result);

        if (result) {
            //getProductIndexByIdsAsync
            $rootScope.getProductByIdsAsync(result.item.Id).then((products) => {
                let productFind = Enumerable.from(products).firstOrDefault();
                productDefer.resolve(productFind);
            }, () => {
                productDefer.reject();
            });
        } else {
            // swal({
            //     title: "Aucun produit trouvé pour le code barre : " + gtin,
            //     text: "Souhaitez-vous l'affecter ?",
            //     buttons: [$translate.instant("Non"), $translate.instant("Oui")]
            // }).then((confirm) => {
            //     // TODO : Complete ça
            //     if(confirm) {
            //         // Ouvrir une modal avec un champs de recherche
            //         // Qui retourne un Id produit
            //         // Puis appeller une API qui permet d'ajouter le GTIN avec le produit
            //         console.log("added");
            //     } else {
            //         console.log("cancel");
            //     }
            // });

            swal({
                title: "Aucun produit trouvé pour le code barre : " + gtin,
                icon: "error"
            });
            productDefer.reject();
        }

        return productDefer.promise;
    };

    //Get products templates
    this.getProductTemplatesByIdsAsync = (productTemplatesIds) => {
        let productTemplatesDefer = $q.defer();

        $rootScope.dbInstance.allDocs({
            include_docs: true,
            startkey: 'ProductTemplate_',
            endkey: 'ProductTemplate_\uffff'
        }).then((result) => {
            let productTemplates = Enumerable.from(result.rows).where((x) => {
                return productTemplatesIds.indexOf(x.doc.data.Id) != -1;
            }).select("x => x.doc.data").toArray();
            productTemplatesDefer.resolve(productTemplates);
        });

        return productTemplatesDefer.promise;
    };

    //Get product attributes given an array of Ids
    this.getProductAttributesForProductIdsAsync = (productIds) => {
        let productAttributesDefer = $q.defer();

        $rootScope.dbInstance.allDocs({
            include_docs: true,
            startkey: 'ProductAttribute_',
            endkey: 'ProductAttribute_\uffff'
        }).then((result) => {
            let productAttributes = Enumerable.from(result.rows).where((x) => {
                return productIds.indexOf(x.doc.data.ProductId) != -1;
            }).select("x => x.doc.data").toArray();
            productAttributesDefer.resolve(productAttributes);
        });

        return productAttributesDefer.promise;
    };

    //Get product comments
    this.getProductCommentsForProductIdsAsync = (productIds) => {
        let productCommentsDefer = $q.defer();

        $rootScope.dbInstance.allDocs({
            include_docs: true,
            startkey: 'ProductComment_',
            endkey: 'ProductComment_\uffff'
        }).then((result) => {
            let productComments = Enumerable.from(result.rows).where((x) => {
                return productIds.indexOf(x.doc.data.Product_Id) != -1;
            }).select("x => x.doc.data").toArray();
            productCommentsDefer.resolve(productComments);
        });

        return productCommentsDefer.promise;
    };

    //Get the attributes value
    this.getProductAttributeValuesForAttributeIdsAsync = (attributeIds) => {
        let attributeValuesDefer = $q.defer();

        $rootScope.dbInstance.allDocs({
            include_docs: true,
            startkey: 'ProductAttributeValue_',
            endkey: 'ProductAttributeValue_\uffff'
        }).then((result) => {
            let productAttributeValues = Enumerable.from(result.rows).where((x) => {
                return attributeIds.indexOf(x.doc.data.ProductAttributeId) != -1;
            }).select("x => x.doc.data").toArray();

            attributeValuesDefer.resolve(productAttributeValues);
        });

        return attributeValuesDefer.promise;
    };

    //Get Product by Ids
    this.getProductIndexByIdsAsync = (productIds) => {
        let productDefer = $q.defer();

        if ($rootScope.isWindowsContainer) {
            const repoPromise = new Promise((resolve, reject) => {
                window.repository.getProductsByIds(productIds, resolve, reject);
            });
            console.log("Load repo windows");
            repoPromise.then((products) => {
                //console.log(products);
                productDefer.resolve(JSON.parse(products));
            }, (err) => {
                console.error("GetProductsByIds windows error : " + err);
                productDefer.reject(err);
            });
        } else {
            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'Product_',
                endkey: 'Product_\uffff'
            }).then((result) => {
                let products = Enumerable.from(result.rows).where((x) => {
                    return productIds.includes(x.doc.Id) && (x.doc.IsEnabled || x.doc.UsedInLoyalty);
                }).select(d => d.doc).toArray();
                productDefer.resolve(products);
            }, (err) => {
                productDefer.reject(err);
            });
        }

        return productDefer.promise;
    };

    this.incrementQuantity = (cartItem) => {
        // Si il n'y a pas assez de stock pour incrémenter la qté du produit
        if (cartItem.Product.StockQuantity && cartItem.Product.ManageInventoryMethodId === 1 && cartItem.Quantity >= cartItem.Product.StockQuantity) {
            return;
        }

        if (cartItem.Product.OrderMaximumQuantity && cartItem.Quantity >= cartItem.Product.OrderMaximumQuantity) {
            swal({
                title: `Vous avez atteint la quantité maximum (${product.OrderMaximumQuantity}) de ${product.Name} par commande !`,
            });
            return;
        }

        if (!self.tryMatchItem(cartItem.Product)) {
            cartItem.DiscountIT += cartItem.DiscountIT / cartItem.Quantity;
            cartItem.DiscountET += cartItem.DiscountET / cartItem.Quantity;
            cartItem.Quantity++;

            if (cartItem.stockQuantity === undefined && !cartItem.Product.SaleUnit) {
                cartItem.stockQuantity = 1;
            }
            if (!cartItem.Product.SaleUnit) {
                cartItem.stockQuantity++;
            }

            cartItem.Printed = cartItem.PrintedQuantity === cartItem.Quantity;
        }

        self.tryApplyDiscountsCartItem(cartItem);

        loyaltyService.calculateLoyalty();
        if (cartItem.stockQuantity && cartItem.Product.ManageInventoryMethodId === 1) {
            stockService.addToStockBuffer(cartItem, cartItem.Product.Id, 1);
        }
        paymentService.calculateTotal();

        //notify add
        var newItem = {
            ProductId: cartItem.ProductId,
            Product: cartItem.Product,
            Quantity: 1,
            IsFree: cartItem.IsFree,
            PriceIT: cartItem.PriceIT / cartItem.Quantity,
            DiscountIT: cartItem.DiscountIT / cartItem.Quantity,
            hashkey: cartItem.hashkey
        }
        $rootScope.$emit("shoppingCartItemChanged", cartItem);
    };

    this.decrementQuantity = (cartItem) => {
        if ($rootScope.borne || posUserService.isEnable('DELI')) {
            // Check if the user has already selected payments modes
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                paymentService.removeAllPayments();
            }

            // Check if the user has already applied a discount
            if ($rootScope.currentShoppingCart.Discounts && $rootScope.currentShoppingCart.Discounts.length > 0) {
                self.removeAllShoppingCartDiscounts();
            }

            cartItem.DiscountIT -= cartItem.DiscountIT / cartItem.Quantity;
            cartItem.DiscountET -= cartItem.DiscountET / cartItem.Quantity;
            cartItem.Quantity--;
            cartItem.Printed = cartItem.PrintedQuantity === cartItem.Quantity;

            if (cartItem.stockQuantity && cartItem.stockQuantity >= 1) {
                cartItem.stockQuantity--;
            }

            self.tryApplyDiscountsCartItem(cartItem);

            paymentService.calculateTotal();
            loyaltyService.calculateLoyalty();
            if (cartItem.stockQuantity && cartItem.Product.ManageInventoryMethodId === 1) {
                stockService.removeFromStockBuffer(cartItem.Product.Id, 1);
            }

           //notify remove
            var oldItem = {
                ProductId: cartItem.ProductId,
                Product: cartItem.Product,
                Quantity: 1,
                IsFree: cartItem.IsFree,
                PriceIT: cartItem.PriceIT / cartItem.Quantity,
                DiscountIT: cartItem.DiscountIT / cartItem.Quantity,
                hashkey: cartItem.hashkey
            }
            $rootScope.$emit("shoppingCartItemRemoved", oldItem);

            $rootScope.$emit("shoppingCartItemChanged", cartItem);
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    this.editComment = (cartItem) => {
        let modalName = "modals/modalComment.html";
        let size = "bigModal";
        if ($rootScope.borne) {
            modalName = 'modals/modalCommentBorne.html';
        }
        if (!$rootScope.borneVertical) {
            size = "smallModal";
        }
        if (!$mdMedia('min-width: 800px')) {
            size = "smallModalH";
        }

        let modalInstance = $uibModal.open({
            templateUrl: modalName,
            controller: 'ModalCommentController',
            windowClass: 'centeredModals ' + size,
            resolve: {
                obj: () => {
                    return cartItem;
                }
            },
            backdrop: 'static'
        });
        modalInstance.result.then((comment) => {
            if (comment.length > 0) {
                //on coupe la ligne si elle n'a pas de commentaire et que la quantité est supérieure à 1
                if ((!cartItem.Comment || cartItem.Comment.length == 0) && cartItem.Quantity > 1 && !cartItem.Product.SaleUnit) {
                    cartItem.Quantity--;
                    cartItem.PrintedQuantity--;
                    let newCartItem = clone(cartItem);
                    newCartItem.Quantity = 1;
                    newCartItem.Comment = comment;

                    // Et on reset les printcount du produit
                    newCartItem.Printed = false;
                    newCartItem.PrintCount = 0;
                    newCartItem.PrintedQuantity = 0;

                    // On genere une nouvelle hashkey
                    newCartItem.hashkey = objectHash(cartItem);

                    self.addCartItem(newCartItem);
                } else {
                    cartItem.Comment = comment;
                    // Et on reset les printcount du produit
                    cartItem.Printed = false;
                    cartItem.PrintCount = 0;
                    cartItem.PrintedQuantity = 0;

                    // On genere une nouvelle hashkey
                    cartItem.hashkey = objectHash(cartItem);
                }
            } else {
                cartItem.Comment = undefined;
                // Et on reset les printcount du produit
                cartItem.Printed = false;
                cartItem.PrintCount = 0;
                cartItem.PrintedQuantity = 0;

                // On genere une nouvelle hashkey
                cartItem.hashkey = objectHash(cartItem);
            }
        }, () => { });
    };

    this.editQuantity = (item) => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPickQuantity.html',
            controller: 'ModalPickQuantityController',
            size: 'sm',
            resolve: {
                product: () => {
                    return item;
                }
            },
            backdrop: 'static'
        });
        modalInstance.result.then((newQuantity) => {
            item.Quantity = newQuantity;
            paymentService.calculateTotal();
        });
    };

    this.editMenu = (cartItem) => {
        this.ReloadSelected = false;
        $rootScope.addToCart(cartItem.Product, false, cartItem.Offer, cartItem.IsFree);

        if (cartItem.Quantity > 1) {
            self.decrementQuantity(cartItem);
        } else {
            self.removeItem(cartItem);
        }
    };

    //Add a product to the ticket
    this.addCartItem = (cartItem) => {
        $rootScope.currentShoppingCart.Items.push(cartItem);
        $timeout(() => {
            paymentService.calculateTotal();
            if (!$rootScope.$$phase) {
                $rootScope.$apply();
            }
            $rootScope.$emit("shoppingCartItemAdded", cartItem);
        });
    };

    // Used to transfer item from a ticket to another when splitting ticket
    this.addItemTo = (shoppingCartTo, shoppingCartFrom, cartItem, qty) => {
        if (!qty) {
            if (Number.isInteger(cartItem.Quantity) || cartItem.Quantity >= 1) {
                qty = 1;
            } else {
                qty = cartItem.Quantity;
            }
        }
        let item = clone(cartItem);
        /*
        let ratio = qty / item.Quantity;
        item.DiscountIT = ratio * clone(cartItem.DiscountIT);
        item.DiscountET = ratio * clone(cartItem.DiscountET);

        cartItem.DiscountIT -= item.DiscountIT;
        cartItem.DiscountET -= item.DiscountET;
        */
        item.Quantity = qty;
        item.DiscountIT = 0;
        item.DiscountET = 0;
        shoppingCartTo.Items.push(item);
        cartItem.Quantity -= qty;

        if (cartItem.Quantity <= 0 && shoppingCartFrom) {
            self.removeItemFrom({
                shoppingCart: shoppingCartFrom,
                cartItem,
                setToZero: false,
                forceRemove: true
            });
            item.DiscountIT = cartItem.DiscountIT;
            item.DiscountET = cartItem.DiscountET;
        }
        if (shoppingCartFrom) {
            paymentService.calculateTotalFor(shoppingCartFrom);
        }
        paymentService.calculateTotalFor(shoppingCartTo);
    };

    this.addToCartBySku = (sku) => {
        self.getProductBySKUAsync(sku).then((product) => {
            if (product) {
                $rootScope.addToCart(product);
            } else {
                swal({
                    title: $translate.instant("Produit introuvable")
                });
            }
        });
    };

    this.resetCurrentItems = () => {
        currentItems = [];
    }

    //Associe a un item les formules qui lui correspond et crée eventuellement un formules à partir des item présent dans le currentShoppingCart
    this.tryMatchItem = (item) => {
        try {
            let currentMatchedProducts = [];

            if ( /*item.ProductTemplate && item.ProductTemplate.ViewPath !== "ProductTemplate.Simple" || */ !$rootScope.IziBoxConfiguration.EnableAutoMatch || !$rootScope.currentShoppingCart) {
                return false;
            }

            if (!item.ProductAttributes || item.ProductAttributes.length === 0) {
                currentItems.push(item.Id);
            }

            const checkMenuCompleted = (menu) => {
                currentMatchedProducts = [];
                for (let cat of menu.Categories) {
                    if (cat.Required) {
                        if (!cat.Products.some(p => currentItems.includes(p))) {
                            return false;
                        } else {
                            currentMatchedProducts.push(cat.Products.find(p => currentItems.includes(p)));
                        }
                    } else {
                        if (!cat.Products.some(p => currentItems.includes(p))) {
                            currentMatchedProducts.push(null);
                        } else {
                            currentMatchedProducts.push(cat.Products.find(p => currentItems.includes(p)));
                        }
                    }
                }
                return true;
            };
            if ($rootScope.menusDataProducts.length === 0) {
                return false;
            }

            //Get matching menus for item
            const allMatchingMenuForItem = $rootScope.menusDataProducts.filter(menu => menu.Categories.some(cat => cat.Products && cat.Products.includes(item.Id)));

            //Filter duplicate menus
            currentPossibleMenus = currentPossibleMenus.concat(allMatchingMenuForItem.filter(item => currentPossibleMenus.indexOf(item) === -1));

            //Filter menus missing items
            currentPossibleMenus = currentPossibleMenus.filter(menu => $rootScope.currentShoppingCart.Items.length >= menu.Categories.filter(cat => cat.Required).length);

            //Check if a menu is completed
            for (let menu of currentPossibleMenus) {
                if (checkMenuCompleted(menu)) {
                    let attributesPriceSum = 0;
                    for (let product of currentMatchedProducts) {
                        if (product) {
                            let cartProduct = $rootScope.currentShoppingCart.Items.find(item => item.Product && item.Product.Id === product || item.Id === product);
                            if (cartProduct) {
                                attributesPriceSum += cartProduct.Product.Price;
                            } else {
                                break;
                            }
                        }
                    }

                    let cartMenu = angular.copy($rootScope.menusData.find(m => m.Id === menu.Id));

                    if (cartMenu) {
                        let menuPriceAfterAdjustment = cartMenu.Price;

                        for (let i = 0; i < currentMatchedProducts.length; i++) {
                            if (currentMatchedProducts[i]) {
                                let matchedProductId = currentMatchedProducts[i];

                                cartMenu.ProductAttributes[i].ProductAttributeValues.forEach((item) => {
                                    // On Déselectionne toutes les valeurs d'attribut
                                    item.Selected = false;
                                });

                                let finalProduct = cartMenu.ProductAttributes[i].ProductAttributeValues.find(pav => pav.LinkedProduct.Id === currentMatchedProducts[i]);
                                let currentShoppingCartItem = $rootScope.currentShoppingCart.Items.find(i => i.Product && i.Product.Id === matchedProductId || i.ProductId === matchedProductId);

                                cartMenu.ProductAttributes[i].Step = currentShoppingCartItem.Step;

                                finalProduct.Selected = true;
                                finalProduct.Step = currentShoppingCartItem.Step;

                                menuPriceAfterAdjustment += finalProduct.PriceAdjustment;
                            }
                        }

                        //Create cartMenu and add it to shoppingCart
                        if (attributesPriceSum >= menuPriceAfterAdjustment) {
                            for (let removedProduct of currentMatchedProducts) {
                                if (removedProduct) {
                                    self.removeOneByProductIdFrom($rootScope.currentShoppingCart, removedProduct);
                                    if (currentItems.indexOf(removedProduct) !== -1) {
                                        currentItems.splice(currentItems.indexOf(removedProduct), 1);
                                    }
                                }
                            }

                            console.log("AddToCart : ", Date.now());
                            // On set le prix du produit
                            cartMenu.Price = menuPriceAfterAdjustment;
                            $rootScope.addToCart(cartMenu, true);
                            console.log("Menu created : ", Date.now());
                            return true;
                        }
                    } else {
                        break;
                    }
                }
            }
            return false;
        } catch (ex) {
            console.error("Erreur lors du matching : ", ex);
            return false;
        }
    };

    this.addAnimation = (idProduct) => {
        if ($rootScope.borne) {
            let productBox = document.querySelector("#pb" + idProduct);

            let productPicture = document.querySelector("#img" + idProduct);

            let toElem = document.querySelector(".catalog");
            

            let afterElement = document.createElement("div");

            let fromElem = productPicture || productBox;

            if (toElem && afterElement && fromElem) {
                if (productPicture) {
                    // Si on a une picture
                    let positionCurrentElem = productPicture.getBoundingClientRect();
                    afterElement.id = "temp";
                    afterElement.style.position = "absolute";
                    afterElement.style.zIndex = "1000";
                    afterElement.style.top = positionCurrentElem.top + "px";
                    afterElement.style.left = positionCurrentElem.left + "px";
                    afterElement.style.height = positionCurrentElem.height + "px";
                    afterElement.style.top = positionCurrentElem.top + "px";
                    afterElement.style.width = positionCurrentElem.width + "px";

                    afterElement.className = "animatePicture";
                    afterElement.innerHTML = productPicture.innerHTML;
                    let imgElement = afterElement.querySelector("img");
                    if (imgElement) {
                        imgElement.style.width = positionCurrentElem.width + "px";
                        imgElement.style.height = positionCurrentElem.height + "px";
                    }

                    toElem.appendChild(afterElement);
                    setTimeout(() => {
                        toElem.removeChild(afterElement);
                    }, 700);
                } else {
                    // Si pas de picture
                    let positionCurrentElem = productBox.getBoundingClientRect();
                    afterElement.id = "box";
                    afterElement.style.position = "absolute";
                    afterElement.style.zIndex = "1000";
                    afterElement.style.top = positionCurrentElem.top + "px";
                    afterElement.style.left = positionCurrentElem.left + "px";
                    afterElement.style.height = positionCurrentElem.height + "px";
                    afterElement.style.top = positionCurrentElem.top + "px";
                    afterElement.style.width = positionCurrentElem.width + "px";
                    afterElement.className = "animateProductBox";
                    afterElement.innerHTML = productBox.innerHTML;

                   toElem.appendChild(afterElement);
                    setTimeout(() => {
                        toElem.removeChild(afterElement);
                    }, 700); 
                }
            }
        }
        //affiche la div caché et drag en bas avec animation
    };

    //Remove a line from the ticket
    this.removeItem = (cartItem, forceRemove) => {
        if ($rootScope.borne || posUserService.isEnable('DELI') || forceRemove) {
            // Check if the user has already selected payments modes
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                paymentService.removeAllPayments();
            }

            if (cartItem.Offer) {
                let matchingOffer = $rootScope.currentShoppingCart.Offer.OfferObjectId === cartItem.Offer.OfferObjectId && $rootScope.currentShoppingCart.Offer.OfferClassId === cartItem.Offer.OfferClassId;
                if (matchingOffer) {
                    delete $rootScope.currentShoppingCart.Offer;
                }
            }

            // Check if the user has already applied a discount
            if ($rootScope.currentShoppingCart.Discounts && $rootScope.currentShoppingCart.Discounts.length > 0) {
                self.removeAllShoppingCartDiscounts();
            }

            // TODO : Supprime les menu lié uniquement a cet item
            if (currentItems.indexOf(cartItem.Product.Id) !== -1) {
                currentItems.splice(currentItems.indexOf(cartItem.Product.Id), 1);
            }

            const idxToRemove = $rootScope.currentShoppingCart.Items.indexOf(cartItem);
            if (idxToRemove > -1 || $rootScope.currentShoppingCart.ParentTicket) {
                //If already printed in step mode we're setting the quantity to zero
                //Or if this is a valid cancel negative ticket
                cartItem.Printed = false;
                if ($rootScope.IziBoxConfiguration.StepEnabled && cartItem.PrintCount) {
                    cartItem.Quantity = 0;
                    $rootScope.$emit("shoppingCartItemChanged", cartItem);
                } else {
                    $rootScope.currentShoppingCart.Items.splice(idxToRemove, 1);
                    $rootScope.$emit("shoppingCartItemRemoved", cartItem);
                }

                stockService.removeFromStockBuffer(cartItem.Product.Id, 99999);
                $rootScope.currentShoppingCart.ItemsChanged = true;
                paymentService.calculateTotal(false, true, false);
                loyaltyService.calculateLoyalty();
            }

            if (!cartItem.IsFree) {
                cartItem.Quantity = 0;
                self.tryApplyDiscountsCartItem(cartItem);
            }
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    //Decremente ou supprime un produit d'un shoppingCart donné
    this.removeOneByProductIdFrom = (shoppingCart, productId) => {
        const cartItem = Enumerable.from(shoppingCart.Items).lastOrDefault(i => i.Product.Id === productId);
        if (cartItem) {
            if (cartItem.Quantity > 1) {
                self.decrementQuantity(cartItem);
            } else {
                self.removeItemFrom({
                    shoppingCart,
                    cartItem,
                    setToZero: false
                });
            }
        }
    };

    // Remove a line from the ticket
    this.removeItemFrom = ({
        shoppingCart,
        cartItem,
        setToZero = false,
        forceRemove = false,
        truncate = false,
        calculateDiscount = true
    } = {}) => {
        const idxToRemove = shoppingCart.Items.indexOf(cartItem);

        if (idxToRemove > -1 || shoppingCart.ParentTicket) {
            //If already printed in step mode we're setting the quantity to zero
            //Or if this is a valid cancel negative ticket
            if (setToZero || $rootScope.IziBoxConfiguration.StepEnabled && cartItem.Printed && !forceRemove) {
                cartItem.Quantity = 0;
                $rootScope.$emit("shoppingCartItemChanged", cartItem);
            } else {
                shoppingCart.Items.splice(idxToRemove, 1);
                $rootScope.$emit("shoppingCartItemRemoved", cartItem);
            }
            paymentService.calculateTotal(truncate, calculateDiscount);
            loyaltyService.calculateLoyalty();
        }
    };

    this.removeAllShoppingCartDiscounts = () => {
        // on supprime tous les discount sauf lié au split/merge
        $rootScope.currentShoppingCart.Discounts.filter(d => d.IsMergedPartiallyPaidDiscount);

        for (let i of $rootScope.currentShoppingCart.Items) {
            i.DiscountIT = 0;
            i.DiscountET = 0;
        }
        paymentService.calculateTotal();
        loyaltyService.calculateLoyalty();
        $rootScope.$emit("shoppingCartDiscountRemoved");
    };

    this.tryApplyDiscountsCartItem = (cartItem) => {
        if (cartItem.PriceIT > 0 && !cartItem.IsFree) {
            self.getDiscountsForProductAsync(cartItem.Product).then((discounts) => {
                let selectedDiscount = Enumerable.from(discounts).firstOrDefault();

                if (selectedDiscount) {
                    switch (selectedDiscount.DiscountType) {
                        case "AddProductOfCategoryToShoppingCart":
                        case "AddProductToShoppingCart":
                            applyProductDiscount(selectedDiscount, cartItem);
                            break;
                    }
                }
            });
        }
    };

    const applyProductDiscount = (discount, cartItem) => {
        try {
            if (discount && discount.DiscountRequirements) {
                let requirement = discount.DiscountRequirements[0];
                let requiredQty = parseInt(requirement.RestrictedProductIds.split(':')[1]);

                let cartItemQuantity = 0;

                let countUsed = $rootScope.currentShoppingCart.Items.filter(i => i.DiscountId === discount.Id).length;
                if (discount.LimitationTimes != -1 && countUsed >= discount.LimitationTimes && cartItem.Quantity > 0) {
                    return;
                }

                $rootScope.currentShoppingCart.Items.forEach((item) => {
                    if (!item.IsFree && (discount.DiscountType === "AddProductOfCategoryToShoppingCart" && cartItem.Product.CategoryId === item.Product.CategoryId ||
                        discount.DiscountType === "AddProductToShoppingCart" && cartItem.Product.Id === item.Product.Id)) {
                        cartItemQuantity += item.Quantity;
                    }
                });

                let applyDiscountMultiplicator = Math.floor(cartItemQuantity / requiredQty);
                if (discount.LimitationTimes != -1) {
                    applyDiscountMultiplicator = Math.min(applyDiscountMultiplicator, discount.LimitationTimes);
                }

                let discountedLines = Enumerable.from($rootScope.currentShoppingCart.Items).where(i => i.DiscountId === discount.Id).toArray();
                let discountAppliedCount = 0;

                discountedLines.forEach((line) => {
                    discountAppliedCount += line.Quantity;
                });

                let offerToAdd = applyDiscountMultiplicator - discountAppliedCount;

                if (offerToAdd > 0) {
                    for (let i = 0; i < offerToAdd; i++) {
                        if (discount.DiscountType === "AddProductOfCategoryToShoppingCart") {
                            self.discountOneProductInCategory(discount, cartItem.Product.CategoryId);
                        } else {
                            // Si le produit en question est une formule
                            if (cartItem.Product.ProductAttributes.length > 0) {
                                let item = $rootScope.addToCart(cartItem.Product, false, undefined, true, true);
                                item.DiscountId = discount.Id;
                            } else {
                                let item = $rootScope.addToCart(cartItem.Product, true, undefined, true);
                                item.DiscountId = discount.Id;
                            }
                        }
                    }
                } else if (offerToAdd < 0) {
                    for (let j = 0; j < Math.abs(offerToAdd); j++) {
                        self.removeItem(discountedLines[j], true);
                    }
                }
            }
        } catch (error) {
            console.error("addProductDiscount error -- " + error);
        }
    };

    this.discountOneProductInCategory = (discount, categoryId) => {
        let modal = "modals/modalOneProductInCategory.html";
        if ($rootScope.borne) {
            modal = 'modals/modalSelectProductOfferBorne.html';
        }
        let size = "bigModal";
        if (!$rootScope.borneVertical) {
            size = "smallModal";
        }
        if (!$mdMedia('min-width: 800px')) {
            size = "smallModalH";
        }

        let modalInstance = $uibModal.open({
            templateUrl: modal,
            controller: 'ModalOneProductInCategoryController',
            windowClass: 'centeredModals ' + size,
            size: 'lg',
            backdrop: false,
            resolve: {
                offerOneProductInCategory: undefined,
                discountOneProductInCategory: () => {
                    return categoryId;
                }
            }
        });

        modalInstance.result.then((product) => {
            // Si le produit en question est une formule
            if (product.ProductAttributes.length > 0) {
                let item = $rootScope.addToCart(product, false, undefined, true, true);
                item.DiscountId = discount.Id;
            } else {
                let item = $rootScope.addToCart(product, true, undefined, true);
                item.DiscountId = discount.Id;
            }
        });
    };

    //Get discounts for product
    this.getDiscountsForProductAsync = (product) => {
        let self = this;
        let resultDefer = $q.defer();

        if ($rootScope.modelDb.dataReady) {
            $rootScope.dbInstance.rel.find('Discount').then((results) => {
                let discounts = Enumerable.from(results.Discounts).where((d) => {
                    return d.AppliedToCategories.indexOf(product.CategoryId) !== -1 || d.AppliedToProducts.indexOf(product.Id) !== -1;
                }).toArray();

                if (discounts) {
                    let discountsEnumerator = Enumerable.from(discounts);

                    discountsEnumerator.forEach((discount) => {
                        switch (discount.DiscountType) {
                            case "AddProductOfCategoryToShoppingCart":
                                discount.Priority = 1;
                                break;
                            case "AddProductToShoppingCart":
                                discount.Priority = 2;
                                break;
                            default:
                                discount.Priority = 99;
                                break;
                        }
                    });

                    discounts = discountsEnumerator.orderBy(d => d.Priority).toArray();

                    resultDefer.resolve(discounts);
                } else {
                    resultDefer.reject("No discounts for this product !");
                }
            }, (err) => {
                resultDefer.reject(err);
            });
        } else {
            resultDefer.reject("Database isn't ready !");
        }

        return resultDefer.promise;
    };

    this.splitSCByPrice = (shoppingCartLeft, shoppingCartRight, item, amount) => {
        let hasQuantity = false;
        if (item.stockQuantity && item.stockQuantity !== 0) {
            hasQuantity = true;
        }

        //First
        let clonedItem = clone(item);

        clonedItem.PriceIT = truncator(amount, 2);
        clonedItem.PriceET = truncator(item.PriceET * amount / item.PriceIT, 2);
        clonedItem.Quantity = truncator(item.Quantity * amount / item.PriceIT, 8);
        clonedItem.DiscountIT = truncator(item.DiscountIT * amount / item.PriceIT, 8);
        clonedItem.DiscountET = truncator(item.DiscountET * amount / item.PriceIT, 8);

        clonedItem.isPartSplitItem = true;
        clonedItem.stockQuantity = 0;

        shoppingCartRight.Items.push(clonedItem);

        //Second
        let updatedItem = clone(item);

        updatedItem.PriceIT = truncator(item.PriceIT - clonedItem.PriceIT, 2);
        updatedItem.PriceET = truncator(item.PriceET - clonedItem.PriceET, 2);
        updatedItem.Quantity = truncator(item.Quantity - clonedItem.Quantity, 8);
        updatedItem.DiscountIT = truncator(item.DiscountIT - clonedItem.DiscountIT, 8);
        updatedItem.DiscountET = truncator(item.DiscountET - clonedItem.DiscountET, 8);

        updatedItem.isPartSplitItem = true;

        if (hasQuantity) {
            updatedItem.stockQuantity = Number.isInteger(item.stockQuantity) ? item.stockQuantity : null;
        }

        shoppingCartLeft.Items.push(updatedItem);

        self.removeItemFrom({
            shoppingCart: shoppingCartLeft,
            cartItem: item,
            truncate: true,
            calculateDiscount: false,
            forceRemove: true
        });
    };

    this.splitSCByParts = (shoppingCart, cartItem, divider) => {
        let totalQuantity = cartItem.Quantity;
        let totalPrice = cartItem.PriceIT + cartItem.DiscountIT;
        let hasQuantity = false;
        if (cartItem.stockQuantity && cartItem.stockQuantity !== 0) {
            hasQuantity = true;
        }

        while (divider > 0) {
            let clonedItem = clone(cartItem);

            let price = truncator((cartItem.PriceIT + cartItem.DiscountIT) / divider, 2);
            let discountIT = truncator(cartItem.DiscountIT / divider, 2);
            let discountET = truncator(cartItem.DiscountET / divider, 2);
            let quantity = truncator(price / totalPrice, 8);

            cartItem.PriceIT = truncator(cartItem.PriceIT - (price - discountIT), 2);
            cartItem.DiscountIT = truncator(cartItem.DiscountIT - discountIT, 2);
            cartItem.DiscountET = truncator(cartItem.DiscountET - discountET, 2);

            clonedItem.DiscountIT = discountIT;
            clonedItem.DiscountET = discountET;
            clonedItem.Quantity = truncator(quantity * totalQuantity, 8);
            clonedItem.PriceIT = price;
            clonedItem.isPartSplitItem = true;

            if (divider === 1 && hasQuantity && cartItem.stockQuantity) {
                clonedItem.stockQuantity = Number.isInteger(cartItem.stockQuantity) ? cartItem.stockQuantity : null;
            } else {
                clonedItem.stockQuantity = 0;
            }

            shoppingCart.Items.push(clonedItem);
            divider--;
        }

        self.removeItemFrom({
            shoppingCart,
            cartItem,
            truncate: true,
            calculateDiscount: false,
            forceRemove: true
        });
    };

    this.createDividedShoppingCartsAsync = (shoppingCart, divider) => {
        let dividedDefer = $q.defer();

        if (divider > 1 && Number.isInteger(divider)) {
            shoppingCart.Id = shoppingCart.OrderId || shoppingCart.Timestamp;
            shoppingCart.origShoppingCart = clone(shoppingCart);
            shoppingCart.splitAmountPaid = 0;
            shoppingCart.isDividedShoppingCart = true;
            shoppingCart.shouldTruncate = true;
            // Clear all PayementModes
            shoppingCart.PaymentModes = [];
            shoppingCart.BalanceUpdate = undefined;

            for (let discount of shoppingCart.Discounts) {
                if (!discount.IsPercent) {
                    discount.Value /= divider;
                }
            }

            let originalSC = clone(shoppingCart);
            let first = true;
            let count = 1;
            while (divider > 0) {
                let clonedSC = clone(originalSC);

                clonedSC = paymentService.NewTimeStampForClonedShoppingCart(clonedSC, count);

                for (let i = 0; i < clonedSC.Items.length; i++) {
                    let totalQuantity = originalSC.Items[i].Quantity;
                    let price = truncator(originalSC.Items[i].PriceIT / divider, 2);
                    let discountIT = truncator(originalSC.Items[i].DiscountIT / divider, 2);
                    let discountET = truncator(originalSC.Items[i].DiscountET / divider, 2);
                    let quantity = null;
                    if (shoppingCart.Items[i].PriceIT === 0) {
                        quantity = truncator(shoppingCart.Items[i].Quantity / divider, 8);
                    } else {
                        quantity = truncator(price / shoppingCart.Items[i].PriceIT, 8);
                    }

                    originalSC.Items[i].PriceIT -= price;
                    originalSC.Items[i].DiscountIT -= discountIT;
                    originalSC.Items[i].DiscountET -= discountET;

                    if (first) {
                        shoppingCart.Items[i].DiscountIT = discountIT;
                        shoppingCart.Items[i].DiscountET = discountET;
                        shoppingCart.Items[i].Quantity = quantity * totalQuantity;
                        shoppingCart.Items[i].isPartSplitItem = true;
                        shoppingCart.Items[i].index = i;
                        shoppingCart.Items[i].stockQuantity = 0;
                        shoppingCart.Items[i].hashkey = objectHash(clonedSC.Items[i]);
                    } else {
                        clonedSC.Items[i].DiscountIT = discountIT;
                        clonedSC.Items[i].DiscountET = discountET;
                        clonedSC.Items[i].Quantity = quantity * totalQuantity;
                        clonedSC.Items[i].isPartSplitItem = true;
                        clonedSC.Items[i].index = i;
                        clonedSC.Items[i].hashkey = objectHash(clonedSC.Items[i]);

                        if (divider === 1 && originalSC.Items[i].stockQuantity) {
                            clonedSC.Items[i].stockQuantity = Number.isInteger(originalSC.Items[i].stockQuantity) ? originalSC.Items[i].stockQuantity : null;
                        } else {
                            clonedSC.Items[i].stockQuantity = 0;
                        }
                    }
                }
                clonedSC.shouldTruncate = false;
                paymentService.calculateTotalFor(clonedSC, true);
                if (!first) {
                    shoppingCart.shoppingCartQueue.push(clonedSC);
                } else {
                    first = false;
                }

                count++;
                divider--;
            }

            shoppingCart = paymentService.NewTimeStampForClonedShoppingCart(shoppingCart, count, true);

            paymentService.calculateTotalFor(shoppingCart, true);
            dividedDefer.resolve();
        } else {
            dividedDefer.reject("Diviseur decimal ou inferieur ou egal a 1");
        }

        return dividedDefer.promise;
    };
});