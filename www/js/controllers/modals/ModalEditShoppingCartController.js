app.controller('ModalEditShoppingCartController', function ($scope, $rootScope, $uibModalInstance, $translate, ngToast, settingService, shoppingCartService, zposService, shoppingCart) {

    $scope.shoppingCart = shoppingCart;
    $scope.paymentType = PaymentType;
    $scope.loading = false;

    $scope.init = () => {
        zposService.getShoppingCartByIdAsync(shoppingCart.Timestamp).then((shoppingCart) => {
            settingService.getPaymentModesAsync().then((paymentSetting) => {
                let paymentModes = paymentSetting;
                let newPaymentValues = {
                    PaymentValues: shoppingCart.PaymentModes
                };
                newPaymentValues.PaymentValues = takeAccountRepaidAndCredit(newPaymentValues.PaymentValues, shoppingCart);
                for (let p of paymentModes) {
                    if (!p.Disabled && !newPaymentValues.PaymentValues.find(n => n.Value === p.Value && n.PaymentType === p.PaymentType)) {

                        const addPaymentMode = {
                            PaymentType: p.PaymentType,
                            Value: p.Value,
                            Text: p.Text,
                            Total: 0,
                            IsBalance: p.IsBalance
                        };
                        newPaymentValues.PaymentValues.push(addPaymentMode);
                    }
                }

                $scope.newPaymentValues = {};
                $scope.newPaymentValues.PaymentValues = Enumerable.from(newPaymentValues.PaymentValues).orderBy('x => x.Text').toArray();
            }, (err) => {
                console.error(err);
            });
        }, (err) => {
            console.error(err);
        });
    };

    const takeAccountRepaidAndCredit = (paymentValues, shoppingCart) => {
        // Enlever le rendu monnaie du montant "Espèce"
        if(!paymentValues) {
            paymentValues = [];
        }
        let repaid;
        if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
            repaid = shoppingCart.Repaid;
            if (repaid) {
                // If cash for display and binding
                let cashTypeFound = false;
                for (let p of paymentValues) {
                    if (p.PaymentType == PaymentType.ESPECE && !cashTypeFound) {
                        p.Total = p.Total - repaid;
                        cashTypeFound = false;
                    }
                }
            }
        }

        // Enlever le credit du montant "Ticket resto" ou avoir
        let credit;
        if (shoppingCart.Credit && shoppingCart.Credit > 0) {
            credit = shoppingCart.Credit;
            if (credit) {
                // If "Ticket Resto" for display and binding
                let creditTypeFound = false;
                for (let p of paymentValues) {
                    if (p.PaymentType == PaymentType.TICKETRESTAURANT && !creditTypeFound) {
                        p.Total = p.Total - credit;
                        creditTypeFound = true;
                    }
                }
                if (!creditTypeFound) {
                    // Si Avoir for display and binding
                    for (let p of paymentValues) {
                        if (p.PaymentType == PaymentType.AVOIR && !creditTypeFound) {
                            p.Total = p.Total - credit;
                            creditTypeFound = true;
                        }
                    }
                }
            }
        }
        return paymentValues;
    }

    $scope.ok = () => {
        $scope.loading = true;
        $rootScope.closeKeyboard();
        let validPaymentModes = [];
        //let newTotal = 0;
        for (let p of $scope.newPaymentValues.PaymentValues) {
            p.Total = parseFloat(p.Total);
            //newTotal = roundValue(p.Total + newTotal);

            if (isNaN(p.Total)) {
                p.Total = 0;
                validPaymentModes.push(p);
            } else {
                validPaymentModes.push(p);
            }
        }

        let totalPayment = shoppingCart.Total;
        //if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
        //    totalPayment -= parseFloat(shoppingCart.Repaid);
        //}
        //if (shoppingCart.Credit && shoppingCart.Credit > 0) {
        //    totalPayment -= parseFloat(shoppingCart.Credit);
        //}

        // le total des moyens de paiement doit être égal au total avant modification
        if ($scope.newPVTotal() == totalPayment) {
            console.log('Nouveau total ok!');
            console.log(validPaymentModes);
            shoppingCart.PaymentModes = validPaymentModes;

            const displayError = (err) => {
                ngToast.create({
                    className: 'danger',
                    content: '<span class="bold">Impossible de modifier le moyen de paiement</span>',
                    dismissOnTimeout: true,
                    timeout: 10000,
                    dismissOnClick: true
                });
                console.error(err);
                $scope.loading = false;
                $uibModalInstance.close();
            }

            try {
                // we're getting a fresh shopping cart because the selected item from the component is altered
                let tmpPaymentModes = shoppingCart.PaymentModes;
                zposService.getShoppingCartByIdAsync(shoppingCart.Id).then((shoppingCart) => {
                    let oldPaymentValues = takeAccountRepaidAndCredit(shoppingCart.PaymentModes, shoppingCart);
                    shoppingCart.PaymentModes = tmpPaymentModes;
                    // When we change the paymentMode, we loose the repaid and the credit value
                    shoppingCart.Repaid = 0;
                    shoppingCart.Credit = 0;
                    shoppingCartService.savePaymentEditAsync(shoppingCart, oldPaymentValues).then(() => {
                        $scope.loading = false;
                        $uibModalInstance.close();
                    }, (err) => {
                        displayError(err);
                    });
                });
            } catch (err) {
                displayError(err);
            }
        } else {
            swal({
                title: "Attention",
                text: "Le total des moyens de réglements saisi ne correspond pas au total encaissé.",
                buttons: [false, $translate.instant("Ok")],
                dangerMode: true
            });
            $scope.loading = false;
        }
    };

    $scope.newPVTotal = () => {
        if($scope.newPaymentValues && $scope.newPaymentValues.PaymentValues) {
            return $scope.newPaymentValues.PaymentValues.map(pv => Number(pv.Total)).reduce((a, b) => a + b, 0)
        }
        return 0;
    };

    $scope.closeK = () => {
        $rootScope.closeKeyboard();
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});