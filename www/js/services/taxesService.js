app.service('taxesService', ['$rootScope', '$q','settingService',
    function ($rootScope, $q) {

        var cacheTaxProvider = undefined;
        var cacheTaxCategories = undefined;
        var cacheTaxDisplay = undefined;
        //var roundPrecisionNumber = settingService.getRoundNumberPrecisionAsync();
        var cacheIsPricesIncludedTax = undefined;
    	var self = this;

        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status == "Change" &&  args.id.indexOf('Setting') == 0) {
                cacheTaxCategories = undefined;
                cacheTaxProvider = undefined;
                cacheTaxDisplay = undefined;
                cacheIsPricesIncludedTax = undefined;
            }
        });


        this.groupTaxDetail = function (input) {
            var taxDetails = [];

            if (input) {
                Enumerable.from(input).forEach(function (itemTaxDetail) {
                    var existingTaxDetail = Enumerable.from(taxDetails).firstOrDefault(function (taxD) {
                        return taxD.TaxCode == itemTaxDetail.TaxCode && taxD.TaxRate == itemTaxDetail.TaxRate;
                    });

                    // On ajoute le montant de la taxe 
                    if (existingTaxDetail) {
                        existingTaxDetail.TaxAmount += itemTaxDetail.TaxAmount;
                    } else {
                        taxDetails.push(clone(itemTaxDetail));
                    }

                });
            }

            return taxDetails;
        }


        //#region Données TAXE -> PouchDB


        //Prix des produits définis en HT ou TTC        
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

        //[Obsolete] Prix des produits définis en HT ou TTC        
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

        //Récupération du provider de taxe à utiliser
        this.getTaxProviderAsync = function () {
            var taxProviderDefer = $q.defer();

            //TODO à enlever POUR TEST
            //cacheTaxProvider = "Tax.FixedRate";

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
        }

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
        }

        //Récupération des catégories de taxes en fonction du provider        
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
        		        //Le provider n'est pas défini, on utilise le provider FixedRate par défaut
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
        var getTaxDetailLine = function (taxCategoryId,taxCode,taxRate,taxAmount) {
            var taxDetail = {
                TaxCategoryId: taxCategoryId,
                TaxCode: taxCode,
                TaxRate: taxRate,
                TaxAmount: taxAmount
            }

            return taxDetail;
        }

        //Get tax value
        var getTaxValue = function (valueET, taxRate) {
            return (valueET * taxRate) / 100;
        }

        //HT vers TTC
        var ETtoIT = function (valueET, taxRate) {
            var valueIT = valueET + getTaxValue(valueET, taxRate);
            return valueIT;
        }

       
        //TTC vers HT
        var ITtoET = function (valueIT, taxRate) {
            valueET = valueIT / ((taxRate / 100) + 1);
            return valueET;
        }


        //Calcul le total 
        var calculateCartItemTotal = function (cartItem,deliveryType) {
            var priceIT = 0;
            var priceET = 0;
            var taxDetails = [];

            //Si il y a une offre/bon cadeau
            if (cartItem.IsFree) {
                priceIT = 0;
                priceET = 0;
            } 
            else {
                //Calcul des taxes pour l'article 
                switch (cacheTaxProvider) {                    
                    case "Tax.FixedRate":
                        //Si l'article est à emporter on utilise la TVA alternative
                        var taxRate = deliveryType == DeliveryTypes.FORHERE ? cartItem.Product.TaxCategory.VAT : cartItem.Product.TaxCategory.altVAT;
                        
                        //calcul du prix est Hors-taxe
                        if (!cacheIsPricesIncludedTax) {
                            priceET = cartItem.Product.Price;
                            priceIT = ETtoIT(priceET, taxRate);
                        }
                        //Calcul du prix TTC
                        else {
                            priceIT = cartItem.Product.Price;
                            priceET = ITtoET(priceIT, taxRate);
                        }
                        
                        //On ajoute les résultat au détail de taxe
                        var newTaxDetail = getTaxDetailLine(cartItem.Product.TaxCategory.TaxCategoryId, "TVA", taxRate, (priceIT - priceET) * cartItem.Quantity);
                        taxDetails.push(newTaxDetail);
                        
                        break;
                        
                    case "Tax.Quebec":
                        // La taxe fédérale et la taxe locale
                        var tpsAmount, tvqAmount;
                        
                        //Si le prix est Hors-taxe
                        if (!cacheIsPricesIncludedTax) {
                            priceET = cartItem.Product.Price;

                            tpsAmount = getTaxValue(priceET, cartItem.Product.TaxCategory.TPSValue);
                            tvqAmount = getTaxValue(priceET, cartItem.Product.TaxCategory.TVQValue);

                            priceIT = priceET + tpsAmount + tvqAmount;

                        }
                        //Si le prix est TTC
                        else{
                            priceIT = cartItem.Product.Price;
                            priceET = ITtoET(priceIT, cartItem.Product.TaxCategory.TPSValue + cartItem.Product.TaxCategory.TVQValue);
                            tpsAmount = getTaxValue(priceET, cartItem.Product.TaxCategory.TPSValue);
                            tvqAmount = getTaxValue(priceET, cartItem.Product.TaxCategory.TVQValue);
                        }
                        
                        // on récupère le montant de chaque taxe et on les ajoute au détail de taxe
                        var newTaxDetailTPS = getTaxDetailLine(cartItem.Product.TaxCategory.TaxCategoryId, "TPS", cartItem.Product.TaxCategory.TPSValue, tpsAmount*cartItem.Quantity);
                        var newTaxDetailTVQ = getTaxDetailLine(cartItem.Product.TaxCategory.TaxCategoryId, "TVQ", cartItem.Product.TaxCategory.TVQValue, tvqAmount*cartItem.Quantity);
                        taxDetails.push(newTaxDetailTPS);
                        taxDetails.push(newTaxDetailTVQ);
                        
                        break;
                }
            }

            //Calcul le prix de l'article en fonction de la quantité 
            cartItem.PriceIT = priceIT * cartItem.Quantity;
            cartItem.PriceET = priceET * cartItem.Quantity;
            
            //On ajoute les détails de taxe à l'article
            cartItem.TaxDetails = taxDetails;
           
        }


        //On calcule le total du ticket
        this.calculateTotalFor = function (shoppingCart) {
            
            if (shoppingCart) {
                var taxDetails = [];
                var totalET = 0;
                var totalIT = 0;

                //Pour chaque article
                Enumerable.from(shoppingCart.Items).forEach(function (i) {

                    // on calcul le prix 
                    calculateCartItemTotal(i, shoppingCart.DeliveryType);
                    
                    // on ajoute le total TTC et HT de la ligne au montant total 
                    totalIT += roundValue(i.PriceIT);
                    totalET += roundValue(i.PriceET);
    
                    // On récupère les taxes de l'article
                    Enumerable.from(i.TaxDetails).forEach(function (itemTaxDetail) {
                        var existingTaxDetail = Enumerable.from(taxDetails).firstOrDefault(function (taxD) {
                            return taxD.TaxCategoryId == itemTaxDetail.TaxCategoryId &&
                                taxD.TaxCode == itemTaxDetail.TaxCode &&
                                taxD.TaxRate == itemTaxDetail.TaxRate;
                        });

                        // On ajoute le montant de la taxe 
                        if (existingTaxDetail) {
                            existingTaxDetail.TaxAmount += itemTaxDetail.TaxAmount;
                        } else {
                            taxDetails.push(clone(itemTaxDetail));
                        }

                    });
                });


                //On calcule la remise si il y en a -- on le calcule aussi pour chaque montant de taxe
                var discount = Enumerable.from(shoppingCart.Discounts).firstOrDefault();

                if (discount) {                                    
                    var totalDiscount = totalIT;

                    //Calcul de la remise 
                    if (!discount.IsPercent) {
                        valueDiscount = discount.Value;
                        totalDiscount = totalIT - valueDiscount;
                        var ratio = totalDiscount / totalIT;
                    }
                    // si la remise est en pourcentage
                    else {
                        valueDiscount = (totalIT * discount.Value) / 100;
                        totalDiscount = totalIT - valueDiscount;
                        var ratio = totalDiscount / totalIT;
                        
                         // Calcule la remise sur la tva total du panier
                        Enumerable.from(taxDetails).forEach(function (i) {
                            i.TaxAmount = roundValue( i.TaxAmount-( i.TaxAmount * ratio));                         
                        });
                    }
                    
                   

                    //On récupère la remise totale sur le Hors-taxe
                    totalETDiscount = totalET * ratio;

                    totalIT = totalDiscount;
                    totalET = totalETDiscount;

                    discount.Total = valueDiscount;
                    
                    
                    
                    // Calc discount on each item
                    Enumerable.from(shoppingCart.Items).forEach(function (i) {
                        i.DiscountIT = roundValue(i.PriceIT - i.PriceIT * ratio);
                        i.DiscountET = roundValue(i.PriceET - i.PriceET * ratio);                     
                                    
                    });
                    
                   
                }

                totalIT = roundValue(totalIT);


                //On calcule les totaux du ticket en fonction du mode de paiement
                var totalPayment = 0;

                Enumerable.from(shoppingCart.PaymentModes).forEach(function (p) {
                    totalPayment = totalPayment + p.Total;
                })

                //Add balanceUpdate value
                if (shoppingCart.BalanceUpdate) {
                    totalPayment = totalPayment + shoppingCart.BalanceUpdate.UpdateValue;
                }

                //On calcule le rendu 
                var residue = totalIT - totalPayment;
                var repaid = 0;
                var credit = 0;

                if (residue < 0) {
                    //Test if only "ticket-restaurant" in payment modes -> Credit
                    var hasRepaidPaymentMode = Enumerable.from(shoppingCart.PaymentModes).any('p=>p.PaymentType != PaymentType.TICKETRESTAURANT && p.PaymentType != PaymentType.AVOIR');
                    if (!hasRepaidPaymentMode) {
                        credit = residue * -1;
                    } else {
                        repaid = residue * -1;
                    }
                    residue = 0;
                }

                //On prépare le ticket pour impression/validation
                totalIT = parseFloat(totalIT);
                totalET = parseFloat(totalET);
                totalPayment = parseFloat(totalPayment);
                residue = parseFloat(residue);
                repaid = parseFloat(repaid);

                shoppingCart.Total = roundValue(totalIT);
                shoppingCart.TotalET = roundValue(totalET);
                shoppingCart.TotalPayment = roundValue(totalPayment);
                shoppingCart.Residue = roundValue(residue);
                shoppingCart.Repaid = roundValue(repaid);
                shoppingCart.Credit = roundValue(credit);
                shoppingCart.TaxDetails = taxDetails;
                shoppingCart.ExcludedTax = !cacheIsPricesIncludedTax;
                shoppingCart.Digits = ROUND_NB_DIGIT;
            }
        }

        //#endregion

    }])