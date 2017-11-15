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
});


app.controller('ConfigurationController', function ($scope, $rootScope, $location, $http, $uibModal, shoppingCartService, posLogService, posService) {
	var current = this;

	var portraitRatioHandler = undefined;
	var lanscapeRatioHandler = undefined;

	$scope.searchIziBoxProgression = { total: 0, step: 0, percent: 0, find: 0 };

	$rootScope.$on('searchIziBoxProgress', function (event, args) {
		$scope.searchIziBoxProgression.total = args.total;
		$scope.searchIziBoxProgression.step = args.step;
		$scope.searchIziBoxProgression.find = args.find;
		if (args.total > 0) {
			$scope.searchIziBoxProgression.percent = (args.step * 100) / args.total;
		}
	});

	$scope.init = function () {
        $scope.Model = {};

        $rootScope.modelPos.posNumber = window.localStorage.getItem("PosNumber");
        if (!$rootScope.modelPos.posNumber) $rootScope.modelPos.posNumber = 1;

		$rootScope.PrinterConfiguration = {};
		$rootScope.PrinterConfiguration.POSPrinter = window.localStorage.getItem("POSPrinter");
		$rootScope.PrinterConfiguration.ProdPrinter = window.localStorage.getItem("ProdPrinter");

		if (!$rootScope.RatioConfiguration) $rootScope.RatioConfiguration = {}; //Not in Cordova
		var landscapeRatioValue = window.localStorage.getItem("LandscapeRatio");
		var portraitRatioValue = window.localStorage.getItem("PortraitRatio");


		$rootScope.RatioConfiguration.LandscapeRatio = $scope.Model.LandscapeRatio = (landscapeRatioValue ? parseFloat(landscapeRatioValue) * 100 : 100);
		$rootScope.RatioConfiguration.PortraitRatio = $scope.Model.PortraitRatio = (portraitRatioValue ? parseFloat(portraitRatioValue) * 100 : 100);

		var posPrinterCountValue = window.localStorage.getItem("POSPrinterCount");
		var prodPrinterCountValue = window.localStorage.getItem("ProdPrinterCount");

		$rootScope.PrinterConfiguration.POSPrinterCount = posPrinterCountValue != undefined ? parseInt(posPrinterCountValue) : 1;
		$rootScope.PrinterConfiguration.ProdPrinterCount = prodPrinterCountValue != undefined ? parseInt(prodPrinterCountValue) : 1;

		if (!$rootScope.PrinterConfiguration.POSPrinter) $rootScope.PrinterConfiguration.POSPrinter = 1;
		if (!$rootScope.PrinterConfiguration.ProdPrinter) $rootScope.PrinterConfiguration.ProdPrinter = 1;

        var settingsPouchDB = {
            typeDB: 'websql',
            opts: { live: true, retry: true, batch_size: 50, batches_limit: 100 },
            optsReplicate: { live: true, retry: true, batch_size: 10, batches_limit: 8 }
        };

		posLogService.getHardwareIdAsync().then(function (result) {

            $rootScope.modelPos.hardwareId = result;

        });


        // For developpement
		if ($location.$$path == "/restart") {
			$scope.validConfig();
		}

		$scope.closable = navigator.userAgent.match(/(WPF)/);
	};



	/**
	 * Empty the data cache
	 * Works
	 *
	 * */
	$scope.emptyCache = function () {
		// Checking if all tickets have already been synchronised with the izibox
		var dbReplicate = new PouchDB('izipos_replicate', { adapter: settingsPouchDB.typeDB });

		var deleteCache = function () {
			swal({ title: "Attention", text: "Supprimer le cache de l'application ?", type: "warning", showCancelButton: true, confirmButtonColor: "#d83448", confirmButtonText: "Oui", cancelButtonText: "Non", closeOnConfirm: true },
				function () {
					if ($scope.closable) {
						emptyCache.clear();
						$scope.reset();
					} else {
						try {
							// FIXME: Windows cache is not always available
							window.cache.clear(function () {
								$scope.reset();
							});
						} catch (err) {
							console.log(err);
						}
					}
				});
		};

		// Synchronize the documents
		dbReplicate.allDocs({
			include_docs: false,
			attachments: false
		}).then(function (result) {
			var docToSynchronize = Enumerable.from(result.rows).any(function (item) {
				return item.id.indexOf("PosLog_") === -1;
			});

			if (docToSynchronize) {
				swal({ title: "Attention", text: "Il reste des documents à synchroniser, vous ne pouvez pas supprimer le cache.", type: "warning", showCancelButton: false, confirmButtonColor: "#d83448", confirmButtonText: "Ok", closeOnConfirm: true });
			} else {
				deleteCache();
			}
		}).catch(function (err) {
			deleteCache();
		});


	};

	/**
	 * Change the 'portrait' display ratio
	 */
	$scope.updatePortraitRatio = function () {
		if ($scope.Model.PortraitRatio > 100) $scope.Model.PortraitRatio = 100;
		if ($scope.Model.PortraitRatio < 10) $scope.Model.PortraitRatio = 10;

		$rootScope.RatioConfiguration.PortraitRatio = $scope.Model.PortraitRatio;
		$scope.$evalAsync();
		$rootScope.closeKeyboard();
	};

    /**
     * Change the 'landscape' display ratio
     */
	$scope.updateLandscapeRatio = function () {
		if ($scope.Model.LandscapeRatio > 100) $scope.Model.LandscapeRatio = 100;
		if ($scope.Model.LandscapeRatio < 10) $scope.Model.LandscapeRatio = 10;

		$rootScope.RatioConfiguration.LandscapeRatio = $scope.Model.LandscapeRatio;
		$scope.$evalAsync();
		$rootScope.closeKeyboard();
	};

    /**
	 * Cancel the izibox search
     */
	$scope.stopIziboxSearch = function () {
		$rootScope.ignoreSearchIzibox = true;
	};


    /**
	 * Clear the last configuration and reload all data
     */
	$scope.reset = function () {
		window.localStorage.removeItem("IziBoxConfiguration");
		window.location.reload();
	};

    /**
	 * Exit the application - only appears and works on windows system
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
	 * Set the printer who will be used for 'client' printing
	 */
	$scope.setPOSPrinter = function (idx) {
		$rootScope.PrinterConfiguration.POSPrinter = idx;
	};

    /**
     * Set the printer who will be used for 'kitchen' printing
     */
	$scope.setProdPrinter = function (idx) {
		$rootScope.PrinterConfiguration.ProdPrinter = idx;
	};

    /**
	 * A simple print test
	 * Print  the printer id
     * @param idx The printers id
     */
	$scope.testPrinter = function (idx) {
		shoppingCartService.testPrinterAsync(idx).then(function (res) {
			sweetAlert("Printer ok !");
		}, function (err) {
			sweetAlert("Printer error !");
		});
	};

    /**
	 * Store the user preferences
     */
	$scope.validConfig = function () {

		$scope.updateLandscapeRatio();
		$scope.updatePortraitRatio();

        window.localStorage.setItem("PosNumber", $rootScope.modelPos.posNumber);
		window.localStorage.setItem("POSPrinter", $rootScope.PrinterConfiguration.POSPrinter);
		window.localStorage.setItem("ProdPrinter", $rootScope.PrinterConfiguration.ProdPrinter);
		window.localStorage.setItem("POSPrinterCount", $rootScope.PrinterConfiguration.POSPrinterCount);
		window.localStorage.setItem("ProdPrinterCount", $rootScope.PrinterConfiguration.ProdPrinterCount);
		window.localStorage.setItem("LandscapeRatio", $rootScope.RatioConfiguration.LandscapeRatio / 100);
		window.localStorage.setItem("PortraitRatio", $rootScope.RatioConfiguration.PortraitRatio / 100);

		$location.path("/loading");	
	};

    /**
	 * Retrieve a configuration with a barcode - The barcode contains the address of a data index
     * @param value
     * @returns {string}
     */
	var decryptBarcode = function (value) {
		var plain = "";

		try {
			plain = Aes.Ctr.decrypt(value, "IziPassIziPos", 256);
		} catch (err) {
			console.log(err);
		}

		return plain;
	};

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
	};

	this.updateConfig = function (index) {
		// TODO: The setup could be elsewhere - remove this address
		var configApiUrl = "http://izitools.cloudapp.net:5984/iziboxsetup/" + index;

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