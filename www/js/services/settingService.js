app.service('settingService', ['$rootScope', '$q',
	function ($rootScope, $q) {
		var cacheStepNames = undefined;
		var cacheCurrency = undefined;
		var cacheUseRoundPrices = undefined;
		var cacheRoundPricesDigit = undefined;
		var cacheCompanyInfo = undefined;
		var currencyLoaded = false;
		var initialized = false;
		var self = this;



		$rootScope.$on('pouchDBChanged', function (event, args) {
			if (args.status == "Change" &&  args.id.indexOf('Setting') == 0) {
				cacheStepNames = undefined;
				self.init();
			}
		});

		$rootScope.$on('dbDatasReplicate', function (event, args) {
			if (args.status == 'UpToDate') {
				self.init();
			}
		});

		this.init = function () {
			this.getRoundPriceSettingAsync();
			this.getRoundNumberPrecisionAsync();
			this.getCompanyInfoAsync();
		};

		/** Get the rounding settings for calculation money values */
		this.getRoundPriceSettingAsync = function () {
			var self = this;
			var roundPricesDefer = $q.defer();

			if ($rootScope.modelDb.dataReady) {
				if (cacheUseRoundPrices) {
					roundPricesDefer.resolve(cacheUseRoundPrices);
				} else {
					$rootScope.dbInstance.rel.find('Setting').then(function (results) {
						var roundPriceSetting = Enumerable.from(results.Settings).firstOrDefault("s => s.Name == 'shoppingcartsettings.roundpricesduringcalculation'");
						if (roundPriceSetting) {
							cacheUseRoundPrices = JSON.parse(roundPriceSetting.Value.toLowerCase());
							roundPricesDefer.resolve(cacheUseRoundPrices);
						} else {
							roundPricesDefer.reject("Round price setting not found !");
						}

					}, function (err) {
						roundPricesDefer.reject(err);
					});
				}
			} else {
				roundPricesDefer.reject("Database isn't ready !");
			}

			return roundPricesDefer.promise;
		};

		/** return cache value of the round price setting */
		this.getRoundPriceSetting = function() {
			return cacheUseRoundPrices;
		};

		/** Get the rounding settings for calculation money values */
		this.getRoundNumberPrecisionAsync = function () {
			var self = this;
			var roundPricesDefer = $q.defer();

			if ($rootScope.modelDb.dataReady) {
				$rootScope.dbInstance.rel.find('Setting').then(function (results) {
					var roundPriceSetting = Enumerable.from(results.Settings).firstOrDefault("s => s.Name == 'shoppingcartsettings.roundpricesdigits'");
					if (roundPriceSetting) {
						
						
						cacheRoundPricesDigit = parseInt(roundPriceSetting.Value);

						//--> utils.js
						ROUND_NB_DIGIT = cacheRoundPricesDigit;

						roundPricesDefer.resolve(cacheRoundPricesDigit);
					} else {
						roundPricesDefer.reject("Round price setting not found !");
					}

				}, function (err) {
					roundPricesDefer.reject(err);
				});
			} else {
				roundPricesDefer.reject("Database isn't ready !");
			}

			return roundPricesDefer.promise;
		};

        /** Get the rounding settings for calculation money values */
        this.getCompanyInfoAsync = function () {
            var self = this;

            var companyInfo = {};
            var companyInfoDefer = $q.defer();

            if ($rootScope.modelDb.dataReady) {

                $rootScope.dbInstance.rel.find('PosSetting').then(function (results) {
                    var PosSettings = Enumerable.from(results.PosSettings).toArray();
                    if (PosSettings) {
                        for (var i = 0; i < PosSettings.length; i++) {
                            var PosSetting = PosSettings[i];
                            if (PosSetting.SettingKey =='CompanyName') {
                                companyInfo.Company = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey =='Street') {
                                companyInfo.Address = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey =='ZipCode') {
                                companyInfo.ZipCode = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey =='City') {
                                companyInfo.City = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey =='CountryName') {
                                companyInfo.Country = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey =='CommercialRegister') {
                                companyInfo.SiretNumber = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey =='TaxNumber') {
                                companyInfo.NafCode = PosSetting.SettingValue;
                            }
                            if (PosSetting.SettingKey == 'VatId') {
                                companyInfo.VatNumber = PosSetting.SettingValue;
                            }
                        }

                        cacheCompanyInfo = companyInfo;
                        companyInfoDefer.resolve(companyInfo);
                    } else {
                        companyInfoDefer.reject("Setting not found !");
                    }
                }, function (err) {
                    companyInfoDefer.reject(err);
                });
            }
            else
			{
                companyInfoDefer.reject("Database isn't ready !");
            }
            return companyInfoDefer.promise;
        };


        this.getCompanyInfo = function () {
            return cacheCompanyInfo;
        };

		/** return cache value of the round precision setting */
		this.getRoundNumberPrecision = function () {
			return cacheRoundPricesDigit;
		};

		/** Get the paymentmodes available */
		this.getPaymentModesAsync = function () {
			var self = this;
			var paymentDefer = $q.defer();

			if ($rootScope.modelDb.dataReady) {
				$rootScope.dbInstance.rel.find('Setting').then(function (results) {
					var paymentSetting = undefined;

					// Payment modes generic
					var paymentWillbecard = Enumerable.from(results.Settings).firstOrDefault("s => s.Name == 'willbecardpaymentsettings.paiementoptionlist'");
					if (paymentWillbecard){
						paymentSetting = JSON.parse(paymentWillbecard.Value);
					}

					// EasyTransac
					var paymentEasyTransac = Enumerable.from(results.Settings).firstOrDefault("s => s.Name == 'easytransacpaymentsettings.easytransackey'");
					if (paymentEasyTransac) {
						if (!paymentSetting) {
							paymentSetting = [];
						}

						var easytransacValue = {
							Disabled: false,
							Group: null,
							PaymentType: PaymentType.EASYTRANSAC,
							Selected: false,
							Text: "EasyTransac",
							Value: "EasyTransac",
							Options: {
								EasyTransacKey: paymentEasyTransac.Value
							}
						};

						paymentSetting.push(easytransacValue);

					}
						

					if (paymentSetting) {
						paymentDefer.resolve(paymentSetting);
					} else {
						paymentDefer.reject("Setting not found !");
					}


					

				}, function (err) {
					paymentDefer.reject(err);
				});
			} else {
				paymentDefer.reject("Database isn't ready !");
			}

			return paymentDefer.promise;
		};


		/** Get Steps Name  */
		this.getStepNamesAsync = function () {
			var self = this;
			var valuesDefer = $q.defer();

			if ($rootScope.modelDb.dataReady) {
				if (cacheStepNames) {
					valuesDefer.resolve(cacheStepNames);
				} else {
					$rootScope.dbInstance.get('Steps_1_0000000000000000').then(function (results) {
						cacheStepNames = results.data;
						valuesDefer.resolve(cacheStepNames);
					}, function () {
						valuesDefer.reject("Step names not found !");
					});
				}
			} else {
				valuesDefer.reject("Database isn't ready !");
			}

			return valuesDefer.promise;
		};

        /**
		 * Get and sets the currency used for display
         */
		this.getCurrencyAsync = function () {
			var self = this;
			var valuesDefer = $q.defer();

			if ($rootScope.modelDb.dataReady) {
				if (currencyLoaded) {
					valuesDefer.resolve(cacheCurrency);

				}
				else
				{
					$rootScope.dbInstance.rel.find('Setting').then(function (results) {
						var currencySetting = Enumerable.from(results.Settings).firstOrDefault(function (setting) {
							return setting.Name.indexOf('currencysettings.primarystorecurrencyid') == 0

						});


						currencyLoaded = true;

						if (currencySetting) {
							var currencyId = parseInt(currencySetting.Value);
							$rootScope.dbInstance.rel.find('Currency', currencyId).then(function (resCurrency) {
								cacheCurrency = Enumerable.from(resCurrency.Currencies).firstOrDefault();


								if (cacheCurrency) {
									
									// Obtain currency symbol
									var number = 0;
									var currencySymbol = undefined;

									try{
										currencySymbol = number.toLocaleString('fr-FR', { style: 'currency', currency: cacheCurrency.CurrencyCode }).replace('0,00', '').trim()[0];
									}
									catch(excCurrency){
										console.error(excCurrency);
									}

									if (!currencySymbol || currencySymbol == number){
										switch (cacheCurrency.CurrencyCode) {
											case "EUR":
												currencySymbol = "€";
												break;
											case "USD":
												currencySymbol = "$";
												break;
											case "CAD":
												currencySymbol = "$";
                                                break;
                                            case "KMF":
                                                currencySymbol = "F";
                                                break;
										}
									}
									cacheCurrency.currencySymbol = currencySymbol;
								}
								valuesDefer.resolve(cacheCurrency);
							}, function (err) {
								cacheCurrency = undefined;
								valuesDefer.resolve(cacheCurrency);
							});

						} else {

                            cacheCurrency = undefined;
							valuesDefer.resolve(cacheCurrency);
						}
					}, function (err) {
						valuesDefer.reject(err);
					});
				}
			} else {
				valuesDefer.reject("Database isn't ready !");
			}
			return valuesDefer.promise;
		};	
	}]);