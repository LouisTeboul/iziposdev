app.controller('ModalPromptDeliveryAddressController', function ($scope, $rootScope, $uibModalInstance, $translate, $http, $uibModal, loyaltyService, barcodeClient) {
    $scope.selectedAddress = undefined;
    $scope.errorMessage = undefined;
    $scope.selectedAddress = undefined;
    $scope.noDelivery = true;
    $scope.init = () => {

        loyaltyService.getAddressesAsync(barcodeClient).then((addresses) => {
            //Bind les adresse a une variable du scope
            $scope.addresses = addresses;
        });
    };

    $scope.hashAd = function(ad){
        return objectHash(ad);
    };

    $scope.setNoDelivery = function(){
        $scope.noDelivery = true;
        $scope.selectedAddress = "";
    };

    $scope.selectDeliveryAddress = function (ad) {
        $scope.noDelivery = false;
        $scope.selectedAddress = ad;
        console.log($scope.selectedAddress);
    };


    $scope.addAddress = function () {

        console.log('Add');

        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalAddAddressForm.html',
            controller: 'ModalAddAddressFormController',
            backdrop: 'static'
        });

        modalInstance.result.then((newAddress) => {

            const formattedAddress = {
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

            loyaltyService.addAddressAsync(formattedAddress).then(() => {
                // Recharge les adresses
                loyaltyService.getAddressesAsync().then((addresses) => {
                    $scope.addresses = addresses;
                });
            }, (err) => {
                console.error(err);                
                swal({ title: $translate.instant("Impossible d'ajouter l'adresse !") });
            });
        }, () => {
            // Cancel, ne fait rien
        });

    };

    $scope.ok = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.close($scope.selectedAddress);
    };
});