app.service('stockService', function ($rootScope, $http, $q) {
    let bufferStock = [];
    let cacheProductForCategory = {};

    this.initStockBuffer = () => {
        let setUrl = $rootScope.APIBaseURL + "/setBuffer";

        $rootScope.stringifyStoreInfos($rootScope.currentShoppingCart);

        $http.post(setUrl, $rootScope.currentShoppingCart).then((res) => {
            console.log(res);
        }, (err) => {
            console.error(err);
        });
    };

    this.addToStockBuffer = (cartItem, ProductId, Quantity) => {
        let addToStockUrl = $rootScope.APIBaseURL + "/addToBuffer";
        const req = {
            HardwareId: $rootScope.modelPos.hardwareId,
            ProductId,
            Quantity
        };

        $http.post(addToStockUrl, req).then((res) => {
            // Ok on peut ajouter
        }, (err) => {
            if ($rootScope.modelPos.iziboxConnected) {
                // NOK, on annule le dernier ajout
                cartItem.Quantity -= Quantity;
                cartItem.OutOfStock = true;
            }
        });
    };

    this.removeFromStockBuffer = (ProductId, Quantity) => {
        let removeFromStockUrl = $rootScope.APIBaseURL + "/removeFromBuffer";
        const req = {
            HardwareId: $rootScope.modelPos.hardwareId,
            ProductId,
            Quantity
        };
        $http.post(removeFromStockUrl, req);
    };

    this.moveStockBuffer = (fromId, toId) => {
        let moveDefer = $q.defer();
        let moveStockBufferUrl = $rootScope.APIBaseURL + "/moveStockBuffer";
        const req = {
            FromId: fromId,
            ToId: toId
        };
        $http.post(moveStockBufferUrl, req).then(() => {
            moveDefer.resolve();
        });

        return moveDefer.promise;
    };

    this.clearStockBuffer = () => {
        let clearUrl = $rootScope.APIBaseURL + "/clearBuffer/HID_" + $rootScope.modelPos.hardwareId;
        $http.get(clearUrl);
    };

    this.checkStockBufferAsync = () => {

        const checkDefer = $q.defer();
        let checkUrl = $rootScope.APIBaseURL + "/checkBuffer/HID_" + $rootScope.modelPos.hardwareId;

        $http.get(checkUrl).then((res) => {
            let invalidReqs = res.data;

            if (invalidReqs && invalidReqs.length > 0) {

                let invalidProductIds = invalidReqs.map(ir => Number(ir.ProductId));

                let matchingProducts = $rootScope.currentShoppingCart.Items.filter(i => invalidProductIds.includes(i.Product.Id)).map(i => i.Product);

                let msg = "Les produits suivants sont en rupture : \n";
                matchingProducts.forEach((p) => {
                    msg += p.Name + "\n";
                });
                msg += "Veuillez reessayer.";


                checkDefer.reject(msg);

            } else {

                // RESOLVE
                checkDefer.resolve();

            }
        }, (err) => {

            // Si on arrive pas a joindre la box ou qu'on a une erreur sur l'API, on resolve dans le doute
            console.error(err);

            checkDefer.resolve();

        });

        return checkDefer.promise;
    }

    this.getBufferStock = () => {
        return bufferStock;
    };

    this.setBufferStock = (newBufferStock) => {
        bufferStock = newBufferStock;
        $rootScope.$emit("productReload", bufferStock);
    };

    this.fetchBufferStock = () => {
        let fetchUrl = $rootScope.APIBaseURL + "/getBuffer";
        $http.get(fetchUrl).then((res) => {
            //console.log(res.data);
            bufferStock = res.data;
        });
    };

    this.getBufferStockForProductId = (productId) => {
        let ret = 0;
        let matchedProductInBuffer = bufferStock.find(b => b.ProductId == productId);
        if (matchedProductInBuffer) {
            ret = matchedProductInBuffer.Quantity;
        }
        return ret;
    };

    this.initStock = () => {
        const updateStock = (stocks) => {
            let productIdsToUpdate = stocks.map(p => p.ProductId);
            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'Product_',
                endkey: 'Product_\uffff'
            }).then((resProduct) => {
                if (resProduct.rows) {
                    // Selectionne les product a update
                    let products = resProduct.rows;
                    let productToUpdate = products.filter(p => productIdsToUpdate.includes(p.doc.Id));
                    // On update les stock

                    let updatedCategoyIds = [];
                    productToUpdate.forEach(p => {
                        let match = stocks.find(ps => ps.ProductId === p.doc.Id);
                        if (match) {
                            p.doc.StockQuantity = Number.isInteger(match.StockQuantity) ? match.StockQuantity : null;
                            // Si on passe la qté à 0, on supprime le produit du panier
                            if(p.doc.StockQuantity === 0) {
                                $rootScope.$emit("removeItem", p.doc);
                            }

                            delete cacheProductForCategory[p.doc.CategoryId];
                            updatedCategoyIds.push(p.doc.CategoryId);
                        }
                    });

                    $rootScope.$emit("categoryReload", updatedCategoyIds);

                    // Il faut invalider le cache des catégories contenant des produit updaté
                    $rootScope.dbInstance.bulkDocs(productToUpdate.map(p => p.doc)).then((resSave) => {
                        //console.log(resSave);
                    }, (errSave) => {
                        console.error(errSave);
                    });

                    // Save les product
                }
            });
        };
        // Init products with inital state
        $rootScope.dbStock.rel.find("ProductQuantity").then((resPs) => {
            if (resPs.ProductQuantities) {
                updateStock(resPs.ProductQuantities);
            }
        }, (err) => {
            console.error(err);
        });

        // Init Listener
        $rootScope.$on('dbStockChange', (event, args) => {
            console.log({ event }, { args });
            if (args && args.docs) {
                let updatedStocks = args.docs.map(d => d.data);
                updateStock(updatedStocks);
            } else if (args && args.change) {
                let updatedStocks = args.changes.docs.map(d => d.data);
                updateStock(updatedStocks);
            }
        });
    };
});