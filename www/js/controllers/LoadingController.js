app.config(function ($stateProvider) {
    $stateProvider.state('loading', {
        url: '/loading',
        templateUrl: 'views/loading.html'
    });
});

//For displaying the progress bar of data loading from couchdb
//Plugged to the data loading event
app.controller('LoadingController', function ($scope, $rootScope, $q, $http, $injector, $mdMedia, zposService, settingService, posService, stockService, borneService, orderService, posLogService, repositoryLoaderService) {

    $scope.mdMedia = $mdMedia;
    let currencyReady = false;


    let dbReplicateHandler = $rootScope.$on('dbDatasReplicate', (event, args) => {
        if (args.status === "Change") {
            $scope.$apply(() => {
                $scope.percentProgress = args.percent;
                $scope.loading = true;
                if ($scope.gauges) {
                    $scope.gauges.loading.set($scope.percentProgress);
                }
            });
        }
    });

    let dbOrderHandler = $rootScope.$on('dbOrderChange', (event, args) => {
        $scope.$apply(() => {
            $scope.orderProgress = GetPercentage(args);
            $scope.orderLoading = true;
            $scope.gauges.orderloading.set($scope.orderProgress);
        });
    });


    //Calculate the progression percentile
    const GetPercentage = (changeData) => {
        //update_seq & last_seq were simple number in the couchdb 1.6.0
        if (changeData.remoteInfo && changeData.last_seq && changeData.remoteInfo.update_seq) {
            let changeDataSeq = changeData.remoteInfo.update_seq;
            if (isNaN(changeDataSeq)) {
                changeDataSeq = Number(changeData.remoteInfo.update_seq.split("-")[0]);
                if (changeDataSeq <= 0) changeDataSeq = 1;
            }

            let lastDataSeq = changeData.last_seq;
            if (isNaN(lastDataSeq)) {
                lastDataSeq = Number(changeData.last_seq.split("-")[0]);
                if (lastDataSeq <= 0) lastDataSeq = 1;
            }

            let percent = Math.round((lastDataSeq * 100) / changeDataSeq);
            if (percent > 100) {
                percent = 100;
            }
            return percent;
        } else {
            return 0;
        }
    };


    let configReplicationReadyHandler = $rootScope.$watch("modelDb.configReplicationReady", () => {
        checkDbReady();
    });

    let dataReadyHandler = $rootScope.$watch("modelDb.dataReady", () => {
        checkDbReady();
    });

    let zposReadyHandler = $rootScope.$watch("modelDb.zposReady", () => {
        checkDbReady();
    });

    let stockReadyHandler = $rootScope.$watch("modelDb.stockReady", () => {
        checkDbReady();
    });


    let orderReadyHandler = $rootScope.$watch("modelDb.orderReady", () => {
        checkDbReady();
    });
    let storesReadyHandler = $rootScope.$watch("modelDb.storesReady", () => {
        checkDbReady();
    });


    let databaseReadyHandler = $rootScope.$watch("modelDb.databaseReady", () => {
        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady && !$rootScope.loaded) {
            $rootScope.loaded = true;
            console.log("Loading : Event db ready");
            posService.getPosNameAsync($rootScope.modelPos.hardwareId).then((alias) => {
                $rootScope.modelPos.aliasCaisse = alias;
            }).catch((err) => {
                console.error(err);
            });
            // TODO ? zposService.getPaymentValuesAsync();
            //checkUpdate();
        }
    });

    $scope.$on("$destroy", () => {
        if (configReplicationReadyHandler) {
            configReplicationReadyHandler();
        }
        if (dataReadyHandler) {
            dataReadyHandler();
        }
        if (zposReadyHandler) {
            zposReadyHandler();
        }
        if (stockReadyHandler) {
            stockReadyHandler();
        }
        if (orderReadyHandler) {
            orderReadyHandler();
        }
        if (storesReadyHandler) {
            storesReadyHandler();
        }
        if (databaseReadyHandler) {
            databaseReadyHandler();
        }

        if (dbReplicateHandler) {
            dbReplicateHandler();
        }
        if (dbOrderHandler) {
            dbOrderHandler();
        }
    });


    var checkDbReady = () => {
        if ($rootScope.modelDb &&
            $rootScope.modelDb.configReplicationReady &&
            $rootScope.modelDb.dataReady &&
            $rootScope.modelDb.zposReady &&
            $rootScope.modelDb.stockReady &&
            $rootScope.modelDb.orderReady &&
            $rootScope.modelDb.storesReady) {

            if (!$rootScope.modelDb.databaseReady) {
                $rootScope.modelDb.databaseReady = true;
                next();
            }
        } else {

            // DEBUG

            // console.log("---");
            // console.log("modelDb : " + $rootScope.modelDb);
            // if($rootScope.modelDb) {

            //     console.log("configReplicationReady : " + $rootScope.modelDb.configReplicationReady);

            //     console.log("dataReady : " + $rootScope.modelDb.dataReady);

            //     console.log("zposReady : " + $rootScope.modelDb.zposReady);

            //     console.log("stockReady : " + $rootScope.modelDb.stockReady);

            //     console.log("orderReady : " + $rootScope.modelDb.orderReady);

            //     console.log("storesReady : " + $rootScope.modelDb.storesReady);
            // }
        }
    };

    $scope.init = () => {
        if (window.iziBoxSetup) {
            window.iziBoxSetup.init(JSON.stringify($rootScope.IziBoxConfiguration));
        }
        // On tente d'init le TPA seulement en mode borne et si le paiement CB est actif
        if ($rootScope.borne && $rootScope.borneCB) {
            $rootScope.IziBoxConfiguration.LoginRequired = false;

            // Init le TPA si on est en mode borne
            if (window.tpaPayment && $rootScope.borne) {

                $rootScope.tpaInitialized = false;

                const initTpaPromise = new Promise((resolve, reject) => {
                    window.tpaPayment.initValina(resolve, reject);
                });

                initTpaPromise.then((res) => {
                    console.log(res);
                    $rootScope.tpaInitialized = true;
                }, (err) => {
                    throw err;
                });
            }
        }
        //CouchDb
        app.configPouchDb($rootScope, $q, $http, zposService, posService, repositoryLoaderService);

        $scope.loading = false;
        $scope.percentProgress = 0;
        $scope.downloading = false;
        $scope.downloadProgress = 0;

        setTimeout(() => {
            initGauges();
        }, 100);

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            $rootScope.loaded = true;
            console.log("Loading : init db ready");
            next();
        }
    };

    const initGauges = () => {
        $scope.gauges = {};

        let opts = {
            angle: 0.5, // The span of the gauge arc
            lineWidth: 0.07, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.6, // // Relative to gauge radius
                strokeWidth: 0.035, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false, // If false, max value increases automatically if value > maxValue
            limitMin: false, // If true, the min value of the gauge will be fixed
            colorStart: '#d83448', // Colors
            colorStop: '#d83448', // just experiment with them
            strokeColor: '#EEEEEE', // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true // High resolution support
        };

        const createGauge = (gaugeName) => {
            let target = document.getElementById('gauge' + gaugeName); // your canvas element
            let gaugeValue = document.getElementById('gauge' + gaugeName + 'Value');
            let gauge = new Donut(target).setOptions(opts); // create sexy gauge!
            gauge.setTextField(gaugeValue);
            gauge.maxValue = 100; // set max gauge value
            gauge.setMinValue(0); // Prefer setter over gauge.minValue = 0
            gauge.animationSpeed = 20; // set animation speed (32 is default value)
            gauge.set(0); // set actual value
            return gauge;
        };

        $scope.gauges.loading = createGauge('Loading');
        $scope.gauges.orderloading = createGauge('OrderLoading');
    };

    const next = () => {
        $scope.gauges.loading.set(100);
        $scope.gauges.orderloading.set(100);

        // Initializing empty iziposconfiguration
        if (!$rootScope.IziPosConfiguration) {
            $rootScope.IziPosConfiguration = {};
        }
        let styleLink = document.createElement("link");
       

        if ($rootScope.borne) {
            if ($rootScope.borneVertical) {      

                styleLink.href = "css/styleBorne.css";

            } else {

                styleLink.href = "css/styleBorneH.css";

            }
        } else {
            styleLink.href = "css/stylePOS.css";
        }
        styleLink.setAttribute('rel', 'stylesheet');
        styleLink.setAttribute('type', 'text/css');

        document.head.appendChild(styleLink);

        stockService.initStock();

        orderService.init();

        posLogService.updatePosLogAsync().then((posLog) => {
            $rootScope.PosLog = posLog;
        }).catch((err) => {
            console.error(err);
        }).then(() => {
            // Loading currency
            settingService.getCurrencyAsync().then((currency) => {
                if (currency) {
                    $rootScope.IziPosConfiguration.Currency = currency;
                } else {
                    $rootScope.IziPosConfiguration.Currency = {
                        DisplayLocale: "fr-FR",
                        CurrencyCode: "EUR"
                    }; // Default currency

                }
                currencyReady = true;
                $rootScope.init = true;
                initServices($rootScope, $injector);
                setTimeout(() => {
                    borneService.redirectToHome();
                }, 100);

            }, (err) => {
                $rootScope.IziPosConfiguration.Currency = {
                    DisplayLocale: "fr-FR",
                    CurrencyCode: "EUR"
                };
                currencyReady = true;
                $rootScope.init = true;
                initServices($rootScope, $injector);
                setTimeout(() => {
                    borneService.redirectToHome();
                }, 100);
            });
        });
    };
});