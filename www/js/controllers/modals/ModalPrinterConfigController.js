app.controller('ModalPrinterConfigController', function ($scope, $rootScope, $uibModalInstance, $http, $mdMedia, printService, currentConfig) {
    $scope.showAdditionalOptions = false;
    $scope.mdMedia = $mdMedia;

    $scope.init = function () {
        if (currentConfig) {
            $scope.printerConfig = currentConfig;
            if ($rootScope.PrinterConfiguration.ProdPrinter) {
                // On check si l'IP du prod printer est dans la config
                if ($scope.printerConfig.Printers && !$scope.printerConfig.Printers.some(p => p.IPaddress == $rootScope.PrinterConfiguration.ProdPrinter)) {
                    $rootScope.PrinterConfiguration.ProdPrinter = $scope.printerConfig.Printers[0].IPaddress;
                }
            } else {
                if ($scope.printerConfig.Printers && $scope.printerConfig.Printers.length > 0) {
                    $rootScope.PrinterConfiguration.ProdPrinter = $scope.printerConfig.Printers[0].IPaddress;
                }
            }

            if ($rootScope.PrinterConfiguration.POSPrinter) {
                // On check si l'IP du prod printer est dans la config
                if ($scope.printerConfig.Printers && !$scope.printerConfig.Printers.some(p => p.IPaddress == $rootScope.PrinterConfiguration.POSPrinter)) {
                    $rootScope.PrinterConfiguration.POSPrinter = $scope.printerConfig.Printers[0].IPaddress;
                }
            } else {
                if ($scope.printerConfig.Printers && $scope.printerConfig.Printers.length > 0) {
                    $rootScope.PrinterConfiguration.POSPrinter = $scope.printerConfig.Printers[0].IPaddress;
                }
            }
        } else {
            $scope.printerConfig = {
                Printers: [],
                AnnouncementTicketsEnabled: false,
                PrintDoubleSize: false
            };
        }

        let addApiUrl = $rootScope.APIBaseURL + "/getprinterroles/";
        let defaultRole = { Id: 0, Name: "DEFAULT" };
        let allRole = { Id: 999, Name: "ALL" };

        $scope.printerConfig.PrinterRoles = [defaultRole, allRole];

        $http.get(addApiUrl, { timeout: 30000 }).then((ret) => {
            if (ret.data) {
                ret.data = ret.data.map(pr => {
                    if (pr.SeparateItems) {
                        pr.Name += " ✂️";
                    }
                    return pr;
                });

                $scope.printerConfig.PrinterRoles.push(...ret.data);
            }
        }, (err) => {
            console.error(err);
        });

        // $scope.allRoles = [
        //     "DEFAULT", // Role tjr présent
        //     "ALL", // Role tjr présent
        //     "Chaud",
        //     "Froid",
        //     "Bar"
        // ];

        $scope.printerAddError = null;
    };

    $scope.testPrinter = (printer) => {
        printService.testPrinterAsync(printer.IPaddress).then(function (res) {
            printer.IsUp = true;
            swal({ title: "Printer ok !" });
        }, (err) => {
            printer.IsUp = false;
            swal({ title: "Printer error !" });
        });
    };

    $scope.testBornePrinter = () => {
        if ($rootScope.borne) {
            printService.testPrinterAsync($rootScope.modelPos.localIp).then((res) => {
                swal({ title: "Printer ok !" });
            }, (err) => {
                swal({ title: "Printer error !" });
            });
        }
    };

    $scope.setLineFeed = function (printer, nb) {
        printer.LineFeed = nb;
    };

    $scope.removePrinter = function (printer) {
        let removeApiUrl = $rootScope.APIBaseURL + "/removeprinter/";
        $http.post(removeApiUrl, { ipAddress: printer.IPaddress }, { timeout: 30000 }).then((ret) => {
            $scope.printerConfig.Printers = $scope.printerConfig.Printers.filter(function (item) {
                return item.IPaddress !== printer.IPaddress
            });

            //Reaffecte PosPrinter et ProdPrinter si necessaire
            if ($rootScope.PrinterConfiguration.POSPrinter) {
                let exists = $scope.printerConfig.Printers.find(p => p.IPaddress === $rootScope.PrinterConfiguration.POSPrinter);

                if (!exists) {
                    $rootScope.PrinterConfiguration.POSPrinter = $scope.printerConfig.Printers[0].IPaddress;
                }
            }

            if ($rootScope.PrinterConfiguration.ProdPrinter) {
                let exists = $scope.printerConfig.Printers.find(p => p.IPaddress === $rootScope.PrinterConfiguration.ProdPrinter);

                if (!exists) {
                    $rootScope.PrinterConfiguration.ProdPrinter = $scope.printerConfig.Printers[0].IPaddress;
                }
            }
        }, (err) => {
            console.error(err);
        })
    };

    $scope.addPrinter = function () {
        $scope.printerAddError = null;
        // Appelle une API registerNewPrinter, qui permet de check si un printer existe, puis de l'ajouter à la config
        let addApiUrl = $rootScope.APIBaseURL + "/addprinter/";
        $http.post(addApiUrl, { ipAddress: $scope.newPrinterIp }, { timeout: 30000 }).then((ret) => {
            console.log(ret);
            updateConfig(ret.data);
        }, (err) => {
            console.error(err);
            if (err.data) {
                $scope.printerAddError = err.data.Result;
            }
        })
    };

    const updateConfig = (newConfig) => {
        // $scope.printerConfig.AnnouncementTicketsEnabled = newConfig.AnnouncementTicketsEnabled;
        // $scope.printerConfig.PrintDoubleSize = newConfig.PrintDoubleSize;
        let LANPrinters = newConfig.Printers;

        // Si on a déjà une config
        if ($scope.printerConfig && $scope.printerConfig.Printers && $scope.printerConfig.Printers.length > 0 && LANPrinters && LANPrinters.length > 0) {
            for (let i = $scope.printerConfig.length - 1; i >= 0; i--) {
                let printer = $scope.printerConfig[i];
                let match = LANPrinters.find(p => p.IPAddress === printer.IPAddress);
                if (match) {
                    // Si match, on met a jour les champs de l'imprimante
                    // = Son port d'impression
                    printer.PrintPort = match.PrintPort;
                } else {
                    // Si pas de match, ca veut dire que l'imprimante est offline
                    // On la supprime de la liste ?
                    $scope.printerConfig.splice(i, 1);
                }
            }
        }

        if (LANPrinters) {
            for (let lp of LANPrinters) {
                let match = false;
                if ($scope.printerConfig && $scope.printerConfig.Printers) {
                    match = $scope.printerConfig.Printers.find(p => p.IPaddress === lp.IPaddress);
                } else {
                    $scope.printerConfig.Printers = [];
                }
                if (!match) {
                    lp.IsUp = true;
                    $scope.printerConfig.Printers.push(lp);
                } else {
                    match.IsUp = false;
                }
            }
        }
    };

    const addPrinterToConfig = (newPrinter) => {
        let match = null;
        if ($scope.printerConfig && $scope.printerConfig.Printers) {
            match = $scope.printerConfig.Printers.find(p => p.IPaddress === newPrinter.IPaddress);
        } else {
            $scope.printerConfig.Printers = [];
        }
        if (!match) {
            newPrinter.IsUp = true;
            $scope.printerConfig.Printers.push(newPrinter);
        } else {
            match.IsUp = true;
        }
        $scope.$apply();
    };

    const discoverPrinterAsync = () => {
        $scope.waitingForScan = true;
        const urlDatasApi = $rootScope.APIBaseURL + "/discoverprintersstream";

        let source = new EventSource(urlDatasApi);

        source.onmessage = (event) => {            
            try {
                const printerDevice = JSON.parse(event.data);
                console.log('Found Printer : ' + event.data);
                addPrinterToConfig(printerDevice);
            } catch (e) {
                console.error("Discover printer : Invalid json");
            }

        };

        source.onopen = () => {
            console.log('onopen discoverprintersstream');
        };

        source.onerror = (err) => {
            $scope.waitingForScan = false;
            console.log('onerror discoverprintersstream');
            source.close();
            $scope.$apply();
        };
    };

    $scope.setCountPrinterProd = function (nb) {
        $rootScope.PrinterConfiguration.ProdPrinterCount = nb;
    };

    $scope.scanNetwork = function () {
        // Appelle l'APi discover network, et update la config courante avec le resultat

        // Recupere les printers de maniere asynchrone (au fur et à mesure que la box scan)
        discoverPrinterAsync();

        //// Permet de recuperer tout les printers du réseau de maniere synchrone
        // let discoverApiUrl = $rootScope.APIBaseURL + "/discoverprinters/";
        // $http.get(discoverApiUrl, {timeout: 30000}).then((ret) => {
        //     // On aggrege la reponse avec la config courante
        //     $scope.waitingForScan = false;
        //     updateConfig(ret.data);
        //
        //     console.log(ret);
        // }, (err) => {
        //     $scope.waitingForScan = false;
        //     console.error(err);
        // });
    };

    $scope.toggleAdditionalOptions = function () {
        $scope.showAdditionalOptions = !$scope.showAdditionalOptions;
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };

    $scope.ok = function () {
        $uibModalInstance.close($scope.printerConfig);
    }
});