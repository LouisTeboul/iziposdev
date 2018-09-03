/**
 * Modal available for phone orders
 * Select an existing customer, or fully create one
 */
app.controller('ModalCustomerForPhoneController', function ($scope, $rootScope, $q, $http, $uibModalInstance, $uibModal, shoppingCartService, loyaltyService, ngToast, shoppingCartModel, $translate, $timeout) {

    let current = this;
    $rootScope.currentPage = 1;

    $scope.init = function () {

        $scope.validDisabled = false;
        $scope.search = {};
        $scope.barcode = {};
        $scope.firstName;
        $scope.lastName;
        $scope.email;
        $scope.clientSelected = false;
        $scope.registerFull = false;
        $scope.signInSettings = undefined;

        let settingApi = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/RESTLoyalty/getCustomerSettings';
        console.log(settingApi);


        $http.get(settingApi).success(function (settings) {
            console.log(settings);
            $scope.signInSettings = {
                City: settings.CityRequired,
                Company: settings.CompanyRequired,
                Fax: settings.FaxRequired,
                Phone: settings.PhoneRequired,
                StreetAddress: settings.StreetAddressRequired,
                StreetAddress2: settings.StreetAddressRequired2,
                ZipPostalCode: settings.ZipPostalCodeRequired
            };
        });

        $timeout(function () {
            document.querySelector("#searchBar").focus();
        }, 100);

        $scope.newLoyalty = {};
        $scope.isLoyaltyEnabled = {
            value: 'Fid'
        };

        $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
        $scope.clientUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi.replace("/api", "");
    };

    $scope.pageChanged = function () {
        $rootScope.closeKeyboard();
        switch ($rootScope.currentPage) {
            case 1:
                $timeout(function () {
                    document.querySelector("#email").focus();
                }, 50);
                break;
            case 2:
                $timeout(function () {
                    document.querySelector("#city").focus();
                }, 50);
                break;
            case 3:
                $timeout(function () {
                    document.querySelector("#ZipPostalCode").focus();
                }, 50);
                break;
            case 4:
                $timeout(function () {
                    document.querySelector("#txtBarcodeCustomer").focus();
                }, 50);
                break;
            default:
                break;
        }
    };

    $scope.toggleRegisterFull = function () {
        $scope.registerFull = !$scope.registerFull;
    };

    //Recherche de client par nom, prénom ou email
    $scope.searchForCustomer = function () {
        loyaltyService.searchForCustomerAsync($scope.search.query).then(function (res) {
            $scope.search.results = res;
        }, function () {
            $scope.search.results = [];
        });
        $rootScope.closeKeyboard();
    };

    $scope.setMode = function (mode) {
        $rootScope.closeKeyboard();
        switch (mode) {
            case "RECH":
                $timeout(function () {
                    document.querySelector("#searchBar").focus();
                }, 100);
                break;
            case "ENR" :
                $timeout(function () {
                    document.querySelector("#email").focus();
                }, 100);
                break;
        }
    };


    /**
     * Add the customer loyalty info to the current shopping cart
     * @param barcode
     */
    $scope.selectCustomer = function (barcode) {
        barcode = barcode.trim();
        if (barcode) {
            $rootScope.showLoading();

            /**Proposer de renseigner une adresse de livraison */
            /*
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalPromptDeliveryAddress.html',
                controller: 'ModalPromptDeliveryAddressController',
                resolve: {
                    barcodeClient: function () {
                        return barcode;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then(function (deliveryAddress) {
                console.log(deliveryAddress);
                $scope.currentShoppingCart.deliveryAddress = {
                    Address1: deliveryAddress.Address1,
                    ZipPostalCode: deliveryAddress.ZipPostalCode,
                    City: deliveryAddress.City,
                    Floor: deliveryAddress.Floor,
                    Door: deliveryAddress.Door,
                    Digicode: deliveryAddress.Digicode,
                    InterCom: deliveryAddress.InterCom,
                    PhoneNumber: deliveryAddress.PhoneNumber
                };

            }, function () {
                $rootScope.hideLoading()

            });
            */

            loyaltyService.getLoyaltyObjectAsync(barcode).then(function (loyalty) {
                if (loyalty && loyalty.CustomerId != 0) {
                    if ($scope.currentShoppingCart == undefined) {
                        shoppingCartModel.setDeliveryType(1);
                        shoppingCartModel.createShoppingCart();
                    }
                    /*
                    $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
                    $scope.currentShoppingCart.Barcode = barcode;
                    $scope.currentShoppingCart.customerLoyalty = loyalty;

                    $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
                    */
                    $scope.clientSelected = true;
                    $scope.validCustomer(loyalty);
                    setTimeout(function () {
                        $rootScope.hideLoading();
                    }, 500);
                } else {
                    $rootScope.hideLoading();
                    sweetAlert($translate.instant("Carte de fidélité introuvable !"));
                }
            }, function (err) {
                $rootScope.hideLoading();
                console.log(err);
                sweetAlert($translate.instant("Une erreur s'est produite !"));
            });

        }
    };

    $scope.validEmail = function (strEmail) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(strEmail);
    };

    $scope.validPhone = function (strPhone) {
        const reFrance = /^0[1-9][0-9]{8}$/;
        const resultFrance = reFrance.test(strPhone);

        const reCanada = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        const resultCanada = reCanada.test(strPhone);
        return (resultCanada || resultFrance);
    };


    $scope.validZipPostCode = function (strZip) {
        const reFrance = /^[0-9]{5}$/;
        const resultFrance = reFrance.test(strZip);

        const reCanada = /[ABCEGHJKLMNPRSTVXY][0-9][ABCEGHJKLMNPRSTVWXYZ] ?[0-9][ABCEGHJKLMNPRSTVWXYZ][0-9]/;
        const resultCanada = reCanada.test(strZip);
        return (resultCanada || resultFrance);
    };


    /**
     *  Scan the loyalty card
     */
    $scope.scanBarcode = function () {
        try {
            cordova.plugins.barcodeScanner.scan(
                function (result) {
                    $scope.newLoyalty.barcode.barcodeValue = result.text;
                },
                function (error) {
                }
            );
        } catch (err) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalBarcodeReader.html',
                controller: 'ModalBarcodeReaderController',
                backdrop: 'static'
            });

            modalInstance.result.then(function (value) {
                $scope.newLoyalty.barcode.barcodeValue = value;

            }, function () {
            });
        }
    };

    $scope.setBarcodeFocus = function () {
        console.log("barcode Focus");
        const test = document.getElementById("txtBarcodeCustomer");
        test.focus();

    };

    $scope.changeOperation = function (strOperation) {
        $scope.registerOperation = strOperation;

        //Put the focus in the barcode input for a direct scan
        if (strOperation == "registerFid") {
            setTimeout(function () {
                console.log("barcode customer focus");
                document.getElementById("txtBarcodeCustomer").focus();
            }, 0);
        }
    };

    $scope.ok = function () {
        delete $rootScope.currentPage;
        $rootScope.hideLoading();
        $rootScope.closeKeyboard();
    };

    $scope.validCustomer = function (loyalty) {
        $scope.validDisabled = true;
        // No register if no customer is selected

        if ($scope.clientSelected == true) {
            // $rootScope.PhoneOrderMode = true;
            $uibModalInstance.close(loyalty);
            return;
        }

        //Si pas d'infos saisie pour les mails- aucune opération
        if ($scope.newLoyalty.CustomerEmail == '' || $scope.newLoyalty.CustomerEmail == undefined) {
            $scope.validDisabled = false;
            $scope.close();
            return;
        }
        else {
            if (!$scope.validEmail($scope.newLoyalty.CustomerEmail)) {
                $scope.validDisabled = false;
                ngToast.create({
                    className: 'danger',
                    content: '<span class="bold">Le format de l\'email est incorrect</span>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                $rootScope.hideLoading();
                return;
            }
        }

        if (!$scope.validPhone($scope.newLoyalty.CustomerPhone)) {
            $scope.validDisabled = false;
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Le format du téléphone est incorrect</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $rootScope.hideLoading();
            return;
        }

        if (!$scope.validZipPostCode($scope.newLoyalty.CustomerZipPostalCode)) {
            $scope.validDisabled = false;
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Le format du code postal est incorrect</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $rootScope.hideLoading();
            return;
        }

        // Get the current Shopping CArt

        /*
        var curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        if (curShoppingCart == undefined) {
            shoppingCartModel.createShoppingCart();
        }
        */

        // curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        try {
            function isFormComplete() {
                //Si un parametre est requiered dans signInSettings
                //On verifie si le champs du formulaire qui lui est associé est valide
                // Si non, la methode retourne false
                try {
                    for(let field of $scope.signInSettings) {
                        //Si le champs est requis
                        if (field.value == true) {
                            //On verifie si le champs est renseigné
                            //Validation ?
                            if (!$scope.newLoyalty["Customer" + field.key] || $scope.newLoyalty["Customer" + field.key] == "" || $scope.newLoyalty["Customer" + field.key].length == 0) {
                                throw 0;
                            }
                        }
                    }
                    $scope.validDisabled = false;
                    return true;
                }
                catch (ex) {
                    $scope.validDisabled = false;
                    return false;
                }
            }


            // Si tout les champs requis sont rempli
            if (isFormComplete() != false) {
                console.log($scope.newLoyalty);
                $rootScope.showLoading();
                $rootScope.closeKeyboard();
                loyaltyService.registerFullCustomerAsync($scope.newLoyalty).then(function (loyalty) {
                    // On ajoute la fidélité au ticket
                    console.log('Succes');
                    $rootScope.hideLoading();
                    setTimeout(function () {
                        $rootScope.hideLoading();
                    }, 500);

                    console.log(loyalty);

                    /*
                    if (!curShoppingCart.deliveryAddress) {
                        // Proposer de renseigner une adresse de livraison
                        var modalInstance = $uibModal.open({
                            templateUrl: 'modals/modalPromptDeliveryAddress.html',
                            controller: 'ModalPromptDeliveryAddressController',
                            resolve: {
                                barcodeClient: function () {
                                    return loyalty.Barcodes[0].Barcode;
                                }
                            },
                            backdrop: 'static'
                        });

                        modalInstance.result.then(function (deliveryAddress) {
                            curShoppingCart.deliveryAddress = {
                                Address1: deliveryAddress.Address1,
                                ZipPostalCode: deliveryAddress.ZipPostalCode,
                                City: deliveryAddress.City,
                                Floor: deliveryAddress.Floor,
                                Door: deliveryAddress.Door,
                                Digicode: deliveryAddress.Digicode,
                                InterCom: deliveryAddress.InterCom,
                                PhoneNumber: deliveryAddress.PhoneNumber,
                            };

                        }, function () {
                            $rootScope.hideLoading();
                        });
                    }

                    */

                    $scope.validDisabled = false;

                    /*
                    curShoppingCart.customerLoyalty = loyalty;
                    $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    $rootScope.$emit("shoppingCartChanged", curShoppingCart);
                    */

                    //notification
                    ngToast.create({
                        className: 'info',
                        content: 'Le client est enregistré',
                        dismissOnTimeout: true,
                        timeout: 10000,
                        dismissOnClick: true
                    });
                    $rootScope.hideLoading();
                    $scope.validDisabled = false;
                    // $rootScope.PhoneOrderMode = true;
                    $uibModalInstance.close(loyalty);
                }, function (err) {
                    $rootScope.hideLoading();
                    $scope.validDisabled = false;
                    console.log(err);
                });

            } else {
                $scope.validDisabled = false;
                ngToast.create({
                    className: 'danger',
                    content: '<span class="bold">Veuillez renseigner tout les champs</span>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                $rootScope.hideLoading();
            }
        }
        catch (err) {
            $scope.validDisabled = false;
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Impossible d\'enregistrer le client</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $rootScope.hideLoading();
        }
    };

    $scope.close = function () {
        delete $rootScope.currentPage;
        $uibModalInstance.dismiss('cancel');
    };

    //-------------------------------------------------------------------------Fid----------------------------------------------------------------------------------

    $scope.containsBalanceType = function (balanceType) {
        let ret = false;

        if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.Balances && $scope.currentShoppingCart.customerLoyalty.Balances.length > 0) {
            ret = Enumerable.from($scope.currentShoppingCart.customerLoyalty.Balances).any(function (balance) {
                return balance.BalanceType == balanceType;
            });
        }

        return ret;
    };

    $scope.getDate = function (date) {
        return new Date(date);
    };

    $scope.getTotalPositiveHistory = function (history, balance) {
        let total = 0;
        for (let i = 0; i < history.length; i++) {
            total += history[i].Value > 0 && history[i].BalanceType_Id == balance.BalanceType_Id ? history[i].Value : 0;
        }
        return balance.UseToPay ? roundValue(total) : total;
    };

});