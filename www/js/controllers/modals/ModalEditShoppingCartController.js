app.controller('ModalEditShoppingCartController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService,shoppingCartService, shoppingCart) {
    $scope.shoppingCart = shoppingCart;
    $scope.oldPaymentValues = clone(shoppingCart.PaymentModes);

    $scope.init = function () {
        settingService.getPaymentModesAsync().then(function (paymentSetting) {
            var paymentModesAvailable = paymentSetting.ValueObject;
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

        Enumerable.from($scope.newPaymentValues.PaymentValues).forEach(function (p) {
            p.Total = parseFloat(p.Total);

            if (isNaN(p.Total)) {
                p.Total = 0;
            }

            if (p.Total > 0) {
                validPaymentModes.push(p);
            }
        });

        shoppingCart.PaymentModes = validPaymentModes;

        var paymentEdit = {
            Timestamp: shoppingCart.Timestamp,
            PaymentModes: validPaymentModes
        }

        shoppingCartService.savePaymentEditAsync(shoppingCart, paymentEdit, $scope.oldPaymentValues);

        $uibModalInstance.close();
    }

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();

        $uibModalInstance.dismiss('cancel');
    }
});