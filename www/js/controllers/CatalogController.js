app.config(function ($stateProvider, IdleProvider) {
    $stateProvider
        .state('catalog', {
            url: '/catalog',
            templateUrl: 'views/catalog.html'
        })
    IdleProvider.idle(15); // in seconds
    IdleProvider.timeout(15); // in seconds
})


app.controller('CatalogController', function ($scope, $rootScope, $state, $uibModal, Idle, shoppingCartModel, posLogService, ngToast, $mdSidenav, $mdMedia,orderShoppingCartService) {
    var watchHandler = undefined;
    var dbOrderChangedHandler = undefined;
    var state = $state;
	
    $scope.$rootScope = $rootScope;

    $scope.$mdMedia = $mdMedia;

    $scope.init = function (IdleProvider) {          
    	$rootScope.showShoppingCart = false;

        // Login needed
        if ($rootScope.IziBoxConfiguration.LoginRequired) {
            watchHandler = $scope.$watch(function (scope) { return $rootScope.PosUserId },
                         function () {

                             if ($rootScope.PosUserId == 0) $scope.showLogin();
                         }
                        );
            $rootScope.PosUserId = 0;
            // configure Idle settings
            Idle.setIdle($rootScope.IziBoxConfiguration.LoginTimeout);
        }


        $rootScope.showLoading();

        orderShoppingCartService.init();

        setTimeout(function () {
        	posLogService.updatePosLogAsync().then(function (posLog) {
        		$rootScope.PosLog = posLog;
        		$rootScope.hideLoading();
        	}, function (errPosLog) {

        		$rootScope.hideLoading();
        		swal({ title: "Critique", text: "Erreur d'identification, veuillez relancer l'application.", showConfirmButton: false });
        	});
        }, 3000);


        dbOrderChangedHandler = $rootScope.$on('dbOrderChange', function (event, args) {
            var newOrder = Enumerable.from(args.docs).any(function (d) {
                return !d._deleted;
            });

            if (newOrder) {
                Enumerable.from(args.docs).forEach(function (d) {
                    var orderId = parseInt(d._id.replace("ShoppingCart_1_", ""));
                    ngToast.create({
                        className: 'danger',
                        content: '<b>Nouvelle commande : '+orderId+'</b>',
                        dismissOnTimeout: true,
                        timeout: 10000,
                        dismissOnClick: true
                    });
                });

                $rootScope.$evalAsync();
            }
        });
    };

    $scope.$on("$destroy", function () {
        if (watchHandler) watchHandler();
        if (dbOrderChangedHandler) dbOrderChangedHandler();
    });

    //#region Actions
    $scope.addToCart = function (product) {
        if (!product.DisableBuyButton) {
            shoppingCartModel.addToCart(product);
        }
    }
    //#endregion

    //#region Drawer menu
    $scope.onDrawerMenuClick = function () {
        $scope.toggleDrawerMenu();
    }

    $scope.toggleDrawerMenu = function () {
    	$mdSidenav('drawerMenuDiv').toggle();
    }

    $scope.openDrawerMenu = function () {
    	$mdSidenav('drawerMenuDiv').open();
    }

    $scope.closeDrawerMenu = function () {
        $mdSidenav('drawerMenuDiv').close();
    }

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
    }
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
        $scope.$emit(Keypad.OPEN, "numeric");
        $rootScope.PosUserId = 0;
        $rootScope.PosUserName = '';
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

});