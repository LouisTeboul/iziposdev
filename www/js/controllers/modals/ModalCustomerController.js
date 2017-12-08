/**
 * Modal available if we have the forcedeliverytype parameters enabled
 * The POS user should select a valid delivery mode before validating the ticket
 */
app.controller('ModalCustomerController', function ($scope, $rootScope, $q, $uibModalInstance, $uibModal, shoppingCartService, loyaltyService, ngToast, shoppingCartModel, $translate) {

    var current = this;
    $scope.registerOperation = "getEmail"; // for display

    $scope.init = function () {
        $scope.searchResults = [];
        $scope.barcode = {};
        $scope.firstName;
        $scope.lastName;
        $scope.email;
        $scope.clientSelected = false;

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
            $uibModalInstance.close();
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

        // Get the current Shopping CArt
        var curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        if (curShoppingCart == undefined) {
            shoppingCartModel.createShoppingCart();
        }

        curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

        //si la case fidélité est coché on enregistre le client
        if ($scope.registerOperation == "registerFid") {
            try {
                //On récupère le loyalty si il existe 
                loyaltyService.getLoyaltyObjectAsync($scope.newLoyalty.barcode.barcodeValue).then(function (loyalty) {


                    if ($scope.newLoyalty.barcode.barcodeValue == "" && (loyalty == undefined || (loyalty != undefined && !loyalty.AllowCustomerToCreateLoyaltyBarcode))) {

                        ngToast.create({
                            className: 'info',
                            content: 'le code barre n\'est pas renseigné',
                            dismissOnTimeout: true,
                            timeout: 10000,
                            dismissOnClick: true
                        });

                        return;
                    }

                    if (!loyalty) {
                        loyalty = $scope.newLoyalty;
                        return;
                    }
                    else {
                        //On associe le client à la carte
                        loyalty.CustomerEmail = $scope.newLoyalty.CustomerEmail;
                        loyalty.CustomerFirstName = $scope.newLoyalty.CustomerFirstName;
                        loyalty.CustomerLastName = $scope.newLoyalty.CustomerLastName;
                    }

                    //On enregistre le client
                    loyaltyService.registerCustomerAsync(loyalty).then(function (loyalty) {
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

                        $uibModalInstance.close();
                    });
                }, function (err) { //response
                    console.log(err);
                });

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
        }

        if ($scope.registerOperation == "getEmail") {

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

            $uibModalInstance.close();
        }

        return;

    };

    $scope.close = function () {
        $uibModalInstance.close();
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