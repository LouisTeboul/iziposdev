/**
 * Modal available if we have the forcedeliverytype parameters enabled
 * The POS user should select a valid delivery mode before validating the ticket
 */
app.controller('ModalCustomerController', function ($scope, $rootScope, $q, $http, $timeout, $uibModalInstance, $uibModal, shoppingCartService, loyaltyService, ngToast, shoppingCartModel, $translate) {

    var current = this;
    $scope.registerOperation = "getEmail"; // for display

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


        var settingApi = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/RESTLoyalty/getCustomerSettings';
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

            console.log($scope.signInSettings)

        });

        $timeout(function () {
            document.getElementById("txtComment").focus();
        }, 0);

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


    $scope.editDeliveryAddress = function(){
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPromptDeliveryAddress.html',
            controller: 'ModalPromptDeliveryAddressController',
            resolve: {
                barcodeClient: function () {
                    return $scope.currentShoppingCart.Barcode;
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
    };

    $scope.toggleRegisterFull = function () {
        $scope.registerFull = !$scope.registerFull;
    };

    //Recherche de client par nom, prénom ou email
    $scope.searchForCustomer = function () {
        loyaltyService.searchForCustomerAsync($scope.search.query).then(function (res) {
            $scope.search.results = res;
        }, function () {
            console.log("Erreur de recherche");
            $scope.search.results = [];
        });
    };

    /**
     * Add the customer loyalty info to the current shopping cart
     * @param barcode
     */
    $scope.selectCustomer = function (barcode) {
        barcode = barcode.trim();
        if (barcode) {
            $rootScope.showLoading();


            loyaltyService.getLoyaltyObjectAsync(barcode).then(function (loyalty) {
                if (loyalty && loyalty.CustomerId != 0) {
                    if ($scope.currentShoppingCart == undefined) {
                        shoppingCartModel.createShoppingCart();
                    }
                    $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
                    $scope.currentShoppingCart.Barcode = barcode;
                    $scope.currentShoppingCart.customerLoyalty = loyalty;
                    $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
                    $scope.clientSelected = true;

                    setTimeout(function () {
                        $rootScope.hideLoading();
                    }, 500);

                } else {
                    sweetAlert($translate.instant("Carte de fidélité introuvable !"));
                    $rootScope.hideLoading();
                }
            }, function (err) {
                console.log(err);
                sweetAlert($translate.instant("Le serveur de fidélité n'est pas joignable ..."));
                $rootScope.hideLoading();

            });
        }

    };

    $scope.validEmail = function (strEmail) {
        if(strEmail){
            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var myResult = re.test(strEmail);
            return myResult;
        } else {
            return false;
        }

    };

    $scope.validPhone = function (strPhone) {
        if(strPhone){
            var reFrance = /^0[1-9][0-9]{8}$/;
            var resultFrance = reFrance.test(strPhone);

            //Numero de telephone canadien.
            // Indicatif entre parenthese facultatif
            // Separateur soit : rien, espace, ou tiret.
            var reCanada = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
            var resultCanada = reCanada.test(strPhone);
            return (resultCanada || resultFrance);
        } else {
            return false;
        }

    };


    $scope.validZipPostCode = function (strZip) {
        if(strZip){
            var reFrance = /^[0-9]{5}$/;
            var resultFrance = reFrance.test(strZip);

            //Post Code canadien, avec espace facultatif
            var reCanada = /[ABCEGHJKLMNPRSTVXY][0-9][ABCEGHJKLMNPRSTVWXYZ] ?[0-9][ABCEGHJKLMNPRSTVWXYZ][0-9]/;
            var resultCanada = reCanada.test(strZip.toUpperCase());
            return (resultCanada || resultFrance);
        } else {
            return false;
        }

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
        var test = document.getElementById("txtBarcodeCustomer");
        test.focus();

    };

    $scope.changeOperation = function (strOperation) {
        $scope.registerOperation = strOperation;

        //Put the focus in the barcode input for a direct scan
        if (strOperation == "registerFid") {
            /*

            setTimeout(function () {
                document.getElementById("txtBarcodeCustomer").focus();
            }, 0);

            */
        }
    };

    $scope.ok = function () {
        delete $rootScope.currentPage;
        $rootScope.closeKeyboard();
    };

    $scope.validCustomer = function () {
        $scope.validDisabled = true;
        // No register if no customer is selected

        if ($scope.clientSelected == true) {
            $uibModalInstance.close();
            $scope.validDisabled = false;
            return;
        }

        //Si pas d'infos saisie pour les mails- aucune opération
        if ($scope.newLoyalty.CustomerEmail == '' || $scope.newLoyalty.CustomerEmail == undefined) {
            $uibModalInstance.close();
            $scope.validDisabled = false;
            return;
        }
        else {
            if (!$scope.validEmail($scope.newLoyalty.CustomerEmail) && $scope.registerFull) {
                ngToast.create({
                    className: 'danger',
                    content: '<b>Le format de l\'email est incorrect</b>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                $scope.validDisabled = false;
                return;
            }
        }

        if (!$scope.validPhone($scope.newLoyalty.CustomerPhone) && $scope.registerFull) {
            ngToast.create({
                className: 'danger',
                content: '<b>Le format du téléphone est incorrect</b>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $scope.validDisabled = false;
            return;
        }

        if (!$scope.validZipPostCode($scope.newLoyalty.CustomerZipPostalCode) && $scope.registerFull) {
            ngToast.create({
                className: 'danger',
                content: '<b>Le format du code postal est incorrect</b>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $scope.validDisabled = false;
            return;
        }

        // Get the current Shopping Cart
        var curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        if (curShoppingCart == undefined) {
            shoppingCartModel.createShoppingCart();
        }

        curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        //si la case fidélité est coché on enregistre le client
        if ($scope.registerOperation == "registerFid") {
            try {
                function isFormComplete() {
                    // Si un parametre est requiered dans signInSettings
                    // On verifie si le champs du formulaire qui lui est associé est valide
                    // Si non, la methode retourne false
                    try {
                        Enumerable.from($scope.signInSettings).forEach(function (field) {
                            //Si le champs est requis
                            if (field.value == true) {
                                //On verifie si le champs est renseigné
                                //Validation ?
                                if (!$scope.newLoyalty["Customer" + field.key] || $scope.newLoyalty["Customer" + field.key] == "" || $scope.newLoyalty["Customer" + field.key].length == 0) {
                                    throw 0;
                                }
                            }
                        });
                        $scope.validDisabled = false;
                        return true;
                    }
                    catch (ex) {
                        $scope.validDisabled = false;
                        return false;
                    }
                }

                if ($scope.registerFull) {
                    loyaltyService.getLoyaltyObjectAsync().then(function (l) {
                        $scope.newLoyalty.AllowCustomerToCreateLoyaltyBarcode = l.AllowCustomerToCreateLoyaltyBarcode;
                        console.log(l.AllowCustomerToCreateLoyaltyBarcode);
                        // Si tout les champs requis sont rempli
                        if (isFormComplete() != false &&
                            (!l.AllowCustomerToCreateLoyaltyBarcode && $scope.newLoyalty.barcode.barcodeValue != "" || l.AllowCustomerToCreateLoyaltyBarcode)) {

                            console.log($scope.newLoyalty);
                            loyaltyService.registerFullCustomerAsync($scope.newLoyalty).then(function (loyalty) {
                                // On ajoute la fidélité au ticket
                                $scope.validDisabled = false;
                                console.log('Succes');
                                curShoppingCart.customerLoyalty = loyalty;
                                $rootScope.$emit("customerLoyaltyChanged", loyalty);
                                $rootScope.$emit("shoppingCartChanged", curShoppingCart);
                                //notification
                                ngToast.create({
                                    className: 'info',
                                    content: 'Le client est enregistré',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                                $scope.validDisabled = false;
                                $uibModalInstance.close();
                            }, function (err) {
                                $scope.validDisabled = false;
                                console.log(err);
                            });
                            //Appelle loyalty service
                            //Enregistre le customer complet

                        } else {
                            $scope.validDisabled = false;
                            ngToast.create({
                                className: 'danger',
                                content: '<b>Veuillez renseigner tout les champs</b>',
                                dismissOnTimeout: true,
                                timeout: 10000,
                                dismissOnClick: true
                            });
                            $scope.validDisabled = false;


                        }
                    }, function(err){
                        swal($translate.instant("Une erreur s'est produite !"));
                        $scope.validDisabled = false;
                    });

                } else {

                    // On récupère le loyalty si il existe
                    // Si le client n'a pas de loyalty on l'enregistre en partiel
                    loyaltyService.getLoyaltyObjectAsync($scope.newLoyalty.barcode.barcodeValue).then(function (loyalty) {


                        if ($scope.newLoyalty.barcode.barcodeValue == "" && (loyalty == undefined || (loyalty != undefined && !loyalty.AllowCustomerToCreateLoyaltyBarcode))) {

                            ngToast.create({
                                className: 'info',
                                content: 'le code barre n\'est pas renseigné',
                                dismissOnTimeout: true,
                                timeout: 10000,
                                dismissOnClick: true
                            });
                            $scope.validDisabled = false;
                            return;
                        }


                        if (!loyalty) {
                            loyalty = $scope.newLoyalty;
                            $scope.validDisabled = false;
                            return;
                        }
                        else {
                            //On associe le client à la carte
                            loyalty.CustomerEmail = $scope.newLoyalty.CustomerEmail;
                            loyalty.CustomerFirstName = $scope.newLoyalty.CustomerFirstName;
                            loyalty.CustomerLastName = $scope.newLoyalty.CustomerLastName;
                        }

                        //On enregistre le client partiel
                        console.log(loyalty);
                        loyaltyService.registerCustomerAsync(loyalty).then(function (loyalty) {
                            $scope.validDisabled = false;
                            // On ajoute la fidélité au ticket
                            curShoppingCart.customerLoyalty = loyalty;
                            $rootScope.$emit("customerLoyaltyChanged", loyalty);
                            $rootScope.$emit("shoppingCartChanged", curShoppingCart);
                            //notification
                            ngToast.create({
                                className: 'info',
                                content: 'Le client est enregistré',
                                dismissOnTimeout: true,
                                timeout: 10000,
                                dismissOnClick: true
                            });
                            $scope.validDisabled = false;
                            $uibModalInstance.close();
                        }, function (err) {
                            $scope.validDisabled = false;
                            console.log(err);
                        });


                    }, function (err) { //response
                        $scope.validDisabled = false;
                        swal($translate.instant("Le serveur de fidélité n'est pas joignable ..."));
                        console.log(err);
                    });
                }

            }
            catch (err) {
                $scope.validDisabled = false;
                ngToast.create({
                    className: 'danger',
                    content: '<b>Impossible d\'enregistrer le client</b>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                $scope.validDisabled = false;
            }
        }

        if ($scope.registerOperation == "getEmail") {
            $scope.validDisabled = false;

            curShoppingCart.customerLoyalty = $scope.newLoyalty;
            $rootScope.$emit("customerLoyaltyChanged", $scope.newLoyalty);
            $rootScope.$emit("shoppingCartChanged", curShoppingCart);

            ngToast.create({
                className: 'info',
                content: 'Le mail ' + $scope.newLoyalty.CustomerEmail + 'a été ajouté au ticket',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $scope.validDisabled = false;
            $uibModalInstance.close();
        }

        return;

    };

    $scope.close = function () {
        delete $rootScope.currentPage;
        $uibModalInstance.dismiss('cancel');
    };

    //-------------------------------------------------------------------------Fid----------------------------------------------------------------------------------

    $scope.containsBalanceType = function (balanceType) {
        var ret = false;

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
        var total = 0;
        for (var i = 0; i < history.length; i++) {
            total += history[i].Value > 0 && history[i].BalanceType_Id == balance.BalanceType_Id ? history[i].Value : 0;
        }
        return balance.UseToPay ? roundValue(total) : total;
    };

    //[WARNING] -> La caisse ne peut pas utiliser le addpassage il est géré à l'intégration du ticket 
    $scope.addPassage = function () {
        $scope.isAddingPassage = true;
        var passageObj = createEmptyPassageObj();
        loyaltyService.addPassageAsync(passageObj).then(function (res) {
            customAlert($translate.instant("Un passage a été ajouté"));
        });
    };

    $scope.clickAction = function (actionId, isTiles) {
        $scope.currentShoppingCart.customerLoyalty.customAction = actionId;
        $scope.useAction(true);
    };


    //[OBSOLETE]
    $scope.useAction = function (isTiles) {
        var amount = $('#orderAmountInput').val();
        // If the amount is mandatory
        if ($scope.currentShoppingCart.customerLoyalty.CustomActionMandatoryAmount && (amount == null || amount == undefined || amount === "")) {
            customAlert($translate.instant("Veuillez saisir") + " " + ($scope.currentShoppingCart.customerLoyalty.OneRuleWithOrderAmountString ? $scope.currentShoppingCart.customerLoyalty.OneRuleWithOrderAmountString : $translate.instant("Montant d'achat")));
        }
        else {
            $scope.isUsingAction = true;
            customConfirm($translate.instant("Voulez-vous effectuer cette action ?"), "", function (isAccept) {
                if (isAccept) {
                    var passageObj = createEmptyPassageObj();
                    if (amount != null && amount != undefined && amount != "") {
                        passageObj.OrderTotalIncludeTaxes = amount;
                        passageObj.OrderTotalExcludeTaxes = amount;
                    }
                    if (isTiles) {
                        passageObj.CustomAction = {
                            "CustomActionId": $scope.currentShoppingCart.customerLoyalty.customAction
                        };
                    } else {
                        passageObj.CustomAction = {
                            "CustomActionId": $('#actionSelect').val()
                        };
                    }
                    //$log.info(passageObj); // BROKEN

                    loyaltyService.addPassageAsync(passageObj).success(function () {
                        customAlert($translate.instant("Action exécutée"));
                    });
                } else {
                    $scope.isUsingAction = false;
                }
            });
        }

    };

    var customAlert = function (newTitle, newText, callback) {
        swal({
            title: newTitle,
            text: newText,
            showCancelButton: false,
            confirmButtonColor: "#28A54C",
            confirmButtonText: "OK",
            closeOnCancel: false,
            closeOnConfirm: true
        }, callback);
    };

    var customConfirm = function (newTitle, newText, callback) {
        swal({
            title: newTitle,
            text: newText,
            showCancelButton: true,
            confirmButtonColor: "#28A54C",
            confirmButtonText: $translate.instant("Oui"),
            cancelButtonText: $translate.instant("Non"),
            closeOnCancel: true,
            closeOnConfirm: true
        }, callback);
    };
});