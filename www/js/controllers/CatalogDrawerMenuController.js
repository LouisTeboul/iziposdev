app.controller('CatalogDrawerMenuController', function ($scope, $rootScope, $state, $uibModal, $http, shoppingCartModel, posUserService, $translate, $compile, $location, authService) {
    $scope.closable = false;
    $scope.authService = authService;
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
    }

    $scope.setLanguage = function (codeLng) {

    	window.localStorage.setItem("CurrentLanguage", codeLng);

    	$translate.use(codeLng);
    }

    $scope.toggleDirectPayment = function () {
    	$rootScope.IziPosConfiguration.IsDirectPayment = $rootScope.IziPosConfiguration.IsDirectPayment ? false : true;
    	window.localStorage.setItem("IsDirectPayment", $rootScope.IziPosConfiguration.IsDirectPayment);
    }

    $scope.shoppingCartDiscount = function () {

        if (posUserService.isEnable('DISC'))
        {
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

    $scope.showAllShoppingCarts = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalAllShoppingCarts.html',
            controller: 'ModalAllShoppingCartsController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function (shoppingCart) {
        	$scope.closeDrawerMenu();
        }, function () {
        	$scope.closeDrawerMenu();
        });
    }

    $scope.printLastShoppingCart = function () {
        shoppingCartModel.printLastShoppingCart();
    }

    $scope.printShoppingCartNote = function () {
        shoppingCartModel.printShoppingCartNote();
    }

    $scope.openPos = function () {
        $scope.closeDrawerMenu();

        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalOpenPos.html',
            controller: 'ModalOpenPosController',
            
            backdrop: 'static'
        });

        modalInstance.result.then(function () {

        }, function () {
        });
    }

    $scope.closePos = function () {
        $scope.closeDrawerMenu();

        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalClosePos.html',
            controller: 'ModalClosePosController',
            size: 'lg',
            backdrop: 'static'
        });

        modalInstance.result.then(function () {

        }, function () {
        });
    }

    $scope.openDrawer = function () {

        if (posUserService.isEnable('ODRAW'))
        {
            var configApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, { timeout: 10000 });

        }

    }

    $scope.logout = function () {
        $scope.closeDrawerMenu();

        posUserService.saveEventAsync("Logout", 1, 0);
        posUserService.StopWork($rootScope.PosUserId);
        $rootScope.PosUserId = 0;
        $rootScope.PosUserName = "";
    }

    $scope.exit = function () {
        if (navigator.userAgent.match(/(WPF)/)) {
            try {
                wpfCloseApp.shutdownApp();
            } catch (err) {
            }
        }
    }

    $scope.changeUser = function () {
        $scope.closeDrawerMenu();
        posUserService.saveEventAsync("Logout", 1, 0);        
        $rootScope.PosUserId = 0;
        $rootScope.PosUserName = "";
    }

    $scope.shoppingCartSplit = function () {

        if (posUserService.isEnable('SPLIT')) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalShoppingCartSplit.html',
                controller: 'ModalShoppingCartSplitController',
                backdrop: 'static',
                size:'lg',
                resolve: {
                    defaultValue: function () {
                        return true;
                    }
                }
            });

            
        }


    }
    $scope.openAdmin = function (adminController,adminAction) {
        $scope.closeDrawerMenu();

        var htmlcontent = $('#loadAdmin ');
        $http.get($rootScope.IziBoxConfiguration.UrlSmartStoreApi + '/../PosAdminV2/' + adminController + '/' + adminAction).then(function (response) {
            htmlcontent.html(response.data);
            //$compile(htmlcontent.contents())($scope);
        });
               
    }

});