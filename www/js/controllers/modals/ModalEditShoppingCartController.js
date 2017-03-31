app.controller('ModalEditShoppingCartController', function ($scope, $rootScope, $uibModal, $uibModalInstance,ngToast, settingService,shoppingCartService, zposService, shoppingCart) {
    $scope.shoppingCart = shoppingCart;
    $scope.oldPaymentValues = clone(shoppingCart.PaymentModes);

    $scope.init = function () {
        settingService.getPaymentModesAsync().then(function (paymentSetting) {
            var paymentModesAvailable = paymentSetting;
            var newPaymentValues = {
                PaymentValues: $scope.shoppingCart.PaymentModes
            }

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

            $scope.newPaymentValues = {};
            $scope.newPaymentValues.PaymentValues = Enumerable.from(newPaymentValues.PaymentValues).orderBy('x => x.Text').toArray();
            

        }, function (err) {
            console.log(err);
        });
    }

    $scope.ok = function () {
    	$rootScope.closeKeyboard();

        var validPaymentModes = [];

        var newTotal = 0;
        Enumerable.from($scope.newPaymentValues.PaymentValues).forEach(function (p) {
        	p.Total = parseFloat(p.Total);
        	newTotal = roundValue(p.Total + newTotal);

            if (isNaN(p.Total)) {
                p.Total = 0;
            }

            if (p.Total > 0) {
                validPaymentModes.push(p);
            }
        });

        // le total des moyens de paiement doit être égal au total avant modification
        if (newTotal == shoppingCart.TotalPayment) {
        	shoppingCart.PaymentModes = validPaymentModes;

        	var paymentEdit = {
        		Timestamp: shoppingCart.Timestamp,
        		PaymentModes: validPaymentModes
        	}

            
            try{
                // we're getting a fresh shopping cart because the selected item from the component is altered
                var tmpPaymentModes = shoppingCart.PaymentModes;
                zposService.getShoppingCartByIdAsync(shoppingCart.id).then(function(shoppingCart){
                    shoppingCart.PaymentModes=tmpPaymentModes;
                    shoppingCartService.savePaymentEditAsync(shoppingCart, paymentEdit, $scope.oldPaymentValues);
                });                     	   
            }
            catch(err){                
                ngToast.create({
                                    className: 'danger',
                                    content: '<b>Impossible de modifier le moyen de paiement</b>',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                console.log(err);
            }

        	$uibModalInstance.close();
        } else {
            //TODO : traductions 
        	swal({ title: "Attention", text: "Le total des moyens de réglements saisis ne correspond pas au total encaissé.", type: "warning", showCancelButton: false, confirmButtonColor: "#d83448", confirmButtonText: "Ok", closeOnConfirm: true });
        }

    }

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});