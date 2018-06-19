app.service('taxesService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        var cacheTaxProvider = undefined;
        var cacheTaxCategories = undefined;
        var cacheTaxDisplay = undefined;
        var cacheIsPricesIncludedTax = undefined;
        var self = this;

        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status == "Change" && args.id.indexOf('Setting') == 0) {
                cacheTaxProvider = undefined;
                cacheTaxCategories = undefined;
                cacheTaxDisplay = undefined;
                cacheIsPricesIncludedTax = undefined;
                // Reset cache
                self.initTaxCache();
            }
        });

        this.initTaxCache = function () {
            self.getTaxProviderAsync().then(function (results) {
                cacheTaxProvider = results;
                self.getTaxCategoriesAsync().then((res) => {
                    cacheTaxCategories = res
                });
            });
            self.getTaxDisplayTypeAsync().then((res) => {
                cacheTaxDisplay = res;
            });
            self.getPricesIncludedTaxAsync().then((res) => {
                cacheIsPricesIncludedTax = res;
            });
        };

        /**
         * Regrou
         * @param input
         * @returns {Array}
         */
        this.groupTaxDetail = function (input) {
            var taxDetails = [];

            if (input) {
                Enumerable.from(input).forEach(function (itemTaxDetail) {
                    var existingTaxDetail = Enumerable.from(taxDetails).firstOrDefault(function (taxD) {
                        return taxD.TaxCode == itemTaxDetail.TaxCode && taxD.TaxRate == itemTaxDetail.TaxRate;
                    });

                    // We're adding the tax amount
                    if (existingTaxDetail) {
                        existingTaxDetail.TaxAmount += itemTaxDetail.TaxAmount;
                        existingTaxDetail.PriceIT = roundValue(existingTaxDetail.PriceIT + itemTaxDetail.PriceIT);
                        existingTaxDetail.PriceET = roundValue(existingTaxDetail.PriceET + itemTaxDetail.PriceET);
                    } else {
                        taxDetails.push(clone(itemTaxDetail));
                    }
                });
            }
            return taxDetails;

        };

        //#region Données TAXE -> PouchDB

        /**
         * Gets if the product price includes tax or no
         * */
        this.getPricesIncludedTaxAsync = function () {
            var pricesIncludedTaxDefer = $q.defer();

            if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
                if (cacheIsPricesIncludedTax) {
                    pricesIncludedTaxDefer.resolve(cacheIsPricesIncludedTax);
                } else {
                    $rootScope.dbInstance.rel.find('Setting').then(function (results) {
                        var pricesIncludedTax = Enumerable.from(results.Settings).firstOrDefault("s => s.Name.indexOf('taxsettings.pricesincludetax') == 0");
                        if (pricesIncludedTax) {
                            cacheIsPricesIncludedTax = JSON.parse(pricesIncludedTax.Value.toLowerCase());
                            pricesIncludedTaxDefer.resolve(cacheIsPricesIncludedTax);
                        } else {
                            cacheIsPricesIncludedTax = true;
                            pricesIncludedTaxDefer.resolve(cacheIsPricesIncludedTax);
                        }
                    }, function (err) {
                        pricesIncludedTaxDefer.reject(err);
                    });
                }
            } else {
                pricesIncludedTaxDefer.reject("Database isn't ready !");
            }
            return pricesIncludedTaxDefer.promise;
        };


        /**
         * Gets if the product price is display with or without taxes
         *@deprecated
         */
        this.getTaxDisplayTypeAsync = function () {
            var taxDisplayDefer = $q.defer();

            if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
                if (cacheTaxDisplay) {
                    taxDisplayDefer.resolve(cacheTaxDisplay);
                } else {
                    $rootScope.dbInstance.rel.find('Setting').then(function (results) {
                        var taxDisplay = Enumerable.from(results.Settings).firstOrDefault("s => s.Name.indexOf('taxsettings.taxdisplaytype') == 0");
                        if (taxDisplay) {
                            cacheTaxDisplay = taxDisplay.Value;
                            taxDisplayDefer.resolve(taxDisplay.Value);
                        } else {
                            taxDisplayDefer.reject("Setting taxDisplay not found !");
                        }
                    }, function (err) {
                        taxDisplayDefer.reject(err);
                    });
                }
            } else {
                taxDisplayDefer.reject("Database isn't ready !");
            }
            return taxDisplayDefer.promise;
        };


        this.getTaxDisplayType = function () {
            return cacheTaxDisplay;
        };

        /**
         * Get the tax provider - we can have different tax provider ex : quebec, france
         */
        this.getTaxProviderAsync = function () {
            var taxProviderDefer = $q.defer();

            if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
                if (cacheTaxProvider) {
                    taxProviderDefer.resolve(cacheTaxProvider);
                } else {
                    $rootScope.dbInstance.rel.find('Setting').then(function (results) {
                        var taxProvider = Enumerable.from(results.Settings).firstOrDefault("s => s.Name.indexOf('taxsettings.activetaxprovidersystemname') == 0");
                        if (taxProvider) {
                            cacheTaxProvider = taxProvider.Value;
                            taxProviderDefer.resolve(taxProvider.Value);

                        } else {
                            taxProviderDefer.reject("Setting taxProvider not found !");
                        }
                    }, function (err) {
                        taxProviderDefer.reject(err);
                    });
                }
            } else {
                taxProviderDefer.reject("Database isn't ready !");
            }
            return taxProviderDefer.promise;
        };

        /**
         * Get taxes for the french system
         */
        var getTaxFixedRate = function (taxCategoriesDefer) {
            var taxCategories = [];

            $rootScope.dbInstance.rel.find('Setting').then(function (results) {
                var taxCategorySettings = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.fixedrate.taxcategoryid') == 0").toArray();
                if (taxCategorySettings) {
                    for (var i = 0; i < taxCategorySettings.length; i++) {
                        var taxCategorySetting = taxCategorySettings[i];
                        var newTaxCategory = {};
                        newTaxCategory.VAT = JSON.parse(taxCategorySetting.Value);
                        newTaxCategory.TaxCategoryId = parseInt(taxCategorySetting.Name.replace('tax.taxprovider.fixedrate.taxcategoryid', ''));
                        // Searching altVAT
                        var altSetting = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.fixedalternaterate.taxcategoryid" + newTaxCategory.TaxCategoryId + "') == 0").firstOrDefault();
                        if (altSetting) newTaxCategory.altVAT = JSON.parse(altSetting.Value);
                        else newTaxCategory.altVAT = 0;

                        taxCategories.push(newTaxCategory);
                    }
                    cacheTaxCategories = taxCategories;
                    taxCategoriesDefer.resolve(taxCategories);
                } else {
                    taxCategoriesDefer.reject("Setting not found !");
                }
            }, function (err) {
                taxCategoriesDefer.reject(err);
            });
        };

        /**
         * Get taxes for the canadian system
         */
        var getTaxQuebec = function (taxCategoriesDefer) {
            var taxCategories = [];

            $rootScope.dbInstance.rel.find('Setting').then(function (results) {
                var taxCategorySettings = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.quebectps.taxcategoryid') == 0").toArray();
                if (taxCategorySettings) {
                    for (var i = 0; i < taxCategorySettings.length; i++) {
                        var taxCategorySetting = taxCategorySettings[i];
                        var newTaxCategory = {};
                        newTaxCategory.TPSValue = JSON.parse(taxCategorySetting.Value);
                        newTaxCategory.TaxCategoryId = parseInt(taxCategorySetting.Name.replace('tax.taxprovider.quebectps.taxcategoryid', ''));
                        // Searching tvq
                        var tvqSetting = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.quebectvq.taxcategoryid" + newTaxCategory.TaxCategoryId + "') == 0").firstOrDefault();
                        if (tvqSetting) newTaxCategory.TVQValue = JSON.parse(tvqSetting.Value);
                        else newTaxCategory.TVQValue = 0;

                        taxCategories.push(newTaxCategory);
                    }
                    cacheTaxCategories = taxCategories;
                    taxCategoriesDefer.resolve(taxCategories);
                } else {
                    taxCategoriesDefer.reject("Setting not found !");
                }
            }, function (err) {
                taxCategoriesDefer.reject(err);
            });
        };

        /** Gets the different tax categories according to the tax system */
        this.getTaxCategoriesAsync = function () {
            var taxCategoriesDefer = $q.defer();

            if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
                if (cacheTaxCategories) {
                    taxCategoriesDefer.resolve(cacheTaxCategories);
                } else {

                    this.getTaxProviderAsync().then(function (displayType) {
                        switch (displayType) {
                            case "Tax.FixedRate":
                                getTaxFixedRate(taxCategoriesDefer);
                                break;
                            case "Tax.Quebec":
                                getTaxQuebec(taxCategoriesDefer);
                                break;
                        }
                    }, function () {
                        // If provider undefined we're using the Fixed Rate provider by default
                        getTaxFixedRate(taxCategoriesDefer);
                    });
                }
            } else {
                taxCategoriesDefer.reject("Database isn't ready !");
            }
            return taxCategoriesDefer.promise;
        };
        //#endregion


        //#region Calculs Taxe

        /** Get a list of tax for a given tax system */
        var getTaxDetailLine = function (taxCategoryId, taxCode, taxRate, taxAmount, priceIT, priceET) {
            var taxDetail = {
                TaxCategoryId: taxCategoryId,
                TaxCode: taxCode,
                TaxRate: taxRate,
                TaxAmount: taxAmount,
                PriceIT: priceIT,
                PriceET: priceET
            };
            return taxDetail;
        };


        // TODO: The code below doesn't belong in this file 
        // It should be in the shoppingcartcontroller

        var calculateTax = function (deliveryType, taxCategory, price, quantity, discountIT = 0, discountET = 0) {
            var priceIT = 0;
            var priceET = 0;
            var taxDetails = [];


            // Calculate item's tax
            switch (cacheTaxProvider) {
                case "Tax.FixedRate":
                    //If the item is for a takeaway, we use alt TVA
                    var taxRate = deliveryType == DeliveryTypes.FORHERE ? taxCategory.VAT : taxCategory.altVAT;

                    // Calculate excluding tax price
                    if (!cacheIsPricesIncludedTax) {
                        if (quantity != 0) {
                            priceET = price - (discountET / quantity);
                            priceIT = ETtoIT(priceET, taxRate);
                        } else {
                            priceET = 0;
                            priceIT = 0;
                        }
                    }

                    // Calculate price including tax
                    else {
                        if (quantity != 0) {
                            priceIT = price - (discountIT / quantity);
                            priceET = ITtoET(priceIT, taxRate);
                        } else {
                            priceET = 0;
                            priceIT = 0;
                        }
                    }
                    // Add the result to the tax list
                    // ATTENTION au round value
                    var newTaxDetail = getTaxDetailLine(taxCategory.TaxCategoryId, "TVA", taxRate, roundValue(priceIT - priceET) * quantity, priceIT * quantity, priceET * quantity);
                    taxDetails.push(newTaxDetail);

                    break;

                case "Tax.Quebec":
                    // Tps is the provincial tax and tvq is the quebec tax
                    var tpsAmount, tvqAmount;
                    // Price is without taxes
                    if (!cacheIsPricesIncludedTax) {

                        //console.log('Price ET : ', price - (discountET / quantity));
                        priceET = Math.round10((price - (discountET / quantity)), -5);

                        //console.log('tpsAmount : ', getTaxValue(priceET, taxCategory.TPSValue));
                        tpsAmount = Math.round10(getTaxValue(priceET, taxCategory.TPSValue), -5);

                        //console.log('tvqAmount : ', getTaxValue(priceET, taxCategory.TVQValue));
                        tvqAmount = Math.round10(getTaxValue(priceET, taxCategory.TVQValue), -5);

                        //console.log('Price IT : ', priceET + tpsAmount + tvqAmount);
                        priceIT = Math.round10((priceET + tpsAmount + tvqAmount), -5);
                    }

                    // Price includes taxes
                    else {
                        priceIT = (price - (discountIT / quantity));
                        priceET = ITtoET(priceIT, taxCategory.TPSValue + taxCategory.TVQValue);
                        tpsAmount = getTaxValue(priceET, taxCategory.TPSValue);
                        tvqAmount = getTaxValue(priceET, taxCategory.TVQValue);
                    }
                    // Adding the amount of taxes to the tax list
                    var newTaxDetailTPS = getTaxDetailLine(taxCategory.TaxCategoryId, "TPS", taxCategory.TPSValue, tpsAmount * quantity, priceIT * quantity, priceET * quantity);
                    var newTaxDetailTVQ = getTaxDetailLine(taxCategory.TaxCategoryId, "TVQ", taxCategory.TVQValue, tvqAmount * quantity, priceIT * quantity, priceET * quantity);
                    taxDetails.push(newTaxDetailTPS);
                    taxDetails.push(newTaxDetailTVQ);
                    break;
            }

            var taxValues = {
                // Quantity calculation
                priceIT: (priceIT * quantity),
                priceET: (priceET * quantity),

                // Add tax list to the cart item
                taxDetails: taxDetails
            };

            return taxValues;
        };

        var getTaxRate = function (taxCategory, deliveryType = 0) {
            var taxRate = 0;
            switch (cacheTaxProvider) {
                case "Tax.FixedRate":
                    taxRate = deliveryType == DeliveryTypes.FORHERE ? taxCategory.VAT : taxCategory.altVAT;
                    break;

                case "Tax.Quebec":
                    taxRate = taxCategory.TPSValue + taxCategory.TVQValue;
                    break;
            }
            return taxRate;
        };

        /** Do the necessary calculation for a cart item - discount, sum, taxes .... */
        /**
         * @param shoppingCart
         * @param cartItem
         * @param deliveryType
         */
        var calculateCartItemTotal = function (shoppingCart, cartItem, deliveryType) {

            // If item's Discount property are not initialized, we set them to 0
            // to avoid NaN errors
            if (isNaN(cartItem.DiscountET))
                cartItem.DiscountET = 0;
            if (isNaN(cartItem.DiscountIT))
                cartItem.DiscountIT = 0;

            cartItem.PriceIT = 0;
            cartItem.PriceET = 0;
            cartItem.TaxDetails = [];

            //cartItem.Quantity = roundValue(cartItem.Quantity );


            // If the item is flagged as free
            if (cartItem.IsFree) {
                priceIT = 0;
                priceET = 0;

                var taxResult = undefined;
                /*
                switch (deliveryType) {
                    case 0:
                        taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);
                        break;
                    case 1:
                        taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.TakeawayPrice || cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);
                        break;
                    case 2:
                        taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.DeliveryPrice || cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);
                        break;
                    default:
                        taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);
                        break;
                }*/
                taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);

                // Add tax list to the cart item, We have to set the normal TaxDetails
                cartItem.TaxDetails = taxResult.taxDetails;
            }
            else {
                // Calculate item's tax
                var cartItemPrice = 0;

                switch (cacheTaxProvider) {
                    case "Tax.FixedRate":
                        switch (deliveryType) {
                            case 0:
                                cartItemPrice = cartItem.Product.Price;
                                break;
                            case 1:
                                cartItemPrice = cartItem.Product.TakeawayPrice || cartItem.Product.Price;
                                break;
                            case 2:
                                cartItemPrice = cartItem.Product.DeliveryPrice || cartItem.Product.Price;
                                break;
                            default:
                                cartItemPrice = cartItem.Product.Price;
                                break;
                        }
                        break;

                    case "Tax.Quebec":
                        // Tps is the provincial tax and tvq is the quebec tax
                        var tpsAmount, tvqAmount;

                        // Price is without taxes
                        if (!cacheIsPricesIncludedTax) {
                            /*
                            switch (deliveryType) {
                                case 0:
                                    cartItemPrice = cartItem.Product.Price;
                                    break;
                                case 1:
                                    cartItemPrice = cartItem.Product.TakeawayPrice || cartItem.Product.Price;
                                    break;
                                case 2:
                                    cartItemPrice = cartItem.Product.DeliveryPrice || cartItem.Product.Price;
                                    break;
                                default:
                                    cartItemPrice = cartItem.Product.Price;
                                    break;
                            }*/
                            cartItemPrice = cartItem.Product.Price;

                        }
                        // Price includes taxes
                        else {
                            /*
                            switch (deliveryType) {
                                case 0:
                                    cartItemPrice = cartItem.Product.Price;
                                    break;
                                case 1:
                                    cartItemPrice = cartItem.Product.TakeawayPrice || cartItem.Product.Price;
                                    break;
                                case 2:
                                    cartItemPrice = cartItem.Product.DeliveryPrice || cartItem.Product.Price;
                                    break;
                                default:
                                    cartItemPrice = cartItem.Product.Price;
                                    break;
                            }
                            */
                            cartItemPrice = cartItem.Product.Price;

                        }
                        break;
                }

                var isDispatchedTax = cartItem.Attributes && cartItem.Attributes.length > 0;
                var taxToUse = cartItem.Product.TaxCategory;

                //Formule
                if (isDispatchedTax) {
                    switch (cacheTaxProvider) {
                        case "Tax.FixedRate" :
                            //Récupération des produits liés
                            var linkedProducts = [];
                            var totalLinkedProducts = 0;
                            var highestTax = taxToUse;

                            var productAttributesEnumerator = Enumerable.from(cartItem.Product.ProductAttributes);

                            cartItem.Attributes.forEach(function (attr) {
                                var productAttribute = productAttributesEnumerator.firstOrDefault(function (pAttr) {
                                    return attr.ProductAttributeId == pAttr.Id;
                                });

                                if (productAttribute) {
                                    var productAttributeValue = Enumerable.from(productAttribute.ProductAttributeValues).firstOrDefault(function (pAttrValue) {
                                        return pAttrValue.Id == attr.ProductAttributeValueId;
                                    });

                                    if (productAttributeValue && productAttributeValue.LinkedProduct) {

                                        //On stocke la taxe la plus élevée qui sera appliquée si le prix d'un attribut est 0
                                        if (productAttributeValue.LinkedProduct.TaxCategory && getTaxRate(productAttributeValue.LinkedProduct.TaxCategory, shoppingCart.DeliveryType) > getTaxRate(highestTax, shoppingCart.DeliveryType)) {
                                            highestTax = productAttributeValue.LinkedProduct.TaxCategory;
                                        }

                                        if (productAttributeValue.LinkedProduct.Price == 0) {
                                            isDispatchedTax = false;
                                        }

                                        totalLinkedProducts += productAttributeValue.LinkedProduct.Price;
                                        linkedProducts.push(productAttributeValue.LinkedProduct);
                                    }
                                }
                            });

                            if (!isDispatchedTax) {
                                taxToUse = highestTax;
                            }


                            if (totalLinkedProducts > 0 || !isDispatchedTax) {
                                Enumerable.from(linkedProducts).forEach(function (linkedProduct) {
                                    var priceToUse = (linkedProduct.Price * cartItemPrice) / totalLinkedProducts;
                                    var discountToUseIT = cartItem.DiscountIT / linkedProducts.length;
                                    var discountToUseET = cartItem.DiscountET / linkedProducts.length;

                                    var taxResult = calculateTax(deliveryType, linkedProduct.TaxCategory, priceToUse, cartItem.Quantity, discountToUseIT, discountToUseET);

                                    // On récupère les taxes de l'article
                                    Enumerable.from(taxResult.taxDetails).forEach(function (itemTaxDetail) {
                                        var existingTaxDetail = Enumerable.from(cartItem.TaxDetails).firstOrDefault(function (taxD) {
                                            return taxD.TaxCategoryId == itemTaxDetail.TaxCategoryId &&
                                                taxD.TaxCode == itemTaxDetail.TaxCode &&
                                                taxD.TaxRate == itemTaxDetail.TaxRate;
                                        });

                                        // On ajoute le montant de la taxe
                                        if (existingTaxDetail) {
                                            existingTaxDetail.TaxAmount = roundValue(existingTaxDetail.TaxAmount + itemTaxDetail.TaxAmount);
                                            existingTaxDetail.PriceIT = roundValue(existingTaxDetail.PriceIT + itemTaxDetail.PriceIT);
                                            existingTaxDetail.PriceET = roundValue(existingTaxDetail.PriceET + itemTaxDetail.PriceET);

                                        } else {
                                            cartItem.TaxDetails.push(clone(itemTaxDetail));
                                        }
                                    });

                                    cartItem.PriceIT += taxResult.priceIT;
                                    cartItem.PriceET += taxResult.priceET;

                                });
                            } else {
                                //si le total des produits liés est à 0 on effectue le calcul de taxe comme pour un produit normal.
                                isDispatchedTax = false;
                                taxToUse = highestTax;
                            }
                            break;
                        case "Tax.Quebec":
                            var cartItemPrice = cartItem.Product.Price;
                            Enumerable.from(cartItem).forEach(function (attr) {

                                cartItemPrice += attr.PriceAdjustment ? attr.PriceAdjustment : 0;
                            });
                            var taxResult = calculateTax(deliveryType, taxToUse, cartItemPrice, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);
                            // Quantity calculation
                            cartItem.PriceIT = taxResult.priceIT;
                            cartItem.PriceET = taxResult.priceET;

                            // Add tax list to the cart item
                            cartItem.TaxDetails = taxResult.taxDetails;
                            break;
                    }
                }
                //Produit normal
                if (!isDispatchedTax) {
                    var taxResult = calculateTax(deliveryType, taxToUse, cartItemPrice, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);

                    // Quantity calculation
                    cartItem.PriceIT = taxResult.priceIT;
                    cartItem.PriceET = taxResult.priceET;

                    // Add tax list to the cart item
                    cartItem.TaxDetails = taxResult.taxDetails;
                }
            }
        };

        /**
         * Do the necessary calculation for a given ShoppingCart - discount, sum, taxes ....
         * */
        this.calculateTotalFor = function (shoppingCart) {
            if (shoppingCart) {
                console.log("Calcul du shopping cart ", shoppingCart);
                //On suppose que le shopping cart n'a pas d'item split
                shoppingCart.hasSplitItems = false;

                var taxDetails = [];
                var totalET = 0;
                var totalIT = 0;
                var totalQty = 0;
                var shipping = shoppingCart.Shipping;
                var discount = Enumerable.from(shoppingCart.Discounts).firstOrDefault();


                //TODO : passer le calcul à la ligne
                //On calcule la remise si il y en a -- on le calcule aussi pour chaque montant de taxe

                // If the shopping cart has a global discount attached to it
                if (discount) {
                    discount.Total = 0;

                    // Calc discount on each item
                    // And add it on top of existing discount
                    Enumerable.from(shoppingCart.Items).forEach(function (i) {

                        var taxRate = getTaxRate(i.TaxCategory, shoppingCart.DeliveryType);

                        if (discount.IsPercent) {

                            if (cacheIsPricesIncludedTax) {
                                //Product price représente le prix toutes taxes
                                i.DiscountIT = i.Product.Price * i.Quantity * (discount.Value / 100);
                            } else {
                                //Product price represente le prix hors taxe. On deduit le prix toute taxes a partir du taxRate
                                i.DiscountIT = ETtoIT(i.Product.Price, taxRate) * i.Quantity * (discount.Value / 100);
                            }

                        } else {
                            i.DiscountIT = discount.Value / shoppingCart.Items.length;
                        }
                        i.DiscountET = ITtoET(i.DiscountIT, taxRate);
                        discount.Total += i.DiscountIT;
                    });
                }

                // Pour chaque article
                Enumerable.from(shoppingCart.Items).forEach(function (i, index) {
                    //Si on rencontre un item avec un quantité decimale
                    if (!Number.isInteger(i.Quantity)) {
                        //On flag le shopping cart
                        shoppingCart.hasSplitItems = true;
                    }
                    totalQty += i.Quantity;

                    i.LineNumber = index + 1;

                    // On calcul le prix 
                    calculateCartItemTotal(shoppingCart, i, shoppingCart.DeliveryType);

                    // On ajoute le total TTC et HT de la ligne au montant total
                    // Check for discount on line only if there is no discount on receipt

                    totalIT = roundValue(totalIT + i.PriceIT);
                    totalET = roundValue(totalET + i.PriceET);

                    // On récupère les taxes de l'article
                    Enumerable.from(i.TaxDetails).forEach(function (itemTaxDetail) {
                        var existingTaxDetail = Enumerable.from(taxDetails).firstOrDefault(function (taxD) {
                            return taxD.TaxCategoryId == itemTaxDetail.TaxCategoryId &&
                                taxD.TaxCode == itemTaxDetail.TaxCode &&
                                taxD.TaxRate == itemTaxDetail.TaxRate;
                        });

                        // On ajoute le montant de la taxe 
                        if (existingTaxDetail) {
                            existingTaxDetail.TaxAmount = roundValue(existingTaxDetail.TaxAmount + itemTaxDetail.TaxAmount);
                            existingTaxDetail.PriceIT = roundValue(existingTaxDetail.PriceIT + itemTaxDetail.PriceIT);
                            existingTaxDetail.PriceET = roundValue(existingTaxDetail.PriceET + itemTaxDetail.PriceET);
                        } else {
                            taxDetails.push(clone(itemTaxDetail));
                        }
                    });

                });

                if (shipping) {
                    Enumerable.from(shipping.TaxDetails).forEach(function (shippingTaxDetail) {
                        totalIT = roundValue(totalIT + shippingTaxDetail.PriceIT);
                        totalET = roundValue(totalET + shippingTaxDetail.PriceET);

                        var existingTaxDetail = Enumerable.from(taxDetails).firstOrDefault(function (taxD) {
                            return taxD.TaxCategoryId == shippingTaxDetail.TaxCategoryId &&
                                taxD.TaxCode == shippingTaxDetail.TaxCode &&
                                taxD.TaxRate == shippingTaxDetail.TaxRate;
                        });

                        // On ajoute le montant de la taxe
                        if (existingTaxDetail) {
                            existingTaxDetail.TaxAmount = roundValue(existingTaxDetail.TaxAmount + shippingTaxDetail.TaxAmount);
                            existingTaxDetail.PriceIT = roundValue(existingTaxDetail.PriceIT + shippingTaxDetail.PriceIT);
                            existingTaxDetail.PriceET = roundValue(existingTaxDetail.PriceET + shippingTaxDetail.PriceET);
                        } else {
                            taxDetails.push(clone(shippingTaxDetail));
                        }
                    });
                }

                totalIT = roundValue(totalIT);


                //On calcule les totaux du ticket en fonction du mode de paiement
                var totalPayment = 0;

                Enumerable.from(shoppingCart.PaymentModes).forEach(function (p) {
                    totalPayment = totalPayment + p.Total;
                });

                //Add balanceUpdate value
                if (shoppingCart.BalanceUpdate) {
                    totalPayment = totalPayment + shoppingCart.BalanceUpdate.UpdateValue;
                }

                //On calcule le rendu monnaie
                var residue = parseFloat(totalIT.toFixed(2)) - totalPayment;
                var repaid = 0;
                var credit = 0;

                if (residue < 0) {

                    //Pas de rendue monnaie sur les tickets restaurants ou avoir 
                    var hasCreditPaymentMode = Enumerable.from(shoppingCart.PaymentModes).any('p=>p.PaymentType == PaymentType.TICKETRESTAURANT || p.PaymentType == PaymentType.AVOIR');
                    var hasRepaidPaymentMode = Enumerable.from(shoppingCart.PaymentModes).any('p=>p.PaymentType != PaymentType.TICKETRESTAURANT && p.PaymentType != PaymentType.AVOIR');

                    if (hasCreditPaymentMode && !hasRepaidPaymentMode) {
                        credit = residue * -1;
                    } else {
                        repaid = residue * -1;
                    }
                    residue = 0;
                }

                // Formatting the ticket


                shoppingCart.Total = parseFloat(totalIT.toFixed(2));
                shoppingCart.TotalET = parseFloat(totalET.toFixed(2));
                shoppingCart.TotalPayment = parseFloat(totalPayment.toFixed(2));
                shoppingCart.Residue = parseFloat(residue.toFixed(2));
                shoppingCart.Repaid = parseFloat(repaid.toFixed(2));
                shoppingCart.Credit = parseFloat(credit.toFixed(2));
                shoppingCart.TaxDetails = taxDetails;
                shoppingCart.ExcludedTax = !cacheIsPricesIncludedTax;
                shoppingCart.Digits = ROUND_NB_DIGIT;
            }
        }
        //#endregion
    }]);