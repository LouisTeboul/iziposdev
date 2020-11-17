app.service('loyaltyService', function ($http, $rootScope, $q, $mdMedia, $translate, $uibModal, $filter) {
    let self = this;

    const checkAuth = () => {

        if (!$rootScope.Logged && !$rootScope.borne && $rootScope.IziBoxConfiguration.UseFid) {
            swal({
                title: "Erreur d'authentification !",
                text: "Veuillez contacter le support"
            });
        }

        return $rootScope.Logged;
    }

    // LOGGED METHODS

    this.getAddressesAsync = (barcode) => {
        const addressesDefer = $q.defer();
        if (checkAuth()) {
            $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/GetAddresses?barcode=' + barcode).then((response) => {
                //Bind les adresse a une variable du scope
                if (response.data.Addresses) {
                    addressesDefer.resolve(response.data.Addresses);
                }
            }, (err) => {
                addressesDefer.reject();
            });

        } else {
            addressesDefer.reject();
        }

        return addressesDefer.promise;
    }

    this.addAdressAsync = (newAddress) => {
        const addressesDefer = $q.defer();

        if (checkAuth()) {
            $http({
                method: 'POST',
                url: $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/AddAddress?barcode=' + barcodeClient,
                data: JSON.stringify(newAddress)
            }).then((success) => {
                console.log(success);
                addressesDefer.resolve()
            }, (error) => {
                console.error(error);
                addressesDefer.reject();
            });
        } else {
            addressesDefer.reject();
        }

        return addressesDefer.promise;
    };

    this.addBalanceCreditAsync = (balance, mode, amountToCredit) => {
        const loyaltyDefer = $q.defer();

        if (checkAuth()) {
            let amountToCreditStr = amountToCredit.toString().replace(",", ".");
            //Contruire l'URL avec les parametres

            let description = mode == "CREDIT" ? "Crédit manuel - " + $rootScope.PosUserName : "Débit manuel - " + $rootScope.PosUserName;

            let urlAPIFid = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/AddBalanceCredit" +
                "?barCodeClient=" + $rootScope.currentShoppingCart.Barcode +
                "&balanceId=" + balance.Id
                // On encode le montant, qui peut etre decimal
                +
                "&amountToCredit=" + amountToCreditStr +
                "&description=" + description;

            let swalTitle = mode == "CREDIT" ? "Crédit" : "Débit";
            let swalText = mode == "CREDIT" ? "Client crédité !" : "Client débité !";

            $http.post(encodeURI(urlAPIFid)).then((res) => {
                swal({
                    title: $translate.instant(swalTitle),
                    text: $translate.instant(swalText),
                    buttons: [false, $translate.instant("Ok")]
                });

                loyaltyDefer.resolve();
            }, (err) => {
                swal({
                    title: $translate.instant(swalTitle),
                    text: $translate.instant("Echec !"),
                    buttons: [false, $translate.instant("Ok")]
                });

                loyaltyDefer.reject(err);
            });

        } else {
            loyaltyDefer.reject();
        }

        return loyaltyDefer.promise;
    };

    // Get required registration fields
    this.getSignInSettingsAsync = () => {
        let loyaltyDefer = $q.defer();

        if (checkAuth()) {
            let settingApi = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/getCustomerSettings';

            $http.get(settingApi).then((ret) => {
                const settings = ret.data;
                const signInSettings = {
                    City: settings.CityRequired,
                    Company: settings.CompanyRequired,
                    Fax: settings.FaxRequired,
                    Phone: settings.PhoneRequired,
                    StreetAddress: settings.StreetAddressRequired,
                    StreetAddress2: settings.StreetAddress2Required,
                    ZipPostalCode: settings.ZipPostalCodeRequired
                };
                loyaltyDefer.resolve(signInSettings);
            }, (err) => {
                loyaltyDefer.reject(err);
            });
        } else {
            loyaltyDefer.reject();
        }

        return loyaltyDefer.promise;
    };

    // Get loyalty classes
    this.getLoyaltyClasses = () => {
        let loyaltyDefer = $q.defer();

        if (checkAuth()) {
            if ($rootScope.IziBoxConfiguration && $rootScope.IziBoxConfiguration.UrlSmartStoreApi) {
                let getLoyaltyUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/GetAllLoyaltyClasses";
                $http.get(getLoyaltyUrl).then((ret) => {
                    loyaltyDefer.resolve(ret.data);
                }, (err) => {
                    loyaltyDefer.reject(err);
                });
            } else {
                loyaltyDefer.reject("Pas de IziBoxConfiguration ou pas d'UrlSmartStoreApi");
            }
        } else {
            loyaltyDefer.reject();
        }

        return loyaltyDefer.promise;
    };

    //Get the loyalty information
    this.getLoyaltyObjectAsync = (barcode, whisOrdersAcivate = false) => {
        let loyaltyDefer = $q.defer();
        if (checkAuth()) {
            let getLoyaltyUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/GetLoyaltyObject?barcode=" + barcode + "&withOrders=" + whisOrdersAcivate;
            console.log(getLoyaltyUrl);
            $http({
                url: getLoyaltyUrl,
                method: "GET",
                timeout: 20000
            }).then((response) => {
                if (response && response.data) {
                    console.log(response);
                    //Si on a pas de customer
                    //On créer un guest customer pour cette fidélité pour permettre de cagnotter la carte
                    //Le guest customer n'est pas supprimé par la tache de maintenance
                    if (response.data.CustomerId == 0 && response.data.AllowAnonymous && response.data.Barcodes.length != 0) {
                        barcodeNumber = response.data.Barcodes[0].Barcode;

                        //On crée l'objet pour enregister un client anonyme
                        var request = {
                            "Barcode": barcodeNumber
                        };

                        // we don't call another method
                        // => https://github.com/angular/angular.js/issues/2702
                        var getRegisterUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RegisterAnonymous";

                        // Why do we need to stringify twice ?
                        // https://docs.angularjs.org/api/ng/service/$http
                        $http.post(getRegisterUrl, JSON.stringify(JSON.stringify(request)), {
                            timeout: 10000
                        }).then((resRegister) => {
                            response.data = resRegister.data;
                            loyaltyDefer.resolve(response.data);
                        }, (err) => {
                            console.error(err);
                            loyaltyDefer.reject("Error registering anonymous customer");
                        });
                        return loyaltyDefer.promise;
                    }

                    Enumerable.from(response.data.Offers).forEach(function (o) {
                        o.OfferParam = JSON.parse(o.OfferParam);
                    });
                    loyaltyDefer.resolve(response.data);
                    return loyaltyDefer.promise;
                } else {
                    loyaltyDefer.reject("Error retrieving barcode information");
                    swal({
                        title: $translate.instant("Numéro de carte inconnu")
                    });
                    //loyaltyDefer.resolve();
                    return loyaltyDefer.promise;
                }
            }, (err) => {
                loyaltyDefer.reject(err);
            });
        } else {
            loyaltyDefer.reject();
        }

        return loyaltyDefer.promise;
    };

    this.getallbalancetypes = (onlyUseToPay) => {
        let getallbalancetypesDefer = $q.defer();

        if (checkAuth()) {
            const getallbalancetypeUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/GetAllBalanceTypes";

            $http.get(getallbalancetypeUrl, {
                timeout: 10000
            }).then((ret) => {
                let balanceTypes = [];
                if (onlyUseToPay) {
                    Enumerable.from(ret.data).forEach(function (bt) {
                        if (bt.UseToPay) {
                            balanceTypes.push(bt);
                        }
                    });
                } else {
                    balanceTypes = ret.data;
                }
                getallbalancetypesDefer.resolve(balanceTypes);
            }, (err) => {
                getallbalancetypesDefer.reject("Error GetBalanceTypes");
                console.log("Erreur lors de la récupération des types de cagnotte");
                //swal({ title: $translate.instant("Erreur lors de la récupération des types de cagnotte") });
            });
        } else {
            getallbalancetypesDefer.reject();
        }

        return getallbalancetypesDefer.promise;
    };

    this.addPassageAsync = (loyaltyRequest) => {
        //console.log(loyaltyRequest);
        let addPassageDefer = $q.defer();
        if (checkAuth()) {
            const addPassageUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/AddPassageJson";

            $http.post(addPassageUrl, loyaltyRequest, {
                timeout: 10000
            }).then(function (data, status, headers, config) {
                addPassageDefer.resolve(data);
            }, function (response) {
                addPassageDefer.reject("Error addPassage");
                swal({
                    title: $translate.instant("Erreur lors de l'enregistrement de l'utilisation de l'offre")
                });
            });
        } else {
            addPassageDefer.reject();
        }

        return addPassageDefer.promise;
    };

    //Register a partial customer - firstname, lastname, mail are mandatory
    this.registerCustomerAsync = (loyalty) => {
        var registerDefer = $q.defer();

        if (checkAuth()) {
            var getRegisterAnonymousUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RegisterAnonymousJson";
            var code;

            //if (loyalty.AllowCustomerToCreateLoyaltyBarcode)
            if (loyalty.Barcodes && loyalty.Barcodes.length > 0) {
                code = loyalty.Barcodes[0].Barcode;
            } else {
                if (loyalty.barcode) {
                    code = loyalty.barcode.barcodeValue;
                }
            }
            let obj = "";
            if (code == undefined && loyalty.AllowCustomerToCreateLoyaltyBarcode) {
                obj = {
                    "FirstName": loyalty.CustomerFirstName,
                    "LastName": loyalty.CustomerLastName,
                    "Email": loyalty.CustomerEmail
                };
            } else {
                obj = {
                    "Barcode": code,
                    "FirstName": loyalty.CustomerFirstName,
                    "LastName": loyalty.CustomerLastName,
                    "Email": loyalty.CustomerEmail
                };
            }
            $http.post(getRegisterAnonymousUrl, obj, {
                timeout: 10000
            }).then(function (response) {
                registerDefer.resolve(response.data);
            }, function (response) {
                registerDefer.reject("Error registering customer");
                if (response.statusText != undefined && response.statusText != '') {
                    swal({
                        title: $translate.instant(response.statusText)
                    });
                } else {
                    //Si pas de reponse du serveur
                    swal({
                        title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                    });
                }
            });
        } else {
            registerDefer.reject();
        }

        return registerDefer.promise;
    };

    this.getAllOffersAsync = (loyaltyClassId) => {
        const offerDefer = $q.defer();

        if (checkAuth()) {
            const getUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/GetAllOfferClasses";
            $http.get(getUrl, {
                timeout: 10000
            }).then(function (response) {
                offerDefer.resolve(response.data);
            }, function (response) {
                offerDefer.reject("Error getting offers");
                if (response.statusText !== undefined && response.statusText !== '') {
                    swal({
                        title: $translate.instant(decodeURIComponent(escape(response.statusText)))
                    });
                } else {
                    //Si pas de réponse du serveur
                    swal({
                        title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                    });
                }
            });
        } else {
            offerDefer.reject();
        }



        return offerDefer.promise;
    };

    this.updateCustomerAsync = (loyalty) => {
        const updateDefer = $q.defer();

        if (checkAuth()) {
            const UpdateUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/UpdateJSON";

            $http.post(UpdateUrl, loyalty, {
                timeout: 10000
            }).then((response) => {
                updateDefer.resolve(response.data);
            }, (err) => {
                updateDefer.reject("Error updating customer");
                if (err.statusText !== undefined && err.statusText !== '') {
                    swal({
                        title: $translate.instant(decodeURIComponent(escape(response.statusText)))
                    });
                } else {
                    //Si pas de réponse du serveur
                    swal({
                        title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                    });
                }
            });
        } else {
            updateDefer.reject();
        }

        return updateDefer.promise;
    };

    //Register a full customer - mandatory fields only
    this.registerFullCustomerAsync = (loyalty) => {
        var registerDefer = $q.defer();

        if (checkAuth()) {
            var getRegisterUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RegisterJSON";
            var code;
            var obj = {};

            if (loyalty.Barcodes && loyalty.Barcodes.length > 0 && loyalty.Barcodes) {
                code = loyalty.Barcodes[0].Barcode;
            } else {
                if (loyalty.barcode && loyalty.barcode.barcodeValue != "") {
                    code = loyalty.barcode.barcodeValue;
                }
            }

            if (code == undefined && loyalty.AllowCustomerToCreateLoyaltyBarcode) {
                delete loyalty['barcode'];
                Enumerable.from(loyalty).forEach(function (field) {
                    var newKey = field.key.replace("Customer", "");
                    obj[newKey] = field.value;
                });
            } else {
                delete loyalty['barcode'];
                Enumerable.from(loyalty).forEach(function (field) {
                    var newKey = field.key.replace("Customer", "");
                    obj[newKey] = field.value;
                });
                obj.Barcode = code;
            }
            console.log(obj);
            $http.post(getRegisterUrl, obj, {
                timeout: 10000
            }).then((response) => {
                registerDefer.resolve(response.data);
            }, (err) => {
                registerDefer.reject("Error registering customer");
                if (err.statusText != undefined && err.statusText != '') {
                    swal({
                        title: $translate.instant(decodeURIComponent(escape(err.statusText)))
                    });
                } else {
                    //Si pas de réponse du serveur
                    swal({
                        title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                    });
                }
            });
        } else {
            registerDefer.reject();
        }

        return registerDefer.promise;
    };

    //Search for a customer with an existing the loyalty
    this.searchForCustomerAsync = (query) => {
        var searchDefer = $q.defer();
        if (checkAuth()) {
            var getSearchUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTCustomer/GetSearchCustomer?searchString=" + query;

            $http({
                url: getSearchUrl,
                method: "GET",
                timeout: 20000
            }).then(function (response) {
                searchDefer.resolve(response.data);
            }, function (err) {
                searchDefer.reject(err);
            });

        } else {
            searchDefer.reject();
        }

        return searchDefer.promise;
    };

    this.addAccountConsignor = (data) => {
        $rootScope.createShoppingCart();
        self.removeAllLoyalties();

        if (data.Consignor) {
            $rootScope.currentShoppingCart.customerAccountConsignor = data.Consignor;
            self.addEnCompte();
        }
        else {
            $rootScope.currentShoppingCart.customerAccountConsignor = null;
        }

        $rootScope.currentShoppingCart.customerInfo = {
            Id: data.Customer.Id,
            Company: data.Customer.Company,
            Email: data.Customer.Email,
            FirstName: data.Customer.FirstName,
            LastName: data.Customer.LastName,
            PhoneNumber: data.Customer.PhoneNumber
        };

        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
    };

    this.getLoyaltyAsync = (barcode) => {
        const loyaltyDefer = $q.defer();

        if (checkAuth()) {
            barcode = barcode.trim();

            if (barcode) {
                self.getLoyaltyObjectAsync(barcode).then((loyalty) => {
                    $rootScope.createShoppingCart();
                    self.removeAllLoyalties();
                    if (loyalty && ((loyalty.CustomerId && loyalty.CustomerId !== 0))) { // Client fidèle

                        if (loyalty.CustomerAccountConsignor) {
                            $rootScope.currentShoppingCart.customerAccountConsignor = loyalty.CustomerAccountConsignor;
                            self.addEnCompte();
                        }
                        else {
                            $rootScope.currentShoppingCart.customerAccountConsignor = null;
                        }

                        $rootScope.currentShoppingCart.customerInfo = {
                            Id: loyalty.CustomerId,
                            Company: loyalty.CustomerCompany,
                            Email: loyalty.CustomerEmail,
                            FirstName: loyalty.CustomerFirstName,
                            LastName: loyalty.CustomerLastName,
                            PhoneNumber: loyalty.CustomerPhone
                        };

                        $rootScope.currentShoppingCart.Barcode = barcode;
                        $rootScope.currentShoppingCart.customerLoyalty = loyalty;
                        self.calculateLoyalty();
                        $rootScope.$emit("customerLoyaltyChanged", loyalty);
                        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                        loyaltyDefer.resolve();


                    } else if (loyalty && angular.isObject(loyalty) && loyalty.Offers && loyalty.Offers.length > 0) { // Offre

                        // Si il y a deja une offre au panier
                        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Offer) {
                            // On ne fait rien
                            swal({
                                title: "Une offre maximum par commande !"
                            });
                            loyaltyDefer.reject();
                        } else {
                            // Offre sans lien avec un client
                            let selectedOffer = loyalty && loyalty.Offers && loyalty.Offers.length > 0 ? loyalty.Offers[0] : null;

                            if (!selectedOffer.OfferParam ||
                                (selectedOffer.OfferParam &&
                                    !selectedOffer.OfferParam.MinOrderIncTax ||
                                    (selectedOffer.OfferParam.MinOrderIncTax && $rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Total > selectedOffer.OfferParam.MinOrderIncTax))) {
                                if (selectedOffer.isValid) {
                                    self.applyOffer(selectedOffer);
                                    loyaltyDefer.resolve();
                                } else {
                                    swal({
                                        title: selectedOffer.OfferClassDescription + " n'est plus disponible"
                                    });
                                    loyaltyDefer.reject();
                                }
                            } else {
                                swal({
                                    title: `Offre valable pour un minimum de ${$filter('CurrencyFormat')(selectedOffer.OfferParam.MinOrderIncTax)} de commande`
                                });
                                loyaltyDefer.reject();
                            }
                        }
                    } else {
                        if (loyalty && loyalty !== '' && !angular.isObject(loyalty)) {
                            swal({
                                title: $translate.instant(loyalty)
                            });
                            loyaltyDefer.resolve();
                        } else {
                            if (!$rootScope.borne) {
                                swal({
                                    title: $translate.instant("Carte de fidélité introuvable !")
                                });
                            }
                            loyaltyDefer.reject();
                        }
                    }
                }, (err) => {
                    console.error(err);
                    swal({
                        title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                    });
                    loyaltyDefer.reject();
                    $rootScope.hideLoading();
                });
            } else {
                loyaltyDefer.reject("No barcode provided");
            }
        } else {
            loyaltyDefer.reject();
        }

        return loyaltyDefer.promise;
    };



    // NOT LOGGED METHODS

    //Delete balance and offer in the customer loyalty
    this.removeAllLoyalties = () => {
        if ($rootScope.currentShoppingCart) {
            if ($rootScope.currentShoppingCart.customerLoyalty) {
                const offersToRemove = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Offers).where(o => o.isApplied).toArray();

                if (offersToRemove.length > 0) {
                    discountService.removeOffers(offersToRemove);
                }
                const balancesToRemove = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Balances).toArray();

                if (balancesToRemove.length > 0) {
                    self.removeBalances(balancesToRemove);
                }
            }

            // Remove le consignor aussi
            delete $rootScope.currentShoppingCart.Consignor;

            // Update TotalPayment
            let totalPaymentLoyalty = 0;
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                let paymentLoyalty = $rootScope.currentShoppingCart.PaymentModes.filter(pma => pma.IsBalance && pma.PaymentType === PaymentType.FIDELITE);
                if (paymentLoyalty) {
                    totalPaymentLoyalty = paymentLoyalty.reduce((acc, b) => acc + b.Total, 0);
                }
            }

            $rootScope.currentShoppingCart.TotalPayment = roundValue($rootScope.currentShoppingCart.TotalPayment - totalPaymentLoyalty);
            $rootScope.currentShoppingCart.Residue = roundValue($rootScope.currentShoppingCart.Total - $rootScope.currentShoppingCart.TotalPayment);

            // Deleted BalanceUpdate and Loylaty PaymentModes
            $rootScope.currentShoppingCart.Barcode = undefined;
            $rootScope.currentShoppingCart.BalanceUpdate = undefined;
            if ($rootScope.currentShoppingCart.PaymentModes && $rootScope.currentShoppingCart.PaymentModes.length > 0) {
                $rootScope.currentShoppingCart.PaymentModes = $rootScope.currentShoppingCart.PaymentModes.filter(pma => !pma.IsBalance && pma.PaymentType !== PaymentType.FIDELITE);
            }

            // Deleted Offer
            $rootScope.currentShoppingCart.Offer = undefined;
            $rootScope.currentShoppingCart.Items = $rootScope.currentShoppingCart.Items.filter(item => !item.Offer);
        }
    };

    //Empty Obj for loyalty operation
    //{{Login: null, Password: null, Key: null, Barcode: (*|string), CustomerFirstName: *, CustomerLastName: *, CustomerEmail: *, OrderTotalIncludeTaxes: number, OrderTotalExcludeTaxes: number, CurrencyCode: string, Items: Array, BalanceUpdate: {}, OrderSpecificInfo: string}}
    this.createEmptyPassageObj = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty && $rootScope.currentShoppingCart.customerLoyalty.Barcodes.length > 0) {
            return {
                "Login": null,
                "Password": null,
                "Key": null,
                "Barcode": $rootScope.currentShoppingCart.customerLoyalty.Barcodes[0].Barcode,
                "CustomerFirstName": $rootScope.currentShoppingCart.customerLoyalty.CustomerFirstName,
                "CustomerLastName": $rootScope.currentShoppingCart.customerLoyalty.CustomerLastName,
                "CustomerEmail": $rootScope.currentShoppingCart.customerLoyalty.CustomerEmail,
                "OrderTotalIncludeTaxes": 0,
                "OrderTotalExcludeTaxes": 0,
                "CurrencyCode": "EUR", // TODO: This is hardcoded and should be changed
                "Items": [],
                "BalanceUpdate": {},
                "OrderSpecificInfo": "2",
                "Offer": {}
            };
        } else {
            return {};
        }
    };

    //Modal for the loyalty 'custom action' choice
    this.openCustomActionModal = () => {
        $uibModal.open({
            templateUrl: 'modals/modalCustomAction.html',
            controller: 'ModalCustomActionController',
            backdrop: 'static',
            size: 'lg'
        });
    };

    //Apply offers - text offers are not available to use
    this.calculateLoyalty = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty && $rootScope.currentShoppingCart.customerLoyalty.Offers) {
            const totalCart = $rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Total ? $rootScope.currentShoppingCart.Total : 0;
            //Remove offers that no longer apply
            const offersToRemove = $rootScope.currentShoppingCart.customerLoyalty.Offers.filter(o => o.OfferParam && o.isValid && (o.OfferParam.MinOrderIncTax && o.OfferParam.MinOrderIncTax > totalCart) && o.isApplied);

            if (offersToRemove.length > 0) {
                discountService.removeOffers(offersToRemove);
            }
            if (!Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Offers).any("o=>o.isApplied")) {
                // Obtains relevant offers
                $rootScope.currentShoppingCart.customerLoyalty.RelevantOffers = $rootScope.currentShoppingCart.customerLoyalty.Offers.filter(o => o.isValid &&
                    (o.OfferTypeName === "PromoText" || o.OfferParam && (!o.OfferParam.MinOrderIncTax || o.OfferParam.MinOrderIncTax && o.OfferParam.MinOrderIncTax <= totalCart)) && !o.isApplied);
            } else {
                $rootScope.currentShoppingCart.customerLoyalty.RelevantOffers = undefined;
            }
            if (!$rootScope.$$phase) {
                $rootScope.$apply();
            }
            // Obtains balances can be used to pay
            let relevantBalances = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Balances).where(o => o.UseToPay && o.MinOrderTotalIncVAT <= totalCart).toArray();

            if (relevantBalances.length > 0) {
                self.applyBalances(relevantBalances);
            }
            //Remove balances that no longer apply
            const balancesToRemove = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Balances).where(o => o.MinOrderTotalIncVAT > totalCart).toArray();

            if (balancesToRemove.length > 0) {
                self.removeBalances(balancesToRemove);
            }
        }
    };

    this.applyBalances = (balances) => {
        $rootScope.paymentModesAvailable = $rootScope.paymentModesAvailable.filter(pma => !pma.IsBalance);
        // Il faut delete les autres balances avant d'ajouter celles ci
        for (let i = 0; i < balances.length; i++) {
            const balance = balances[i];
            //Create new payment mode
            const paymentModeExists = $rootScope.paymentModesAvailable.some(p => p.Balance && p.Balance.Id === balance.Id);

            if (!paymentModeExists && !$rootScope.currentShoppingCart.DeliveryPartnerId) {
                const newPaymentMode = {
                    PaymentType: PaymentType.FIDELITE,
                    Text: balance.BalanceName,
                    Value: balance.BalanceName,
                    Balance: balance,
                    IsBalance: true
                };
                $rootScope.paymentModesAvailable.push(newPaymentMode);
            }
        }
        $rootScope.$evalAsync();
        $rootScope.resizeMiniBasket();
    };

    this.addBalanceUpdate = (balanceUpdate) => {
        $rootScope.currentShoppingCart.BalanceUpdate = balanceUpdate;
    };

    this.applyOffer = (offer) => {
        switch (offer.OfferTypeName) {
            case "AddProduct":
                offer.isApplied = true;
                self.offerAddProduct(offer);
                break;
            case "PromoText":
                offer.isApplied = true;
                self.offerPromoText(offer);
                break;
            case "OneProductInCategory":
                offer.isApplied = true;
                self.offerOneProductInCategory(offer);
                break;
            default:
                console.log("Unrecognized offer");
        }
        if (!$rootScope.currentShoppingCart) {
            $rootScope.createShoppingCart();
        }
        $rootScope.currentShoppingCart.Offer = offer;
    };

    this.offerOneProductInCategory = (offer) => {
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
            resolve: {
                offerOneProductInCategory: () => {
                    return offer;
                },
                discountOneProductInCategory: null
            }
        });

        modalInstance.result.then((product) => {
            // Si le produit en question est une formule
            if (product.ProductAttributes.length > 0) {
                $rootScope.addToCart(product, false, offer, null, true);
            } else {
                $rootScope.addToCart(product, true, offer);
            }
        });
    };

    this.offerPromoText = (offer) => {
        let modal = "modals/modalPromoText.html";
        let size = "bigModal";

        if ($rootScope.borne) {
            modal = "modals/modalPromoTextBorne.html";
        }
        if (!$rootScope.borneVertical) {
            size = "smallModal";
        }
        $uibModal.open({
            templateUrl: modal,
            controller: 'ModalPromoTextController',
            windowClass: 'centeredModals ' + size,
            resolve: {
                offerPromoText: () => {
                    return offer;
                }
            },
            backdrop: 'static'
        });
    };

    this.offerAddProduct = (offer) => {
        //Obtain product id to add
        const productIds = self.getProductIdsFromOfferParam(offer.OfferParam);
        const offerPrice = offer.OfferParam.Price;

        $rootScope.getProductByIdsAsync(productIds).then((products) => {
            for (let product of products) {
                //Apply offer price
                product.Price = offerPrice > product.Price ? product.Price : offerPrice;

                if (product.ProductAttributes.length > 0) {
                    $rootScope.addToCart(product, false, offer);
                } else {
                    $rootScope.addToCart(product, true, offer);
                }
            }
        });
    };

    //Get the product id from the loyalty offer parameter
    this.getProductIdsFromOfferParam = (offerParam) => {
        let productIds = [];

        for (let i = 0; i < offerParam.ProductId.length; i++) {
            let productIdName = offerParam.ProductId[i];
            let idxName = productIdName.indexOf("-");

            if (idxName >= 0) {
                let productId = parseInt(productIdName.substring(0, idxName));
                productIds.push(productId);
            }
        }

        return productIds;
    };

    this.addEnCompte = () => {
        const paymentModeExists = $rootScope.paymentModesAvailable.some(p => p.PaymentType === PaymentType.ENCOMPTE);
        if (!paymentModeExists) {
            const newPaymentMode = {
                PaymentType: PaymentType.ENCOMPTE,
                Text: "En compte",
                Value: "EN-COMPTE",
                IsBalance: false
            };
            $rootScope.paymentModesAvailable.push(newPaymentMode);
        }
        $rootScope.$evalAsync();
        $rootScope.resizeMiniBasket();
    };

    this.removeBalances = (balancesToRemove) => {
        for (let i = 0; i < balancesToRemove.length; i++) {
            const balance = balancesToRemove[i];
            const idxToRemove = Enumerable.from($rootScope.paymentModesAvailable).indexOf(p => p.Value == balance);

            if (idxToRemove > -1) {
                $rootScope.paymentModesAvailable.splice(idxToRemove);
            }
        }
        $rootScope.$evalAsync();
        $rootScope.resizeMiniBasket();
    };
});