app.config(function ($stateProvider) {
    $stateProvider.state('configuration', {
        url: '/',
        templateUrl: 'views/configuration.html'
    }).state('restart', {
        url: '/restart',
        templateUrl: 'views/configuration.html'
    });
});

app.controller('ConfigurationController', function ($scope, $rootScope, $location, $http, $mdMedia, $uibModal, $translate, posLogService, ipService, pictureService) {
    let self = this;
    let userPresetIndex = 1;
    let borneModeHandler = undefined;
    let iziboxConfigurationHandler = undefined;
    let searchIziBoxProgressHandler = undefined;
    let userPresetCount = 1;

    $scope.$translate = $translate;
    $scope.searchIziBoxProgression = {
        total: 0,
        step: 0,
        percent: 0,
        find: 0
    };

    borneModeHandler = $rootScope.$watch('borne', () => {
        if ($rootScope.IziBoxConfiguration) {
            $rootScope.IziBoxConfiguration.defaultStoreId = $rootScope.IziBoxConfiguration.StoreId;
            if ($rootScope.borne) {
                if ($rootScope.IziBoxConfiguration.StoreBorneId) {
                    console.log("StoreId changed : " + $rootScope.IziBoxConfiguration.StoreId + " => " + $rootScope.IziBoxConfiguration.StoreBorneId);
                    $rootScope.IziBoxConfiguration.StoreId = $rootScope.IziBoxConfiguration.StoreBorneId;
                }
            } else {
                console.log("StoreId changed : " + $rootScope.IziBoxConfiguration.StoreId + " => " + $rootScope.IziBoxConfiguration.defaultStoreId);
                $rootScope.IziBoxConfiguration.StoreId = $rootScope.IziBoxConfiguration.defaultStoreId;
            }
        }
    });

    iziboxConfigurationHandler = $rootScope.$watch('IziBoxConfiguration', () => {
        if ($rootScope.IziBoxConfiguration) {
            initPrinterConfig();
            initPreset();
        }
    });

    searchIziBoxProgressHandler = $rootScope.$on('searchIziBoxProgress', (event, args) => {
        $scope.searchIziBoxProgression.total = args.total;
        $scope.searchIziBoxProgression.step = args.step + 1;
        $scope.searchIziBoxProgression.find = args.find;

        if (args.total > 0) {
            $scope.searchIziBoxProgression.percent = (args.step * 100) / args.total;
        }
        if ($scope.gauge) {
            $scope.gauge.set(args.step + 1);
        }
    });

    $scope.$on("$destroy", () => {
        borneModeHandler();
        iziboxConfigurationHandler();
        searchIziBoxProgressHandler();
    });

    $scope.init = () => {
        // Default TenantColor
        $rootScope.tenantColor = "#98C8CC";

        if (window.localStorage.getItem("IsBorneDefault")) {
            $rootScope.borne = window.localStorage.getItem("IsBorneDefault") === "true";
        }
        if (window.localStorage.getItem("IsBorneVerticalDefault")) {
            $rootScope.borneVertical = window.localStorage.getItem("IsBorneVerticalDefault") === "true";
        }
        if (window.localStorage.getItem("AnimProductDefault")) {
            $rootScope.animProduct = window.localStorage.getItem("AnimProductDefault") === "true";
        }
        if (window.localStorage.getItem("BorneFidDefault")) {
            $rootScope.borneFid = window.localStorage.getItem("BorneFidDefault") === "true";
        }
        if (window.localStorage.getItem("ProductRecapDefault")) {
            $rootScope.productRecap = window.localStorage.getItem("ProductRecapDefault") === "true";
        }

        if (window.localStorage.getItem("IsBorneAtCashierDefault")) {
            $rootScope.borneAtCashier = window.localStorage.getItem("IsBorneAtCashierDefault") === "true";
        }
        if (window.localStorage.getItem("IsBorneEasyTransacDefault")) {
            $rootScope.borneEasyTransac = window.localStorage.getItem("IsBorneEasyTransacDefault") === "true";
        }
        if (window.localStorage.getItem("IsBorneBalanceDefault")) {
            $rootScope.borneBalance = window.localStorage.getItem("IsBorneBalanceDefault") === "true";
        }
        if (window.localStorage.getItem("IsBorneConsignorDefault")) {
            $rootScope.borneConsignor = window.localStorage.getItem("IsBorneConsignorDefault") === "true";
        }
        if (window.localStorage.getItem("IsBorneCBDefault")) {
            $rootScope.borneCB = window.localStorage.getItem("IsBorneCBDefault") === "true";
        }
        if (window.localStorage.getItem("IsBorneEspeceDefault")) {
            $rootScope.borneEspece = window.localStorage.getItem("IsBorneEspeceDefault") === "true";
        }

        if (window.localStorage.getItem("IsBorneForHereDefault")) {
            $rootScope.borneForHere = window.localStorage.getItem("IsBorneForHereDefault") === "true";

            if (window.localStorage.getItem("IsBorneForHereCollectionDefault")) {
                $rootScope.borneForHereCollection = window.localStorage.getItem("IsBorneForHereCollectionDefault") === "true";
            } else {
                $rootScope.borneForHereCollection = false
            }
        } else {
            $rootScope.borneForHere = true
        }

        if (window.localStorage.getItem("IsBorneTakeawayDefault")) {
            $rootScope.borneTakeaway = window.localStorage.getItem("IsBorneTakeawayDefault") === "true";

            if (window.localStorage.getItem("IsBorneTakeawayCollectionDefault")) {
                $rootScope.borneTakeawayCollection = window.localStorage.getItem("IsBorneTakeawayCollectionDefault") === "true";
            } else {
                $rootScope.borneTakeawayCollection = false
            }
        } else {
            $rootScope.borneTakeaway = true;
        }

        if (window.localStorage.getItem("PrinterConfig")) {
            $rootScope.printerConfig = JSON.parse(window.localStorage.getItem("PrinterConfig"));
        } else {
            $rootScope.printerConfig = {};
        }
        /*if (window.localStorage.getItem("IsBorneCBTRDefault")) {
            $rootScope.borneCBTR = window.localStorage.getItem("IsBorneCBTRDefault") === "true";
        }*/

        // Moyens de paiement
        if(!$rootScope.borne && window.localStorage.getItem("PaymentTypesConfig")) {

            $rootScope.paymentTypesConfig = JSON.parse(window.localStorage.getItem("PaymentTypesConfig"));
        } else {
            $rootScope.paymentTypesConfig = {
                [PaymentType.ESPECE] : true,
                [PaymentType.CB] : true,
                [PaymentType.CHEQUE] : true,
                [PaymentType.TICKETRESTAURANT] : true,
                [PaymentType.AVOIR] : true,
                [PaymentType.ENCOMPTE] : true,
                [PaymentType.LYFPAY] : true,
                [PaymentType.CBTICKETRESTAURANT] : true,
            }
        }

        $rootScope.isPMREnabled = false;
        $rootScope.isCustomerLog = false;
        $scope.Model = {};
        $scope.presetList = [];
        $scope.selectedPresetTitle = "";
        if(window.glory) {
            $scope.enableGlory = true;
        } else {
            $scope.enableGlory = false;
            $rootScope.borneEspece = false;
        }
        
        $rootScope.modelPos.posNumber = window.localStorage.getItem("PosNumber");

        if (!$rootScope.modelPos.posNumber) {
            $rootScope.modelPos.posNumber = 1;
        }

        posLogService.getHardwareIdAsync().then((result) => {
            $rootScope.modelPos.hardwareId = result;
        });
        ipService.getLocalIpAsync().then((ip) => {
            $rootScope.modelPos.localIp = ip.local;
        });

        $scope.closable = $rootScope.isWindowsContainer;
        setTimeout(initGauge, 100);
    };

    $scope.editPaymentTypesConfig = () => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPaymentTypesConfig.html',
            controller: 'ModalPaymentTypesConfigController',
            backdrop: 'static'
        });

        modalInstance.result.then((value) => {

        })
    };

    const initPrinterConfig = () => {
        // Local settings, stored in cache
        $rootScope.PrinterConfiguration = {};
        $rootScope.PrinterConfiguration.POSPrinter = window.localStorage.getItem("POSPrinter");
        $rootScope.PrinterConfiguration.ProdPrinter = window.localStorage.getItem("ProdPrinter");

        let printToPosString = window.localStorage.getItem("PrintToPos");
        $rootScope.PrinterConfiguration.PrintToPos = printToPosString && getStringBoolValue(printToPosString);

        let prodPrinterCountValue = window.localStorage.getItem("ProdPrinterCount");
        $rootScope.PrinterConfiguration.ProdPrinterCount = prodPrinterCountValue ? parseInt(prodPrinterCountValue) : 1;

        if (!$rootScope.PrinterConfiguration.POSPrinter) {
            $rootScope.PrinterConfiguration.POSPrinter = 1;
        }
        if (!$rootScope.PrinterConfiguration.ProdPrinter) {
            $rootScope.PrinterConfiguration.ProdPrinter = 1;
        }

        // Global settings, stored in IziBox
        let configApiUrl = $rootScope.APIBaseURL + "/getprinterconfig/";

        $http.get(configApiUrl, {
            timeout: 10000
        }).then((ret) => {
            if (ret.data && ret.data.Printers && ret.data.Printers.length > 0) {
                $rootScope.printerConfig = ret.data;
                $rootScope.printerConfig.Printers.map(p => p.IsUp = true);
                let checkApiUrl = $rootScope.APIBaseURL + "/checkprinterconfig/";

                $http.get(checkApiUrl).then((ret) => {
                    // console.log(ret);
                    if (ret.data) {
                        const printersStatus = ret.data;

                        if (printersStatus.some(p => !p.IsUp)) {
                            // Set tout les printer a up
                            let downPrinters = printersStatus.filter(p => !p.IsUp).map(p => p.Device);
                            let downIps = downPrinters.map(p => p.IPaddress).join(', ');
                            if (!$rootScope.borne) {
                                swal({
                                    title: "Les imprimantes aux adresses suivantes n'ont pas répondu : " + downIps
                                });
                            }

                            downPrinters.forEach((dp) => {
                                $rootScope.printerConfig.Printers.find(p => p.IPaddress == dp.IPaddress).IsUp = false;
                            });
                        }
                    }
                }, (err) => {
                    console.error(err);
                });
            }
        }, (err) => {
            console.error(err);
        });
    };

    const initPreset = () => {
        //Recupere tout les presets sauvegardé dans le localstorage
        while (window.localStorage.getItem("Userpreset" + userPresetIndex)) {
            let preset = JSON.parse(window.localStorage.getItem("Userpreset" + userPresetIndex));
            $scope.presetList.push(preset);
            userPresetIndex++;
        }
        $scope.selectedPresetID = window.localStorage.getItem('selectedPresetID');
        if (!$scope.selectedPresetID) {
            $scope.selectedPresetID = 0;
        }

        // Recupere le titre correspondant à l'id du preset
        let tmp = Enumerable.from($scope.presetList).firstOrDefault((preset) => {
            return preset.id === $scope.selectedPresetID;
        });

        if (tmp && tmp !== 0) {
            tmp = clearPreset(tmp);
            $scope.currentPreset = tmp;
            //console.log($scope.currentPreset);
            $scope.selectedPresetTitle = tmp.value.name;
        }
    };

    const clearPreset = (preset) => {
        // Supprime les champs incompatible avec le IziBoxSetup de la config courante
        if (!preset.value.settings.DisplayWebOrders) {
            delete preset.value.settings.DisplayWebOrders;
        }
        if ($rootScope.IziBoxConfiguration) {
            if (!$rootScope.IziBoxConfiguration.PhoneOrderEnable) {
                delete preset.value.settings.PhoneOrder;
            }
            if ($rootScope.IziBoxConfiguration.EnableKDS) {
                delete preset.value.settings.DisplayWebOrders;
                delete preset.value.settings.DefaultFreezeActiveTab;
            } else {
                delete preset.value.settings.AutoLoadReadyOrders;
                delete preset.value.settings.PrintProdMode;
            }
        }
        return preset;
    };

    const initGauge = () => {
        let opts = {
            angle: 0.5, // The span of the gauge arc
            lineWidth: 0.03, // The line thickness
            radiusScale: 1, // Relative radius
            limitMax: true, // If false, max value increases automatically if value > maxValue
            limitMin: false, // If true, the min value of the gauge will be fixed
            colorStart: '#2ebbd0', // Colors
            colorStop: '#2ebbd0', // just experiment with them
            strokeColor: '#EEEEEE', // to see which ones work best for you
            generateGradient: false,
            highDpiSupport: true // High resolution support
        };
        let target = document.querySelector('#gaugeIzibox'); // your canvas element
        if (target) {
            let gauge = new Donut(target).setOptions(opts); // create sexy gauge!
            gauge.maxValue = 254; // set max gauge value
            gauge.setMinValue(1); // Prefer setter over gauge.minValue = 0
            gauge.animationSpeed = 20; // set animation speed (32 is default value)
            gauge.set(1); // set actual value

            $scope.gauge = gauge;
        }
    };

    //Empty the data cache
    $scope.emptyCache = () => {
        // Checking if all tickets have already been synchronised with the izibox
        let adapter = !!window.sqlitePlugin ? 'cordova-sqlite' : 'idb';
        let dbValidatePool = new PouchDB('izipos_validatepool', {
            adapter: adapter
        });

        const deleteCache = () => {
            swal({
                title: "Attention",
                text: "Supprimer le cache de l'application ?",
                buttons: [$translate.instant("Non"), $translate.instant("Oui")],
                dangerMode: true
            }).then((confirm) => {
                if (confirm) {
                    if ($scope.closable) {
                        $scope.reset();
                        emptyCache.clear();
                    } else {
                        try {
                            // Windows cache is not always available
                            if (window.cache) {
                                window.cache.clear(() => {
                                    $scope.reset();
                                });
                            } else if ($rootScope.deviceReady && window.CacheClear) {
                                window.CacheClear(() => {
                                    $scope.reset();
                                });
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }
                }
            });
        };

        dbValidatePool.allDocs({
            include_docs: false,
            attachments: false
        }).then((resPool) => {
            if (resPool.rows.length) {
                swal({
                    title: "Attention",
                    text: "Il reste des documents à synchroniser, vous ne pouvez pas supprimer le cache.",
                    buttons: [false, "Ok"],
                    dangerMode: true
                });
            } else {
                deleteCache();
            }
        }).catch(() => {
            deleteCache();
        });
    };

    $scope.fetchUserPresets = () => {
        //Reset les sectionné
        $scope.selectedPresetID = 0;
        $scope.selectedPresetTitle = "";
        $scope.currentPreset = undefined;
        let presetApiUrl = $rootScope.APIBaseURL + "/GetUserPreset";
        console.log('Fetch...');

        //Appelle l'API de la box
        $http.get(presetApiUrl, {
            timeout: 10000
        }).then((presets) => {
            //L'api nous retourne le JSON contenant tout les preset
            console.log(presets.data);
            //Reset existing preset si on reçoit des nouveaux
            $scope.presetList = [];
            userPresetIndex = 1;
            //Clean le local storage
            window.localStorage.removeItem("selectedPresetID");

            userPresetCount = 1;

            while (window.localStorage.getItem("Userpreset" + userPresetCount)) {
                window.localStorage.removeItem("Userpreset" + userPresetCount);
                userPresetCount++;
            }

            if (presets.data) {
                //On boucle dedans,
                Enumerable.from(presets.data.Result).forEach((p) => {
                    let presetData = {
                        value: p.value,
                        id: p.key
                    };
                    //On stock le tout dans le localstorage
                    window.localStorage.setItem("Userpreset" + userPresetIndex, JSON.stringify(presetData));
                    //Et on met a jour la liste
                    $scope.presetList.push(presetData);
                    userPresetIndex++;
                });
            }
        }, (err) => {
            console.error(err);
        });
    };

    $scope.editUserPreset = () => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalEditPreset.html',
            controller: 'ModalEditPresetController',
            resolve: {
                selectedPreset: () => {
                    return $scope.currentPreset;
                },
                mode: () => {
                    return 'edit';
                }
            },
            backdrop: 'static'
        });

        modalInstance.result.then((value) => {
            //Vide le localstorage
            while (window.localStorage.getItem("Userpreset" + userPresetCount)) {
                window.localStorage.removeItem("Userpreset" + userPresetCount);
                userPresetCount++;
            }

            let match = Enumerable.from($scope.presetList).firstOrDefault((preset) => {
                console.log(preset.id);
                return preset.id === value.id;
            });

            //Update la liste des preset
            match.value = value.value;

            for (let i = 1; i <= $scope.presetList.length; i++) {
                window.localStorage.setItem("Userpreset" + i, JSON.stringify($scope.presetList[i - 1]));
            }

            //Update le user preset
            $scope.selectUserPreset(value);
            //$scope.currentPreset.value = value.value;

            //Post la nouvelle config a la box
            let presetApiUrl = $rootScope.APIBaseURL + "/UpdateUserPreset";
            let presetPostData = {
                Id: $scope.currentPreset.id,
                Value: $scope.currentPreset.value
            };

            $http.post(presetApiUrl, presetPostData, {
                timeout: 1000
            }).then(() => {
                //$scope.fetchUserPresets();
            });
        }, (err) => {
            console.error(err);
        });
    };


    $scope.createUserPreset = () => {
        let newPreset = {
            id: Math.random().toString(36).substr(2, 10),
            value: {
                settings: {
                    DefaultDeliveryMode: 0,
                    DisplayButtons: {
                        PrintProd: true,
                        Valid: true,
                        ValidAndPrint: true
                    },
                    DisplayDelivery: true,
                    DisplayFid: true,
                    HandPreference: 1,
                    ItemSize: 1
                }
            }
        };
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalEditPreset.html',
            controller: 'ModalEditPresetController',
            resolve: {
                selectedPreset: () => {
                    return newPreset;
                },
                mode: () => {
                    return 'create';
                }
            },
            backdrop: 'static'
        });

        modalInstance.result.then((value) => {
            // Vide le localstorage
            let i = 1;
            while (window.localStorage.getItem("Userpreset" + i)) {
                window.localStorage.removeItem("Userpreset" + i);
                i++;
            }
            $scope.presetList.push(value);

            console.log($scope.presetList);
            for (let j = 1; j <= $scope.presetList.length; j++) {
                window.localStorage.setItem("Userpreset" + j, JSON.stringify($scope.presetList[j - 1]));
            }

            // Update le user preset
            $scope.selectUserPreset(value);

            // Post la nouvelle config a la box
            let presetApiUrl = $rootScope.APIBaseURL + "/UpdateUserPreset";
            let presetPostData = {
                Id: value.id,
                Value: value.value
            };

            $http.post(presetApiUrl, presetPostData, {
                timeout: 1000
            });
        }, (err) => {
            console.log(err);
        });
    };

    $scope.selectUserPreset = (preset) => {
        preset = clearPreset(preset);
        $scope.selectedPresetID = preset.id;
        $scope.selectedPresetTitle = preset.value.name;
        $scope.currentPreset = preset;
    };

    $scope.deleteUserPreset = (preset) => {
        console.log(preset);
        /** TODO :  demander confirmation + afficher un toast*/
        // Supprime le preset dans la box
        swal({
            title: "Supprimer ce preset ?",
            text: 'Confirmez la suppression du preset "' + preset.value.name + '"',
            buttons: [$translate.instant("Non"), $translate.instant("Oui")]
        }).then((confirm) => {
            if (confirm) {
                let presetApiUrl = $rootScope.APIBaseURL + "/DeleteUserPreset";
                let presetPostData = {
                    Id: preset.id
                };

                $http.post(presetApiUrl, presetPostData, {
                    timeout: 5000
                }).then(() => {
                    // Fetch la nouvelle liste
                    $scope.fetchUserPresets();
                });
            }
        });
    };

    //Cancel the izibox search
    $scope.stopIziboxSearch = () => {
        $rootScope.ignoreSearchIzibox = true;
    };

    //Clear the last configuration and reload all data
    $scope.reset = () => {
        window.localStorage.removeItem("IziBoxConfiguration");
        window.location.reload();
    };

    //Exit the application - only appears and works on windows system
    $scope.exit = () => {
        if ($rootScope.isWindowsContainer) {
            try {
                wpfCloseApp.shutdownApp();
            } catch (err) {
                console.log(err);
            }
        }
    };

    $scope.deletePictureCache = () => {
        swal({
            title: $translate.instant("Supprimer le cache d'images sur l'izibox ?"),
            buttons: [$translate.instant("Non"), $translate.instant("Oui")]
        }).then((confirm) => {
            if (confirm) {
                pictureService.deletePictureCache();
            }
        });
    };

    $scope.openPrintConfig = () => {
        const modalInstance = $uibModal.open({
            templateUrl: 'modals/modalPrinterConfig.html',
            controller: 'ModalPrinterConfigController',
            size: $mdMedia('min-width: 1300px') ? 'xlg' : 'max',
            resolve: {
                currentConfig: () => {
                    return $rootScope.printerConfig;
                }
            },
            backdrop: 'static'
        });

        modalInstance.result.then((newConfig) => {
            console.log(newConfig);
            let configApiUrl = $rootScope.APIBaseURL + "/updateprinterconfig/";

            $http.post(configApiUrl, newConfig, {
                timeout: 10000
            }).then((ret) => {
                console.log(ret.data.Result);
                $rootScope.printerConfig = newConfig;

                //  Set printer pos, prod et les count
                window.localStorage.setItem("PrinterConfig", JSON.stringify($rootScope.printerConfig));

                if ($rootScope.PrinterConfiguration.POSPrinter !== undefined) {
                    window.localStorage.setItem("POSPrinter", $rootScope.PrinterConfiguration.POSPrinter);
                }
                if ($rootScope.PrinterConfiguration.ProdPrinter !== undefined) {
                    window.localStorage.setItem("ProdPrinter", $rootScope.PrinterConfiguration.ProdPrinter);
                }
                if ($rootScope.PrinterConfiguration.ProdPrinterCount !== undefined) {
                    window.localStorage.setItem("ProdPrinterCount", $rootScope.PrinterConfiguration.ProdPrinterCount);
                }
                if ($rootScope.PrinterConfiguration.PrintToPos !== undefined) {
                    window.localStorage.setItem("PrintToPos", $rootScope.PrinterConfiguration.PrintToPos);
                }
            }, (err) => {
                console.error(err);
            });
        }, (err) => {
            console.log(err);
        });
    };

    //Store the user preferences
    $scope.validConfig = () => {
        //$scope.updateLandscapeRatio();
        //$scope.updatePortraitRatio();

        if ($scope.currentPreset) {
            $rootScope.UserPreset = $scope.currentPreset.value.settings;
        }

        window.localStorage.setItem("PosNumber", $rootScope.modelPos.posNumber);

        window.localStorage.setItem("IsBorneDefault", $rootScope.borne ? $rootScope.borne.toString() : false);

        window.localStorage.setItem("PaymentTypesConfig",  JSON.stringify($rootScope.paymentTypesConfig));

        // Flags lié à la borne
        if ($rootScope.borne) {
            window.localStorage.setItem("IsBorneVerticalDefault", $rootScope.borneVertical ? $rootScope.borneVertical.toString() : false);

            window.localStorage.setItem("AnimProductDefault", $rootScope.animProduct ? $rootScope.animProduct.toString() : false);
            window.localStorage.setItem("ProductRecapDefault", $rootScope.productRecap ? $rootScope.productRecap.toString() : false);
            window.localStorage.setItem("BorneFidDefault", $rootScope.borneFid ? $rootScope.borneFid.toString() : false);

            window.localStorage.setItem("IsBorneAtCashierDefault", $rootScope.borneAtCashier ? $rootScope.borneAtCashier.toString() : false);
            window.localStorage.setItem("IsBorneEasyTransacDefault", $rootScope.borneEasyTransac ? $rootScope.borneEasyTransac.toString() : false);
            window.localStorage.setItem("IsBorneBalanceDefault", $rootScope.borneBalance ? $rootScope.borneBalance.toString() : false);
            window.localStorage.setItem("IsBorneConsignorDefault", $rootScope.borneConsignor ? $rootScope.borneConsignor.toString() : false);
            window.localStorage.setItem("IsBorneCBDefault", $rootScope.borneCB ? $rootScope.borneCB.toString() : false);
            window.localStorage.setItem("IsBorneEspeceDefault", $rootScope.borneEspece ? $rootScope.borneEspece.toString() : false);

            window.localStorage.setItem("IsBorneForHereDefault", $rootScope.borneForHere ? $rootScope.borneForHere.toString() : false);

            window.localStorage.setItem("IsBorneForHereCollectionDefault", $rootScope.borneForHere && $rootScope.borneForHereCollection ? $rootScope.borneForHereCollection.toString() : false);

            if (!$rootScope.borneForHere) {
                $rootScope.borneForHereCollection = false;
            }

            window.localStorage.setItem("IsBorneTakeawayDefault", $rootScope.borneTakeaway ? $rootScope.borneTakeaway.toString() : false);

            window.localStorage.setItem("IsBorneTakeawayCollectionDefault", $rootScope.borneTakeaway && $rootScope.borneTakeawayCollection ? $rootScope.borneTakeawayCollection.toString() : false);

            if (!$rootScope.borneTakeaway) {
                $rootScope.borneTakeawayCollection = false;
            }

            // En mode borne, on n'utilise pas les preset
            delete $rootScope.UserPreset;
        } else {
            // Flag lié à la caisse
            if ($scope.selectedPresetID) {
                window.localStorage.setItem("selectedPresetID", $scope.selectedPresetID);
            }

            $rootScope.paymentTypesConfig = {
                [PaymentType.ESPECE] : true,
                [PaymentType.CB] : true,
                [PaymentType.CHEQUE] : true,
                [PaymentType.TICKETRESTAURANT] : true,
                [PaymentType.AVOIR] : true,
                [PaymentType.ENCOMPTE] : true,
                [PaymentType.LYFPAY] : true,
                [PaymentType.CBTICKETRESTAURANT] : true,
            }
        }

        $location.path("/loading");
    };

    //Retrieve a configuration with a barcode - The barcode contains the address of a data index
    const decryptBarcode = (value) => {
        let plain = "";

        try {
            plain = Aes.Ctr.decrypt(value, "IziPassIziPos", 256);
        } catch (err) {
            console.error(err);
        }

        return plain;
    };

    $scope.configIndex = () => {
        swal({
            title: "Attention",
            text: "Si vous continuez, l'application ne fonctionnera plus avec l'izibox.\r\nEtes-vous sûr ?",
            buttons: [$translate.instant("Non"), $translate.instant("Oui")]
        }).then((confirm) => {
            if (confirm) {
                let barcode = undefined;

                try {
                    cordova.plugins.barcodeScanner.scan(
                        (result) => {
                            barcode = decryptBarcode(result.text);
                            self.updateConfig(barcode);
                        },
                        (error) => {
                            console.log(error);
                        }
                    );
                } catch (err) {
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalConfigReader.html',
                        controller: 'ModalBarcodeReaderController',
                        backdrop: 'static'
                    });

                    modalInstance.result.then((value) => {
                        barcode = decryptBarcode(value);
                        self.updateConfig(barcode);
                    }, (err) => {
                        console.log(err);
                    });
                }
            }
        });
    };

    this.updateConfig = (index) => {
        // TODO: The setup could be elsewhere - remove this address
        let configApiUrl = "http://iot.izipass.cloud:5984/iziboxsetup/" + index;

        $http.get(configApiUrl, {
            timeout: 10000
        }).success((data, status, headers, config) => {
            $rootScope.IziBoxConfiguration = data;
            if (data) {
                $rootScope.APIBaseURL = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort;
            }
            if ($rootScope.borne) {
                $rootScope.IziBoxConfiguration.LoginRequired = false;
                if ($rootScope.IziBoxConfiguration.StoreBorneId) {
                    $rootScope.IziBoxConfiguration.defaultStoreId = $rootScope.IziBoxConfiguration.StoreId;
                    console.log("StoreId changed : " + $rootScope.IziBoxConfiguration.StoreId + " => " + $rootScope.IziBoxConfiguration.StoreBorneId);
                    $rootScope.IziBoxConfiguration.StoreId = $rootScope.IziBoxConfiguration.StoreBorneId;
                }
            }

            data.WithoutIzibox = true;
            data.UseProdPrinter = false;
            data.POSPrinterCount = 0;

            for (let prop in data) {
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
        }).error((data, status, headers, config) => {
            swal({
                title: "Index introuvable !"
            });
            $scope.init();
        });
    };
});