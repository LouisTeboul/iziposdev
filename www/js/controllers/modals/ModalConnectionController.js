﻿app.controller('ModalConnectionController', function ($scope, $rootScope, $uibModalInstance, $uibModal, shoppingCartService, ngToast, shoppingCartModel, $timeout, $uibModalStack, $translate) {

    var deliveryTypeHandler = undefined;
    var loyaltyChangedHandler = undefined;

    $scope.DeliveryTypes = DeliveryTypes;

    $scope.init = function () {

<<<<<<< HEAD
        var el = document.getElementsByClassName("keyboardContainer")[0];
        el.style.display = "flex";

        $timeout(function () {
            document.getElementById("txtBarcode").focus();
            document.getElementById("txtValue").getElementsByTagName("span")[0].innerHTML = "";
=======
        var el = document.querySelector(".keyboardContainer");
        el.style.display = "flex";

        $timeout(function () {
            document.querySelector("#txtBarcode").focus();
            document.querySelector("#txtValue > span").innerHTML = "";
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        }, 500);

        $scope.deliveryType = shoppingCartModel.getDeliveryType();

        deliveryTypeHandler = $scope.$watch('deliveryType', function () {
            shoppingCartModel.setDeliveryType($scope.deliveryType);
        });

        loyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', function (event, args) {
            console.log("Client connecté");
            shoppingCartModel.setDeliveryType(0);
            $uibModalInstance.close();
        });

        shoppingCartModel.updatePaymentModes();
    };

    $scope.setDeliveryType = function (value) {
        $scope.deliveryType = value;
        $scope.$evalAsync();
    };

    $scope.close = function () {
<<<<<<< HEAD
        var el = document.getElementsByClassName("keyboardContainer")[0];
=======
        var el = document.querySelector(".keyboardContainer");
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        el.style.display = "none";
        shoppingCartModel.createShoppingCart();
        shoppingCartModel.setDeliveryType(0);
        $uibModalInstance.close();
    };

    $scope.$on("$destroy", function () {
        deliveryTypeHandler();
    });

    $scope.redirectToCustomer = function () {
        if ($rootScope.borne) {
            var top = $uibModalStack.getTop();
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalCustomerBorne.html',
                controller: 'ModalCustomerBorneController',
                backdrop: 'static',
                size: 'lg'
            });
            $timeout(function () {
                if (top) {
                    $uibModalStack.dismiss(top.key);
                }
            }, 250);
        }
    };

    $scope.setLanguage = function (codeLng) {
        window.localStorage.setItem("CurrentLanguage", codeLng);
        $translate.use(codeLng);
    };
});