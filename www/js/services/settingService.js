app.service('settingService', function ($rootScope, $q, pictureService, loyaltyService) {
    let cacheStepNames = undefined;
    let cacheCurrency = undefined;
    let cacheUseRoundPrices = undefined;
    let cacheRoundPricesDigit = undefined;
    let currencyLoaded = false;
    let self = this;

    $rootScope.cacheCompanyInfo = null;

    $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status == "Change" && args.id.indexOf('Setting') == 0) {
            cacheStepNames = undefined;
            self.init();
        }
    });

    $rootScope.$on('dbDatasReplicate', (event, args) => {
        if (args.status == 'UpToDate') {
            self.init();
        }
    });

    this.init = () => {
        this.getRoundPriceSettingAsync();
        this.getRoundNumberPrecisionAsync();
        this.getCompanyInfoAsync();
        if ($rootScope.borne) {
            this.getBorneImages();
        }
    };

    //Get the rounding settings for calculation money values
    this.getRoundPriceSettingAsync = () => {
        let roundPricesDefer = $q.defer();

        if ($rootScope.modelDb.dataReady) {
            if (cacheUseRoundPrices) {
                roundPricesDefer.resolve(cacheUseRoundPrices);
            } else {
                $rootScope.dbInstance.rel.find('Setting').then((results) => {
                    let roundPriceSetting = Enumerable.from(results.Settings).firstOrDefault("s => s.Name == 'shoppingcartsettings.roundpricesduringcalculation'");
                    if (roundPriceSetting) {
                        cacheUseRoundPrices = JSON.parse(roundPriceSetting.Value.toLowerCase());
                        roundPricesDefer.resolve(cacheUseRoundPrices);
                    } else {
                        roundPricesDefer.reject("Round price setting not found !");
                    }
                }, (err) => {
                    roundPricesDefer.reject(err);
                });
            }
        } else {
            roundPricesDefer.reject("Database isn't ready !");
        }

        return roundPricesDefer.promise;
    };

    //Get the rounding settings for calculation money values
    this.getRoundNumberPrecisionAsync = () => {
        let roundPricesDefer = $q.defer();

        if ($rootScope.modelDb.dataReady) {
            $rootScope.dbInstance.rel.find('Setting').then((results) => {
                let roundPriceSetting = Enumerable.from(results.Settings).firstOrDefault("s => s.Name == 'shoppingcartsettings.roundpricesdigits'");
                if (roundPriceSetting) {
                    cacheRoundPricesDigit = parseInt(roundPriceSetting.Value);
                    ROUND_NB_DIGIT = cacheRoundPricesDigit;
                    roundPricesDefer.resolve(cacheRoundPricesDigit);
                } else {
                    roundPricesDefer.reject("Round price setting not found !");
                }
            }, (err) => {
                roundPricesDefer.reject(err);
            });
        } else {
            roundPricesDefer.reject("Database isn't ready !");
        }
        return roundPricesDefer.promise;
    };

    //Get the rounding settings for calculation money values
    this.getCompanyInfoAsync = () => {
        let companyInfo = {};
        let companyInfoDefer = $q.defer();

        if ($rootScope.modelDb.dataReady) {
            $rootScope.dbInstance.rel.find('PosSetting').then((results) => {
                let PosSettings = Enumerable.from(results.PosSettings).toArray();
                $rootScope.borneForHereCollectLabel = "Bipper";
                $rootScope.borneTakeawayCollectLabel = "Bipper"
                if (PosSettings) {

                    for (let i = 0; i < PosSettings.length; i++) {
                        let PosSetting = PosSettings[i];
                        if (PosSetting.SettingKey == 'CompanyName') {
                            companyInfo.Company = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'Street') {
                            companyInfo.Address = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'ZipCode') {
                            companyInfo.ZipCode = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'City') {
                            companyInfo.City = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'CountryName') {
                            companyInfo.Country = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'CommercialRegister') {
                            companyInfo.SiretNumber = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'TaxNumber') {
                            companyInfo.NafCode = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'VatId') {
                            companyInfo.VatNumber = PosSetting.SettingValue;
                        }
                        if (PosSetting.SettingKey == 'MainColor') {
                            if (PosSetting.SettingValue) {
                                $rootScope.tenantColor = PosSetting.SettingValue;
                            }
                        }
                        if (PosSetting.SettingKey == 'AltColor') {
                            if (PosSetting.SettingValue) {
                                $rootScope.tenantAltColor = PosSetting.SettingValue;
                            }
                        }
                        if (PosSetting.SettingKey == 'TextColor') {
                            if (PosSetting.SettingValue) {
                                $rootScope.textColor = PosSetting.SettingValue;
                            }
                        }
                        if (PosSetting.SettingKey == 'BornePaidText') {
                            if (PosSetting.SettingValue) {
                                $rootScope.bornePaidText = PosSetting.SettingValue;
                            }
                        }
                        if (PosSetting.SettingKey == 'BorneToBePaidText') {
                            if (PosSetting.SettingValue) {
                                $rootScope.borneToBePaidText = PosSetting.SettingValue;
                            }
                        }

                        if (PosSetting.SettingKey == 'BorneCollectionItemNameForHere') {
                            if (PosSetting.SettingValue) {
                                $rootScope.borneForHereCollectLabel = PosSetting.SettingValue;
                            }
                        }
                        if (PosSetting.SettingKey == 'BorneCollectionItemNameTakeaway') {
                            if (PosSetting.SettingValue) {
                                $rootScope.borneTakeawayCollectLabel = PosSetting.SettingValue;
                            }
                        }
                    }

                    $rootScope.cacheCompanyInfo = companyInfo;
                    companyInfoDefer.resolve(companyInfo);
                } else {
                    companyInfoDefer.reject("Setting not found !");
                }
            }, (err) => {
                companyInfoDefer.reject(err);
            });
        } else {
            companyInfoDefer.reject("Database isn't ready !");
        }
        return companyInfoDefer.promise;
    };

    this.getBorneImages = () => {
        if ($rootScope.modelDb.dataReady) {
            $rootScope.dbInstance.rel.find('Setting').then((results) => {
                let settings = Enumerable.from(results.Settings).toArray();
                if (settings) {
                    for (let setting of settings) {
                        if (setting.Name && setting.Name === "smartstore.core.domain.cms.contentslidersettings") {
                            let dataImgs = JSON.parse(setting.Value);
                            let listPubImages = [];
                            for (let image of dataImgs.Slides) {
                                if (image.Group === "PicturesBorne") {
                                    if (image.Title === "backgroundIdle") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneBgIdle = data;
                                        });
                                    } else if (image.Title === "backgroundModalBorne") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneBgModal = data;
                                        });
                                    } else if (image.Title === "backgroundCatalogVertical") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneBgCatalogVertical = data;
                                        });
                                    } else if (image.Title === "backgroundCatalogHorizontal") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneBgCatalogHorizontal = data;
                                        });
                                    } else if (image.Title === "mainLogo") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneMainLogo = data;
                                        });
                                    } else if (image.Title === "altLogo") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneAltLogo = data;
                                        });
                                    } else if (image.Title === "recapHeader") {
                                        pictureService.getPictureUrlAsync(image.PictureId).then((data) => {
                                            $rootScope.borneRecapHeader = data;
                                        });
                                    }
                                } else if (image.Group === "PubBorne") {
                                    pictureService.getPictureUrlAsync(image.PictureId).then(function (data) {
                                        listPubImages.push(data);
                                        $rootScope.bornePubImages = listPubImages;
                                    });
                                }
                            }
                        }
                    }
                }
            });
        }
    };

    // return cache value of the round precision setting
    this.getRoundNumberPrecision = () => {
        return cacheRoundPricesDigit;
    };

    // Get the paymentmodes available
    this.getPaymentModesAsync = (addLoyaltyPaymentModes) => {
        let paymentDefer = $q.defer();
        if ($rootScope.modelDb) {
            if ($rootScope.modelDb.dataReady) {
                $rootScope.dbInstance.rel.find('Setting').then((results) => {
                    let paymentSetting = null;

                    // Payment modes generic
                    let paymentWillbecard = Enumerable.from(results.Settings).firstOrDefault(s => s.Name == 'willbecardpaymentsettings.paiementoptionlist');
                    if (paymentWillbecard) {
                        paymentSetting = JSON.parse(paymentWillbecard.Value);
                    }

                    let paymentLyfpay = Enumerable.from(results.Settings).firstOrDefault(s => s.Name == 'lyfpaypaymentsettings.paiementoptionlist' && (s.StoreId === 0 || s.StoreId === $rootScope.IziBoxConfiguration.StoreId));
                    if (paymentLyfpay && paymentLyfpay.Value) {
                        let shopCode = Enumerable.from(results.Settings).firstOrDefault(s => s.Name == 'lyfpaypaymentsettings.shopcode');

                        if (window.lyfPay && shopCode) {
                            const lyfPayPromise = new Promise((resolve, reject) => {
                                window.lyfPay.initLyfPay(shopCode.Value, resolve, reject);
                            });
                            lyfPayPromise.then((res) => {
                                let lyfpay = JSON.parse(paymentLyfpay.Value);
                                paymentSetting = paymentSetting.concat(lyfpay);
                            }).catch((err) => {
                                console.log("LyfPay init error : " + err);
                            }).then(() => {
                                self.loadPaymentModesAsync(results.Settings, paymentSetting, addLoyaltyPaymentModes, paymentDefer);
                            });
                        } else {
                            self.loadPaymentModesAsync(results.Settings, paymentSetting, addLoyaltyPaymentModes, paymentDefer);
                        }
                    } else {
                        self.loadPaymentModesAsync(results.Settings, paymentSetting, addLoyaltyPaymentModes, paymentDefer);
                    }
                }, (err) => {
                    paymentDefer.reject(err);
                });
            } else {
                paymentDefer.reject("Database isn't ready !");
            }
        }

        return paymentDefer.promise;
    };

    this.loadPaymentModesAsync = (resultSettings, paymentSetting, addLoyaltyPaymentModes, paymentDefer) => {
        if (!paymentSetting) {
            paymentSetting = [];
        }

        // EasyTransac
        let paymentEasyTransac = resultSettings.find(s => s.Name === "easytransacpaymentsettings.easytransackey");
        if (paymentEasyTransac) {

            const easytransacValue = {
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

        if ($rootScope.IziBoxConfiguration.UseFID && addLoyaltyPaymentModes) {
            loyaltyService.getallbalancetypes(true).then((balanceTypes) => {
                for (let bt of balanceTypes) {
                    const lineBalance = {
                        PaymentType: PaymentType.FIDELITE,
                        Text: bt.Name,
                        Value: bt.Name,
                        Selected: false,
                        IsBalance: true,
                        Disabled: false,
                        Group: null
                    };
                    paymentSetting.push(lineBalance);
                }
                paymentDefer.resolve(paymentSetting);
            }, (err) => {
                console.error(err);
                // Add default Name
                const lineBalance = {
                    PaymentType: PaymentType.FIDELITE,
                    Text: "Ma Cagnotte",
                    Value: "Ma Cagnotte",
                    Selected: false,
                    IsBalance: true,
                    Disabled: false,
                    Group: null
                };
                paymentSetting.push(lineBalance);
                paymentDefer.resolve(paymentSetting);
            });
        } else {
            paymentDefer.resolve(paymentSetting);
        }
    };

    // Get Steps Name
    this.getStepNamesAsync = () => {
        let valuesDefer = $q.defer();

        if ($rootScope.modelDb.dataReady) {
            if (cacheStepNames) {
                valuesDefer.resolve(cacheStepNames);
            } else {
                $rootScope.dbInstance.get('Steps_1_0000000000000000').then((results) => {
                    cacheStepNames = results.data;
                    valuesDefer.resolve(cacheStepNames);
                }, () => {
                    valuesDefer.reject("Step names not found !");
                });
            }
        } else {
            valuesDefer.reject("Database isn't ready !");
        }

        return valuesDefer.promise;
    };

    //Get and sets the currency used for display
    this.getCurrencyAsync = () => {
        let valuesDefer = $q.defer();

        if ($rootScope.modelDb.dataReady) {
            if (currencyLoaded) {
                valuesDefer.resolve(cacheCurrency);
            } else {
                $rootScope.dbInstance.rel.find('Setting').then((results) => {
                    let currencySetting = Enumerable.from(results.Settings).firstOrDefault((setting) => {
                        return setting.Name.indexOf('currencysettings.primarystorecurrencyid') == 0;
                    });

                    currencyLoaded = true;

                    if (currencySetting) {
                        let currencyId = parseInt(currencySetting.Value);
                        $rootScope.dbInstance.rel.find('Currency', currencyId).then((resCurrency) => {
                            cacheCurrency = Enumerable.from(resCurrency.Currencies).firstOrDefault();

                            if (cacheCurrency) {
                                // Obtain currency symbol
                                let number = 0;
                                let currencySymbol = undefined;

                                try {
                                    currencySymbol = number.toLocaleString('fr-FR', {
                                        style: 'currency',
                                        currency: cacheCurrency.CurrencyCode
                                    }).replace('0,00', '').trim()[0];
                                } catch (excCurrency) {
                                    console.error(excCurrency);
                                }

                                if (!currencySymbol || currencySymbol == number) {
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
                                            currencySymbol = "KMF";
                                            break;
                                    }
                                }
                                cacheCurrency.currencySymbol = currencySymbol;
                            }
                            valuesDefer.resolve(cacheCurrency);
                        }, (err) => {
                            cacheCurrency = undefined;
                            valuesDefer.resolve(cacheCurrency);
                        });
                    } else {
                        cacheCurrency = undefined;
                        valuesDefer.resolve(cacheCurrency);
                    }
                }, (err) => {
                    valuesDefer.reject(err);
                });
            }
        } else {
            valuesDefer.reject("Database isn't ready !");
        }
        return valuesDefer.promise;
    };
});