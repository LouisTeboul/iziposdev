app.controller('ModalPromptDeliveryAddressController', function ($scope, $rootScope, $uibModalInstance, $translate, $http, $uibModal, barcodeClient) {
    $scope.selectedAddress = undefined;
    $scope.errorMessage = undefined;
    $scope.selectedAddress = undefined;
    $scope.noDelivery = true;
    $scope.init = function () {
        /** TODO: Recuperer les adresses du client, voir cou mettre le param barcode */
        $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/RESTLoyalty/GetAddresses?barcode=' + barcodeClient).then(function (response) {
            //Bind les adresse a une variable du scope
            console.log(response);
            $scope.addresses = response.data.Addresses;

        });
    };

    $scope.hashAd = function(ad){
        return objectHash(ad);
    };

    $scope.setNoDelivery = function(){
        $scope.noDelivery = true;
        $scope.selectedAddress = undefined;


    };

    $scope.selectDeliveryAddress = function (ad) {
        $scope.noDelivery = false;
        $scope.selectedAddress = ad;
        console.log($scope.selectedAddress);
    };


    $scope.addAddress = function () {

        console.log('Add');

        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalAddAddressForm.html',
            controller: 'ModalAddAddressFormController',
            backdrop: 'static'
        });

        modalInstance.result.then(function (newAddress) {

            var formattedAddress = {
                Address1 : newAddress.mandatory.Address1,
                City : newAddress.mandatory.City,
                ZipPostalCode : newAddress.mandatory.ZipPostalCode,
                PhoneNumber : newAddress.mandatory.Phone,
                Floor: newAddress.Floor ? newAddress.Floor : null,
                Door : newAddress.Door ? newAddress.Door : null,
                Digicode : newAddress.Digicode ? newAddress.Digicode : null,
                InterCom : newAddress.InterCom ? newAddress.InterCom : null,

                Company : $scope.addresses[0].CompanyRequired ? $scope.addresses[0].Company : null,
                Fax : $scope.addresses[0].FaxRequired ? $scope.addresses[0].Fax : null,
            };



            $http({
                method: 'POST',
                url: $rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/RESTLoyalty/AddAddress?barcode=' + barcodeClient,
                data: JSON.stringify(formattedAddress)
            })
                .then(function (success) {
                    console.log(success);
                    //Recharge la liste des adresses
                    $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/RESTLoyalty/GetAddresses?barcode=' + barcodeClient).then(function (response) {
                        //Bind les adresse a une variable du scope
                        console.log(response);
                        $scope.addresses = response.data.Addresses;
                    });
                }, function (error) {
                    console.log(error);
                    swal($translate.instant("Impossible d'ajouter l'adresse !"));
                });

        }, function () {
            // Cancel, ne fait rien
        });

    };

    $scope.ok = function () {
        if ($scope.selectedAddress) {
            $rootScope.closeKeyboard();
            $uibModalInstance.close($scope.selectedAddress);
        } else {
            $uibModalInstance.dismiss('no delivery');

        }
    };
});