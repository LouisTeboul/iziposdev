app.controller('ModalEditShoppingCartController', function ($scope, $rootScope, $uibModal, $uibModalInstance,ngToast, settingService,shoppingCartService, zposService, shoppingCart) {

    $scope.shoppingCart = shoppingCart;
    $scope.paymentType = PaymentType;

    $scope.init = function () {

        

        zposService.getShoppingCartByIdAsync(shoppingCart.id).then(function (shoppingCart) {

            settingService.getPaymentModesAsync().then(function (paymentSetting) {
                var paymentModesAvailable = paymentSetting;
                var newPaymentValues = {
                    PaymentValues: shoppingCart.PaymentModes
                };

                newPaymentValues.PaymentValues = takeAccountRepaidAndCredit(newPaymentValues.PaymentValues, shoppingCart);

                Enumerable.from(paymentModesAvailable).forEach(function (p) {
                    if (!Enumerable.from(newPaymentValues.PaymentValues).any(function (v) { return v.Value == p.Value; })) {

                        var addPaymentMode = {
                            PaymentType: p.PaymentType,
                            Value: p.Value,
                            Text: p.Text,
                            Total: 0,
                            IsBalance: p.IsBalance
                        };

                        newPaymentValues.PaymentValues.push(addPaymentMode);
                    }
                });

                // Ajouter le montant de cagnotte utiliser
                var balanceUpdateValue;
                if (shoppingCart.BalanceUpdate && shoppingCart.BalanceUpdate.UpdateValue > 0) {
                    if (shoppingCart.customerLoyalty) {
                        Enumerable.from(shoppingCart.customerLoyalty.Balances).forEach(function (balance) {
                            if (balance.Id == shoppingCart.BalanceUpdate.Id) {

                                if (!Enumerable.from(newPaymentValues.PaymentValues).any(function (v) { return v.Value == balance.BalanceName; })) {
                                    balanceUpdateValue = shoppingCart.BalanceUpdate.UpdateValue;
                                    // PaymentType = 9 : FIDELITE
                                    var addPaymentModeFid = {
                                        PaymentType: PaymentType.FIDELITE,
                                        Value: "Ma Cagnotte",
                                        Text: balance.BalanceName,
                                        Total: balanceUpdateValue,
                                        IsBalance: true
                                    };

                                    newPaymentValues.PaymentValues.push(addPaymentModeFid);
                                }
                            }
                        });
                    }
                }

                $scope.newPaymentValues = {};
                $scope.newPaymentValues.PaymentValues = Enumerable.from(newPaymentValues.PaymentValues).orderBy('x => x.Text').toArray();
            }, function (err) {
                console.log(err);
            });
        }, function (err) {
            console.log(err);
        });
    };

    function takeAccountRepaidAndCredit(paymentValues, shoppingCart) {
        // Enlever le rendu monnaie du montant "Espèce"
        var repaid;
        if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
            repaid = shoppingCart.Repaid;

            if (repaid) {
                // If cash for display and binding
                var cashTypeFound = false;
                Enumerable.from(paymentValues).forEach(function (p) {

                    if (p.PaymentType == PaymentType.ESPECE && !cashTypeFound) {
                        p.Total = p.Total - repaid;
                        cashTypeFound = false;
                    }

                });
            }
        }

        // Enlever le credit du montant "Ticket resto" ou avoir
        var credit;
        if (shoppingCart.Credit && shoppingCart.Credit > 0) {
            credit = shoppingCart.Credit;

            if (credit) {
                // If "Ticket Resto" for display and binding
                var creditTypeFound = false;
                Enumerable.from(paymentValues).forEach(function (p) {

                    if (p.PaymentType == PaymentType.TICKETRESTAURANT && !creditTypeFound) {
                        p.Total = p.Total - credit;
                        creditTypeFound = true;
                    }

                });
                if (!creditTypeFound) {
                    // Si Avoir for display and binding
                    Enumerable.from(paymentValues).forEach(function (p) {

                        if (p.PaymentType == PaymentType.AVOIR && !creditTypeFound) {
                            p.Total = p.Total - credit;
                            creditTypeFound = true;
                        }

                    });
                }
            }
        }

        return paymentValues;
    }

    $scope.ok = function () {
    	$rootScope.closeKeyboard();

        var validPaymentModes = [];

        var newTotal = 0;
        Enumerable.from($scope.newPaymentValues.PaymentValues).forEach(function (p) {
            console.log(p);
        	p.Total = parseFloat(p.Total);
        	newTotal = roundValue(p.Total + newTotal);

            if (isNaN(p.Total)) {
                p.Total = 0;
                validPaymentModes.push(p);
            }

            if (p.Total > 0) {
                validPaymentModes.push(p);
            }
        });

        var totalPayment = shoppingCart.TotalPayment;
        if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
            totalPayment -= parseFloat(shoppingCart.Repaid);
        }
        if (shoppingCart.Credit && shoppingCart.Credit > 0) {
            totalPayment -= parseFloat(shoppingCart.Credit);
        }

        // le total des moyens de paiement doit être égal au total avant modification
        if (newTotal == totalPayment) {
            console.log('Nouveau total ok!');
            console.log(validPaymentModes);
        	shoppingCart.PaymentModes = validPaymentModes;

        	var paymentEdit = {
        		Timestamp: shoppingCart.Timestamp,
        		PaymentModes: validPaymentModes
        	};

            
            try{
                // we're getting a fresh shopping cart because the selected item from the component is altered
                var tmpPaymentModes = shoppingCart.PaymentModes;
                zposService.getShoppingCartByIdAsync(shoppingCart.id).then(function (shoppingCart) {
                    var oldPaymentValues = takeAccountRepaidAndCredit(shoppingCart.PaymentModes, shoppingCart);
                    shoppingCart.PaymentModes = tmpPaymentModes;
                    // When we change the paymentMode, we loose the repaid and the credit value
                    shoppingCart.TotalPayment = shoppingCart.TotalPayment - shoppingCart.Repaid - shoppingCart.Credit;
                    shoppingCart.Repaid = 0;
                    shoppingCart.Credit = 0;
                    shoppingCartService.savePaymentEditAsync(shoppingCart, paymentEdit, oldPaymentValues);
                });                     	   
            }
            catch(err){                
                ngToast.create({
                                    className: 'danger',
                                    content: '<span class="bold">Impossible de modifier le moyen de paiement</span>',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                console.log(err);
            }

        	$uibModalInstance.close();
        } else {
            //TODO : traductions 
        	swal({ title: "Attention", text: "Le total des moyens de réglements saisi ne correspond pas au total encaissé.", type: "warning", showCancelButton: false, confirmButtonColor: "#d83448", confirmButtonText: "Ok", closeOnConfirm: true });
        }
    };

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});