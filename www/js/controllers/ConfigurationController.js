app.config(function ($stateProvider) {
    $stateProvider
        .state('configuration', {
            url: '/',
            templateUrl: 'views/configuration.html'
        })
        .state('restart', {
            url: '/restart',
            templateUrl: 'views/configuration.html'
        })
})


app.controller('ConfigurationController', function ($scope, $rootScope, $location, $http,$uibModal, shoppingCartService, posLogService) {
	var current = this;

	var portraitRatioHandler = undefined;
	var lanscapeRatioHandler = undefined;

	$scope.searchIziBoxProgression = {total:undefined,step:undefined,percent:undefined};

	$rootScope.$on('searchIziBoxProgress', function (event, args) {
		$scope.searchIziBoxProgression.total = args.total;
		$scope.searchIziBoxProgression.step = args.step;
		if (args.total > 0) {
			$scope.searchIziBoxProgression.percent = (args.step * 100) / args.total;
		}
	});

    $scope.init = function () {
    	$scope.Model = {};

    	$rootScope.PrinterConfiguration = {};
        $rootScope.PrinterConfiguration.POSPrinter = window.localStorage.getItem("POSPrinter");
        $rootScope.PrinterConfiguration.ProdPrinter = window.localStorage.getItem("ProdPrinter");

        if (!$rootScope.RatioConfiguration) $rootScope.RatioConfiguration = {}; //Not in Cordova
        var landscapeRatioValue = window.localStorage.getItem("LandscapeRatio");
        var portraitRatioValue = window.localStorage.getItem("PortraitRatio");

        
        $rootScope.RatioConfiguration.LandscapeRatio = $scope.Model.LandscapeRatio = (landscapeRatioValue ? parseFloat(landscapeRatioValue) : 1);
        $rootScope.RatioConfiguration.PortraitRatio = $scope.Model.PortraitRatio = (portraitRatioValue ? parseFloat(portraitRatioValue) : 1);

        var posPrinterCountValue = window.localStorage.getItem("POSPrinterCount");
        var prodPrinterCountValue = window.localStorage.getItem("ProdPrinterCount");

        $rootScope.PrinterConfiguration.POSPrinterCount = posPrinterCountValue !=undefined ? parseInt(posPrinterCountValue) : 1;
        $rootScope.PrinterConfiguration.ProdPrinterCount = prodPrinterCountValue != undefined ? parseInt(prodPrinterCountValue) : 1;

        if (!$rootScope.PrinterConfiguration.POSPrinter) $rootScope.PrinterConfiguration.POSPrinter = 1;
        if (!$rootScope.PrinterConfiguration.ProdPrinter) $rootScope.PrinterConfiguration.ProdPrinter = 1;

        posLogService.getHardwareIdAsync().then(function (result) {
        	$scope.HardwareId = result;
        })

        if ($location.$$path == "/restart") {
            $scope.validConfig();
        }

        $scope.closable = navigator.userAgent.match(/(WPF)/);
    };

    $scope.updatePortraitRatio = function () {
    	if ($scope.Model.PortraitRatio > 1) $scope.Model.PortraitRatio = 1;
    	if ($scope.Model.PortraitRatio < 0.1) $scope.Model.PortraitRatio = 0.1;

    	$rootScope.RatioConfiguration.PortraitRatio = $scope.Model.PortraitRatio;

    	$scope.$evalAsync();

    	$rootScope.closeKeyboard();
    }

    $scope.updateLandscapeRatio = function () {
    	if ($scope.Model.LandscapeRatio > 1) $scope.Model.LandscapeRatio = 1;
    	if ($scope.Model.LandscapeRatio < 0.1) $scope.Model.LandscapeRatio = 0.1;

    	$rootScope.RatioConfiguration.LandscapeRatio = $scope.Model.LandscapeRatio;

    	$scope.$evalAsync();

    	$rootScope.closeKeyboard();
    }

    $scope.stopIziboxSearch = function () {
    	$rootScope.ignoreSearchIzibox = true;
    }

    $scope.exit = function () {
        if (navigator.userAgent.match(/(WPF)/)) {
            try {
                wpfCloseApp.shutdownApp();
            } catch (err) {
            }
        }
    };

    $scope.setPOSPrinter = function (idx) {
        $rootScope.PrinterConfiguration.POSPrinter = idx;
    };

    $scope.setProdPrinter = function (idx) {
        $rootScope.PrinterConfiguration.ProdPrinter = idx;
    };

    $scope.testPrinter = function (idx) {
        shoppingCartService.testPrinterAsync(idx).then(function (res) {
            sweetAlert("Printer ok !");
        }, function (err) {
            sweetAlert("Printer error !");
        });
    }

    $scope.validConfig = function () {

    	$scope.updateLandscapeRatio();
    	$scope.updatePortraitRatio();

        window.localStorage.setItem("POSPrinter", $rootScope.PrinterConfiguration.POSPrinter);
        window.localStorage.setItem("ProdPrinter", $rootScope.PrinterConfiguration.ProdPrinter);
        window.localStorage.setItem("POSPrinterCount", $rootScope.PrinterConfiguration.POSPrinterCount);
        window.localStorage.setItem("ProdPrinterCount", $rootScope.PrinterConfiguration.ProdPrinterCount);
        window.localStorage.setItem("LandscapeRatio", $rootScope.RatioConfiguration.LandscapeRatio);
        window.localStorage.setItem("PortraitRatio", $rootScope.RatioConfiguration.PortraitRatio);
        



        $location.path("/loading");

        //var modalInstance = $uibModal.open({
        //    templateUrl: 'modals/modalDemo.html'
        //});
    }

    var decryptBarcode = function (value) {
    	var plain = "";

    	try{
    		plain = Aes.Ctr.decrypt(value, "IziPassIziPos", 256);
    	} catch (err) {

    	}
   	
    	return plain;
    }

    $scope.configIndex = function () {
        swal({ title: "Attention", text: "Si vous continuez, l'application ne fonctionnera plus avec l'izibox.\r\nEtes-vous sûr ?", type: "warning", showCancelButton: true, confirmButtonColor: "#d83448", confirmButtonText: "Oui", cancelButtonText: "Non", closeOnConfirm: true },
            function () {
                var barcode = undefined;

                try {
                    cordova.plugins.barcodeScanner.scan(
                    function (result) {
                        barcode = decryptBarcode(result.text);
                        current.updateConfig(barcode);
                    },
                    function (error) {

                    }
                    );
                } catch (err) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalConfigReader.html',
                        controller: 'ModalBarcodeReaderController',
                        backdrop: 'static'
                    });

                    modalInstance.result.then(function (value) {
                        barcode = decryptBarcode(value);
                        current.updateConfig(barcode);

                    }, function () {
                    });
                }
            });
    }

    this.updateConfig = function (index) {
    	var configApiUrl = "http://izitools.cloudapp.net:5984/iziboxsetup/"+index;    	
    	
        $http.get(configApiUrl, { timeout: 10000 }).
            success(function (data, status, headers, config) {
                $rootScope.IziBoxConfiguration = data;

                data.WithoutIzibox = true;
                data.UseProdPrinter = false;
                data.POSPrinterCount = 0;

                for (var prop in data) {
                    if (data[prop] == "true") {
                        data[prop] = true;
                    }

                    if (data[prop] == "false") {
                        data[prop] = false;
                    }
                }

                window.localStorage.setItem("IziBoxConfiguration", JSON.stringify(data));

                data.deleteCouchDb = true;

                $scope.init();
            }).
            error(function (data, status, headers, config) {
                sweetAlert("Index introuvable !");
                $scope.init();
            });
    }
});