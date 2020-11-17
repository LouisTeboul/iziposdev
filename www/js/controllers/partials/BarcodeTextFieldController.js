app.controller('BarcodeTextFieldController', function ($scope, $rootScope, $uibModal, $mdMedia, $translate, textFieldService, shoppingCartService, productService, stockService, loyaltyService, paymentService) {
    let txtBarcode;

    $scope.init = () => {
        txtBarcode = document.querySelector("#txtBarcode");
        $scope.barcode = $rootScope.currentBarcode;

        if (!$rootScope.keypressListener) {
            $rootScope.keypressListener = $rootScope.$on(Keypad.KEY_PRESSED, (event, data) => {
                let a = textFieldService.getFocusedTextField();
                let b = document.querySelectorAll(".modal");
                if (document.querySelectorAll(".modal").length === 0 || $rootScope.borne) {
                    focusTextField();
                    $scope.barcode.barcodeValue += data;
                }
            });
        }

        if (!$rootScope.modifierKeyListener) {
            $rootScope.modifierKeyListener = $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, (event, data) => {
                if (data === "NEXT") {
                    $scope.validTextField(false);
                }
                if (data === "CLEAR") {
                    $scope.$evalAsync();
                }
            });
        }

        $scope.$on("$destroy", () => {
            $scope.resetKeyboard();
        });
    };

    $scope.showKeyboard = () => {
        if ($rootScope.isKeyboardOpen("decimal")) {
            $rootScope.closeKeyboard();
        } else {
            focusTextField();
            let location = "end-center";

            if ($scope.accordionStatus && !$scope.accordionStatus.ticketOpen) {
                location = "start-center";
            }
            $rootScope.openKeyboard("decimal", location);
        }
    };

    const focusTextField = () => {
        if (txtBarcode) {
            txtBarcode.focus();
        }
    };

    const unfocusTextField = () => {
        if (txtBarcode) {
            txtBarcode.blur();
        }
    };

    $scope.validTextField = (scanned) => {
        let result = false;
        if ($scope.barcode.barcodeValue) {
            let barcode = $scope.barcode.barcodeValue.trim();

            $scope.resetKeyboard();

            unfocusTextField();

            barcode = barcode.replace(/.+\//, '');
            const barcodeLength = barcode.length;

            if (barcodeLength > 0) {
                if (barcode.toUpperCase().startsWith("ADMIN")) {
                    /* Admin barcodes */
                    // Check si le barcode est dans la liste des barcode admin
                    if ($rootScope.IziBoxConfiguration.AdminBarcodes &&
                        $rootScope.IziBoxConfiguration.AdminBarcodes.map(b => b.toUpperCase()).includes(barcode.toUpperCase())) {
                        window.location.reload();
                    }
                } else if (barcode.startsWith("TK")) {
                    /* Freezed shoppingCart */
                    let id = barcode.replace("TK", "");
                    id = parseInt(id);
                    shoppingCartService.unfreezeShoppingCartById(id);
                    result = true;
                } else if (barcode.startsWith("AV")) {
                    /* Avoir */
                    if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Residue > 0) {
                        const avoirValues = atob(barcode.replace("AV", "")).split("|");
                        const avoirAmount = parseFloat(avoirValues[1]) / 100;
                        const avoirStoreId = Number(avoirValues[2]);
                        const avoirValidity = Number(avoirValues[3]);
                        console.log("Avoir : " + avoirValues + " Montant : " + avoirAmount + " StoreId : " + avoirStoreId + " Validity : " + avoirValidity);

                        const timestamp = new Date().getTime();

                        if (!avoirStoreId && !avoirValidity || avoirStoreId == $rootScope.IziBoxConfiguration.StoreId && timestamp < avoirValidity) {
                            const avoirPaymentMode = $rootScope.paymentModesAvailable.find((pm) => pm.PaymentType === PaymentType.AVOIR);

                            if (avoirPaymentMode && $rootScope.currentShoppingCart.TotalTR !== 0) {
                                shoppingCartService.checkCreditUsedAsync(barcode).then((creditUsed) => {
                                    if (creditUsed.data.Result.toLowerCase() === 'false') {
                                        addCreditToCart(barcode, avoirPaymentMode, avoirAmount);
                                    } else {
                                        swal({
                                            title: "Avoir déjà utilisé !"
                                        });
                                    }
                                }, (err) => {
                                    addCreditToCart(barcode, avoirPaymentMode, avoirAmount);
                                });
                            } else {
                                let desc = "";

                                if (!avoirPaymentMode) {
                                    desc += "Aucun mode de paiement de type avoir n'a été trouvé.";
                                }

                                if ($rootScope.currentShoppingCart.TotalTR === 0) {
                                    desc += (desc ? " " : "") + "Le ticket n'est pas éligible.";
                                }

                                swal({
                                    title: $translate.instant("Impossible de payer ces produits avec un avoir."),
                                    text: desc
                                });
                            }
                        } else {
                            swal({
                                title: $translate.instant("Avoir expiré ou invalide !")
                            });
                        }
                    } else {
                        $scope.resetKeyboard();
                        if ($rootScope.currentShoppingCart) {
                            swal({
                                title: "Erreur d'ajout !",
                                text: "L'avoir n'a pas pu être ajouté car le ticket en cours est déjà soldé."
                            });
                        } else {
                            swal({
                                title: "Erreur d'ajout !",
                                text: "L'avoir n'a pas pu être ajouté car vous n'avez aucun panier."
                            });
                        }
                    }
                    result = true;
                } else if (barcodeLength === 24 && !isNaN(barcode)) {
                    /* TicketResto */

                    if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Residue > 0) {
                        shoppingCartService.checkTicketRestoUsedAsync(barcode).then((ticketRestoUsed) => {
                            if (ticketRestoUsed.data.Result.toLowerCase() === 'false') {
                                result = paymentService.addTicketRestaurant(barcode);
                                if (result) {
                                    if (scanned) {
                                        $scope.scanBarcode();
                                    }
                                }
                            } else {
                                swal({
                                    title: "Ticket restaurant déjà utilisé !"
                                });
                            }
                            $scope.resetKeyboard();
                        }, (err) => {
                            result = paymentService.addTicketRestaurant(barcode);
                            if (result) {
                                if (scanned) {
                                    $scope.scanBarcode();
                                }
                            }
                            $scope.resetKeyboard();
                        });
                    } else {
                        $scope.resetKeyboard();
                        if ($rootScope.currentShoppingCart) {
                            swal({
                                title: "Erreur d'ajout !",
                                text: "Le titre-restaurant n'a pas pu être ajouté car le ticket en cours est déjà soldé."
                            });
                        } else {
                            swal({
                                title: "Erreur d'ajout !",
                                text: "Le titre-restaurant n'a pas pu être ajouté car vous n'avez aucun panier."
                            });
                        }
                    }
                } else if (barcodeLength >= 11 && barcodeLength <= 19 && !isNaN(barcode)) {
                    /* Product */
                    productService.addToCartBySku(barcode);
                    result = true;
                } else if (isNaN(barcode)) {
                    productService.searchProductAsync(barcode).then((searchResult) => {
                        if (searchResult && searchResult.length > 0) {
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
                                controller: 'ModalSearchProductsController',
                                windowClass: 'centeredModals ' + size,
                                size: 'lg',
                                backdrop: false,
                                resolve: {
                                    products: () => {
                                        return searchResult;
                                    }
                                }
                            });

                            modalInstance.result.then((product) => {
                                let clonedProduct = angular.copy(product);
                                if (!(clonedProduct.DisableBuyButton || (clonedProduct.ManageInventoryMethodId === 1 && clonedProduct.StockQuantity === 0 || clonedProduct.ManageInventoryMethodId === 1
                                    && clonedProduct.StockQuantity - stockService.getBufferStockForProductId(clonedProduct.Id) <= 0))) {
                                    if ($rootScope.EnableMultiStore && $rootScope.storeFilter) {
                                        clonedProduct.StoreId = $rootScope.storeFilter.Id;
                                    }
                                    $rootScope.addToCart(clonedProduct);
                                }
                            });
                        }
                    }, (errMsg) => {
                        if (!errMsg) {
                            errMsg = "Aucun produit ne correspond à votre recherche."
                        }
                        swal({
                            title: "Oops",
                            text: errMsg
                        });
                    });
                } else if ($rootScope.IziBoxConfiguration.UseFID) {
                    /* Fid */
                    if (!$rootScope.borne || barcode.length >= 8) {
                        // Si on detecte une carte de fidelité, on verifie si le client a un ticket en attente
                        // Si oui, on le defreeze
                        if (!$rootScope.currentShoppingCart) {
                            shoppingCartService.unfreezeShoppingCartByBarcodeAsync(barcode).then(() => { }).catch(() => {
                                loyaltyService.getLoyaltyAsync(barcode);
                                result = true;
                                $scope.resetKeyboard();
                            });
                        } else {
                            loyaltyService.getLoyaltyAsync(barcode);
                            result = true;
                            $scope.resetKeyboard();
                        }
                    } else {
                        if ($rootScope.borne && $rootScope.borneBipperStarted) {
                            $rootScope.borneBipperScanned = barcode;
                        } else {
                            result = true;
                            $scope.resetKeyboard();
                        }
                    }
                    $rootScope.createShoppingCart();
                } else {
                    swal({
                        title: "Le code à barres n'a pas été reconnu..."
                    });
                    $scope.resetKeyboard();
                }
            }
        }
        return result;
    };

    $scope.resetKeyboard = () => {
        setTimeout(() => {
            $scope.barcode.barcodeValue = '';
            $scope.$evalAsync();
            $rootScope.closeKeyboard();
        }, 100);
    };

    const addCreditToCart = (barcode, avoirPaymentMode, avoirAmount) => {
        let added = $rootScope.currentShoppingCart.Credits ? $rootScope.currentShoppingCart.Credits.find((credit) => {
            return credit.Barcode === barcode;
        }) : null;
        if (!added) {
            paymentService.addCredit(barcode);
            let paymentByAvoir = clone(avoirPaymentMode);
            paymentByAvoir.Total = avoirAmount;
            paymentByAvoir.Barcode = barcode;
            paymentService.addPaymentMode(paymentByAvoir);
        } else {
            swal({
                title: "Avoir déjà utilisé !"
            });
        }
    };

    $scope.scanBarcode = () => {
        try {
            cordova.plugins.barcodeScanner.scan(
                (result) => {
                    $scope.barcode.barcodeValue = result.text;
                    $scope.validTextField();
                }, (err) => {
                    console.error(err);
                }
            );
        } catch (err) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalBarcodeReader.html',
                controller: 'ModalBarcodeReaderController',
                backdrop: 'static'
            });

            modalInstance.result.then((value) => {
                $scope.barcode.barcodeValue = value;
                $scope.validTextField();
            }, (err) => {
                console.error(err);
            });
        }
    };
});