app.controller('ModalCustomerController', function ($scope, $rootScope, $interval, $timeout, $uibModalInstance, $uibModal, $translate, ngToast, posUserService, loyaltyService, shoppingCartService, selectedTab, productService) {
    let self = this;
    $scope.registerOperation = "getEmail"; // for display

    $rootScope.currentPage = 1;
    let paged = 0;
    let loadingInterval = null;


    $scope.init = () => {
        paged = 0;

        $scope.searching = false;
        $scope.validDisabled = false;
        $scope.search = {};
        $scope.searchFilter = {
            Loyalty: false,
            Consignor: false
        };
        $scope.barcode = {};
        $scope.firstName;
        $scope.lastName;
        $scope.email;
        $scope.clientSelected = false;

        $scope.canRegisterPartial = $rootScope.loyaltyClasses && $rootScope.loyaltyClasses.some(lc => lc.CustomerPartial);
        $scope.canCreateBarcode = $rootScope.loyaltyClasses && $rootScope.loyaltyClasses.some(lc => lc.AllowCustomerToCreateLoyaltyBarcode);


        $scope.registerFull = !$scope.canRegisterPartial;
        $scope.signInSettings = undefined;

        $scope.deliveryType = $rootScope.currentDeliveryType;

        loyaltyService.getSignInSettingsAsync().then((settings) => {
            $scope.signInSettings = settings
            $scope.settingLength = 4 + settings.City + settings.Company + settings.Fax + settings.Phone + settings.StreetAddress + settings.StreetAddress2 + settings.ZipPostalCode;

        });

        $timeout(() => {
            document.querySelector("#txtComment").focus();
        }, 0);

        $scope.newLoyalty = {};
        $scope.isLoyaltyEnabled = {
            value: 'Fid'
        };

        if ($rootScope.currentShoppingCart) {
            $scope.updatedCustomerLoyalty = angular.copy($rootScope.currentShoppingCart.customerLoyalty);
        }

        $scope.isManualLoyaltyEnabled = posUserService.isEnable('LOYMAN', true) && $scope.getUseToPay();

        $scope.clientUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi.replace("/apiv2", "");

        $scope.loyaltyTabActive = false;
        $scope.consignorTabActive = false;
        switch (selectedTab) {
            case "LOYALTY":
                if ($rootScope.currentShoppingCart && !!$rootScope.currentShoppingCart.customerLoyalty)
                    $scope.loyaltyTabActive = true;
                break;
            case "CONSIGNOR":
                if ($rootScope.currentShoppingCart && !!$rootScope.currentShoppingCart.customerAccountConsignor)
                    $scope.consignorTabActive = true;
                break;
        }
    };


    $scope.getLastPage = (a) => {
        let ret = Math.floor(paged / 3) + 2;
        paged++;
        return ret;
    };

    $scope.filterSearchFid = () => {
        $scope.searchFilter.Loyalty = !$scope.searchFilter.Loyalty;
    };

    $scope.filterSearchConsignor = () => {
        $scope.searchFilter.Consignor = !$scope.searchFilter.Consignor;
    };

    $scope.pageChanged = () => {
        $rootScope.closeKeyboard();
        switch ($rootScope.currentPage) {
            case 1:
                $timeout(() => {
                    document.querySelector("#email").focus();
                }, 50);
                break;
            case 2:
                $timeout(() => {
                    document.querySelector("#city").focus();
                }, 50);
                break;
            case 3:
                $timeout(() => {
                    document.querySelector("#ZipPostalCode").focus();
                }, 50);
                break;
            case 4:
                $timeout(() => {
                    document.querySelector("#txtBarcodeCustomer").focus();
                }, 50);
                break;
            default:
                break;
        }
    };

    $scope.editDeliveryAddress = () => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPromptDeliveryAddress.html',
            controller: 'ModalPromptDeliveryAddressController',
            resolve: {
                barcodeClient: () => {
                    return $rootScope.currentShoppingCart.Barcode;
                }
            },
            backdrop: 'static'
        });

        modalInstance.result.then((deliveryAddress) => {
            console.log(deliveryAddress);
            if (deliveryAddress) {
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
            } else {
                delete $rootScope.currentShoppingCart.deliveryAddress;
            }
        }, () => {
            $rootScope.hideLoading();
        });
    };

    $scope.toggleRegisterFull = () => {
        $scope.registerFull = !$scope.registerFull;
    };

    //Recherche de client par nom, prénom ou email
    $scope.searchForCustomer = () => {
        $rootScope.closeKeyboard();
        if ($scope.search.query) {
            $scope.searching = true;
            loyaltyService.searchForCustomerAsync($scope.search.query).then((res) => {
                $scope.searching = false;
                $scope.search.results = res.sort((a, b) => {
                    if (a.Customer.Email < b.Customer.Email)
                        return -1;
                    if (a.Customer.Email > b.Customer.Email)
                        return 1;
                    return 0;
                });
            }, (err) => {
                $scope.searching = false;

                swal({
                    title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                });

                console.log("Erreur de recherche");
                $scope.search.results = [];
            });
        }
    };

    $scope.selectCustomer = (customer, closeModal = true) => {
        if (customer) {
            const barcode = customer.Barcode;
            if (barcode) {
                loyaltyService.getLoyaltyAsync(barcode).then(() => {
                    if (closeModal) {
                        $uibModalInstance.close();
                    }
                }, (err) => {
                    //console.err(err);
                })
            } else {
                loyaltyService.addAccountConsignor(customer);
                if (closeModal) {
                    $uibModalInstance.close();
                }
            }
        }
    };


    //#region Validation Functions
    $scope.validEmail = (strEmail) => {
        if (strEmail) {
            const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(strEmail);
        } else {
            return false;
        }
    };

    $scope.validPhone = (strPhone) => {
        if (strPhone) {
            const reFrance = /^0[1-9][0-9]{8}$/;
            const resultFrance = reFrance.test(strPhone);

            //Numero de telephone canadien.
            // Indicatif entre parenthese facultatif
            // Separateur soit : rien, espace, ou tiret.
            const reCanada = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
            const resultCanada = reCanada.test(strPhone);
            return resultCanada || resultFrance;
        } else {
            return false;
        }
    };

    $scope.display = (idModalCustomer) => {
        let display = document.getElementById(idModalCustomer).style.display;
        if (display != 'flex') {
            document.getElementById(idModalCustomer).style.display = "flex";
        } else {
            document.getElementById(idModalCustomer).style.display = "none";
        }
    };

    const showLoading = () => {
        if (loadingInterval) {
            $interval.cancel(loadingInterval);
            $scope.acLoadingTimer = 0;
        }
        $scope.loading = true;
        loadingInterval = $interval(() => {
            $scope.acLoadingTimer++;
        }, 1000);
    }

    $scope.hideLoading = () => {
        hideLoading();
    }



    const hideLoading = () => {
        if (loadingInterval) {
            $interval.cancel(loadingInterval);
            $scope.acLoadingTimer = 0;
        }
        $scope.loading = false;
    }

    $scope.getOrdersId = () => {
        $rootScope.closeKeyboard();
        let order = $rootScope.orders.filter(order => order.Id == $scope.search.orderId);
        $rootScope.orders = order;
    };


    $scope.getHistoricOrders = () => {

        document.addEventListener('mouseup', function (e) {

            let container = document.getElementById('historic');
            
            if (container && !container.contains(e.target)) {
                container.style.display = 'none';
            }
        });

        $rootScope.orders = [];
        showLoading();
        if ($rootScope.currentShoppingCart.Barcode != null) {

            loyaltyService.getLoyaltyObjectAsync($rootScope.currentShoppingCart.Barcode, true).then((listOrders) => {
                $rootScope.orders = listOrders.Orders;
                hideLoading();
            }, (err) => {
                console.log(err);
            });

        }
    }

    $scope.addOrdersCart = (order) => {

        if (order.Items.length > 0) {

            $rootScope.currentShoppingCart.Items = [];
            let listItemsOrder = order.Items;

            let listIdsItems = listItemsOrder.map(items => items.ProductId);

            console.log(listItemsOrder);

            productService.getProductIndexByIdsAsync(listIdsItems).then((listProducts) => {
                let listDesactivateProduct = [];
                //vérifie si la liste des produits est la même que celle de la commande
                if (listItemsOrder.length != listProducts.length) {

                    //vérifie si le produit est activé 
                    for (let i = 0; i < listItemsOrder.length; i++) {

                        if (listProducts.find(product => product.Id == listIdsItems[i])) {

                        } else {

                            listDesactivateProduct.push(listItemsOrder[i]);
                        }
                    }
                    if (listDesactivateProduct.length > 0) {
                        $scope.itemsDesactivate = listDesactivateProduct;
                        $scope.display('popDeletedItem');
                    }
                } else {
                    $scope.itemsDesactivate = "";
                }

                ///menu attrtibutes 
                console.log("listOrders");
                console.log(listItemsOrder);

                console.log("lisproduct");
                console.log(listProducts);

                let indexProduct = listItemsOrder.length;

                for (let i = 0; i < listItemsOrder.length; i++) {
                    if (listItemsOrder[i].Attributes != null) {

                        console.log("la tailles du tableaux d'attributs est ");
                        console.log(listItemsOrder[i].Attributes.length);

                        for (j = 0; j < listItemsOrder[i].Attributes.length; j++) {

                            let attribute = listItemsOrder[i].Attributes[j];

                            if (listProducts[i].ProductAttributes) {

                                let test = Enumerable.from(listProducts[i].ProductAttributes).firstOrDefault(x => x.Id === attribute.ProductId);

                                console.log("enum");
                                console.log(test);

                                console.log("attribut");
                                console.log(attribute);
                            }

                        }


                        console.log("il y a des attributs");
                        //console.log(listProducts[indexProduct].ProductAttributes.ProductValues[0]);
                    }
                    indexProduct--;
                }

                console.log("lisproduct after add attributes");

                console.log(listProducts)


                let nbAdd = 0;

                //boucle sur la liste des produits à ajouté

                for (i = 0; i < listProducts.length; i++) {

                    // boucle sur la liste de la commande 

                    for (j = 0; j < listItemsOrder.length; j++) {

                        //vérifie que l'item est activé , ajout nb quantité de l'item

                        if (listProducts[i].Id == listIdsItems[j]) {

                            //on récupère la quantité du produit si il existe
                            nbAdd = listItemsOrder[j].Quantity;

                        }
                    }

                    //Ajout nb quantité pour un produit I
                    for (p = 0; p < nbAdd; p++) {

                        $rootScope.addToCart(listProducts[i]);
                    }
                }

            }, (err) => {
                console.log(err);
            });


        }

    }



    $scope.validZipPostCode = (strZip) => {
        if (strZip) {
            const reFrance = /^[0-9]{5}$/;
            const resultFrance = reFrance.test(strZip);

            //Post Code canadien, avec espace facultatif
            const reCanada = /[ABCEGHJKLMNPRSTVXY][0-9][ABCEGHJKLMNPRSTVWXYZ] ?[0-9][ABCEGHJKLMNPRSTVWXYZ][0-9]/;
            const resultCanada = reCanada.test(strZip.toUpperCase());
            return resultCanada || resultFrance;
        } else {
            return false;
        }
    };
    //#endregion

    /**
     *  Scan the loyalty card
     */
    $scope.scanBarcode = () => {
        try {
            cordova.plugins.barcodeScanner.scan(
                (result) => {
                    $scope.newLoyalty.barcode.barcodeValue = result.text;
                },
                (error) => {}
            );
        } catch (err) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalBarcodeReader.html',
                controller: 'ModalBarcodeReaderController',
                backdrop: 'static'
            });

            modalInstance.result.then((value) => {
                $scope.newLoyalty.barcode.barcodeValue = value;
            }, (err) => {
                console.log(err);
            });
        }
    };

    $scope.setBarcodeFocus = () => {
        let test = document.getElementById("txtBarcodeCustomer");
        test.focus();
    };

    $scope.changeOperation = (strOperation) => {
        $scope.registerFull = !$scope.canRegisterPartial;
        $scope.registerOperation = strOperation;
    };

    $scope.validCustomer = () => {
        $scope.validDisabled = true;
        // No register if no customer is selected

        if ($scope.clientSelected) {
            $uibModalInstance.close();
            $scope.validDisabled = false;
            return;
        }

        //Si pas d'infos saisie pour les mails- aucune opération
        if ($scope.newLoyalty.CustomerEmail == '' || $scope.newLoyalty.CustomerEmail == undefined) {
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">L\'email est obligatoire</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $scope.validDisabled = false;
            return;
        } else {
            if (!$scope.validEmail($scope.newLoyalty.CustomerEmail) && $scope.registerFull) {
                ngToast.create({
                    className: 'danger',
                    content: '<span class="bold">Le format de l\'email est incorrect</span>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                $scope.validDisabled = false;
                return;
            }
        }

        if ($scope.signInSettings.Phone && !$scope.validPhone($scope.newLoyalty.CustomerPhone) && $scope.registerFull) {
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Le format du téléphone est incorrect</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $scope.validDisabled = false;
            return;
        }

        if ($scope.signInSettings.ZipPostalCode && !$scope.validZipPostCode($scope.newLoyalty.CustomerZipPostalCode) && $scope.registerFull) {
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Le format du code postal est incorrect</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
            $scope.validDisabled = false;
            return;
        }

        if (!$rootScope.currentShoppingCart) {
            $rootScope.createShoppingCart();
        }

        const registerWithBarcode = (barcode) => {
            loyaltyService.getLoyaltyObjectAsync($scope.newLoyalty.barcode.barcodeValue).then((loyalty) => {
                if (!loyalty) {
                    loyalty = $scope.newLoyalty;
                    $scope.validDisabled = false;
                    return;
                } else {
                    //On associe le client à la carte
                    loyalty.CustomerEmail = $scope.newLoyalty.CustomerEmail;
                    loyalty.CustomerFirstName = $scope.newLoyalty.CustomerFirstName;
                    loyalty.CustomerLastName = $scope.newLoyalty.CustomerLastName;
                }
                registerWithoutBarcode(loyalty);
            }, (err) => { //response
                $scope.validDisabled = false;
                swal({
                    title: $translate.instant("Le serveur de fidélité n'est pas joignable ...")
                });
                console.error(err);
            });
        };

        const registerWithoutBarcode = (loyalty) => {
            //On enregistre le client partiel
            loyaltyService.registerCustomerAsync(loyalty).then((loyalty) => {
                $scope.validDisabled = false;
                // On ajoute la fidélité au ticket
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
                $scope.validDisabled = false;
                $uibModalInstance.close();
            }, (err) => {
                $scope.validDisabled = false;
                console.error(err);
            });
        };

        switch ($scope.registerOperation) {
            //si la case fidélité est coché on enregistre le client
            case "registerFid":
                try {
                    const isFormComplete = () => {
                        // Si un parametre est requiered dans signInSettings
                        // On verifie si le champs du formulaire qui lui est associé est valide
                        // Si non, la methode retourne false
                        try {
                            let entries = Object.entries($scope.signInSettings);
                            for (let [key, value] of entries) {
                                //Si le champs est requis
                                if (value) {
                                    //On verifie si le champs est renseigné
                                    //Validation ?
                                    if (!$scope.newLoyalty["Customer" + key] || $scope.newLoyalty["Customer" + key] == "" || $scope.newLoyalty["Customer" + key].length == 0) {
                                        throw 0;
                                    }
                                }
                            }
                            $scope.validDisabled = false;
                            return true;
                        } catch (ex) {
                            $scope.validDisabled = false;
                            return false;
                        }
                    };

                    if ($scope.registerFull) {
                        loyaltyService.getLoyaltyObjectAsync().then((l) => {
                            $scope.newLoyalty.AllowCustomerToCreateLoyaltyBarcode = l.AllowCustomerToCreateLoyaltyBarcode;
                            console.log(l.AllowCustomerToCreateLoyaltyBarcode);
                            // Si tout les champs requis sont rempli
                            if (isFormComplete() != false &&
                                (!l.AllowCustomerToCreateLoyaltyBarcode && $scope.newLoyalty.barcode.barcodeValue != "" || l.AllowCustomerToCreateLoyaltyBarcode)) {
                                console.log($scope.newLoyalty);
                                loyaltyService.registerFullCustomerAsync($scope.newLoyalty).then((loyalty) => {
                                    // On ajoute la fidélité au ticket
                                    $scope.validDisabled = false;
                                    console.log('Succes');
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
                                    $scope.validDisabled = false;
                                    $uibModalInstance.close();
                                }, (err) => {
                                    $scope.validDisabled = false;
                                    console.error(err);
                                });
                                //Appelle loyalty service
                                //Enregistre le customer complet
                            } else {
                                $scope.validDisabled = false;
                                ngToast.create({
                                    className: 'danger',
                                    content: '<span class="bold">Veuillez renseigner tous les champs</span>',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                                $scope.validDisabled = false;
                            }
                        }, () => {
                            swal({
                                title: $translate.instant("Une erreur s'est produite !")
                            });
                            $scope.validDisabled = false;
                        });
                    } else if ($scope.canRegisterPartial) {
                        // On récupère le loyalty si il existe
                        // Si le client n'a pas de loyalty on l'enregistre en partiel
                        // Barcode demat autorisé
                        if ($scope.canCreateBarcode) {
                            // Pas de barcode renseigné
                            if ($scope.newLoyalty.barcode.barcodeValue === "") {
                                registerWithoutBarcode($scope.newLoyalty);
                            } else {
                                registerWithBarcode($scope.newLoyalty.barcode.barcodeValue);
                            }
                        }
                        // Pas de barcode demat
                        else {
                            if ($scope.newLoyalty.barcode.barcodeValue === "") {
                                ngToast.create({
                                    className: 'info',
                                    content: 'le code barre n\'est pas renseigné',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                                $scope.validDisabled = false;
                                return;
                            } else {
                                registerWithBarcode($scope.newLoyalty.barcode.barcodeValue);
                            }
                        }

                    }
                } catch (err) {
                    $scope.validDisabled = false;
                    ngToast.create({
                        className: 'danger',
                        content: '<span class="bold">Impossible d\'enregistrer le client</span>',
                        dismissOnTimeout: true,
                        timeout: 10000,
                        dismissOnClick: true
                    });
                    $scope.validDisabled = false;
                }
                break;
            case "getEmail":
                $scope.validDisabled = false;

                $rootScope.currentShoppingCart.customerLoyalty = $scope.newLoyalty;
                $rootScope.$emit("customerLoyaltyChanged", $scope.newLoyalty);
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);

                ngToast.create({
                    className: 'info',
                    content: 'Le mail ' + $scope.newLoyalty.CustomerEmail + 'a été ajouté au ticket',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                $scope.validDisabled = false;
                $uibModalInstance.close();
                break;
        }
    };

    const customerHasModif = () => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty) {
            const eq = !angular.equals($rootScope.currentShoppingCart.customerLoyalty, $scope.updatedCustomerLoyalty);
            return eq;
        } else {
            return false;
        }
    };


    $scope.ok = () => {
        delete $rootScope.currentPage;
        $rootScope.closeKeyboard();
    };

    $scope.close = () => {
        delete $rootScope.currentPage;
        $uibModalInstance.dismiss('cancel');
    };

    // #region fid
    $scope.containsBalanceType = (balanceType) => {
        let ret = false;

        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty &&
            $rootScope.currentShoppingCart.customerLoyalty.Balances &&
            $rootScope.currentShoppingCart.customerLoyalty.Balances.length > 0) {
            ret = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Balances).any((balance) => {
                return balance.BalanceType == balanceType;
            });
        }
        return ret;
    };

    $scope.getUseToPay = () => {
        let ret = false;

        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerLoyalty &&
            $rootScope.currentShoppingCart.customerLoyalty.Balances &&
            $rootScope.currentShoppingCart.customerLoyalty.Balances.length > 0) {
            ret = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Balances).firstOrDefault((balance) => {
                return balance.UseToPay;
            });
        }
        return ret;
    };

    $scope.getDate = (date) => {
        return new Date(date);
    };
    //limit history at 10

    $scope.getMaxHistory = (history) => {
        let historyLimit;

        return history;
    };

    $scope.getTotalPositiveHistory = (history, balance) => {
        let total = 0;
        for (let i = 0; i < history.length; i++) {
            total += history[i].Value > 0 && history[i].BalanceType_Id == balance.BalanceType_Id ? history[i].Value : 0;
        }
        return balance.UseToPay ? roundValue(total) : total;
    };

    $scope.creditBalance = (mode) => {
        let balance = $scope.getUseToPay();
        if (balance && $rootScope.currentShoppingCart.Barcode) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalAddToBalance.html',
                controller: 'ModalAddToBalanceController',
                resolve: {
                    mode: () => {
                        return mode;
                    },
                    customerBalance: () => {
                        return balance;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then((amountToCredit) => {

                loyaltyService.addBalanceCreditAsync(balance, mode, amountToCredit).then(() => {
                    //Recharche le client
                    loyaltyService.getLoyaltyAsync($rootScope.currentShoppingCart.Barcode);
                }, (err) => {
                    console.error(err);
                })

            });
        }
    };

    $scope.creditConsignorBalance = () => {
        if ($rootScope.IziBoxConfiguration.UseAccountConsignor) {
            // Passe en mode paiement de compte
            // Et ferme la modal
            $rootScope.currentShoppingCart.IsAccountConsignorPayment = true;

            // Clear Shoppingcart
            shoppingCartService.clearShoppingCartItem();
            $uibModalInstance.dismiss();
        }
    };

    //[WARNING] -> La caisse ne peut pas utiliser le addpassage il est géré à l'intégration du ticket
    $scope.addPassage = () => {
        $scope.isAddingPassage = true;
        let passageObj = loyaltyService.createEmptyPassageObj();
        loyaltyService.addPassageAsync(passageObj).then(() => {
            customAlert($translate.instant("Un passage a été ajouté"));
        });
    };

    $scope.clickAction = (actionId, isTiles) => {
        $rootScope.currentShoppingCart.customerLoyalty.customAction = actionId;
        $scope.useAction(true);
    };

    //deprecated
    $scope.useAction = (isTiles) => {
        var amount = $('#orderAmountInput').val();
        // If the amount is mandatory
        if ($rootScope.currentShoppingCart.customerLoyalty.CustomActionMandatoryAmount && (amount == null || amount == undefined || amount === "")) {
            customAlert($translate.instant("Veuillez saisir") + " " + ($rootScope.currentShoppingCart.customerLoyalty.OneRuleWithOrderAmountString ? $rootScope.currentShoppingCart.customerLoyalty.OneRuleWithOrderAmountString : $translate.instant("Montant d'achat")));
        } else {
            $scope.isUsingAction = true;
            customConfirm($translate.instant("Voulez-vous effectuer cette action ?"), "", (isAccept) => {
                if (isAccept) {
                    let passageObj = loyaltyService.createEmptyPassageObj();
                    if (amount != null && amount != undefined && amount != "") {
                        passageObj.OrderTotalIncludeTaxes = amount;
                        passageObj.OrderTotalExcludeTaxes = amount;
                    }
                    if (isTiles) {
                        passageObj.CustomAction = {
                            "CustomActionId": $rootScope.currentShoppingCart.customerLoyalty.customAction
                        };
                    } else {
                        passageObj.CustomAction = {
                            "CustomActionId": $('#actionSelect').val()
                        };
                    }
                    //$log.info(passageObj); // BROKEN

                    loyaltyService.addPassageAsync(passageObj).success(() => {
                        customAlert($translate.instant("Action exécutée"));
                    });
                } else {
                    $scope.isUsingAction = false;
                }
            });
        }
    };

    $scope.toggleEditClient = () => {
        //Active l'edition du customer
        $scope.editMode = true;
    };

    $scope.validModifClient = () => {
        $scope.editMode = false;
        if (customerHasModif()) {
            updateCustomer();
        }
    };

    $scope.abortModifClient = () => {
        $scope.editMode = false;
    };

    $scope.addOffer = () => {
        // Marche pas, erreur 500, demander a Ben
        // loyaltyService.getAllOffersAsync().then(() => {
        //
        // })
        // Ajoute une offre (au choix) au client selectionné
        // TODO : Recuperer toutes les offres de la loyalty class du client
        // Afficher une pop up de selection de l'offre
        // Ajouter l'offre au client
    };

    const updateCustomer = () => {
        const UpdatedLoyalty = {
            Email: $scope.updatedCustomerLoyalty.CustomerEmail,
            Barcode: $rootScope.currentShoppingCart.Barcode,
            FirstName: $scope.updatedCustomerLoyalty.CustomerFirstName,
            LastName: $scope.updatedCustomerLoyalty.CustomerLastName,
            Phone: $scope.updatedCustomerLoyalty.CustomerPhone
        };


        if ($scope.validPhone(UpdatedLoyalty.Phone)) {
            loyaltyService.updateCustomerAsync(UpdatedLoyalty).then((res) => {
                //Recharche le client
                loyaltyService.getLoyaltyAsync($rootScope.currentShoppingCart.Barcode);
            }, (err) => {});
        } else {
            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Le format du téléphone est incorrect</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
        }
    };

    const customAlert = (newTitle, newText, callback) => {
        swal({
            title: newTitle,
            text: newText,
            buttons: [false, $translate.instant("Ok")]
        }).then((confirm) => {
            if (confirm) {
                callback();
            }
        });
    };

    const customConfirm = (newTitle, newText, callback) => {
        swal({
            title: newTitle,
            text: newText,
            buttons: [$translate.instant("Non"), $translate.instant("Ok")]
        }).then((confirm) => {
            callback(confirm);
        });
    };
    //#endregion
});