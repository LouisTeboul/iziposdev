/**
 * Modal available for phone orders
 * Select an existing customer, or fully create one
 */
app.controller('ModalRegisterFid', function ($scope, $rootScope, $http, $mdMedia, $uibModalInstance, $uibModal, loyaltyService, ngToast, $translate, $timeout) {
    var current = this;
    $scope.mdMedia = $mdMedia;
    $rootScope.currentPage = 1;

    $scope.init = function () {
        $scope.validDisabled = false;
        $scope.search = {};
        $scope.barcode = {};
        $scope.firstName = undefined;
        $scope.lastName = undefined;
        $scope.email = undefined;
        $scope.clientSelected = false;
        $scope.registerFull = false;
        $scope.signInSettings = undefined;
        $scope.pubMail = true;
        $scope.acceptRules = false;

        if($rootScope.borneVertical){
            $scope.location = "center-end"
        }else{
            $scope.location = "start-end"
        }

        loyaltyService.getSignInSettingsAsync().then((settings) => {
            $scope.signInSettings = settings;
        }, (err) => {
            console.log(err);
        });

        $scope.newLoyalty = {};
        $scope.isLoyaltyEnabled = {
            value: 'Fid'
        };

        $scope.clientUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi.replace("/api", "");

        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical && !$rootScope.isPMREnabled ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size': 'cover'
        };
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
            case "ENR":
                $timeout(function () {
                    document.querySelector("#email").focus();
                }, 100);
                break;
        }
    };

    $scope.toggleRules = function () {
        $scope.acceptRules = !$scope.acceptRules;
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
                $rootScope.hideLoading();
                console.log(deliveryAddress);
                $rootScope.currentShoppingCart.deliveryAddress = {
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
                $rootScope.hideLoading();
            });

            loyaltyService.getLoyaltyObjectAsync(barcode).then(function (loyalty) {
                if (loyalty && loyalty.CustomerId != 0) {
                    if ($rootScope.currentShoppingCart == undefined) {
                        $rootScope.currentDeliveryType = 1;
                        if ($rootScope.currentShoppingCart) {
                            $rootScope.currentShoppingCart.DeliveryType = $rootScope.currentDeliveryType;
                        }
                        $rootScope.$emit('deliveryTypeChanged');
                        $rootScope.createShoppingCart();
                    }
                    $rootScope.currentShoppingCart.Barcode = barcode;
                    $rootScope.currentShoppingCart.customerLoyalty = loyalty;

                    $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                    $scope.clientSelected = true;
                    $scope.acceptRules = true;
                    $scope.validCustomer();
                    setTimeout(() => {
                        $rootScope.hideLoading();
                    }, 500);
                } else {
                    $rootScope.hideLoading();
                    swal({ title: $translate.instant("Carte de fidélité introuvable !") });
                }
            }, function (err) {
                $rootScope.hideLoading();
                console.error(err);
                swal({ title: $translate.instant("Une erreur s'est produite !") });
            });
        }
    };

    $scope.validEmail = function (strEmail) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var myResult = re.test(strEmail);
        return myResult;
    };

    $scope.validPhone = function (strPhone) {
        var reFrance = /^0[1-9][0-9]{8}$/;
        var resultFrance = reFrance.test(strPhone);

        var reCanada = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        var resultCanada = reCanada.test(strPhone);
        return resultCanada || resultFrance;
    };

    $scope.validZipPostCode = function (strZip) {
        var reFrance = /^[0-9]{5}$/;
        var resultFrance = reFrance.test(strZip);

        var reCanada = /[ABCEGHJKLMNPRSTVXY][0-9][ABCEGHJKLMNPRSTVWXYZ] ?[0-9][ABCEGHJKLMNPRSTVWXYZ][0-9]/;
        var resultCanada = reCanada.test(strZip);
        return resultCanada || resultFrance;
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
            var modalInstance = $uibModal.open({
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
        var test = document.getElementById("txtBarcodeCustomer");
        test.focus();
    };

    $scope.changeOperation = function (strOperation) {
        $scope.registerOperation = strOperation;

        //Put the focus in the barcode input for a direct scan
        if (strOperation == "registerFid") {
            console.log("barcode customer focus");
            document.getElementById("txtBarcodeCustomer").focus();
        }
    };

    $scope.ok = function () {
        delete $rootScope.currentPage;
        $rootScope.hideLoading();
        $rootScope.closeKeyboard();
    };

    $scope.validCustomer = function () {
        if ($scope.acceptRules) {
            $scope.validDisabled = true;
            // No register if no customer is selected

            if ($scope.clientSelected) {
                $uibModalInstance.close();
                return;
            }

            //Si pas d'infos saisie pour les mails- aucune opération
            if ($scope.newLoyalty.CustomerEmail === '' || $scope.newLoyalty.CustomerEmail === undefined) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("L'email est obligatoire") });
                $rootScope.hideLoading();
                return;
            }
            else {
                if (!$scope.validEmail($scope.newLoyalty.CustomerEmail)) {
                    $scope.validDisabled = false;
                    swal({ title: $translate.instant("Le format de l'email est incorrect") });
                    //ngToast.create({
                    //    className: 'danger',
                    //    content: '<span class="bold">Le format de l\'email est incorrect</span>',
                    //    dismissOnTimeout: true,
                    //    timeout: 10000,
                    //    dismissOnClick: true
                    //});
                    $rootScope.hideLoading();
                    return;
                }
            }

            if ($scope.signInSettings.Phone && ($scope.newLoyalty.CustomerPhone === '' || $scope.newLoyalty.CustomerPhone === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("Le téléphone est obligatoire !") });
                $rootScope.hideLoading();
                return;
            }
            else if ($scope.newLoyalty.CustomerPhone !== '' && $scope.newLoyalty.CustomerPhone !== undefined && !$scope.validPhone($scope.newLoyalty.CustomerPhone)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("Le format du téléphone est incorrect !") });

                $rootScope.hideLoading();
                return;
            }

            if ($scope.signInSettings.ZipPostalCode && ($scope.newLoyalty.CustomerZipPostalCode === '' || $scope.newLoyalty.CustomerZipPostalCode === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("Le code postal est obligatoire !") });

                $rootScope.hideLoading();
                return;
            }
            else if ($scope.newLoyalty.CustomerZipPostalCode !== '' && $scope.newLoyalty.CustomerZipPostalCode !== undefined && !$scope.validZipPostCode($scope.newLoyalty.CustomerZipPostalCode)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("Le format du code postal est incorrect!") });

                $rootScope.hideLoading();
                return;
            }

            if ($scope.signInSettings.City && ($scope.newLoyalty.CustomerCity === '' || $scope.newLoyalty.CustomerCity === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("La ville est obligatoire !") });
                $rootScope.hideLoading();
                return;
            }

            if ($scope.signInSettings.Company && ($scope.newLoyalty.CustomerCompany === '' || $scope.newLoyalty.CustomerCompany === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("La société est obligatoire !") });
                $rootScope.hideLoading();
                return;
            }

            if ($scope.signInSettings.Fax && ($scope.newLoyalty.CustomerFax === '' || $scope.newLoyalty.CustomerFax === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("Le fax est obligatoire !") });
                $rootScope.hideLoading();
                return;
            }

            if ($scope.signInSettings.StreetAddress && ($scope.newLoyalty.CustomerStreetAddress === '' || $scope.newLoyalty.CustomerStreetAddress === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("L'addresse est obligatoire !") });
                $rootScope.hideLoading();
                return;
            }

            if ($scope.signInSettings.StreetAddress2 && ($scope.newLoyalty.CustomerStreetAddress2 === '' || $scope.newLoyalty.CustomerStreetAddress2 === undefined)) {
                $scope.validDisabled = false;
                swal({ title: $translate.instant("Le complément d'addresse est obligatoire !") });
                $rootScope.hideLoading();
                return;
            }

            if (!$rootScope.currentShoppingCart) {
                $rootScope.createShoppingCart();
            }

            try {
                const isFormComplete = () => {
                    //Si un parametre est requiered dans signInSettings
                    //On verifie si le champs du formulaire qui lui est associé est valide
                    // Si non, la methode retourne false
                    try {
                        let entries = Object.entries($scope.signInSettings);
                        for (let [key, value] of entries) {
                            //Si le champs est requis
                            if (value) {
                                //On verifie si le champs est renseigné
                                //Validation ?
                                if (!$scope.newLoyalty["Customer" + key]
                                    || $scope.newLoyalty["Customer" + key] == ""
                                    || $scope.newLoyalty["Customer" + key].length == 0) {
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
                };

                // Si tout les champs requis sont rempli
                if (isFormComplete() != false) {
                    console.log($scope.newLoyalty);
                    $rootScope.showLoading();
                    $rootScope.closeKeyboard();
                    loyaltyService.registerFullCustomerAsync($scope.newLoyalty).then(function (loyalty) {
                        // On ajoute la fidélité au ticket
                        console.log('Succes');
                        $rootScope.hideLoading();
                        setTimeout(() => {
                            $rootScope.hideLoading();
                        }, 500);

                        console.log(loyalty);

                        $scope.validDisabled = false;
                        $rootScope.currentShoppingCart.customerLoyalty = loyalty;
                        $rootScope.$emit("customerLoyaltyChanged", loyalty);
                        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
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
                        //$rootScope.PhoneOrderMode = true;
                        $uibModalInstance.close();
                    }, function (err) {
                        $rootScope.hideLoading();
                        $scope.validDisabled = false;
                        console.error(err);
                    });
                } else {
                    $scope.validDisabled = false;
                    ngToast.create({
                        className: 'danger',
                        content: '<span class="bold">Veuillez renseigner tous les champs</span>',
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
        }
        else {
            $scope.validDisabled = false;
            swal({ title: $translate.instant("Veuillez acceptez notre politique sur les données personnelles") });
            $rootScope.hideLoading();
            return;
        }
    };

    $scope.close = function () {
        delete $rootScope.currentPage;
        $uibModal.open({
            templateUrl: 'modals/modalConnectionMode.html',
            controller: 'ModalConnectionController',
            backdrop: false,
            keyboard: false,
            size: 'lg',
            windowClass: 'mainModals'
        });
        $timeout(function () {
            $uibModalInstance.dismiss('cancel');
        }, 250);
    };

    //-------------------------------------------------------------------------Fid----------------------------------------------------------------------------------

    $scope.containsBalanceType = function (balanceType) {
        var ret = false;
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty && $rootScope.currentShoppingCart.customerLoyalty.Balances && $rootScope.currentShoppingCart.customerLoyalty.Balances.length > 0) {
            ret = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Balances).any(function (balance) {
                return balance.BalanceType == balanceType;
            });
        }
        return ret;
    };

    $scope.getDate = function (date) {
        return new Date(date);
    };

    $scope.getTotalPositiveHistory = function (history, balance) {
        var total = 0;
        for (var i = 0; i < history.length; i++) {
            total += history[i].Value > 0 && history[i].BalanceType_Id == balance.BalanceType_Id ? history[i].Value : 0;
        }
        return balance.UseToPay ? roundValue(total) : total;
    };
});