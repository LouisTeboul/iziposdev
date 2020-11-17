app.controller('ModalEditDeliveryInfoController', function ($scope, $rootScope, $uibModalInstance, $uibModal, pictureService, deliveryService, existing, fromButton) {
    $scope.DeliveryType = DeliveryType;
    $scope.fromButton = fromButton;
    $scope.existing = existing;
    $scope.result = {
        timeGoalMode: "In",
        timeGoal: null,
        customerLoyalty: null,
        deliveryPartner: null,
        deliveryAddress: null,
        extraInfos: null
    };

    $scope.init = () => {
        $scope.selectedPartnerId = 0;

        deliveryService.getDeliveryPartnersAsync().then((res) => {
            $scope.deliveryPartners = res;

            // $scope.deliveryPartners.push({
            //         Id : 0,
            //         Name : "In house",
            //         IsVisible : true,
            //         PictureURL : "img/delivery-scooter.png"
            // });

            for (let partner of $scope.deliveryPartners) {
                if (partner.PictureId && !partner.PictureURL) {
                    pictureService.getPictureByIdAsync(partner.PictureId).then((resPicture) => {
                        if (resPicture.PictureUrl) {
                            partner.PictureURL = resPicture.PictureUrl;
                        }
                    }, (err) => {
                        console.error(err);
                    });
                }
            }
        });

        // Init timeGoal
        if (existing.timeGoal) {
            existing.timeGoal = Date.parseExact(existing.timeGoal, "dd/MM/yyyy HH:mm");

            console.log(existing.timeGoal.getMinutes());
            const timeDiff = existing.timeGoal.getTime() - new Date().getTime();
            const diffMinutes = Math.ceil(timeDiff / (1000 * 60));

            const dispHeures = Math.trunc(diffMinutes / 60);
            const dispMinutes = diffMinutes - dispHeures * 60;
            $scope.modelTime = {
                In: {
                    hours: dispHeures > 0 ? dispHeures : 0,
                    minutes: dispMinutes > 0 ? dispMinutes : 0,
                },
                For: {
                    hours: existing.timeGoal.getHours(),
                    minutes: existing.timeGoal.getMinutes(),
                },

                date: new Date()
            }
        } else {
            const d = new Date();
            let dispMinutes;
            let dispHeures = d.getHours();

            if (d.getMinutes() + 15 < 60) {
                dispMinutes = d.getMinutes() + 15;
            } else {
                dispMinutes = d.getMinutes() + 15 - 60;
                dispHeures += 1
            }
            $scope.modelTime = {
                In: {
                    hours: 0,
                    minutes: 15,
                },
                For: {
                    hours: dispHeures,
                    minutes: dispMinutes,
                },

                date: new Date()
            };
        }

        // Init loyalty
        if (existing.customer) {
            $scope.result.customerLoyalty = existing.customer;
        }

        // Init delivery partners
        if (existing.deliveryPartner) {
            $scope.result.deliveryPartner = existing.deliveryPartner;
        }

        // Init delivery address
        if (existing.deliveryAddress) {
            $scope.result.deliveryAddress = existing.deliveryAddress;
        }

        // Init commentaire
        if (existing.commentaire) {
            $scope.result.extraInfos = existing.commentaire;
        }
    };

    $scope.setTimeGoalMode = (value) => {
        $scope.result.timeGoalMode = value;
    };

    $scope.selectInHour = (h) => {
        $scope.modelTime.In.hours = h;
    };

    $scope.selectInMinute = (m) => {
        $scope.modelTime.In.minutes = m;
    };

    $scope.choosePartner = (partner) => {
        // On ne peut choisir qu'un partenaire
        if ($scope.result.deliveryPartner && $scope.result.deliveryPartner.Id === partner.Id) {
            $scope.result.deliveryPartner = null;
        } else {
            $scope.result.deliveryPartner = partner;
        }
    };

    $scope.selectCustomer = () => {
        if ($rootScope.Logged) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalCustomer.html',
                controller: 'ModalCustomerController',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    selectedTab: () => {
                        return "LOYALTY";
                    },
                }
            });

            modalInstance.result.then(() => {
                if ($rootScope.currentShoppingCart.customerLoyalty && $rootScope.currentShoppingCart.customerLoyalty.Barcodes) {
                    let firstBarcode = Enumerable.from($rootScope.currentShoppingCart.customerLoyalty.Barcodes).firstOrDefault();
                    if (firstBarcode && firstBarcode.Barcode) {
                        var barcodeClient = firstBarcode.Barcode;

                        // If Livraison
                        if ($rootScope.currentDeliveryType == 2) {
                            // Query les adresses de livraison du client, choisir la premiere
                            loyaltyService.getAddressesAsync(barcodeClient).then((addresses) => {
                                $scope.result.deliveryAddress = Enumerable.from(addresses).firstOrDefault();
                            });
                        }
                    }
                }
            });
        } else {
            if(!$rootScope.borne && $rootScope.IziBoxConfiguration.UseFid) {
                swal({
                    title: "Erreur d'authentification !",
                    text: "Veuillez contacter le support"
                });
            }
        }
    };

    $scope.promptDeliveryAddress = (barcode) => {
        // console.log($scope.result.customerLoyalty);
        /**Proposer de renseigner une adresse de livraison */
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPromptDeliveryAddress.html',
            controller: 'ModalPromptDeliveryAddressController',
            resolve: {
                barcodeClient: () => {
                    return barcode;
                }
            },
            backdrop: 'static'
        });

        modalInstance.result.then(function (deliveryAddress) {
            console.log(deliveryAddress);
            if (!deliveryAddress) {
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
        }, () => {
            $rootScope.hideLoading();
        });
    };

    $scope.clear = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.close();
    };

    $scope.close = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss();
    };

    $scope.ok = () => {
        switch ($scope.result.timeGoalMode) {
            case 'In':
                $scope.modelTime.In.minutes = Number($scope.modelTime.In.minutes);
                $scope.modelTime.In.hours = Number($scope.modelTime.In.hours);
                if ($scope.modelTime.In.minutes > 60) {
                    $scope.modelTime.In.minutes = 60;
                }
                if ($scope.modelTime.In.hours > 23) {
                    $scope.modelTime.In.hours = 23;
                }
                if (Number.isInteger($scope.modelTime.In.minutes) && $scope.modelTime.In.minutes >= 0 && $scope.modelTime.In.minutes < 60) {
                    // On set la datePickup, la customer loyalty, et le commentaire dans le shoppingCart
                    $scope.modelTime.date.setHours($scope.modelTime.date.getHours() + $scope.modelTime.In.hours);
                    $scope.modelTime.date.setMinutes($scope.modelTime.date.getMinutes() + $scope.modelTime.In.minutes);
                    $scope.result.timeGoal = {
                        hours: $scope.modelTime.In.hours,
                        minutes: $scope.modelTime.In.minutes,
                        date: $scope.modelTime.date
                    };

                    $rootScope.closeKeyboard();
                    $uibModalInstance.close($scope.result);
                } else {
                    $scope.errorMessage = "La valeur des minutes est incorrect"
                }

                break;
            case 'For':
                $scope.modelTime.For.minutes = Number($scope.modelTime.For.minutes);
                $scope.modelTime.For.hours = Number($scope.modelTime.For.hours);
                if ($scope.modelTime.For.minutes >= 60) {
                    $scope.modelTime.For.minutes = 59;
                }
                if ($scope.modelTime.For.hours >= 24) {
                    $scope.modelTime.For.hours = 23;
                }
                if ((Number.isInteger($scope.modelTime.For.minutes) && $scope.modelTime.For.minutes >= 0 && $scope.modelTime.For.minutes < 60) &&
                    Number.isInteger($scope.modelTime.For.hours) && $scope.modelTime.For.hours >= 0 && $scope.modelTime.For.hours < 24) {
                    $scope.modelTime.date.setHours($scope.modelTime.For.hours);
                    $scope.modelTime.date.setMinutes($scope.modelTime.For.minutes);
                    $scope.result.timeGoal = {
                        hours: $scope.modelTime.For.hours,
                        minutes: $scope.modelTime.For.minutes,
                        date: $scope.modelTime.date
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