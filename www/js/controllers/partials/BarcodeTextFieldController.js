app.controller('BarcodeTextFieldController', function ($scope, $rootScope, $uibModal, shoppingCartModel,textFieldService) {

    var txtBarcode;

    $scope.init = function () {
        txtBarcode = document.getElementById("txtBarcode");

        $scope.barcode = shoppingCartModel.getCurrentBarcode();

        $rootScope.$on(Keypad.KEY_PRESSED, function (event, data) {
        	if (!textFieldService.getFocusedTextField() && document.getElementsByClassName("modal").length == 0) {
        		$scope.$evalAsync(function () {
        			focusTextField();
        			$scope.barcode.barcodeValue += data;
        		});
        	}
        });
    }

    $scope.showKeyboard = function () {

    	if ($rootScope.isKeyboardOpen("decimal")) {
    		$rootScope.closeKeyboard();
    	} else {

    		focusTextField();

    		var location = "end-center";

    		if ($scope.accordionStatus && !$scope.accordionStatus.ticketOpen) {
    			location = "start-center";
    		}

    		$rootScope.openKeyboard("decimal", location);
    		$rootScope.openKeyboard("decimal", location);
    	}
    }

    var focusTextField = function () {
        
        if (txtBarcode) {
            txtBarcode.focus();
        }
    }
    

    $scope.clearTextField = function () {
        $scope.barcode.barcodeValue = '';
        $scope.$evalAsync();
    }

    $scope.validTextField = function (scanned) {
        var result = false;
        if ($scope.barcode.barcodeValue) {
            var barcode = $scope.barcode.barcodeValue.trim();
            barcode = barcode.replace(/.+\//, '');
            var barcodeLength = barcode.length;
            //console.log(barcode + " / " + barcodeLength);

            if (barcodeLength > 0) {
                if /* Freezed shoppingCart */ (barcode.indexOf("TK") == 0) {
                    var id = barcode.replace("TK", "");
                    id = parseInt(id);
                    shoppingCartModel.unfreezeShoppingCartById(id);
                    result = true;
                } else if /* Avoir */ (barcode.indexOf("AV") == 0) {
                    if (shoppingCartModel.getCurrentShoppingCart()) {
                        var avoirValues = (atob(barcode.replace("AV", ""))).split("|");
                        var avoirAmount = parseFloat(avoirValues[1]) / 100;
                        console.log("Avoir : " + avoirValues + " Montant : " + avoirAmount);

                        var paymentModes = shoppingCartModel.getPaymentModesAvailable();
                        var avoirPaymentMode = Enumerable.from(paymentModes).firstOrDefault(function (pm) { return pm.PaymentType == PaymentType.AVOIR; });

                        if (avoirPaymentMode) {
                            var paymentByAvoir = clone(avoirPaymentMode);
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

                    shoppingCartModel.getLoyalty(barcode);
                    result = true;
                } else {
                    sweetAlert("Le code à barres n'a pas été reconnu...");
                }
            }

            $scope.clearTextField();
        }
        return result;
    }

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
            var modalInstance = $uibModal.open({
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