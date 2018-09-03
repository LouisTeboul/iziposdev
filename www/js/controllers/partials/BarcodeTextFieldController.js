app.controller('BarcodeTextFieldController', function ($scope, $rootScope, $uibModal, shoppingCartModel, textFieldService) {

    let txtBarcode;

    $scope.init = function () {
        txtBarcode = document.getElementById("txtBarcode");

        $scope.barcode = shoppingCartModel.getCurrentBarcode();

        $rootScope.$on(Keypad.KEY_PRESSED, function (event, data) {
            if (!textFieldService.getFocusedTextField() && document.querySelectorAll(".modal").length == 0) {
                $scope.$evalAsync(function () {
                    focusTextField();
                    try {
                        Navigator.vibrate(10);
                    }
                    catch (error) {
                        console.error(error);
                    }
                    finally {
                        $scope.barcode.barcodeValue += data;
                    }


                });
            }
        });


        $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, function (event, data) {
            if (data === "NEXT") {
                $scope.validTextField(false);
            }
            if (data === "CLEAR") {
                $scope.barcode.barcodeValue = $scope.barcode.barcodeValue.substring(0, $scope.barcode.barcodeValue.length - 1);
                $scope.$evalAsync();
            }
        });
    };

    $scope.showKeyboard = function () {
        if ($rootScope.isKeyboardOpen("decimal")) {
            $rootScope.closeKeyboard();
        }
        else {
            focusTextField();

            let location = "end-center";

            if ($scope.accordionStatus && !$scope.accordionStatus.ticketOpen) {
                location = "start-center";
            }

            $rootScope.openKeyboard("decimal", location);
            //$rootScope.openKeyboard("decimal", location);
        }
    };

    const focusTextField = function () {
        if (txtBarcode) {
            txtBarcode.focus();
        }
    };

    $scope.clearTextField = function () {
        $scope.barcode.barcodeValue = '';
        $scope.$evalAsync();
    };

    $scope.validTextField = function (scanned) {
        let result = false;
        if ($scope.barcode.barcodeValue) {
            let barcode = $scope.barcode.barcodeValue.trim();
            barcode = barcode.replace(/.+\//, '');
            const barcodeLength = barcode.length;

            if (barcodeLength > 0) {
                if /* Freezed shoppingCart */ (barcode.indexOf("TK") == 0) {
                    let id = barcode.replace("TK", "");
                    id = parseInt(id);
                    shoppingCartModel.unfreezeShoppingCartById(id);
                    result = true;
                } else if /* Avoir */ (barcode.indexOf("AV") == 0) {
                    if (shoppingCartModel.getCurrentShoppingCart()) {
                        const avoirValues = (atob(barcode.replace("AV", ""))).split("|");
                        const avoirAmount = parseFloat(avoirValues[1]) / 100;
                        console.log("Avoir : " + avoirValues + " Montant : " + avoirAmount);

                        const paymentModes = shoppingCartModel.getPaymentModesAvailable();
                        const avoirPaymentMode = Enumerable.from(paymentModes).firstOrDefault(function (pm) {
                            return pm.PaymentType == PaymentType.AVOIR;
                        });

                        if (avoirPaymentMode) {
                            let paymentByAvoir = clone(avoirPaymentMode);
                            paymentByAvoir.Total = avoirAmount;
                            shoppingCartModel.addPaymentMode(paymentByAvoir);
                        }
                    }

                    result = true;
                } else if /* TicketResto */ (barcodeLength == 24 && !isNaN(barcode)) {

                    result = shoppingCartModel.addTicketRestaurant(barcode);

                    if (result) {

                        $scope.clearTextField();

                        if (scanned) {
                            $scope.scanBarcode();
                        }
                    }


                } else /* Product */ if (barcodeLength == 13 && !isNaN(barcode)) {
                    shoppingCartModel.addToCartBySku(barcode);
                    result = true;
                } else /* Fid */ if ($rootScope.IziBoxConfiguration.UseFID) {


                    // Si on detecte une carte de fidelité, on verifie si le client a un ticket en attente
                    // Si oui, on le defreeze
                    if (shoppingCartModel.getCurrentShoppingCart == undefined) {
                        shoppingCartModel.unfreezeShoppingCartByBarcode(barcode);
                    } else {
                        shoppingCartModel.getLoyalty(barcode);
                        result = true;
                        $rootScope.closeKeyboard();
                    }

                } else {
                    sweetAlert("Le code à barres n'a pas été reconnu...");
                    $rootScope.closeKeyboard();
                }
            }

            $scope.clearTextField();
        }
        return result;
    };

    $scope.scanBarcode = function () {
        try {
            cordova.plugins.barcodeScanner.scan(
                function (result) {
                    $scope.barcode.barcodeValue = result.text;
                    $scope.validTextField();
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
                $scope.barcode.barcodeValue = value;
                $scope.validTextField();
            }, function () {
            });
        }
    }
});