app.controller('CatalogDrawerMenuController', function ($scope, $rootScope, $state, $uibModal, $http, shoppingCartModel, posUserService, $translate, $compile, $location, authService, posPeriodService) {
    $scope.closable = false;
    $scope.authService = authService;
    $scope.docToSynchronize = 0;

    $scope.init = function () {
        var btnMenus = document.getElementsByClassName("btn-menu-closable");

        for (i = 0; i < btnMenus.length; i++) {
            var btn = btnMenus[i];
            btn.onclick = function () {
                $scope.closeDrawerMenu();
            }
        }


        $scope.closable = navigator.userAgent.match(/(WPF)/);

        if (!$rootScope.IziPosConfiguration) {
            $rootScope.IziPosConfiguration = {};
        }

        $rootScope.IziPosConfiguration.IsDirectPayment = window.localStorage.getItem("IsDirectPayment") == "true" ? true : false;
        $rootScope.$evalAsync();

        $scope.checkDocSynchro();
    };

    /**
	 * Check if there's still tickets in the replicate in every 3s
	 * and display the result - useful to tell if the data are synchronised between the Back-Office and the Pos
	 * doesn't tell if there was a problem during ticket validation
     */
    $scope.checkDocSynchro = function () {
        var loop = function () {
            setTimeout(function () { $scope.checkDocSynchro(); }, 3000);
        };

        if (!$("#drawerMenuDiv").hasClass("_md-closed")) {
            $rootScope.dbReplicate.allDocs({
                include_docs: false,
                attachments: false
            }).then(function (result) {
                // Log the result
                $scope.docToSynchronize = Enumerable.from(result.rows).count(function (item) {
                    return item.id.indexOf("PosLog_") === -1;
                });

                $scope.$evalAsync();

                loop();
            }).catch(function (err) {
                loop();
            });
        } else {
            loop();
        }
    };

    /**
	 * Set Localisation - caution only US FR supported ?
     * @param codeLng
     */
    $scope.setLanguage = function (codeLng) {
        window.localStorage.setItem("CurrentLanguage", codeLng);
        $translate.use(codeLng);
    };

    /**
	 * Set the option for not having to complete the amount of a payment mode
     */
    $scope.toggleDirectPayment = function () {
        $rootScope.IziPosConfiguration.IsDirectPayment = $rootScope.IziPosConfiguration.IsDirectPayment ? false : true;
        window.localStorage.setItem("IsDirectPayment", $rootScope.IziPosConfiguration.IsDirectPayment);
    };

    /**
	 * Open the view to apply a discount on the current shopping cart
     */
    $scope.shoppingCartDiscount = function () {
        if (shoppingCartModel.getCurrentShoppingCart()) {
            if (posUserService.isEnable('DISC')) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalShoppingCartDiscount.html',
                    controller: 'ModalShoppingCartDiscountController',
                    backdrop: 'static',
                    resolve: {
                        defaultValue: function () {
                            return 15;
                        }
                    }
                });

                modalInstance.result.then(function (result) {
                    shoppingCartModel.addShoppingCartDiscount(result.value, result.isPercent);
                    $scope.closeDrawerMenu();
                }, function () {
                    $scope.closeDrawerMenu();
                });
            }
        }
    };


    /**
	 * Opens the view to Manage the past ticket
	 * TODO: We can only modify the ticket from the current period
     */
    $scope.showAllShoppingCarts = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalAllShoppingCarts.html',
            controller: 'ModalAllShoppingCartsController',
            size: 'lg',
            backdrop: 'static'
        });

        //??
        modalInstance.result.then(function (shoppingCart) {
            $scope.closeDrawerMenu();
        }, function () {
            $scope.closeDrawerMenu();
        });
    };

    /**
	 * Print the last Shopping Cart
     */
    $scope.printLastShoppingCart = function () {
        shoppingCartModel.printLastShoppingCart();
    };

    /**
	 * Open the view for  printing a 'Note'
     */
    $scope.printShoppingCartNote = function () {
        shoppingCartModel.printShoppingCartNote();
    };

    /**
     * Open the view for 'opening' the POS
     */
    $scope.openPos = function () {
        //TODO sur le YPeriod courant
        $scope.closeDrawerMenu();

        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, true).then(function (yPeriod) {

        });
    };

    /**
     * Open the view to manage cash
     */
    $scope.cashManagement = function () {
        //TODO sur le YPeriod
        $scope.closeDrawerMenu();

        if (posUserService.isEnable('CASH')) {

            posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, false).then(function (yPeriod) {

                if (yPeriod) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalOpenPos.html',
                        controller: 'ModalOpenPosController',
                        resolve: {
                            openPosParameters: function () {
                                return {
                                    isOpenPos: false,
                                    zPeriodId: yPeriod.zPeriodId,
                                    yPeriodId: yPeriod.id
                                }
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then(function () {

                    }, function () {
                    });
                }
            }, function () {
                sweetAlert({ title: $translate.instant("Veuillez renseigner le fond de caisse") }, function () { });
            });
        }
    };
    /**
	 * Open the view for 'closing' the POS
     */
    /*
    $scope.closePos = function () {
        $scope.closeDrawerMenu();

        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, undefined, false).then(function (yPeriod) {
            posPeriodService.closeYPeriodAsync(yPeriod);
        });
    };

    $scope.closeZPos = function () {
        $scope.closeDrawerMenu();

        posPeriodService.getZPeriodAsync().then(function (zPeriod) {
            posPeriodService.closeZPeriodAsync(zPeriod);
        });
    };
    */

    $scope.pickClose = function () {
        $scope.closeDrawerMenu();

        $uibModal.open({
            templateUrl: 'modals/modalYperiodPick.html',
            controller: 'ModalYperiodPickController',
            size: 'lg',
            backdrop: 'static'
        });
    };

    /**
	 * Open the cash drawer
     */
    $scope.openDrawer = function () {
        /**
		 * TODO: Log this event
         */
        if (posUserService.isEnable('ODRAW')) {
            var configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, { timeout: 10000 });
        }
    };

    $scope.logout = function () {
        $scope.closeDrawerMenu();
        posUserService.saveEventAsync("Logout", 1, 0);
        posUserService.StopWork($rootScope.PosUserId);
        $rootScope.PosUserId = 0;
        $rootScope.PosUserName = "";
    };

    /**
	 * Close the application - only available for windows platforms
     */
    $scope.exit = function () {
        if (navigator.userAgent.match(/(WPF)/)) {
            try {
                wpfCloseApp.shutdownApp();
            } catch (err) {
            }
        }
    };

    /**
	 * Change the current user - doesn't unlog the user
	 * This action needs privilege
     */
    $scope.changeUser = function () {
        $scope.closeDrawerMenu();
        posUserService.saveEventAsync("Logout", 1, 0);
        $rootScope.PosUserId = 0;
        $rootScope.PosUserName = "";
    };

    /**
	 * Open the view managing the split ticket
	 * This action needs privilege
     */
    $scope.shoppingCartSplit = function () {
        this.openAdmin();
        if (posUserService.isEnable('SPLIT')) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalShoppingCartSplit.html',
                controller: 'ModalShoppingCartSplitController',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    defaultValue: function () {
                        return true;
                    }
                }
            });
        }
    };

    /**
	 * Open the BO administarion
	 * @Experimental
     * @param adminController
     * @param adminAction
     */
    $scope.openAdmin = function (adminController, adminAction) {
        $scope.closeDrawerMenu();
        var htmlcontent = $('#loadAdmin ');
        $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/../PosAdminV2/' + adminController + '/' + adminAction).then(function (response) {
            htmlcontent.html(response.data);
        });

    };

});