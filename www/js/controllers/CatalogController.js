app.config(function ($stateProvider, IdleProvider) {
    $stateProvider
        .state('catalog', {
            url: '/catalog',
            controller: function ($rootScope, $state) {
                if ($rootScope.borne) {
                    $state.go('catalogBorne');
                } else {
                    $state.go('catalogPOS');
                }
            }
        })
        .state('catalogPOS', {
            url: '/catalogPOS',
            templateUrl: 'views/catalog.html'
        })
        .state('catalogBorne', {
            url: '/catalogBorne',
            templateUrl: 'viewsBorne/catalog.html'
        });
    IdleProvider.idle(15); // in seconds
    IdleProvider.timeout(15); // in seconds
});

app.controller('CatalogController', function ($scope, $rootScope, $uibModal, $location, $uibModalStack, $translate, $mdSidenav, $mdMedia, Idle, ngToast, settingService, repositoryLoaderService, shoppingCartService, orderService) {
    let watchHandler = undefined;
    let dbOrderChangedHandler = undefined;

    $scope.$on("$destroy", function () {
        if (watchHandler) watchHandler();
        if (dbOrderChangedHandler) dbOrderChangedHandler();
    });

    if ($rootScope.borne && $rootScope.borneVertical) { //vertical
        $scope.layoutMain = "column";
        $scope.layoutSec = "row";
        $scope.categoryAlign = "center center";
    } else { //horizontal
        $scope.categoryAlign = "start center";
        $scope.layoutMain = "row";
        $scope.layoutSec = "column";
    }

    $scope.$rootScope = $rootScope;

    $scope.repositoryLoaderService = repositoryLoaderService;

    $scope.mdMedia = $mdMedia;

    $scope.reload = () => {
        swal({
            title: "Le référentiel a été mis à jour",
            text: "Voulez-vous redémarrer ?",
            buttons: [$translate.instant("Non"), $translate.instant("Oui")],
            dangerMode: true
        }).then((confirm) => {
            if (confirm) {
                window.location.reload();
            }
        });
    };

    $scope.init = () => {
        $rootScope.showShoppingCart = true;

        if (!$rootScope.OrderCount) {
            $rootScope.OrderCount = {
                untouched: {},
                in_kitchen: {},
                ready: {},
                total: 0
            };
        }
        if (!$rootScope.FreezeCount) {
            $rootScope.FreezeCount = {
                untouched: {},
                in_kitchen: {},
                ready: {},
                total: 0
            };
        }

        orderService.refecthOrdersAsync(true);

        settingService.getPaymentModesAsync().then((pm) => {
                if (!pm || pm.length <= 0) {
                    swal({
                        title: "Critique",
                        text: "Aucun moyen de paiements !",
                        buttons: [false, false],
                        dangerMode: true,
                        closeOnEsc: false
                    });
                } else {
                    // Login needed
                    if ($rootScope.IziBoxConfiguration.LoginRequired && !$rootScope.borne) {
                        watchHandler = $scope.$watch(() => $rootScope.PosUserId, () => {
                            if ($rootScope.PosUserId === 0) {
                                $scope.showLogin();
                            }
                        });
                        
                        $rootScope.PosUserId = 0;
                        // configure Idle settings
                        Idle.setIdle($rootScope.IziBoxConfiguration.LoginTimeout);

                    }
                    if ($rootScope.borne) {
                        Idle.setIdle(60);
                        Idle.watch();
                    }

                    dbOrderChangedHandler = $rootScope.$on('dbOrderChange', function (event, args) {
                        // On ne trigger le toast que si c'est un document de type shoppingCart, et que c'est un nouveau
                        // = Pas deleted, et pas une deuxieme revision
                        const newOrder = Enumerable.from(args.docs).any(function (d) {
                            return !d._deleted && d._id.includes("ShoppingCart_1_") && !d._revisions;
                        });

                        if (newOrder) {
                            for (const doc of args.docs) {
                                const orderId = doc.data.PartnerOrderId || doc.data.OrderId;
                                // let iconSrc = "";
                                // if(doc.data.Origin) {
                                //     switch(doc.data.Origin) {
                                //         case ShoppingCartOrigins.WEB:
                                //             iconSrc = "img/icons/web.svg";
                                //             break;
                                //         case ShoppingCartOrigins.DELIVEROO:
                                //             iconSrc = "img/icons/deliveroo.svg";
                                //             break;
                                //     }
                                // }
                                ngToast.create({
                                    className: 'danger',
                                    content: '<span class="bold"> Nouvelle commande : ' + orderId + '</span>',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                            }
                            $rootScope.$evalAsync();
                        }
                    });
                }
            },
            (err) => { // err
                swal({
                    title: "Critique",
                    text: "Aucun moyen de paiements !",
                    buttons: [false, false],
                    dangerMode: true,
                    closeOnEsc: false
                });
            });

        $scope.pubImage = $rootScope.bornePubImages ? $rootScope.bornePubImages[0] : "img/ad.png";


        $scope.customStyle = {
            'background-image': $rootScope.bornePubImages ? 'url(' + $rootScope.bornePubImages[0] + ')' : 'url(img/ad.png)'
        };
    };

    $scope.getNbItems = function () {
        return roundValue(shoppingCartService.getNbItems());
    };
    //#endregion

    //#region Drawer menu
    $scope.onDrawerMenuClick = function () {
        if (!$rootScope.borne) {
            $scope.toggleDrawerMenu();
        }
    };

    $scope.toggleDrawerMenu = function () {
        $mdSidenav('drawerMenuDiv').toggle();
    };

    $scope.openDrawerMenu = function () {
        $mdSidenav('drawerMenuDiv').open();
    };

    $scope.closeDrawerMenu = function () {
        $mdSidenav('drawerMenuDiv').close();
    };

    $scope.showLogin = function () {
        $uibModal.open({
            templateUrl: 'modals/modalLogin.html',
            controller: 'ModalLoginController',
            resolve: {
                paymentMode: function () {
                    return 0;
                }
                /*,
                                maxValue: function () {
                                    return 0;
                                }*/
            },
            backdrop: 'static',
            keyboard: false
        });
    };

    function closeModals() {
        if ($scope.warning) {
            $scope.warning.close();
            $scope.warning = null;
        }

        if ($scope.timedout) {
            $scope.timedout.close();
            $scope.timedout = null;
        }
    }

    $scope.$on('IdleStart', function () {
        closeModals();

        $scope.warning = $uibModal.open({
            templateUrl: 'warning-dialog.html',
            windowClass: 'mainModals modal-danger'
        });
    });

    $scope.$on('IdleEnd', function () {
        closeModals();
    });

    $scope.$on('IdleTimeout', function () {
        closeModals();
        $rootScope.closeKeyboard();
        if ($rootScope.borne) {
            $rootScope.clearShoppingCart();
            $rootScope.isCustomerLog = false;
            $uibModalStack.dismissAll();
            $location.path("/idleScreen");
            $rootScope.closeKeyboard();
        } else {
            $scope.$emit(Keypad.OPEN, "numeric");
            $rootScope.PosUserId = 0;
            $rootScope.PosUserName = '';
        }
    });

    $scope.start = function () {
        closeModals();
        Idle.watch();
    };

    $scope.stop = function () {
        closeModals();
        Idle.unwatch();
    };
    //#endregion

    $scope.setLanguage = function (codeLng) {
        window.localStorage.setItem("CurrentLanguage", codeLng);
        $translate.use(codeLng);
    };
});