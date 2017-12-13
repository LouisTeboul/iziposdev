/**
 * Modal available for phone orders
 * Select an existing customer, or fully create one
 */
app.controller('ModalCustomerForPhoneController', function ($scope, $rootScope, $q, $http, $uibModalInstance, $uibModal, shoppingCartService, loyaltyService, ngToast, shoppingCartModel, $translate) {

    var current = this;

    $scope.init = function () {

        $rootScope.PhoneOrderMode = true;
        $scope.searchResults = [];
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
                Phone: settings.PhoneRequired,
                StreetAddress: settings.StreetAddressRequired,
                ZipPostalCode: settings.ZipPostalCodeRequired
            };

            console.log($scope.signInSettings)

        });

        setTimeout(function () {
            document.getElementById("txtComment").focus();
        }, 0);

        $scope.newLoyalty = {};
        $scope.isLoyaltyEnabled = {
            value: 'Fid'
        };

        $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
        $scope.clientUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi.replace("/api", "");
    };

    $scope.toggleRegisterFull = function () {
        $scope.registerFull = !$scope.registerFull;
    };

    //Recherche de client par nom, prénom ou email
    $scope.searchForCustomer = function (query) {
        loyaltyService.searchForCustomerAsync(query).then(function (res) {
            $scope.searchResults = res;
        }, function () {
            $scope.searchResults = [];
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
                    $scope.$evalAsync();
                    $scope.clientSelected = true;

                    $scope.ok();

                    setTimeout(function () {
                        $rootScope.hideLoading();
                    }, 500);

                } else {
                    sweetAlert($translate.instant("Carte de fidélité introuvable !"));
                }
            }, function (err) {
                console.log(err);
                sweetAlert($translate.instant("Le serveur de fidélité n'a pas répondu !"));
            });
        }
    };

    $scope.validEmail = function (strEmail) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var myResult = re.test(strEmail);
        return myResult;
    };

    $scope.validPhone = function (strPhone) {
        var re = /^0[1-68][0-9]{8}$/;
        var myResult = re.test(strPhone);
        return myResult;
    };


    $scope.validZipPostCode = function (strZip) {
        var re = /^[0-9]{5}$/;
        var myResult = re.test(strZip);
        return myResult;
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
            setTimeout(function () {
                document.getElementById("txtBarcodeCustomer").focus();
            }, 0);
        }
    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
    };

    $scope.validCustomer = function () {
        // No register if no customer is selected

        if ($scope.clientSelected == true) {
            $uibModalInstance.close();
            return;
        }

        //Si pas d'infos saisie pour les mails- aucune opération
        if ($scope.newLoyalty.CustomerEmail == '' || $scope.newLoyalty.CustomerEmail == undefined) {
            $scope.close();
            return;
        }
        else {
            if (!$scope.validEmail($scope.newLoyalty.CustomerEmail)) {
                ngToast.create({
                    className: 'danger',
                    content: '<b>Le format de l\'email est incorrect</b>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                return;
            }
        }

        if (!$scope.validPhone($scope.newLoyalty.CustomerPhone)) {
            ngToast.create({
                className: 'danger',
                content: '<b>Le format du téléphone est incorrect</b>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            return;
        }

        if (!$scope.validZipPostCode($scope.newLoyalty.CustomerZipPostalCode)) {
            ngToast.create({
                className: 'danger',
                content: '<b>Le format du code postal est incorrect</b>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            return;
        }

        // Get the current Shopping CArt
        var curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        if (curShoppingCart == undefined) {
            shoppingCartModel.createShoppingCart();
        }

        curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        try {
            function isFormComplete() {
                //Si un parametre est requiered dans signInSettings
                //On verifie si le champs du formulaire qui lui est associé est valide
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
                    return true;
                }
                catch (ex) {
                    return false;
                }
            }


            // Si tout les champs requis sont rempli
            if (isFormComplete() != false) {
                console.log($scope.newLoyalty);
                $scope.newLoyalty.AllowCustomerToCreateLoyaltyBarcode = true;
                loyaltyService.registerFullCustomerAsync($scope.newLoyalty).then(function (loyalty) {
                    // On ajoute la fidélité au ticket
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

                    $uibModalInstance.close();
                }, function (err) {
                    console.log(err);
                });
                //Appelle loyalty service
                //Enregistre le customer complet

            } else {
                ngToast.create({
                    className: 'danger',
                    content: '<b>Veuillez renseigner tout les champs</b>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
            }
        }
        catch (err) {
            ngToast.create({
                className: 'danger',
                content: '<b>Impossible d\'enregistrer le client</b>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
        }
    };

    $scope.close = function () {
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