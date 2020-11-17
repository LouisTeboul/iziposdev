app.controller('CatalogDrawerMenuController', function ($scope, $rootScope, $uibModal, $translate, posUserService, posService, authService, posPeriodService, printService, deliveryService) {
    $scope.closable = false;
    $scope.authService = authService;
    $scope.docToSynchronize = 0;
    $scope.OrderButtonEnabled = $rootScope.IziBoxConfiguration && $rootScope.IziBoxConfiguration.PhoneOrderEnable && ($rootScope.UserPreset && $rootScope.UserPreset.PhoneOrder && $rootScope.UserPreset.PhoneOrder.Menu);
    $scope.GloryButtonEnabled = window.glory && ($rootScope.UserPreset && $rootScope.UserPreset.EnableGlory);

    $scope.init = () => {
        let btnMenus = document.getElementsByClassName("btn-menu-closable");

        for (let i = 0; i < btnMenus.length; i++) {
            let btn = btnMenus[i];
            btn.onclick = () => {
                $scope.closeDrawerMenu();
            };
        }

        $scope.closable = $rootScope.isWindowsContainer;

        if (!$rootScope.IziPosConfiguration) {
            $rootScope.IziPosConfiguration = {};
        }

        $rootScope.IziPosConfiguration.IsDirectPayment = window.localStorage.getItem("IsDirectPayment") === "true";
        $rootScope.$evalAsync();

        $scope.checkDocSynchro();
    };

    $scope.LossOrEmpMealEnable = () => {
        return posUserService.isEnable('LOSS', true) || posUserService.isEnable('EMPMEAL', true);
    };

    $scope.isValidShoppingCart = () => {
        let ret = false;
        if ($rootScope.currentShoppingCart) {
            ret = $rootScope.currentShoppingCart && !$rootScope.currentShoppingCart.IsAccountConsignorPayment && !$rootScope.currentShoppingCart.IsEmployeeMeal &&
                !$rootScope.currentShoppingCart.IsLoss && !$rootScope.currentShoppingCart.ParentTicket;
        } else {
            ret = true;
        }
        return ret;
    };

    $scope.shoppingCartHasItems = () => {
        let ret = false;
        if ($rootScope.currentShoppingCart) {
            ret = $rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items && $rootScope.currentShoppingCart.Items.length > 0;
        }
        return ret;
    };

    //Check if there's still tickets in the replicate in every 3s
    //and display the result - useful to tell if the data are synchronised between the Back-Office and the Pos
    //doesn't tell if there was a problem during ticket validation
    $scope.checkDocSynchro = () => {
        let loop = () => {
            setTimeout(() => {
                $scope.checkDocSynchro();
            }, 3000);
        };

        if (!$("#drawerMenuDiv").hasClass("_md-closed") && $rootScope.dbValidatePool) {
            // Log the result
            // $scope.docToSynchronize = Enumerable.from(result.rows).count(function (item) {
            //     return item.id.indexOf("PosLog_") === -1;
            // });
            //$scope.$evalAsync();

            $rootScope.dbValidatePool.allDocs({
                include_docs: false,
                attachments: false
            }).then((resPool) => {
                $scope.docToSynchronize = resPool.rows.length;
                $scope.$evalAsync();
                loop();
            }).catch(() => {
                loop();
            });
        } else {
            loop();
        }
    };

    //Set Localisation - caution only US FR supported ?
    $scope.setLanguage = (codeLng) => {
        window.localStorage.setItem("CurrentLanguage", codeLng);
        $translate.use(codeLng);
    };

    //Set the option for not having to complete the amount of a payment mode
    $scope.toggleDirectPayment = () => {
        $rootScope.IziPosConfiguration.IsDirectPayment = $rootScope.IziPosConfiguration.IsDirectPayment ? false : true;
        window.localStorage.setItem("IsDirectPayment", $rootScope.IziPosConfiguration.IsDirectPayment);
    };

    //Open the view to apply a discount on the current shopping cart
    $scope.shoppingCartDiscount = () => {
        if ($scope.isValidShoppingCart()) {
            if (posUserService.isEnable('DISC')) {
                let modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalShoppingCartDiscount.html',
                    controller: 'ModalShoppingCartDiscountController',
                    backdrop: 'static'
                });

                modalInstance.result.then(() => {
                    $scope.closeDrawerMenu();
                }, () => {
                    $scope.closeDrawerMenu();
                });
            } else {
                swal({
                    title: $translate.instant("Vous n'avez pas les droits nécessaires.")
                });
            }
        }
    };

    //Opens the view to Manage the past ticket
    $scope.showAllShoppingCarts = () => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalAllShoppingCarts.html',
            controller: 'ModalAllShoppingCartsController',
            backdrop: 'static',
            size: 'full'
        });

        modalInstance.result.then((shoppingCart) => {
            $scope.closeDrawerMenu();
        }, () => {
            $scope.closeDrawerMenu();
        });
    };

    //Print the last Shopping Cart
    $scope.printLastShoppingCart = () => {
        printService.printLastShoppingCart();
    };

    //Open the view for  printing a 'Note'
    $scope.printShoppingCartNote = () => {
        printService.printShoppingCartNote();
    };

    //Open the view for 'opening' the POS
    $scope.openPos = () => {
        //TODO sur le YPeriod courant
        $scope.closeDrawerMenu();

        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => { });
    };

    //Open the view to manage cash
    $scope.cashManagement = () => {
        //TODO sur le YPeriod
        $scope.closeDrawerMenu();

        if (posUserService.isEnable('CASH')) {
            posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, false, false).then((periodPair) => {
                if (periodPair.YPeriod) {
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalOpenPos.html',
                        controller: 'ModalOpenPosController',
                        resolve: {
                            openPosParameters: () => {
                                return {
                                    isOpenPos: false,
                                    zPeriodId: periodPair.YPeriod.zPeriodId,
                                    yPeriodId: periodPair.YPeriod.id,
                                    yPeriod: periodPair.YPeriod
                                };
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then(() => { }, () => { });
                }
            }, () => {
                swal({
                    title: $translate.instant("Veuillez renseigner le fond de caisse")
                });
            });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    /**
     * Open the view for 'closing' the POS
     */
    $scope.pickClose = () => {
        if (!$rootScope.currentShoppingCart) {
            $scope.closeDrawerMenu();

            $uibModal.open({
                templateUrl: 'modals/modalYperiodPick.html',
                controller: 'ModalYperiodPickController',
                size: 'lg',
                backdrop: 'static'
            });
        }
    };

    //Open the view for 'Glory'
    $scope.openGlory = () => {
        if (posUserService.isEnable('GLORY')) {
            $scope.closeDrawerMenu();

            $uibModal.open({
                templateUrl: 'modals/modalGlory.html',
                controller: 'ModalGloryController',
                size: 'lg',
                backdrop: 'static'
            });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    //Open the cash drawer
    $scope.openDrawer = () => {
        posService.openDrawer();
    };

    $scope.openModalOrderInfo = () => {
        if ($scope.isValidShoppingCart()) {
            $scope.closeDrawerMenu();
            deliveryService.editDeliveryInfos(true);
        }
    };

    $scope.openModalSwitchMode = () => {
        // TODO : Ouvrir une modal qui propose un choix entre Perte et Repas Employé
        $uibModal.open({
            templateUrl: 'modals/modalSwitchMode.html',
            controller: 'ModalSwitchModeController'
        });
    };

    $scope.openConfig = () => {
        document.body.innerHTML = '';
        window.location.reload();
    };

    $scope.openDeviceMonitoring = () => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalMonitoring.html',
            controller: 'ModalMonitoringController',
            size: 'lg',
            backdrop: 'static'
        });
    };

    $scope.openStoreStateModal = () => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalOpenCloseStore.html',
            controller: 'ModalOpenCloseStoreController',
            size: 'lg',
            backdrop: 'static'
        });
    };

    $scope.logout = () => {
        $scope.closeDrawerMenu();
        //posUserService.saveEventAsync("Logout", 1, 0, $rootScope.PosUserId);
        //posUserService.StopWork($rootScope.PosUserId);
        $rootScope.PosUserId = 0;
        $rootScope.PosUserName = "";
    };

    //Close the application - only available for windows platforms
    $scope.exit = () => {
        if (!$rootScope.currentShoppingCart) {
            if ($rootScope.isWindowsContainer) {
                try {
                    wpfCloseApp.shutdownApp();
                } catch (err) {
                    console.error(err);
                }
            }
        }
    };

    //Open the view managing the split ticket
    //This action needs privilege
    $scope.shoppingCartSplit = () => {
        this.openAdmin();
        if (posUserService.isEnable('SPLIT')) {
            $uibModal.open({
                templateUrl: 'modals/modalShoppingCartSplit.html',
                controller: 'ModalShoppingCartSplitController',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    defaultValue: () => {
                        return true;
                    }
                }
            });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    //Open the BO administarion
    // $scope.openAdmin = (adminController, adminAction) => {
    //     $scope.closeDrawerMenu();
    //     let htmlcontent = $('#loadAdmin ');
    //     $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/../PosAdminV2/' + adminController + '/' + adminAction).then((response) => {
    //         htmlcontent.html(response.data);
    //     });
    // };
});