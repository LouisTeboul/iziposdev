app.service('taxesService', function ($rootScope, $q, $http) {
    let cacheTaxProvider = undefined;
    let cacheTaxCategories = undefined;
    let cacheTaxDisplay = undefined;
    let cacheTaxCategoriesLabel = undefined;
    let cacheIsPricesIncludedTax = undefined;
    const current = this;

    $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status === "Change" && args.id.indexOf('Setting') === 0) {
            cacheTaxProvider = undefined;
            cacheTaxCategories = undefined;
            cacheTaxDisplay = undefined;
            cacheIsPricesIncludedTax = undefined;
            // Reset cache
            current.initTaxCache();
        }
    });

    this.initTaxCache = () => {
        current.getTaxProviderAsync().then((results) => {
            cacheTaxProvider = results;
            current.getTaxCategoriesAsync().then((res) => {
                cacheTaxCategories = res;
            });
        });
        current.getTaxDisplayTypeAsync().then((res) => {
            cacheTaxDisplay = res;
        });
        current.getPricesIncludedTaxAsync().then((res) => {
            cacheIsPricesIncludedTax = res;
        });

        current.getTaxCategoriesLabelsAsync().then((res) => {
            cacheTaxCategoriesLabel = res;
        });
    };

    this.groupTaxDetail = (input) => {
        let taxDetails = [];

        if (input) {
            Enumerable.from(input).forEach((itemTaxDetail) => {
                let existingTaxDetail = Enumerable.from(taxDetails).firstOrDefault((taxD) => {
                    return taxD.TaxCode == itemTaxDetail.TaxCode && taxD.TaxRate == itemTaxDetail.TaxRate;
                });

                // We're adding the tax amount
                if (existingTaxDetail) {
                    existingTaxDetail.TaxAmountCustomerDisplay += itemTaxDetail.TaxAmountCustomerDisplay;
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

    //Gets if the product price includes tax or no
    this.getPricesIncludedTaxAsync = () => {
        let pricesIncludedTaxDefer = $q.defer();

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            if (cacheIsPricesIncludedTax) {
                pricesIncludedTaxDefer.resolve(cacheIsPricesIncludedTax);
            } else {
                $rootScope.dbInstance.rel.find('Setting').then((results) => {
                    let pricesIncludedTax = Enumerable.from(results.Settings).firstOrDefault("s => s.Name.indexOf('taxsettings.pricesincludetax') == 0");
                    if (pricesIncludedTax) {
                        cacheIsPricesIncludedTax = JSON.parse(pricesIncludedTax.Value.toLowerCase());
                        pricesIncludedTaxDefer.resolve(cacheIsPricesIncludedTax);
                    } else {
                        cacheIsPricesIncludedTax = true;
                        pricesIncludedTaxDefer.resolve(cacheIsPricesIncludedTax);
                    }
                }, (err) => {
                    pricesIncludedTaxDefer.reject(err);
                });
            }
        } else {
            pricesIncludedTaxDefer.reject("Database isn't ready !");
        }
        return pricesIncludedTaxDefer.promise;
    };

    //Gets if the product price is display with or without taxes
    this.getTaxDisplayTypeAsync = () => {
        let taxDisplayDefer = $q.defer();

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            if (cacheTaxDisplay) {
                taxDisplayDefer.resolve(cacheTaxDisplay);
            } else {
                $rootScope.dbInstance.rel.find('Setting').then((results) => {
                    let taxDisplay = Enumerable.from(results.Settings).firstOrDefault("s => s.Name.indexOf('taxsettings.taxdisplaytype') == 0");
                    if (taxDisplay) {
                        cacheTaxDisplay = taxDisplay.Value;
                        taxDisplayDefer.resolve(taxDisplay.Value);
                    } else {
                        taxDisplayDefer.reject("Setting taxDisplay not found !");
                    }
                }, (err) => {
                    taxDisplayDefer.reject(err);
                });
            }
        } else {
            taxDisplayDefer.reject("Database isn't ready !");
        }
        return taxDisplayDefer.promise;
    };

    this.getTaxDisplayType = () => {
        return cacheTaxDisplay;
    };

    //Get the tax provider - we can have different tax provider ex : quebec, france
    this.getTaxProviderAsync = () => {
        let taxProviderDefer = $q.defer();

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            if (cacheTaxProvider) {
                taxProviderDefer.resolve(cacheTaxProvider);
            } else {
                $rootScope.dbInstance.rel.find('Setting').then((results) => {
                    let taxProvider = Enumerable.from(results.Settings).firstOrDefault("s => s.Name.indexOf('taxsettings.activetaxprovidersystemname') == 0");

                    if (taxProvider) {
                        cacheTaxProvider = taxProvider.Value;
                        taxProviderDefer.resolve(taxProvider.Value);
                    } else {
                        taxProviderDefer.reject("Setting taxProvider not found !");
                    }
                }, (err) => {
                    taxProviderDefer.reject(err);
                });
            }
        } else {
            taxProviderDefer.reject("Database isn't ready !");
        }
        return taxProviderDefer.promise;
    };

    //Get taxes for the french system
    const getTaxFixedRate = (taxCategoriesDefer) => {
        let taxCategories = [];

        $rootScope.dbInstance.rel.find('Setting').then((results) => {
            let taxCategorySettings = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.fixedrate.taxcategoryid') == 0").toArray();
            if (taxCategorySettings) {
                for (let i = 0; i < taxCategorySettings.length; i++) {
                    let taxCategorySetting = taxCategorySettings[i];
                    let newTaxCategory = {};
                    newTaxCategory.VAT = JSON.parse(taxCategorySetting.Value);
                    newTaxCategory.TaxCategoryId = parseInt(taxCategorySetting.Name.replace('tax.taxprovider.fixedrate.taxcategoryid', ''));
                    // Searching altVAT
                    let altSetting = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.fixedalternaterate.taxcategoryid" + newTaxCategory.TaxCategoryId + "') == 0").firstOrDefault();
                    if (altSetting) {
                        newTaxCategory.AltVAT = JSON.parse(altSetting.Value);
                    } else {
                        newTaxCategory.AltVAT = 0;
                    }

                    taxCategories.push(newTaxCategory);
                }
                cacheTaxCategories = taxCategories;
                taxCategoriesDefer.resolve(taxCategories);
            } else {
                taxCategoriesDefer.reject("Setting not found !");
            }
        }, (err) => {
            taxCategoriesDefer.reject(err);
        });
    };

    //Get taxes for the canadian system
    const getTaxQuebec = (taxCategoriesDefer) => {
        let taxCategories = [];

        $rootScope.dbInstance.rel.find('Setting').then((results) => {
            let taxCategorySettings = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.quebectps.taxcategoryid') == 0").toArray();
            if (taxCategorySettings) {
                for (let i = 0; i < taxCategorySettings.length; i++) {
                    let taxCategorySetting = taxCategorySettings[i];
                    let newTaxCategory = {};
                    newTaxCategory.TPSValue = JSON.parse(taxCategorySetting.Value);
                    newTaxCategory.TaxCategoryId = parseInt(taxCategorySetting.Name.replace('tax.taxprovider.quebectps.taxcategoryid', ''));
                    // Searching tvq
                    let tvqSetting = Enumerable.from(results.Settings).where("s => s.Name.indexOf('tax.taxprovider.quebectvq.taxcategoryid" + newTaxCategory.TaxCategoryId + "') == 0").firstOrDefault();
                    if (tvqSetting) {
                        newTaxCategory.TVQValue = JSON.parse(tvqSetting.Value);
                    } else {
                        newTaxCategory.TVQValue = 0;
                    }

                    taxCategories.push(newTaxCategory);
                }
                cacheTaxCategories = taxCategories;
                taxCategoriesDefer.resolve(taxCategories);
            } else {
                taxCategoriesDefer.reject("Setting not found !");
            }
        }, (err) => {
            taxCategoriesDefer.reject(err);
        });
    };

    //Gets the different tax categories according to the tax system
    this.getTaxCategoriesAsync = () => {
        const taxCategoriesDefer = $q.defer();

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            if (cacheTaxCategories) {
                taxCategoriesDefer.resolve(cacheTaxCategories);
            } else {
                this.getTaxProviderAsync().then((displayType) => {
                    switch (displayType) {
                        case "Tax.FixedRate":
                            getTaxFixedRate(taxCategoriesDefer);
                            break;
                        case "Tax.Quebec":
                            getTaxQuebec(taxCategoriesDefer);
                            break;
                    }
                }, (err) => {
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

    //Get a list of tax for a given tax system
    const getTaxDetailLine = (taxCategoryId, taxCode, taxRate, taxAmount, priceIT, priceET, isFree) => {
        let taxDetail = {
            TaxCategoryId: taxCategoryId,
            TaxCode: taxCode,
            TaxRate: taxRate,
            TaxAmount: taxAmount,
            TaxAmountCustomerDisplay: isFree ? 0 : taxAmount,
            PriceIT: priceIT,
            PriceET: priceET
        };
        return taxDetail;
    };

    // TODO: The code below doesn't belong in this file
    // It should be in the shoppingcartcontroller
    const calculateTax = (deliveryType, taxCategory, price, quantity, discountIT = 0, discountET = 0, isFree = false, truncate = false) => {
        let priceIT = 0;
        let priceET = 0;
        let priceITLine = 0;
        let priceETLine = 0;
        let taxDetails = [];

        // Calculate item's tax
        let taxCategoryId = taxCategory.TaxCategoryId || taxCategory.Id;

        switch (cacheTaxProvider) {
            case "Tax.FixedRate":
                //If the item is for a takeaway, we use alt TVA
                let taxRate = Number(deliveryType) === DeliveryType.FORHERE ? taxCategory.VAT : taxCategory.AltVAT || taxCategory.AltVAT;

                // Calculate excluding tax price
                if (!cacheIsPricesIncludedTax) {
                    if (quantity !== 0) {
                        priceET = price - discountET / quantity;
                        priceIT = ETtoIT(priceET, taxRate);
                    } else {
                        priceET = 0;
                        priceIT = 0;
                    }
                } else { // Calculate price including tax
                    if (quantity !== 0) {
                        priceIT = price - discountIT / quantity;
                        priceET = ITtoET(priceIT, taxRate);
                    } else {
                        priceET = 0;
                        priceIT = 0;
                    }
                }
                // Add the result to the tax list
                if (truncate) {
                    priceITLine = truncator(priceIT * quantity, 2);
                    priceETLine = truncator(priceET * quantity, 2);
                } else {
                    priceITLine = roundValue(priceIT * quantity);
                    priceETLine = roundValue(priceET * quantity);
                }

                let taxAmountLine = roundValue(priceITLine - priceETLine);
                let TaxCategoryId = taxCategory.TaxCategoryId ? taxCategory.TaxCategoryId : taxCategory.Id;

                let newTaxDetail = getTaxDetailLine(TaxCategoryId, "TVA", taxRate, taxAmountLine, priceITLine, priceETLine, isFree);
                taxDetails.push(newTaxDetail);

                break;

            case "Tax.Quebec":
                // Tps is the provincial tax and tvq is the quebec tax
                let tpsAmount, tvqAmount;
                // Price is without taxes
                if (!cacheIsPricesIncludedTax) {
                    //console.log('Price ET : ', price - (discountET / quantity));
                    priceET = price - discountET / quantity;

                    //console.log('tpsAmount : ', getTaxValue(priceET, taxCategory.TPSValue));
                    tpsAmount = getTaxValue(priceET, taxCategory.TPSValue);

                    //console.log('tvqAmount : ', getTaxValue(priceET, taxCategory.TVQValue));
                    tvqAmount = getTaxValue(priceET, taxCategory.TVQValue);

                    //console.log('Price IT : ', priceET + tpsAmount + tvqAmount);
                    priceIT = priceET + tpsAmount + tvqAmount;
                } else { // Price includes taxes
                    priceIT = price - discountIT / quantity;
                    priceET = ITtoET(priceIT, taxCategory.TPSValue + taxCategory.TVQValue);
                    tpsAmount = getTaxValue(priceET, taxCategory.TPSValue);
                    tvqAmount = getTaxValue(priceET, taxCategory.TVQValue);
                }
                priceITLine = roundValue(priceIT * quantity);
                priceETLine = roundValue(priceET * quantity);

                let tpsAmountline = roundValue(tpsAmount * quantity);
                let tvqAmountLine = roundValue(tvqAmount * quantity);

                // Adding the amount of taxes to the tax list
                let newTaxDetailTPS = getTaxDetailLine(taxCategoryId, "TPS", taxCategory.TPSValue, tpsAmountline, priceITLine, priceETLine, isFree);
                let newTaxDetailTVQ = getTaxDetailLine(taxCategoryId, "TVQ", taxCategory.TVQValue, tvqAmountLine, priceITLine, priceETLine, isFree);

                taxDetails.push(newTaxDetailTPS);
                taxDetails.push(newTaxDetailTVQ);
                break;
        }

        let taxValues = {
            // Quantity calculation
            priceIT: priceITLine,
            priceET: priceETLine,

            // Add tax list to the cart item
            taxDetails: taxDetails
        };

        return taxValues;
    };

    const getTaxRate = (taxCategory, deliveryType = 0) => {
        let taxRate = 0;
        if (taxCategory) {
            switch (cacheTaxProvider) {
                case "Tax.FixedRate":
                    taxRate = deliveryType === DeliveryType.FORHERE ? taxCategory.VAT : taxCategory.AltVAT;
                    break;
                case "Tax.Quebec":
                    taxRate = taxCategory.TPSValue + taxCategory.TVQValue;
                    break;
            }
        }
        return taxRate;
    };

    // Do the necessary calculation for a cart item - discount, sum, taxes...
    this.calculateCartItemTotal = (shoppingCart, cartItem, deliveryType, truncate = false) => {
        // Si c'est une commande deliveroo, un remake, et que c'est la faut du restaurant
        // La commande passe à 0, taxes à 0
        if (shoppingCart.Origin === ShoppingCartOrigins.DELIVEROO && shoppingCart.DeliverooRemakeDetails &&
            shoppingCart.DeliverooRemakeDetails.fault === DeliverooRemakeFaults.RESTO) {
            cartItem.PriceIT = 0;
            cartItem.PriceET = 0;

            cartItem.TaxDetails = [];
            return;
        }

        // If item's Discount property are not initialized, we set them to 0
        // to avoid NaN errors
        if (isNaN(cartItem.DiscountET)) {
            cartItem.DiscountET = 0;
        }
        if (isNaN(cartItem.DiscountIT)) {
            cartItem.DiscountIT = 0;
        }

        cartItem.PriceIT = 0;
        cartItem.PriceET = 0;
        cartItem.TaxDetails = [];

        //cartItem.Quantity = roundValue(cartItem.Quantity );
        let taxResult = undefined;

        // If the item is flagged as free
        if (cartItem.IsFree) {
            taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET, cartItem.IsFree, truncate);

            // Add tax list to the cart item, We have to set the normal TaxDetails
            cartItem.TaxDetails = taxResult.taxDetails;
        } else {
            // Calculate item's tax
            let cartItemPrice = 0;

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
                    let tpsAmount, tvqAmount;

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

            let isDispatchedTax = cartItem.Attributes && cartItem.Attributes.length > 0;
            let taxToUse = null;
            if (cartItem.Product && cartItem.Product.TaxCategory) {
                taxToUse = cartItem.Product.TaxCategory;
            } else if (cartItem.Product.TaxCategoryId) {
                taxToUse = Enumerable.from(cacheTaxCategories).firstOrDefault(t => t.TaxCategoryId === cartItem.Product.TaxCategoryId);
            }

            //Formule
            if (isDispatchedTax) {
                switch (cacheTaxProvider) {
                    case "Tax.FixedRate":
                        // Premiere boucle
                        // On groupe les linkedproduct par categorie de taxe
                        // Et on determine le taux de taxe le plus haut
                        let totalLinkedProducts = 0;
                        let linkedProducts = [];
                        let highestTax = taxToUse;
                        let AmountByTaxCategory = [];
                        let shouldApplyHighestTax = false;

                        if (cartItem.Product.ProductAttributes) {
                            cartItem.Attributes.forEach((attr) => {
                                let productAttribute = cartItem.Product.ProductAttributes.find(pAttr => attr.ProductAttributeId === pAttr.Id);
                                // Recupere les attributs renseigné un par un
                                if (productAttribute) {
                                    // Pour chaque attributs, on récupere la valeur selectionné
                                    let productAttributeValue = productAttribute.ProductAttributeValues.find(pAttrValue => pAttrValue.Id === attr.ProductAttributeValueId);

                                    if (productAttributeValue && productAttributeValue.LinkedProduct) {
                                        // On stock la categorie de taxe la plus haute
                                        if (!highestTax && productAttributeValue.LinkedProduct.TaxCategory || highestTax && productAttributeValue.LinkedProduct.TaxCategory
                                            && getTaxRate(productAttributeValue.LinkedProduct.TaxCategory, shoppingCart.DeliveryType) > getTaxRate(highestTax, shoppingCart.DeliveryType)) {
                                            highestTax = productAttributeValue.LinkedProduct.TaxCategory;
                                        }

                                        // Si on recontre un produit lié avec un prix à 0, on fait un calcul par rapport au prix total de la formule, avec la taxe la plus haute
                                        if (productAttributeValue.LinkedProduct.Price === 0) {
                                            isDispatchedTax = false;
                                            shouldApplyHighestTax = true;
                                        }

                                        // On stock la list des taxCategory des linked product
                                        let existingTc = AmountByTaxCategory.find(tc => tc.TaxCategory.TaxCategoryId === productAttributeValue.LinkedProduct.TaxCategory.TaxCategoryId);
                                        if (!existingTc) {
                                            AmountByTaxCategory.push({
                                                Amount: 0,
                                                DiscountIT: 0,
                                                DiscountET: 0,
                                                TaxCategory: productAttributeValue.LinkedProduct.TaxCategory
                                            });
                                        }

                                        linkedProducts.push(productAttributeValue.LinkedProduct);
                                        totalLinkedProducts += productAttributeValue.LinkedProduct.Price;
                                    }
                                }
                            });
                        }

                        // Si tous les produit lié appartienne à la meme categorie de taxe, on ne fait pas le calcul par ratio
                        if (AmountByTaxCategory.length === 1) {
                            isDispatchedTax = false;
                        }

                        if (totalLinkedProducts === 0 || shouldApplyHighestTax) {
                            isDispatchedTax = false;
                            taxToUse = highestTax;
                        }

                        if (isDispatchedTax) {
                            // Calcul par ratio (Pour les formules)
                            // On alimente l'object de somme par TaxCategory

                            let ratioSum = 0;

                            let ptuSum = 0;

                            linkedProducts.sort((a, b) => {
                                return a.Price - b.Price;
                            }).forEach((lp, idx, arr) => {
                                // On determine le prix qu'occupe le linked product dans la formule
                                let ratio = lp.Price / totalLinkedProducts;

                                let priceToUse = roundValue(cartItemPrice * ratio);

                                ratioSum += ratio;
                                ptuSum += priceToUse;

                                // Si on est a la derniere itération, on ajuste le ratio si besoin
                                if (idx === arr.length - 1) {
                                    if (ptuSum !== cartItemPrice) {
                                        priceToUse = roundValue(priceToUse + (cartItemPrice - ptuSum));
                                    }
                                }

                                // Puis on l'associe à sa catégorie de taxe
                                let matchingAtc = AmountByTaxCategory.find(atc => atc.TaxCategory.TaxCategoryId === lp.TaxCategory.TaxCategoryId);
                                if (matchingAtc) {
                                    if (!matchingAtc.Amount) {
                                        matchingAtc.Amount = 0;
                                    }
                                    matchingAtc.Amount += priceToUse;
                                    matchingAtc.DiscountIT += cartItem.DiscountIT / linkedProducts.length;
                                    matchingAtc.DiscountET += cartItem.DiscountET / linkedProducts.length;
                                } else {
                                    console.error("WTF pas de matching ATC");
                                }

                                let attrTaxResult = calculateTax(deliveryType, lp.TaxCategory, priceToUse, cartItem.Quantity, cartItem.DiscountIT / linkedProducts.length, cartItem.DiscountET / linkedProducts.length, false, truncate);
                                if(attrTaxResult && attrTaxResult.taxDetails) {
                                    lp.TaxDetails = attrTaxResult.taxDetails;
                                }
                                
                            });

                            if (cartItem.Product.ProductAttributes) {
                                cartItem.Attributes.forEach((attr) => {
                                    let productAttribute = cartItem.Product.ProductAttributes.find(pAttr => attr.ProductAttributeId === pAttr.Id);
                                    // Recupere les attributs renseigné un par un
                                    if (productAttribute) {
                                        // Pour chaque attributs, on récupere la valeur selectionné
                                        let productAttributeValue = productAttribute.ProductAttributeValues.find(pAttrValue => pAttrValue.Id === attr.ProductAttributeValueId);

                                        if (productAttributeValue && productAttributeValue.LinkedProduct) {

                                            attr.TaxDetails = productAttributeValue.LinkedProduct.TaxDetails;

                                        }
                                    }
                                })
                            }

                            // Puis on boucle sur les sommes pour calculer le TaxDetail et le prix de l'item
                            AmountByTaxCategory.forEach((atc) => {
                                taxResult = calculateTax(deliveryType, atc.TaxCategory, atc.Amount, cartItem.Quantity, atc.DiscountIT, atc.DiscountET, false, truncate);

                                // Quantity calculation
                                cartItem.PriceIT += taxResult.priceIT;
                                cartItem.PriceET += taxResult.priceET;

                                // Add tax list to the cart item
                                taxResult.taxDetails.forEach((itemTaxDetail) => {
                                    let existingTaxDetail = cartItem.TaxDetails.find((taxD) => {
                                        return taxD.TaxCategoryId === itemTaxDetail.TaxCategoryId &&
                                            taxD.TaxCode === itemTaxDetail.TaxCode &&
                                            taxD.TaxRate === itemTaxDetail.TaxRate;
                                    });

                                    // On ajoute le montant de la taxe
                                    if (existingTaxDetail) {
                                        existingTaxDetail.TaxAmountCustomerDisplay = existingTaxDetail.TaxAmountCustomerDisplay + itemTaxDetail.TaxAmountCustomerDisplay;
                                        existingTaxDetail.TaxAmount = existingTaxDetail.TaxAmount + itemTaxDetail.TaxAmount;
                                        existingTaxDetail.PriceIT = existingTaxDetail.PriceIT + itemTaxDetail.PriceIT;
                                        existingTaxDetail.PriceET = existingTaxDetail.PriceET + itemTaxDetail.PriceET;
                                    } else {
                                        cartItem.TaxDetails.push(clone(itemTaxDetail));
                                    }
                                });
                            });
                        }
                        //Produit normal
                        else {
                            taxResult = calculateTax(deliveryType, taxToUse, cartItemPrice, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET, cartItem.IsFree, truncate);

                            // Quantity calculation
                            cartItem.PriceIT = taxResult.priceIT;
                            cartItem.PriceET = taxResult.priceET;

                            // Add tax list to the cart item
                            cartItem.TaxDetails = taxResult.taxDetails;
                        }

                        break;
                    case "Tax.Quebec":
                        cartItemPrice = cartItem.Product.Price;
                        Enumerable.from(cartItem).forEach((attr) => {
                            cartItemPrice += attr.PriceAdjustment ? attr.PriceAdjustment : 0;
                        });
                        taxResult = calculateTax(deliveryType, taxToUse, cartItemPrice, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET, cartItem.IsFree, truncate);
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
                taxResult = calculateTax(deliveryType, taxToUse, cartItemPrice, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET, cartItem.IsFree, truncate);

                // Quantity calculation
                cartItem.PriceIT = taxResult.priceIT;
                cartItem.PriceET = taxResult.priceET;

                // Add tax list to the cart item
                cartItem.TaxDetails = taxResult.taxDetails;
            }
        }

        //if (truncate) {
        //    cartItem.PriceIT = truncator(cartItem.PriceIT, 2);
        //    cartItem.PriceET = truncator(cartItem.PriceET, 2);
        //} else {
        //    cartItem.PriceIT = roundValue(cartItem.PriceIT);
        //    cartItem.PriceET = roundValue(cartItem.PriceET);
        //}
    };

    this.getTaxCategoriesLabelsAsync = () => {
        let labelDefer = $q.defer();
        if (cacheTaxCategoriesLabel) {
            labelDefer.resolve(cacheTaxCategoriesLabel);
        } else {
            let urlApi = $rootScope.APIBaseURL + "/gettaxcategorieslabel";

            $http.get(urlApi).then((res) => {
                labelDefer.resolve(res.data);
            }, (err) => {
                labelDefer.reject(err);
            });
        }

        return labelDefer.promise;
    };

    this.getTaxCategoriesLabels = () => {
        return cacheTaxCategoriesLabel;
    };

    //Do the necessary calculation for a given ShoppingCart - discount, sum, taxes...
    this.calculateAllTotalFor = (shoppingCart, truncate = false, calculateDiscount = true) => {
        if (shoppingCart) {
            if (shoppingCart.shouldTruncate) {
                truncate = true;
            }
            console.log("Calcul du shopping cart ", shoppingCart);
            //On suppose que le shopping cart n'a pas d'item split
            shoppingCart.hasSplitItems = false;

            let taxDetails = [];
            let totalET = 0;
            let totalIT = 0;
            let totalTR = 0;
            let shipping = shoppingCart.Shipping;
            let discount = Enumerable.from(shoppingCart.Discounts).firstOrDefault();

            //TODO : passer le calcul à la ligne
            //On calcule la remise si il y en a -- on le calcule aussi pour chaque montant de taxe

            // If the shopping cart has a global discount attached to it
            if (discount && calculateDiscount) {
                discount.Total = 0;

                // Calc discount on each item
                // And add it on top of existing discount

                // N'applique pas sur les item qté 0, offert, ou dont le prix est nul
                let filteredItems = shoppingCart.Items.filter(i => {
                    return i.Quantity > 0 && !i.IsFree && i.PriceIT >= 0.00;
                });
                if (filteredItems && filteredItems.length > 0) {
                    let processedItem = 0;
                    filteredItems.forEach((i) => {
                        processedItem++;
                        let taxRate = getTaxRate(i.TaxCategory, shoppingCart.DeliveryType);

                        if (discount.IsPercent) {
                            if (cacheIsPricesIncludedTax) {
                                //Product price représente le prix toutes taxes
                                i.DiscountIT = roundValue(i.Product.Price * i.Quantity * (discount.Value / 100));
                            } else {
                                //Product price represente le prix hors taxe. On deduit le prix toute taxes a partir du taxRate
                                i.DiscountIT = roundValue(ETtoIT(i.Product.Price, taxRate) * i.Quantity * (discount.Value / 100));
                            }
                        } else {
                            // Ratio du prix du produit par rapport au total
                            let tmpTotal = shoppingCart.Items.reduce((acc, cur) => {
                                return acc + cur.Product.Price * cur.Quantity;
                            }, 0);
                            if (tmpTotal > 0) {
                                let ratio = i.Product.Price * i.Quantity / tmpTotal;
                                i.DiscountIT = roundValue(discount.Value * ratio);
                            }
                            // Si c'est la derniere iteration, on ajuste le discount
                            if (processedItem === filteredItems.length) {
                                let totalAppliedDiscount = shoppingCart.Items.reduce((acc, cur) => {
                                    return acc + cur.DiscountIT;
                                }, 0);

                                let discountAdjust = discount.Value - totalAppliedDiscount;
                                i.DiscountIT += discountAdjust;
                            }
                        }
                        i.DiscountET = roundValue(ITtoET(i.DiscountIT, taxRate));
                        discount.Total += i.DiscountIT;
                    });
                }
            }

            // Pour chaque article
            if (shoppingCart.Items) {
                shoppingCart.Items.forEach((i, index) => {
                    //Si on rencontre un item avec un quantité decimale
                    if (!Number.isInteger(i.Quantity) && !i.Product.SaleUnit) {
                        //On flag le shopping cart
                        shoppingCart.hasSplitItems = true;
                    }

                    i.LineNumber = index + 1;

                    // On calcul le prix
                    current.calculateCartItemTotal(shoppingCart, i, shoppingCart.DeliveryType, truncate);

                    // On ajoute le total TTC et HT de la ligne au montant total
                    // Check for discount on line only if there is no discount on receipt
                    if (!i.Product.DisableTR) {
                        totalTR = roundValue(totalTR + i.PriceIT);
                    }

                    totalIT = roundValue(totalIT + i.PriceIT);
                    totalET = roundValue(totalET + i.PriceET);

                    // On récupère les taxes de l'article
                    i.TaxDetails.forEach((itemTaxDetail) => {
                        let existingTaxDetail = taxDetails.find((taxD) =>
                            taxD.TaxCategoryId === itemTaxDetail.TaxCategoryId
                            && taxD.TaxCode === itemTaxDetail.TaxCode
                            && taxD.TaxRate === itemTaxDetail.TaxRate);

                        // On ajoute le montant de la taxe
                        if (existingTaxDetail) {
                            existingTaxDetail.TaxAmountCustomerDisplay = roundValue(existingTaxDetail.TaxAmountCustomerDisplay + itemTaxDetail.TaxAmountCustomerDisplay);
                            existingTaxDetail.TaxAmount = roundValue(existingTaxDetail.TaxAmount + itemTaxDetail.TaxAmount);
                            existingTaxDetail.PriceIT = roundValue(existingTaxDetail.PriceIT + itemTaxDetail.PriceIT);
                            existingTaxDetail.PriceET = roundValue(existingTaxDetail.PriceET + itemTaxDetail.PriceET);
                        } else {
                            taxDetails.push(clone(itemTaxDetail));
                        }
                    });
                });
            }

            if (shipping && shipping.TaxDetails) {
                shipping.TaxDetails.forEach((shippingTaxDetail) => {
                    if (shippingTaxDetail.Product && !shippingTaxDetail.Product.DisableTR) {
                        totalTR = roundValue(totalTR + shippingTaxDetail.PriceIT);
                    }

                    totalIT = roundValue(totalIT + shippingTaxDetail.PriceIT);
                    totalET = roundValue(totalET + shippingTaxDetail.PriceET);

                    let existingTaxDetail = taxDetails.find((taxD) =>
                        taxD.TaxCategoryId == shippingTaxDetail.TaxCategoryId
                        && taxD.TaxCode == shippingTaxDetail.TaxCode
                        && taxD.TaxRate == shippingTaxDetail.TaxRate
                    );

                    // On ajoute le montant de la taxe
                    if (existingTaxDetail) {
                        existingTaxDetail.TaxAmountCustomerDisplay = roundValue(existingTaxDetail.TaxAmountCustomerDisplay + shippingTaxDetail.TaxAmountCustomerDisplay);
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
            let totalPayment = 0;

            if (shoppingCart.PaymentModes) {
                totalPayment = shoppingCart.PaymentModes.reduce((acc, cur) => {
                    return acc + cur.Total;
                }, 0);
            }

            //On calcule le rendu monnaie
            let residue = roundValue(totalIT - totalPayment);
            let repaid = 0;
            let credit = 0;

            //Pas de rendue monnaie sur les tickets restaurants ou avoir
            let hasCreditPaymentMode = shoppingCart.PaymentModes && shoppingCart.PaymentModes.some(p => p.PaymentType === PaymentType.TICKETRESTAURANT || p.PaymentType === PaymentType.AVOIR);
            let hasRepaidPaymentMode = shoppingCart.PaymentModes && shoppingCart.PaymentModes.some(p => p.PaymentType === PaymentType.ESPECE);

            let amountCreditable = 0;
            if (hasCreditPaymentMode) {
                amountCreditable = shoppingCart.PaymentModes ? shoppingCart.PaymentModes.reduce((acc, cur) => {
                    if ((cur.PaymentType === PaymentType.TICKETRESTAURANT || cur.PaymentType === PaymentType.AVOIR) && cur.PaymentType !== PaymentType.ESPECE) {
                        acc += cur.Total;
                    }
                    return acc;
                }, 0) : null;
            }

            let amountRepayable = 0;
            if (hasRepaidPaymentMode) {
                amountRepayable = shoppingCart.PaymentModes ? shoppingCart.PaymentModes.reduce((acc, cur) => {
                    if (cur.PaymentType !== PaymentType.TICKETRESTAURANT && cur.PaymentType !== PaymentType.AVOIR && cur.PaymentType !== PaymentType.CB && cur.PaymentType !== PaymentType.CBTICKETRESTAURANT) {
                        acc += cur.Total;
                    }
                    return acc;
                }, 0) : null;
            }

            let credited = false;

            if (totalTR < totalIT) {
                if (shoppingCart.PaymentModes && hasCreditPaymentMode) {
                    let cappedAmountCreditable = Math.min(amountCreditable, totalTR);
                    credit = amountCreditable - cappedAmountCreditable;
                    residue += credit;
                    credited = true;
                }
            }

            if (residue < 0 && !shoppingCart.ParentTicket || residue > 0 && shoppingCart.ParentTicket) {
                if (hasCreditPaymentMode && !hasRepaidPaymentMode && !credited) {
                    // if (residue > 0) {
                    //     credit = Math.min(Math.abs(residue), amountCreditable);
                    //     residue += credit;
                    // } else {
                    //     credit = Math.min(Math.abs(residue), amountCreditable);
                    //     residue -= credit;
                    // }
                    credit = Math.min(Math.abs(residue), amountCreditable);
                    residue += credit;
                }

                if (hasRepaidPaymentMode) {
                    // if (residue > 0) {
                    //     repaid = Math.min(Math.abs(residue), amountRepayable);
                    //     residue += repaid;
                    // } else {
                    //     repaid = Math.min(Math.abs(residue), amountRepayable);
                    //     residue -= repaid;
                    // }
                    repaid = Math.min(Math.abs(residue), amountRepayable);
                    residue += repaid;
                }

                if (residue !== 0) {
                    if (hasCreditPaymentMode && !credited) {
                        // if (residue > 0) {
                        //     credit = Math.min(Math.abs(residue), amountCreditable);
                        //     residue += credit;
                        // } else {
                        //     credit = Math.min(Math.abs(residue), amountCreditable);
                        //     residue -= credit;
                        // }
                        credit = Math.min(Math.abs(residue), amountCreditable);
                        residue += credit;
                    }
                }

                //if (hasCreditPaymentMode && !hasRepaidPaymentMode) {
                //    credit = residue * -1;
                //} else {
                //    repaid = residue * -1;
                //}
            }

            // Formatting the ticket

            shoppingCart.Total = roundValue(totalIT);
            shoppingCart.TotalET = roundValue(totalET);
            shoppingCart.TotalTR = roundValue(totalTR);
            shoppingCart.TotalPayment = roundValue(totalPayment);
            shoppingCart.Residue = roundValue(residue);
            shoppingCart.Repaid = roundValue(repaid);
            shoppingCart.Credit = roundValue(credit);
            shoppingCart.TaxDetails = taxDetails;
            shoppingCart.ExcludedTax = !cacheIsPricesIncludedTax;
            shoppingCart.Digits = ROUND_NB_DIGIT;
        }
    };
    //#endregion
});