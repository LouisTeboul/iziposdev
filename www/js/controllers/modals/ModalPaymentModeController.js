app.controller('ModalPaymentModeController', function ($scope, $mdMedia, $rootScope, $translate, $filter, $q, $uibModalInstance, paymentMode, maxValue, Idle, paymentService, posUserService) {
    const currencyFormat = $filter('CurrencyFormat');

    $scope.loading = false;
    $scope.canceled = false;
    $scope.lyfPayRunning = false;
    $scope.gloryEnabled = false;
    $scope.gloryRunning = false;

    $scope.mdMedia = $mdMedia;
    $scope.paymentMode = paymentMode;
    $scope.paymentType = PaymentType;
    $scope.CBMerchantTicket = undefined;
    $scope.errorMessage = undefined;
    $scope.value = {
        pay: 0,
        barcode: ''
    };
    $scope.isNotLyfPay = true;
    $scope.valueKeyboard = "";
    $scope.options = {
        easytransacType: ""
    };

    $scope.init = () => {
        if (maxValue === undefined) {
            maxValue = 99999;
        }

        if ($rootScope.borne && window.glory) {
            $scope.gloryEnabled = true;
        }

        // TODO : Creer un droit pour forcer le moyen de paiement
        $scope.canForce = posUserService.isEnable('ODRAW', true);

        $scope.manualOverride = false;

        $scope.value.pay = paymentMode.Total + "";
        let toPay = $rootScope.currentShoppingCart.Residue;
        let balance = 0;
        let usedBalance = "";
        let titleBalance = "";

        if (paymentMode.PaymentType === PaymentType.FIDELITE && $rootScope.currentShoppingCart.customerLoyalty && $rootScope.currentShoppingCart.customerLoyalty.Balances) {
            for (let cagnotte of $rootScope.currentShoppingCart.customerLoyalty.Balances) {
                balance += cagnotte.Value;
            }
            if (balance >= toPay) {
                titleBalance = $translate.instant("Voulez-vous payer avec votre cagnotte ?");
                usedBalance = currencyFormat(toPay) + " " + $translate.instant("vont être utilisé");
            } else {
                titleBalance = $translate.instant("Voulez-vous utiliser votre cagnotte ?");
                usedBalance = currencyFormat(balance) + " " + $translate.instant("vont être utilisé et retiré du prix total");
            }

            if ($rootScope.borne) {
                swal({
                    title: titleBalance,
                    text: usedBalance,
                    buttons: [$translate.instant("Non"), $translate.instant("Oui")],
                    dangerMode: true,
                    icon: "warning"
                }).then((confirm) => {
                    if (confirm) {
                        $scope.ok();
                    } else {
                        $uibModalInstance.close();
                    }
                });
            }
        } else {
            if ($rootScope.borne) {
                $scope.ok();
            }
        }

        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row'
        };
        $scope.customBackground = {
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)'
        };
    };

    $scope.removeTicketResto = (tkResto) => {
        paymentService.removeTicketRestaurant(tkResto);
        $scope.value.pay = paymentMode.Total + "";
    };

    $scope.remove = () => {
        $scope.value.pay = 0;
        $scope.ok();
    };

    $scope.calculate = () => {
        try {
            if ($scope.value.pay && typeof $scope.value.pay === "string") {
                $scope.value.pay = $scope.value.pay.replace(",", ".");
            }
            const newValue = Math.round(eval($scope.value.pay) * 100) / 100;

            if (!isNaN(newValue)) {
                $scope.value.pay = newValue;
            }
        } catch (err) {
            console.error(err);
        }
    };

    $scope.toNFC = () => {
        $scope.options.easytransacType = `NFC`;
        this.ok();
    };
    $scope.toScanner = () => {
        $scope.options.easytransacType = `SCANNER`;
        this.ok();
    };

    $scope.ok = () => {
        $scope.calculate();

        const totalPayment = parseFloat($scope.value.pay);

        if (totalPayment > 10000) {
            $scope.errorMessage = $translate.instant("Le montant maximum autorisé est de") + " " + currencyFormat(10000);
            $scope.$evalAsync();
        } else {
            if (window.glory && ($rootScope.borne || $rootScope.UserPreset && $rootScope.UserPreset.EnableGlory) &&
                $scope.paymentMode.PaymentType === PaymentType.ESPECE) {
                $scope.loading = true;
                $rootScope.closeKeyboard();
                $scope.$evalAsync();
                $scope.gloryRunning = true;
                $scope.Deposit(totalPayment * 100);
            } else {
                if ($scope.paymentMode.PaymentType === PaymentType.LYFPAY) {
                    if ($scope.value.barcode != "") {
                        $scope.isNotLyfPay = false;
                        $rootScope.closeKeyboard();
                        $scope.endPayment(totalPayment);
                        $scope.$evalAsync();
                    } else {
                        $scope.infoMessage = "Veuillez renseigner le barcode.";
                    }
                } else if ($scope.paymentMode.PaymentType === PaymentType.FIDELITE) {
                    $scope.endPayment(totalPayment);
                    $scope.$evalAsync();
                } else {
                    $scope.endPayment(totalPayment);
                    $scope.$evalAsync();
                }
            }
        }
    };

    $scope.endPayment = (totalPayment) => {
        if (isNaN(totalPayment)) {
            $scope.errorMessage = $translate.instant("Montant non valide");
        } else if (maxValue !== undefined && maxValue !== null && maxValue === 0) {
            $scope.errorMessage = $translate.instant("Impossible de payer avec ce moyen de paiement.");
        } else if (maxValue && totalPayment > maxValue && !$rootScope.currentShoppingCart.IsAccountConsignorPayment) {
            $scope.errorMessage = $translate.instant("Le montant ne peut pas dépasser") + " " + currencyFormat(maxValue);
        } else {
            runPaymentProcessAsync().then(() => {
                Idle.watch();
                $scope.infoMessage = "";
                $scope.lockView = false;
                $scope.errorMessage = undefined;
                $scope.paymentMode.Total = totalPayment;
                const ret = {
                    paymentMode: $scope.paymentMode,
                    merchantTicket: $scope.CBMerchantTicket ? $scope.CBMerchantTicket : null
                };
                $uibModalInstance.close(ret);
                $rootScope.closeKeyboard();
            }, (errPaymentProcess) => {
                Idle.watch();
                $scope.lockView = false;
                $scope.errorMessage = errPaymentProcess;
            });
        }
    };

    $scope.Deposit = (value) => {
        console.log("Deposit " + value + " cts");
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.deposit(value, resolve, reject);
        });
        const cancelTime = setTimeout($scope.CancelDeposit, 60000);

        gloryPromise.then((res) => {
            clearTimeout(cancelTime);
            let deposit = JSON.parse(res);
            $scope.endPayment(roundValue(deposit.AmountCts / 100));
            $scope.loading = false;
            $scope.$evalAsync();
            $scope.gloryRunning = false;
            $scope.paymentOver = true;
        }, (err) => {
            clearTimeout(cancelTime);
            console.error("Deposit error : " + err);
            $scope.loading = false;
            $scope.$evalAsync();
            $scope.gloryRunning = false;
        });
    };

    $scope.CancelDeposit = () => {
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.cancelDeposit(resolve, reject);
        });
        $scope.canceled = true;
        console.log("Cancel Deposit");
        gloryPromise.then((res) => {
            console.log(res);
            $scope.loading = false;
            $scope.canceled = false;
            $rootScope.closeKeyboard();
            $scope.$evalAsync();
        }, (err) => {
            console.error("CancelDeposit error : " + err);
            $scope.canceled = false;
            $scope.loading = false;
            $rootScope.closeKeyboard();
            $scope.$evalAsync();
        });
    };

    const runPaymentProcessAsync = () => {
        const processDefer = $q.defer();
        switch ($scope.paymentMode.PaymentType) {
            case PaymentType.LYFPAY:
                $scope.lockView = true;
                $scope.lyfPayRunning = true;

                if (window.lyfPay) {
                    $scope.infoMessage = "Suivez les instructions sur l'application LyfPay";

                    const amountCts = Math.round($scope.value.pay * 100);

                    const lyfPayPromise = new Promise((resolve, reject) => {
                        window.lyfPay.sendPayment(amountCts, $rootScope.currentShoppingCart.id + "", $scope.value.barcode, resolve, reject);
                    });
                    lyfPayPromise.then((res) => {
                        console.log("Payment status : " + res);
                        $scope.lyfPayRunning = false;
                        $scope.loading = false;
                        if (res === 'VALIDATED') {
                            processDefer.resolve();
                        } else {
                            processDefer.reject();
                            $scope.cancel();
                            swal({
                                title: "Paiement annulé."
                            });
                        }
                    }, (err) => {
                        console.error("Payment error : " + err);
                        $scope.lyfPayRunning = false;
                        swal({
                            title: "Payment error."
                        });
                        $scope.cancel();
                    });
                } else {
                    $scope.infoMessage = "Plugin LyfPay non disponible";
                }
                break;
            case PaymentType.EASYTRANSAC:
                try {
                    const apiKey = $scope.paymentMode.Options.EasyTransacKey;
                    const amountCtsStr = (parseFloat($scope.value.pay) * 100).toString();
                    const scannerType = $scope.options.easytransacType;

                    cordova.EasyTransacPlugin.launch(apiKey, amountCtsStr, scannerType, (resEasyTransac) => {
                        $scope.paymentMode.paymentProcessResult = resEasyTransac;
                        processDefer.resolve();
                    }, (errEasyTransac) => {
                        $scope.paymentMode.paymentProcessResult = errEasyTransac;
                        const errorTxt = errEasyTransac && errEasyTransac.error ? errEasyTransac.error : JSON.stringify(errEasyTransac);
                        processDefer.reject(errorTxt);
                    });
                } catch (pluginEx) {
                    processDefer.reject($translate.instant("Le paiement EasyTransac est indisponible."));
                }
                break;
            case PaymentType.CB:
            case PaymentType.CBTICKETRESTAURANT:
                // En mode borne, pour les modes de paiement CB, on envoie le montant au TPA de manière bloquante
                if ($rootScope.borne) {
                    try {
                        let selectedAmount = parseFloat($scope.value.pay);
                        const amountCts = Math.round(selectedAmount * 100);
                        $scope.lockView = true;

                        if (window.tpaPayment) { // CEF Plugin
                            $scope.infoMessage = "Suivez les instructions sur le Terminal";
                            $scope.paymentOver = false;
                            const tpaPromise = new Promise((resolve, reject) => {
                                window.tpaPayment.initPaymentAsync(amountCts, resolve, reject);
                            });

                            tpaPromise.then(ret => {
                                const tickets = JSON.parse(ret);
                                $scope.paymentOver = true;
                                // On imprime le ticket client sur l'imprimante borne
                                // const printerApiUrl = $rootScope.APIBaseURL + "/printhtml";
                                // const htmlPrintReq = {
                                //     PrinterIp: $rootScope.modelPos.localIp,
                                //     Html: tickets.CustomerTicket + "<cut></cut>"
                                // };
                                // On sauvegarde la ticket marchand
                                $rootScope.currentShoppingCart.CBTicket = tickets.CustomerTicket;

                                // $http.post(printerApiUrl, htmlPrintReq, {timeout: 10000}).then(() => {
                                //     $scope.paymentMode.paymentProcessResult = "Success";
                                //     processDefer.resolve();
                                //
                                // }, (err) => {
                                //     $scope.paymentMode.paymentProcessResult = "Error";
                                //     processDefer.reject(err);
                                // })

                                processDefer.resolve();
                            }, (err) => {
                                $scope.paymentOver = true;
                                $scope.abort();
                                $scope.paymentMode.paymentProcessResult = "Error";
                                processDefer.reject(err);
                            });
                        } else {
                            processDefer.reject('Le paiement par carte est indisponible');
                            $scope.abort();
                            swal({
                                title: $translate.instant("Une erreur s'est produite ! Veuillez réessayer ou selectionner le paiement au comptoir.")
                            });
                        }
                    } catch (pluginEx) {
                        $scope.paymentMode.paymentProcessResult = "Error";
                        processDefer.reject($translate.instant("Le plugin Valina ne peut pas être appelé"));
                        $scope.abort();
                        swal({
                            title: $translate.instant("Une erreur s'est produite ! Veuillez réessayer ou selectionner le paiement au comptoir.")
                        });
                    }
                } else {
                    try {
                        //let selectedAmount = parseFloat($scope.value.pay);
                        //const amountCts = Math.round(selectedAmount * 100);
                        //$scope.lockView = true;

                        // if (window.tpePayment && $rootScope.IziBoxConfiguration.EnableTPEIntegration) { // CEF Plugin
                        //     // Envoie le montant au TPE, sans attendre le retour
                        //     $scope.paymentOver = false;

                        //     const tpePromise = new Promise((resolve, reject) => {
                        //         window.tpePayment.initPaymentAsync(amountCts, resolve, reject);
                        //     });

                        //     tpePromise.then(() => {}, (err) => {
                        //         console.error(err);
                        //     });
                        // }

                        $scope.paymentOver = true;
                        $scope.paymentMode.paymentProcessResult = "Success";
                        processDefer.resolve();
                    } catch (ex) {
                        console.error(ex);
                        processDefer.reject();
                        $scope.abort();
                    }
                }
                break;

            case PaymentType.TICKETRESTAURANT:
                // Pour les paiment TR, valeut max = 100€
                $scope.paymentMode.Total = Math.min($scope.paymentMode.Total, 100);
                processDefer.resolve();
                break;
            default:
                $scope.paymentMode.paymentProcessResult = "Success";
                processDefer.resolve();
                break;
        }

        return processDefer.promise;
    };

    $scope.cancel = () => {
        if (paymentMode.PaymentType === PaymentType.CB || paymentMode.PaymentType === PaymentType.CBTICKETRESTAURANT) {
            // Cancel la transaction auprès du valina
            if ($rootScope.borne && window.tpaPayment) { //MonoPlugin
                window.tpaPayment.cancelPayment();
            }
        }
        if ($scope.gloryRunning) {
            $scope.CancelDeposit();
        }
        if ($scope.lyfPayRunning) {
            $scope.loading = true;
            const lyfPayPromise = new Promise((resolve, reject) => {
                window.lyfPay.cancelPayment(resolve, reject);
            });
            lyfPayPromise.then((res) => {
                console.error("CancelPayment succeeded.");
            }, (err) => {
                console.error("CancelPayment error.");
            });
        }
        if (!$scope.lyfPayRunning) {
            $scope.abort();
        }
    };

    $scope.abort = (err = "cancel") => {
        console.error(err);
        $uibModalInstance.dismiss(err);

        $rootScope.closeKeyboard();
    };
});