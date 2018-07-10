﻿app.config(function ($stateProvider, IdleProvider) {
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


app.controller('CatalogController', function ($scope, $rootScope, $state, $uibModal, $location, $uibModalStack, $translate, $mdSidenav, $mdMedia, Idle, shoppingCartModel, posLogService, ngToast, orderShoppingCartService, settingService) {
    var watchHandler = undefined;
    var dbOrderChangedHandler = undefined;
    var state = $state;

    $scope.$rootScope = $rootScope;

    $scope.$mdMedia = $mdMedia;

    $scope.init = function (IdleProvider) {
        $rootScope.showShoppingCart = true;
        settingService.getPaymentModesAsync().then((pm) => {
                if (!pm || pm.length <= 0) {
                    swal({
                        title: "Critique",
                        text: "Aucun moyen de paiements !",
                        allowEscapeKey: false,
                        showConfirmButton: false
                    });
                } else {
                    // Login needed
                    if ($rootScope.IziBoxConfiguration.LoginRequired) {

                        watchHandler = $scope.$watch(function (scope) {
                                return $rootScope.PosUserId
                            },
                            function () {
                                if ($rootScope.PosUserId == 0) {
                                    $scope.showLogin();
                                }
                            }
                        );
                        $rootScope.PosUserId = 0;
                        // configure Idle settings
                        if (!$rootScope.borne) {
                            Idle.setIdle($rootScope.IziBoxConfiguration.LoginTimeout);
                        }
                    }
                    if ($rootScope.borne) {
                        Idle.setIdle(60);
                        Idle.watch();
                    }

                    $rootScope.showLoading();

                    orderShoppingCartService.init();

                    posLogService.updatePosLogAsync().then(function (posLog) {
                        $rootScope.PosLog = posLog;
                        $rootScope.hideLoading();
                    }, function (errPosLog) {
                        $rootScope.hideLoading();
                        swal({
                            title: "Critique",
                            text: "Erreur d'identification, veuillez relancer l'application.",
                            showConfirmButton: false
                        });
                    });

                    dbOrderChangedHandler = $rootScope.$on('dbOrderChange', function (event, args) {
                        var newOrder = Enumerable.from(args.docs).any(function (d) {
                            return !d._deleted;
                        });

                        if (newOrder) {
                            Enumerable.from(args.docs).forEach(function (d) {
                                var orderId = parseInt(d._id.replace("ShoppingCart_1_", ""));
                                ngToast.create({
                                    className: 'danger',
                                    content: '<span class="bold">Nouvelle commande : ' + orderId + '</span>',
                                    dismissOnTimeout: true,
                                    timeout: 10000,
                                    dismissOnClick: true
                                });
                            });
                            $rootScope.$evalAsync();
                        }
                    });
                }
            },
            (err) => {
                swal({
                    title: "Critique",
                    text: "Aucun moyen de paiements",
                    showConfirmButton: false
                });
            });

    };

    $scope.$on("$destroy", function () {
        if (watchHandler) watchHandler();
        if (dbOrderChangedHandler) dbOrderChangedHandler();
    });

    //#region Actions
    /*
    $scope.addToCart = function (product) {
        if(product){
            console.log(product);
            if (!product.DisableBuyButton) {
                shoppingCartModel.addToCart(product);
            }
        }
    };*/

    $scope.getNbItems = function () {
        return Math.round10(shoppingCartModel.getNbItems(), -2);
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
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalLogin.html',
            controller: 'ModalLoginController',
            resolve: {
                paymentMode: function () {
                    return 0;
                },
                maxValue: function () {
                    return 0;
                }
            },
            backdrop: 'static',
            keyboard: false
        });
    };
    $scope.started = false;

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
            windowClass: 'modal-danger'
        });
    });

    $scope.$on('IdleEnd', function () {
        closeModals();
    });

    $scope.$on('IdleTimeout', function () {
        closeModals();
        if ($rootScope.borne) {
            shoppingCartModel.cancelShoppingCart();
            $uibModalStack.dismissAll();
            $location.path("/idleScreen");
        } else {
            $scope.$emit(Keypad.OPEN, "numeric");
            $rootScope.PosUserId = 0;
            $rootScope.PosUserName = '';
        }
    });

    $scope.start = function () {
        closeModals();
        Idle.watch();
        $scope.started = true;
    };

    $scope.stop = function () {
        closeModals();
        Idle.unwatch();
        $scope.started = false;
    };
    //#endregion

    $scope.setLanguage = function (codeLng) {
        window.localStorage.setItem("CurrentLanguage", codeLng);
        $translate.use(codeLng);
    };
});