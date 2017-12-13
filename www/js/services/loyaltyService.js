
app.service('loyaltyService', ["$http", "$rootScope", "$q", "$translate",
    function ($http, $rootScope, $q, $translate) {
        // TODO: Put this in a loyalty service

        /**
         * Get the loyalty information
         * Register anonymously the loyalty card
         * @param barcode barcode number
         */
        this.getLoyaltyObjectAsync = function (barcode) {
            var loyaltyDefer = $q.defer();
            var getLoyaltyUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/GetLoyaltyObject?barcode=" + barcode;

            var callLoyalty = function (retry) {
                $http({
                    url: getLoyaltyUrl,
                    method: "GET",
                    timeout: 20000
                }).then(function (response) {
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
                            var getRegisterUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/RegisterAnonymous";

                            // Why do we need to stringify 2 times ?
                            // https://docs.angularjs.org/api/ng/service/$http
                            $http.post(getRegisterUrl, JSON.stringify(JSON.stringify(request)), {timeout: 10000}).success(function (data, status, headers, config) {
                                response.data = data;
                                loyaltyDefer.resolve(response.data);
                            }).error(function (data, status, headers, config) {
                                console.log(error);
                                loyaltyDefer.reject("Error registering anonymous customer");
                            });
                            return loyaltyDefer.promise;
                        }

                        Enumerable.from(response.data.Offers).forEach(function (o) {
                            o.OfferParam = JSON.parse(o.OfferParam);
                        });
                        loyaltyDefer.resolve(response.data);
                        return loyaltyDefer.promise;

                    }
                    else {
                        loyaltyDefer.reject("Error retrieving barcode information");
                        sweetAlert($translate.instant("Numéro de carte inconnu"));
                        //loyaltyDefer.resolve();
                        return loyaltyDefer.promise;
                    }

                }, function (err) { //response
                    if (retry < 2) {
                        callLoyalty(retry + 1);
                    } else {
                        loyaltyDefer.reject(err);
                    }
                });
            };

            callLoyalty(0);

            return loyaltyDefer.promise;
        };


        this.addPassageAsync = function (loyaltyRequest) {
            //console.log(loyaltyRequest);
            var addPassageDefer = $q.defer();
            var addPassageUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/AddPassageJson";

            $http.post(addPassageUrl, loyaltyRequest, { timeout: 10000 })
                .then(function (data, status, headers, config) {
                    addPassageDefer.resolve(data);
                }, function (response) {
                    addPassageDefer.reject("Error addPassage");
                    sweetAlert($translate.instant("Erreur lors de l'enregistrement de l'utilisation de l'offre"));
                });
            return addPassageDefer.promise;
        };

        /**
         * Register a partial customer - firstname, lastname, mail are mandatory
         * @param loyalty
         */
        this.registerCustomerAsync = function (loyalty) {
            var registerDefer = $q.defer();
            var getRegisterAnonymousUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/RegisterAnonymousJson";
            var code;

            //if (loyalty.AllowCustomerToCreateLoyaltyBarcode)
            if (loyalty.Barcodes && loyalty.Barcodes.length > 0) {
                code = loyalty.Barcodes[0].Barcode;
            } else {
                if (loyalty.barcode) {
                    code = loyalty.barcode.barcodeValue;
                }
            }

            if (code == undefined && loyalty.AllowCustomerToCreateLoyaltyBarcode) {
                var obj = {
                    "FirstName": loyalty.CustomerFirstName,
                    "LastName": loyalty.CustomerLastName,
                    "Email": loyalty.CustomerEmail
                };
            }
            else {
                var obj = {
                    "Barcode": code,
                    "FirstName": loyalty.CustomerFirstName,
                    "LastName": loyalty.CustomerLastName,
                    "Email": loyalty.CustomerEmail
                };
            }
            $http.post(getRegisterAnonymousUrl, obj, { timeout: 10000 })
                .then(function (response) {
                    registerDefer.resolve(response.data);
                }, function (response) {
                    registerDefer.reject("Error registering customer");
                    if (response.statusText != undefined && response.statusText != '') {
                        sweetAlert($translate.instant(response.statusText));
                    }
                    else {
                        sweetAlert($translate.instant("Erreur lors de l'enregistrement du client"));
                    }
            });

            return registerDefer.promise;
        };


        /**
         * Register a partial customer - firstname, lastname, mail are mandatory
         * @param loyalty
         */
        this.registerFullCustomerAsync = function (loyalty) {
            console.log(loyalty);
            var registerDefer = $q.defer();
            var getRegisterUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/RegisterJSON";
            var code;
            var obj = {};

            //if (loyalty.AllowCustomerToCreateLoyaltyBarcode)
            if (loyalty.Barcodes && loyalty.Barcodes.length > 0 && loyalty.Barcodes) {
                code = loyalty.Barcodes[0].Barcode;
            } else {
                if (loyalty.barcode && loyalty.barcode.barcodeValue != "") {
                    code = loyalty.barcode.barcodeValue;
                }
            }

            if (code == undefined && loyalty.AllowCustomerToCreateLoyaltyBarcode) {
                delete loyalty['barcode'];
                Enumerable.from(loyalty).forEach(function(field){
                    var newKey = field.key.replace("Customer", "");
                    obj[newKey] = field.value;
                });

                console.log(obj)
            }
            else {
                delete loyalty['barcode'];
                Enumerable.from(loyalty).forEach(function(field){
                    var newKey = field.key.replace("Customer", "");
                    obj[newKey] = field.value;
                });
                obj.Barcode = code;

                //En attendant mise en prod du fix de l'API
                obj.DateOfBirth = "test au max";
            }
            $http.post(getRegisterUrl, obj, { timeout: 10000 })
                .then(function (response) {
                    registerDefer.resolve(response.data);
                }, function (response) {
                    registerDefer.reject("Error registering customer");
                    if (response.statusText != undefined && response.statusText != '') {
                        sweetAlert($translate.instant(response.statusText));
                    }
                    else {
                        sweetAlert($translate.instant("Erreur lors de l'enregistrement du client"));
                    }
                });

            return registerDefer.promise;
        };

        /**
         * Search for a customer with an existing the loyalty
         * @param query
         */
        this.searchForCustomerAsync = function (query) {
            var searchDefer = $q.defer();
            var getSearchUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/GetSearchCustomer?searchString=" + query;

            $http({
                url: getSearchUrl,
                method: "GET",
                timeout: 20000
            }).then(function (response) {
                searchDefer.resolve(response.data);
            }, function (err) {
                searchDefer.reject(err);
            });

            return searchDefer.promise;
        };
    }
]);