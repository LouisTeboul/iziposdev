app.controller('ModalPaymentModeController', function ($scope, $http, $rootScope, shoppingCartModel, $uibModalInstance, paymentMode, maxValue, $translate, $filter, $q) {

    const currencyFormat = $filter('CurrencyFormat');

    $scope.paymentMode = paymentMode;
    $scope.paymentType = PaymentType;
    $scope.errorMessage = undefined;
    $scope.value = {};
    $scope.valueKeyboard = "";
    $scope.options = {
        easytransacType: ""
    };

    $scope.init = function () {
        if (maxValue === undefined) {
            maxValue = 99999;
        }
        $scope.value.pay = paymentMode.Total;
        $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
        if(!$rootScope.borne) {
            setTimeout(function () {
                const txtAmount = document.getElementById("txtAmount");
                if (txtAmount) {
                    txtAmount.focus();
                }
            }, 100);
        } else {
            setTimeout(function () {
                $scope.options.easytransacType = `NFC`;
                $scope.ok();
            }, 100);
        }
        $scope.customStyle = {
            'flex-direction' : $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)'
        }
    };

    $scope.removeTicketResto = function (tkResto) {
        shoppingCartModel.removeTicketRestaurant(tkResto);
        $scope.value.pay = paymentMode.Total + "";
    };

    $scope.remove = function () {
        $scope.value.pay = 0;
        $scope.ok();
    };

    $scope.calculate = function () {
        try {
            const newValue = Math.round(eval($scope.value.pay) * 100) / 100;

            if (!isNaN(newValue)) {
                $scope.value.pay = newValue;
            }
        } catch (err) {
            console.error(err);
        }
    };

    $scope.toNFC = function () {
        $scope.options.easytransacType = `NFC`;
        this.ok();
    };
    $scope.toScanner = function () {
        $scope.options.easytransacType = `SCANNER`;
        this.ok();
    };

    $scope.ok = function () {
        $scope.calculate();

        const totalPayment = parseFloat($scope.value.pay);

        if (isNaN(totalPayment)) {
            $scope.errorMessage = $translate.instant("Montant non valide");
        } else if (maxValue !== undefined && totalPayment > maxValue) {
            $scope.errorMessage = $translate.instant("Le montant ne peut pas dépasser") + " " + currencyFormat(maxValue);
        } else {
            runPaymentProcessAsync().then(function () {
                $scope.infoMessage = "";
                $scope.lockView = false;
                $scope.errorMessage = undefined;
                $scope.paymentMode.Total = totalPayment;
                $uibModalInstance.close($scope.paymentMode);

                setTimeout(function () {
                    $rootScope.closeKeyboard();
                }, 500);

                if($scope.paymentMode.PaymentType === PaymentType.EASYTRANSAC) {
                    shoppingCartModel.validBorneOrder();
                }

                if(($scope.paymentMode.PaymentType === PaymentType.CB) && $rootScope.borne) {
                    shoppingCartModel.validBorneOrder();

                }

                $scope.$evalAsync();
            }, function (errPaymentProcess) {
                $scope.lockView = false;
                $scope.errorMessage = errPaymentProcess;
                $scope.$evalAsync();
            });
        }

        $scope.$evalAsync();
    };

    const runPaymentProcessAsync = function () {
        const processDefer = $q.defer();
        switch ($scope.paymentMode.PaymentType) {
            case PaymentType.EASYTRANSAC:
                try {
                    const apiKey = $scope.paymentMode.Options.EasyTransacKey;
                    const amountCtsStr = (parseFloat($scope.value.pay) * 100).toString();
                    const scannerType = $scope.options.easytransacType;

                    cordova.EasyTransacPlugin.launch(apiKey, amountCtsStr, scannerType,
                        function (resEasyTransac) {
                            $scope.paymentMode.paymentProcessResult = resEasyTransac;
                            processDefer.resolve();
                        }, function (errEasyTransac) {
                            $scope.paymentMode.paymentProcessResult = errEasyTransac;
                            const errorTxt = errEasyTransac && errEasyTransac.error ? errEasyTransac.error : JSON.stringify(errEasyTransac);
                            processDefer.reject(errorTxt);
                        });
                } catch (pluginEx) {
                    processDefer.reject($translate.instant("Le paiement EasyTransac est indisponible."));
                }
                break;
            case PaymentType.CB:
                if($rootScope.borne) {
                    try {
                        const amountCts = Math.floor(maxValue * 100);
                        $scope.lockView = true;

                        if(window.tpaPayment) { //MonoPlugin
                            $scope.infoMessage = "Suivez les instructions sur le TPE";
                            const tpaPromise = new Promise(function (resolve, reject) {
                                window.tpaPayment.initPaymentAsync(amountCts, resolve, reject);
                            });

                            tpaPromise.then( (ticket) => {
                                const printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printhtml";
                                const htmlPrintReq = {
                                    PrinterIdx: $rootScope.PrinterConfiguration.POSPrinter,
                                    Html: ticket + "<cut></cut>"
                                };

                                $http.post(printerApiUrl, htmlPrintReq, {timeout: 10000});
                                $scope.paymentMode.paymentProcessResult = "Success";
                                processDefer.resolve();
                            }, (err) => {
                                $scope.paymentMode.paymentProcessResult = "Error";
                                processDefer.reject(err);
                            })
                        } else {
                            processDefer.reject('Le paiement par carte est indisponible');
                            $scope.cancel();
                            swal($translate.instant("Une erreur s'est produite ! Veuillez réessayer ou selectionner le paiement au comptoir."));
                        }
                    } catch (pluginEx) {
                        $scope.paymentMode.paymentProcessResult = "Error";
                        processDefer.reject($translate.instant("Le plugin Valina ne peut pas être appelé"));
                        $scope.cancel();
                        swal($translate.instant("Une erreur s'est produite ! Veuillez réessayer ou selectionner le paiement au comptoir."));
                    }
                } else {
                    $scope.paymentMode.paymentProcessResult = "Success";
                    processDefer.resolve();
                }
                break;
            default:
                $scope.paymentMode.paymentProcessResult = "Success";
                processDefer.resolve();
                break;
        }

        return processDefer.promise;
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');

        setTimeout(function () {
            $rootScope.closeKeyboard();
        }, 500);
    }
});