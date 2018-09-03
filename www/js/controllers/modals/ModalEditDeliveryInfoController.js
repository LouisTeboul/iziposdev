app.controller('ModalEditDeliveryInfoController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $http, shoppingCartModel, existing) {

    console.log(existing);
    $scope.result = {
        timeGoalMode : "In",
        timeGoal : null,
        customerLoyalty : null,
        deliveryAddress : null,
        extraInfos : null,
    };

    $scope.init = function(){
        console.log(existing);
        // Init timeGoal
        if(existing.timeGoal){
            existing.timeGoal = Date.parseExact(existing.timeGoal, "dd/MM/yyyy HH:mm:ss");

            console.log(existing.timeGoal.getMinutes());
            const timeDiff = existing.timeGoal.getTime() - new Date().getTime();
            const diffMinutes = Math.ceil(timeDiff / ( 1000 * 60 ));

            const dispHeures = Math.trunc(diffMinutes / 60);
            const dispMinutes = diffMinutes - dispHeures * 60;
            $scope.modelTime ={
                In : {
                    hours : dispHeures > 0 ? dispHeures : 0,
                    minutes : dispMinutes > 0 ? dispMinutes : 0,
                },
                For : {
                    hours : existing.timeGoal.getHours(),
                    minutes : existing.timeGoal.getMinutes(),
                },

                date : new Date()
            }
        } else {
            const d = new Date();
            let dispMinutes;
            let dispHeures = d.getHours();


            if(d.getMinutes() + 15 < 60){
                dispMinutes = d.getMinutes() + 15;
            } else {
                dispMinutes = d.getMinutes() + 15 - 60;
                dispHeures += 1

            }
            $scope.modelTime = {
                In : {
                    hours : 0,
                    minutes : 15,
                },
                For : {
                    hours : dispHeures,
                    minutes : dispMinutes,
                },

                date : new Date()
            };
        }

        // Init loyalty
        if(existing.customer){
            $scope.result.customerLoyalty = existing.customer;
        }

        // Init delivery address
        if(existing.deliveryAddress){
            $scope.result.deliveryAddress = existing.deliveryAddress;
        }

        // Init commentaire
        if(existing.commentaire){
            $scope.result.extraInfos = existing.commentaire;

        }
    };

    $scope.setTimeGoalMode = function(value){
        $scope.result.timeGoalMode = value;
    };


    $scope.selectInHour = function(h){
        $scope.modelTime.In.hours = h;
    };

    $scope.selectInMinute = function(m){
        $scope.modelTime.In.minutes = m;
    };

    $scope.selectCustomer = function(){
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCustomerForPhone.html',
            controller: 'ModalCustomerForPhoneController',
            backdrop: 'static',
            size: 'lg'
        });

        modalInstance.result.then(function (loyalty){
            $scope.result.customerLoyalty = loyalty;

            var barcodeClient = Enumerable.from(loyalty.Barcodes).firstOrDefault().Barcode;

            // If Livraison
            if(shoppingCartModel.getDeliveryType() == 2){
                // Query les adresses de livraison du client, choisir la premiere
                $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/RESTLoyalty/RESTLoyalty/GetAddresses?barcode=' + barcodeClient).then(function (response) {
                    //Bind les adresse a une variable du scope
                    if(response.data.Addresses) {
                        $scope.result.deliveryAddress = Enumerable.from(response.data.Addresses).firstOrDefault();
                    }
                });
            }
            console.log(loyalty);
        })
        // Then recuperer l'objet result retourné par la modal
        // Et le stocker dans le scope pour affichage dans la modal
    };

    $scope.promptDeliveryAddress = function(barcode){
        // console.log($scope.result.customerLoyalty);
        /**Proposer de renseigner une adresse de livraison */
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPromptDeliveryAddress.html',
            controller: 'ModalPromptDeliveryAddressController',
            resolve: {
                barcodeClient: function () {
                    return barcode;
                }
            },
            backdrop: 'static'
        });

        modalInstance.result.then(function (deliveryAddress) {
            console.log(deliveryAddress);
            if(!deliveryAddress){
                $scope.result.deliveryAddress = undefined;
            } else {
                $scope.result.deliveryAddress = {
                    Address1: deliveryAddress.Address1,
                    ZipPostalCode: deliveryAddress.ZipPostalCode,
                    City: deliveryAddress.City,
                    Floor: deliveryAddress.Floor,
                    Door: deliveryAddress.Door,
                    Digicode: deliveryAddress.Digicode,
                    InterCom: deliveryAddress.InterCom,
                    PhoneNumber: deliveryAddress.PhoneNumber
                };
            }
        }, function () {
            $rootScope.hideLoading();
        });
    };

    $scope.clear = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.close();
    };

    $scope.close = function(){
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss();
    };

    $scope.ok = function () {
        switch($scope.result.timeGoalMode){
            case 'In':
                if(Number.isInteger($scope.modelTime.In.minutes) && $scope.modelTime.In.minutes >= 0 && $scope.modelTime.In.minutes < 60) {
                    // On set la datePickup, la customer loyalty, et le commentaire dans le shoppingCart
                    $scope.modelTime.date.setHours($scope.modelTime.date.getHours() + $scope.modelTime.In.hours);
                    $scope.modelTime.date.setMinutes($scope.modelTime.date.getMinutes() + $scope.modelTime.In.minutes);
                    $scope.result.timeGoal = {
                        hours : $scope.modelTime.In.hours,
                        minutes : $scope.modelTime.In.minutes,
                        date : $scope.modelTime.date
                    };

                    $rootScope.closeKeyboard();
                    $uibModalInstance.close($scope.result);
                } else {
                    $scope.errorMessage = "La valeur des minutes est incorrect"
                }

                break;
            case 'For':
                if((Number.isInteger($scope.modelTime.For.minutes) && $scope.modelTime.For.minutes >= 0 && $scope.modelTime.For.minutes < 60) &&
                    Number.isInteger($scope.modelTime.For.hours) && $scope.modelTime.For.hours >= 0 && $scope.modelTime.For.hours < 24) {

                    $scope.modelTime.date.setHours($scope.modelTime.For.hours);
                    $scope.modelTime.date.setMinutes($scope.modelTime.For.minutes);
                    $scope.result.timeGoal = {
                        hours : $scope.modelTime.For.hours,
                        minutes : $scope.modelTime.For.minutes,
                        date : $scope.modelTime.date
                    };

                    $rootScope.closeKeyboard();
                    $uibModalInstance.close($scope.result);

                } else {
                    $scope.errorMessage = "Veuillez saisir une heure correct"
                }
                break;
            default:
                $rootScope.closeKeyboard();
                $uibModalInstance.close();
                break;
        }
    };

});