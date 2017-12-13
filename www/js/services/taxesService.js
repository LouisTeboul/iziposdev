app.service('taxesService', ['$rootScope', '$q','settingService',
    function ($rootScope, $q, settingService) {

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
                cacheTaxProvider = self.getTaxProviderAsync().then(function (results) {
                    cacheTaxCategories = self.getTaxCategoriesAsync();
                });
                cacheTaxDisplay = self.getTaxDisplayTypeAsync();
                cacheIsPricesIncludedTax = self.getPricesIncludedTaxAsync();
            }
        });

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

            if ($rootScope.modelDb.databaseReady) {
                if (cacheIsPricesIncludedTax) {
                    taxDisplayDefer.resolve(cacheIsPricesIncludedTax);
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

        this.getPricesIncludedTaxAsync();

        /**
         * Gets if the product price is display with or without taxes
        *@deprecated 
        */
        this.getTaxDisplayTypeAsync = function () {
            var taxDisplayDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
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
        
        this.getTaxDisplayTypeAsync();

        this.getTaxDisplayType = function () {
            return cacheTaxDisplay;
        };

        /**
         * Get the tax provider - we can have different tax provider ex : quebec, france
         */
        this.getTaxProviderAsync = function () {
            var taxProviderDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
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

        	if ($rootScope.modelDb.databaseReady) {
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
        var getTaxDetailLine = function (taxCategoryId,taxCode,taxRate,taxAmount,priceIT,priceET) {
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
         
        // Get tax value
        var getTaxValue = function (valueET, taxRate) {
            return (valueET * taxRate) / 100;
        };

        /**
         * From price without tax to price included tax
         * @param valueET
         * @param taxRate
         * @returns {number}
         */
        var ETtoIT = function (valueET, taxRate) {
            var valueIT = valueET + getTaxValue(valueET, taxRate);
            return valueIT;
        };

        /**
         * From price included tax to price  without tax
         * @param valueIT
         * @param taxRate
         * @returns {number}
         */
        var ITtoET = function (valueIT, taxRate) {
            valueET = valueIT / ((taxRate / 100) + 1);
            return valueET;
        };

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

                        priceET = price - discountET / quantity;
                        priceIT = ETtoIT(priceET, taxRate);

                    }

                    // Calculate price including tax
                    else {

                        priceIT = price - discountIT / quantity;
                        priceET = ITtoET(priceIT, taxRate);

                    }


                    // Add the result to the tax list
                    // ATTENTION au round value
                    var newTaxDetail = getTaxDetailLine(taxCategory.TaxCategoryId, "TVA", taxRate, roundValue(priceIT - priceET) * quantity, priceIT, priceET);
                    taxDetails.push(newTaxDetail);



                    break;

                case "Tax.Quebec":
                    // Tps is the provincial tax and tvq is the quebec tax
                    var tpsAmount, tvqAmount;

                    // Price is without taxes
                    if (!cacheIsPricesIncludedTax) {
                        priceET = price;

                        tpsAmount = getTaxValue(priceET, taxCategory.TPSValue);
                        tvqAmount = getTaxValue(priceET, taxCategory.TVQValue);

                        priceIT = priceET + tpsAmount + tvqAmount;

                    }
                    // Price includes taxes
                    else {
                        priceIT = price;
                        priceET = ITtoET(priceIT, taxCategory.TPSValue + taxCategory.TVQValue);
                        tpsAmount = getTaxValue(priceET, taxCategory.TPSValue);
                        tvqAmount = getTaxValue(priceET, taxCategory.TVQValue);
                    }

                    // Adding the amount of taxes to the tax list
                    var newTaxDetailTPS = getTaxDetailLine(taxCategory.TaxCategoryId, "TPS", taxCategory.TPSValue, tpsAmount * quantity, priceIT, priceET);
                    var newTaxDetailTVQ = getTaxDetailLine(taxCategory.TaxCategoryId, "TVQ", taxCategory.TVQValue, tvqAmount * quantity, priceIT, priceET);
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
            if (isNaN(cartItem.splittedAmount))
                cartItem.splittedAmount = 0;

            cartItem.PriceIT = 0;
            cartItem.PriceET = 0;
            cartItem.TaxDetails = [];

            // If the item is flagged as free
            if (cartItem.IsFree) {
                priceIT = 0;
                priceET = 0;

                var taxResult = calculateTax(deliveryType, cartItem.Product.TaxCategory, cartItem.Product.Price, cartItem.Quantity, cartItem.DiscountIT, cartItem.DiscountET);

                // Add tax list to the cart item, We have to set the normal TaxDetails 
                cartItem.TaxDetails = taxResult.taxDetails;
            }
            else {

                // Calculate item's tax
                var cartItemPrice = 0;

                switch (cacheTaxProvider) {
                    case "Tax.FixedRate":
                        cartItemPrice = cartItem.Product.Price + cartItem.splittedAmount;
                        break;

                    case "Tax.Quebec":
                        // Tps is the provincial tax and tvq is the quebec tax
                        var tpsAmount, tvqAmount;

                        // Price is without taxes
                        if (!cacheIsPricesIncludedTax) {
                            cartItemPrice = cartItem.Product.Price;
                        }
                        // Price includes taxes
                        else {
                            cartItemPrice = cartItem.Product.Price;
                        }
                        break;
                }

                var isDispatchedTax = cartItem.Attributes && cartItem.Attributes.length > 0;
                var taxToUse = cartItem.Product.TaxCategory;

                //Formule
                if (isDispatchedTax) {
                    //Récupération des produits liés
                    var linkedProducts = [];
                    var totalLinkedProducts = 0;
                    var highestTax = taxToUse;

                    var productAttributesEnumerator = Enumerable.from(cartItem.Product.ProductAttributes);

                    var getTaxRate = function (taxCategory) {
                        var taxRate = 0;
                        switch (cacheTaxProvider) {
                            case "Tax.FixedRate":
                                taxRate = deliveryType == DeliveryTypes.FORHERE ? taxCategory.VAT : taxCategory.altVAT;
                                break;

                            case "Tax.Quebec":
                                taxRate = taxCategory.TPSValue;
                                break;
                        }
                        return taxRate;
                    };

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
                                if (productAttributeValue.LinkedProduct.TaxCategory && getTaxRate(productAttributeValue.LinkedProduct.TaxCategory) > getTaxRate(highestTax)) {
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
                console.log(shoppingCart);
                var taxDetails = [];
                var totalET = 0;
                var totalIT = 0;

                var discount = Enumerable.from(shoppingCart.Discounts).firstOrDefault();

                // Pour chaque article
                Enumerable.from(shoppingCart.Items).forEach(function (i) {

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


                //TODO : passer le calcul à la ligne
                //On calcule la remise si il y en a -- on le calcule aussi pour chaque montant de taxe

                // If the shopping cart has a global discount attached to it
                // And has not been applied yet
                if (discount && !shoppingCart.isDiscountConsumed) {
                    var totalDiscount = totalIT;

                    // Calcul de la remise
                    if (!discount.IsPercent) {
                        valueDiscount = discount.Value;
                        totalDiscount = totalIT - valueDiscount;
                        var ratio = totalDiscount / totalIT;

                      
                    }
                    // si la remise est en pourcentage
                    else {
                        valueDiscount = roundValue((totalIT * discount.Value) / 100);
                        totalDiscount = roundValue(totalIT - valueDiscount);
                        var ratio = roundValue(totalDiscount / totalIT);                       
                        
                    }        
                    
                      // Calcule la remise sur la tva total du panier
                        Enumerable.from(taxDetails).forEach(function (i) {                                                     
                            i.TaxAmount = i.TaxAmount - i.TaxAmount *(1- ratio);                                                    
                        });
                   
                    // On récupère la remise totale sur le Hors-taxe
                    totalETDiscount =(totalET * ratio);                    
   
                    totalIT = totalDiscount;
                    totalET = totalETDiscount;

                    discount.Total = valueDiscount;                                   
                    
                    // Calc discount on each item
                    // And add it on top of existing discount
                    Enumerable.from(shoppingCart.Items).forEach(function (i) {
                        i.DiscountIT = roundValue(i.PriceIT - i.PriceIT * ratio);
                        i.DiscountET = roundValue(i.PriceET - i.PriceET * ratio);
                    });
                    shoppingCart.isDiscountConsumed = true;
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