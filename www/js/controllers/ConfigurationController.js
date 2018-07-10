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
    var userPresetIndex = 1;
    //var portraitRatioHandler = undefined;
    //var lanscapeRatioHandler = undefined;

    $scope.searchIziBoxProgression = {total: 0, step: 0, percent: 0, find: 0};

    $rootScope.$on('searchIziBoxProgress', function (event, args) {
        $scope.searchIziBoxProgression.total = args.total;
        $scope.searchIziBoxProgression.step = args.step + 1;
        $scope.searchIziBoxProgression.find = args.find;
        if (args.total > 0) {
            $scope.searchIziBoxProgression.percent = (args.step * 100) / args.total;
        }

        $scope.gauge.set(args.step + 1);
    });

    $scope.init = function () {
        if(window.localStorage.getItem("IsBorneDefault") ) {
            $rootScope.borne = window.localStorage.getItem("IsBorneDefault") === "true" ? true : false;
        }
        if(window.localStorage.getItem("IsBorneCBDefault") ) {
            $rootScope.borneCB = window.localStorage.getItem("IsBorneCBDefault") === "true" ? true : false;
        }


        $scope.Model = {};
        $scope.presetList = [];
        $scope.selectedPresetTitle = "";

        $rootScope.modelPos.posNumber = window.localStorage.getItem("PosNumber");
        if (!$rootScope.modelPos.posNumber) $rootScope.modelPos.posNumber = 1;

        //Recupere tout les presets sauvegardé dans le localstorage
        while (window.localStorage.getItem("Userpreset" + userPresetIndex)) {
            var preset = JSON.parse(window.localStorage.getItem("Userpreset" + userPresetIndex));
            $scope.presetList.push(preset);
            userPresetIndex++
        }
        $scope.selectedPresetID = window.localStorage.getItem('selectedPresetID');
        if (!$scope.selectedPresetID) $scope.selectedPresetID = 0;

        // Recupere le titre correspondant à l'id du preset
        var tmp = Enumerable.from($scope.presetList).firstOrDefault(function (preset) {
            return preset.id === $scope.selectedPresetID;
        });

        if (tmp && tmp != 0) {
            $scope.currentPreset = tmp;
            // console.log($scope.currentPreset);
            $scope.selectedPresetTitle = tmp.value.name;
        }

        $rootScope.PrinterConfiguration = {};
        $rootScope.PrinterConfiguration.POSPrinter = window.localStorage.getItem("POSPrinter");
        $rootScope.PrinterConfiguration.ProdPrinter = window.localStorage.getItem("ProdPrinter");

        var posPrinterCountValue = window.localStorage.getItem("POSPrinterCount");
        var prodPrinterCountValue = window.localStorage.getItem("ProdPrinterCount");

        $rootScope.PrinterConfiguration.POSPrinterCount = posPrinterCountValue ? parseInt(posPrinterCountValue) : 1;
        $rootScope.PrinterConfiguration.ProdPrinterCount = prodPrinterCountValue ? parseInt(prodPrinterCountValue) : 1;

        if (!$rootScope.PrinterConfiguration.POSPrinter) $rootScope.PrinterConfiguration.POSPrinter = 1;
        if (!$rootScope.PrinterConfiguration.ProdPrinter) $rootScope.PrinterConfiguration.ProdPrinter = 1;

        posLogService.getHardwareIdAsync().then(function (result) {

            $rootScope.modelPos.hardwareId = result;

        });

        // For developpement
        if ($location.$$path == "/restart") {
            $scope.validConfig();
        }

        $scope.closable = $rootScope.isWindowsContainer;

        setTimeout(initGauge, 100);
    };

    var initGauge = function () {

        var opts = {
            angle: 0.5, // The span of the gauge arc
            lineWidth: 0.03, // The line thickness
            radiusScale: 1, // Relative radius
            limitMax: true,     // If false, max value increases automatically if value > maxValue
            limitMin: false,     // If true, the min value of the gauge will be fixed
            colorStart: '#2ebbd0',   // Colors
            colorStop: '#2ebbd0',    // just experiment with them
            strokeColor: '#EEEEEE',  // to see which ones work best for you
            generateGradient: false,
            highDpiSupport: true,     // High resolution support
        };

        var target = document.getElementById('gaugeIzibox'); // your canvas element
        var gauge = new Donut(target).setOptions(opts); // create sexy gauge!
        gauge.maxValue = 254; // set max gauge value
        gauge.setMinValue(1);  // Prefer setter over gauge.minValue = 0
        gauge.animationSpeed = 20; // set animation speed (32 is default value)
        gauge.set(1); // set actual value

        $scope.gauge = gauge;
    };

    /**
     * Empty the data cache
     * Works
     * */
    $scope.emptyCache = function () {
        // Checking if all tickets have already been synchronised with the izibox
        var adapter = !!window.sqlitePlugin ? 'cordova-sqlite' : 'websql';
        var dbReplicate = new PouchDB('izipos_replicate', { adapter: adapter});

        var deleteCache = function () {
            swal({
                    title: "Attention",
                    text: "Supprimer le cache de l'application ?",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#d83448",
                    confirmButtonText: "Oui",
                    cancelButtonText: "Non",
                    closeOnConfirm: true
                },
                function () {
                    if ($scope.closable) {
                        emptyCache.clear();
                        $scope.reset();
                    } else {
                        try {
                            // FIXME: Windows cache is not always available
                            if(window.cache) {
                                window.cache.clear(function () {
                                    $scope.reset();
                                });
                            } else if($rootScope.deviceReady && window.CacheClear) {
                                window.CacheClear( () => {
                                    $scope.reset
                                });
                            }

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

            $rootScope.dbValidatePool.allDocs({
                include_docs: false,
                attachments: false
            }).then(function (resPool) {
                docToSynchronize += resPool.rows.length;

                if (docToSynchronize) {
                    swal({
                        title: "Attention",
                        text: "Il reste des documents à synchroniser, vous ne pouvez pas supprimer le cache.",
                        type: "warning",
                        showCancelButton: false,
                        confirmButtonColor: "#d83448",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true
                    });
                } else {
                    deleteCache();
                }

            }).catch(function () {
                deleteCache();
            });

        }).catch(function (err) {
            deleteCache();
        });


    };

    $scope.fetchUserPresets = function () {
        // Reset les sectionné
        $scope.selectedPresetID = 0;
        $scope.selectedPresetTitle = "";
        $scope.currentPreset = undefined;
        var presetApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/GetUserPreset";
        console.log('Fetch...');
        // Appelle l'API de la box
        $http.get(presetApiUrl, {timeout: 10000}).then(function (presets) {
            // L'api nous retourne le JSON contenant tout les preset
            console.log(presets.data);

            //Reset existing preset si on reçoit des nouveaux
            $scope.presetList = [];
            userPresetIndex = 1;
            // Clean le local storage
            window.localStorage.removeItem("selectedPresetID");

            var i = 1;
            while (window.localStorage.getItem("Userpreset" + i)) {
                window.localStorage.removeItem("Userpreset" + i);
                i++
            }

            if (presets.data) {
                // On boucle dedans,
                Enumerable.from(presets.data.Result).forEach(function (p) {
                    var presetData = {
                        value: p.value,
                        id: p.key
                    };
                    // on stock le tout dans le localstorage
                    localStorage.setItem("Userpreset" + userPresetIndex, JSON.stringify(presetData));
                    // et on met a jour la liste
                    $scope.presetList.push(presetData);
                    userPresetIndex++
                });
            }

        }, function (err) {
            console.log(err);
        });
    };

    $scope.editUserPreset = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalEditPreset.html',
            controller: 'ModalEditPresetController',
            resolve: {
                selectedPreset: function () {
                    return $scope.currentPreset;
                },
                mode: function () {
                    return 'edit';
                },
            },
            backdrop: 'static'
        });

        modalInstance.result.then(function (value) {
            // Vide le localstorage
            while (window.localStorage.getItem("Userpreset" + i)) {
                window.localStorage.removeItem("Userpreset" + i);
                i++
            }

            var match = Enumerable.from($scope.presetList).firstOrDefault(function (preset) {
                console.log(preset.id);
                return preset.id === value.id
            });

            // Update la liste des preset
            match.value = value.value;
            console.log($scope.presetList);
            for (var i = 1; i <= $scope.presetList.length; i++) {
                console.log($scope.presetList[i - 1]);
                window.localStorage.setItem("Userpreset" + i, JSON.stringify($scope.presetList[i - 1]));
            }
            // Update le user preset
            $scope.currentPreset.value = value.value;

            // Post la nouvelle config a la box
            var presetApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/UpdateUserPreset";
            var presetPostData = {
                Id: $scope.currentPreset.id,
                Value: $scope.currentPreset.value
            };

            $http.post(presetApiUrl, presetPostData, {timeout: 1000});

        }, function () {
        });
    };

    $scope.createUserPreset = function () {
        var newPreset = {
            id: Math.random().toString(36).substr(2, 10),
            value: {
                settings: {
                    DefaultDeliveryMode: 0,
                    DisplayButtons: {
                        PrintProd: true,
                        Valid: true,
                        ValidAndPrint: true,
                    },
                    DisplayDelivery: true,
                    DisplayFid: true,
                    HandPreference: 1,
                    ItemSize: 1
                }
            }
        };

        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalEditPreset.html',
            controller: 'ModalEditPresetController',
            resolve: {
                selectedPreset: function () {
                    return newPreset;
                },
                mode: function () {
                    return 'create';
                },
            },
            backdrop: 'static'
        });

        modalInstance.result.then(function (value) {
            // Vide le localstorage

            while (window.localStorage.getItem("Userpreset" + i)) {
                window.localStorage.removeItem("Userpreset" + i);
                i++
            }

            $scope.presetList.push(value);

            console.log($scope.presetList);
            for (var i = 1; i <= $scope.presetList.length; i++) {
                console.log($scope.presetList[i - 1]);
                window.localStorage.setItem("Userpreset" + i, JSON.stringify($scope.presetList[i - 1]));
            }

            // Post la nouvelle config a la box
            var presetApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/UpdateUserPreset";
            var presetPostData = {
                Id: value.id,
                Value: value.value
            };

            $http.post(presetApiUrl, presetPostData, {timeout: 1000});
        }, function () {
        });
    };

    $scope.selectUserPreset = function (preset) {
        console.log(preset);
        $scope.selectedPresetID = preset.id;
        $scope.selectedPresetTitle = preset.value.name;

        $scope.currentPreset = preset;
    };

    $scope.deleteUserPreset = function (preset) {
        /** TODO :  demander confirmation + afficher un toast*/
            // Supprime le preset dans la box
        var presetApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/DeleteUserPreset";
        var presetPostData = {
            Id: preset.id
        };
        $http.post(presetApiUrl, presetPostData, {timeout: 5000}).then(() => {
            // Fetch la nouvelle liste
            $scope.fetchUserPresets();
        });
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
        if ($rootScope.isWindowsContainer) {
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
        //$scope.updateLandscapeRatio();
        //$scope.updatePortraitRatio();
        if ($scope.currentPreset) {
            $rootScope.UserPreset = $scope.currentPreset.value.settings;
        }
        window.localStorage.setItem("IsBorneDefault", $rootScope.borne ? $rootScope.borne.toString() : false);
        window.localStorage.setItem("IsBorneCBDefault", $rootScope.borneCB ? $rootScope.borneCB.toString() : false);
        window.localStorage.setItem("PosNumber", $rootScope.modelPos.posNumber);
        window.localStorage.setItem("POSPrinter", $rootScope.PrinterConfiguration.POSPrinter);
        window.localStorage.setItem("ProdPrinter", $rootScope.PrinterConfiguration.ProdPrinter);
        window.localStorage.setItem("POSPrinterCount", $rootScope.PrinterConfiguration.POSPrinterCount);
        window.localStorage.setItem("ProdPrinterCount", $rootScope.PrinterConfiguration.ProdPrinterCount);
        //window.localStorage.setItem("LandscapeRatio", $rootScope.RatioConfiguration.LandscapeRatio / 100);
        //window.localStorage.setItem("PortraitRatio", $rootScope.RatioConfiguration.PortraitRatio / 100);
        if ($scope.selectedPresetID) {
            window.localStorage.setItem("selectedPresetID", $scope.selectedPresetID);
        }

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
        swal({
                title: "Attention",
                text: "Si vous continuez, l'application ne fonctionnera plus avec l'izibox.\r\nEtes-vous sûr ?",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d83448",
                confirmButtonText: "Oui",
                cancelButtonText: "Non",
                closeOnConfirm: true
            },
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

        $http.get(configApiUrl, {timeout: 10000}).success(function (data, status, headers, config) {
            $rootScope.IziBoxConfiguration = data;
            if ($rootScope.borne) {
                $rootScope.IziBoxConfiguration.LoginRequired = false;
            }
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
        }).error(function (data, status, headers, config) {
            sweetAlert("Index introuvable !");
            $scope.init();
        });
    }
});