app.config(function ($stateProvider) {
    $stateProvider
        .state('loading', {
            url: '/loading',
            templateUrl: 'views/loading.html'
        })
});

/**
 * For displaying the progress bar of data loading from couchdb
 * Plugged to the data loading event
 */
app.controller('LoadingController', function ($scope, $rootScope, $location, $timeout, $q, $injector, updateService, zposService, settingService, posService) {

    // What's the difference with dbReplic below
    $rootScope.$on('dbDatasReplicate', function (event, args) {
        if (args.status == "Change") {
            $scope.$apply(function () {
                $scope.percentProgress = GetPercentage(args);
                $scope.loading = true;
                $scope.gauges.loading.set($scope.percentProgress);
            });
        }
    });

    $rootScope.$on('dbFreezeChange', function (event, args) {
        $scope.$apply(function () {
            $scope.freezeProgress = GetPercentage(args);
            $scope.freezeLoading = true;
            $scope.gauges.freezeloading.set($scope.freezeProgress);
        });
    });

    $rootScope.$on('dbReplicChange', function (event, args) {
        $scope.$apply(function () {
            $scope.replicProgress = GetPercentage(args);
            $scope.replicLoading = true;
            $scope.gauges.replicloading.set($scope.replicProgress);
        });
    });

    $rootScope.$on('dbOrderChange', function (event, args) {
        $scope.$apply(function () {
            $scope.orderProgress = GetPercentage(args);
            $scope.orderLoading = true;
            $scope.gauges.orderloading.set($scope.orderProgress);
        });
    });

    $rootScope.$on('dbZposChange', function (event, args) {
        $scope.$apply(function () {
            $scope.zposPurgeProgress = GetPercentage(args);
            $scope.zposPurge = true;
        });
    });

    // @deprecated
    $rootScope.$on('dbZposPurge', function (event, args) {
        $scope.$apply(function () {
            if (args && args.value && args.max && args.max > 0) {
                var percent = Math.round((args.value * 100) / args.max);
                if (percent > 100) percent = 100;
                $scope.zposPurgeProgress = percent;
            }

            $scope.zposPurge = true;
        });
    });

	/*
	* Calculate the progression percentile
	*/
    var GetPercentage = function (changeData) {
        //  update_seq & last_seq were simple number in the couchdb 1.6.0
        if (changeData.remoteInfo && changeData.last_seq && changeData.remoteInfo.update_seq) {
            var changeDataSeq = changeData.remoteInfo.update_seq;
            if (isNaN(changeDataSeq)) {
                changeDataSeq = Number(changeData.remoteInfo.update_seq.split("-")[0]);
                if (changeDataSeq <= 0) changeDataSeq = 1;
            }

            var lastDataSeq = changeData.last_seq;
            if (isNaN(lastDataSeq)) {
                lastDataSeq = Number(changeData.last_seq.split("-")[0]);
                if (lastDataSeq <= 0) lastDataSeq = 1;
            }

            var percent = Math.round((lastDataSeq * 100) / changeDataSeq);
            if (percent > 100) percent = 100;
            return percent;

        }
        else {
            return 0;
        }
    };

    var dataReadyHandler = $rootScope.$watch("modelDb.dataReady", function () {
        checkDbReady();
    });
    var replicateReadyHandler = $rootScope.$watch("modelDb.replicateReady", function () {
        checkDbReady();
    });
    var zposReadyHandler = $rootScope.$watch("modelDb.zposReady", function () {
        checkDbReady();
    });
    var freezeReadyHandler = $rootScope.$watch("modelDb.freezeReady", function () {
        checkDbReady();
    });
    var orderReadyHandler = $rootScope.$watch("modelDb.orderReady", function () {
        checkDbReady();
    });
    var configReplicationReadyHandler = $rootScope.$watch("modelDb.configReplicationReady", function () {
        checkDbReady();
    });

    var databaseReadyHandler = $rootScope.$watch("modelDb.databaseReady", function () {
        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady && !$rootScope.loaded) {
            $rootScope.loaded = true;
            console.log("Loading : Event db ready");
            posService.getPosNameAsync($rootScope.modelPos.hardwareId).then(function (alias) {
                $rootScope.modelPos.aliasCaisse = alias;
            }).catch(function (err) {
                console.log(err)
            });

            //TODO ? zposService.getPaymentValuesAsync();
            checkUpdate();
        }
    });

    $scope.$on("$destroy", function () {
        if (dataReadyHandler) dataReadyHandler();
        if (replicateReadyHandler) replicateReadyHandler();
        if (zposReadyHandler) zposReadyHandler();
        if (freezeReadyHandler) freezeReadyHandler();
        if (orderReadyHandler) orderReadyHandler();
        if (databaseReadyHandler) databaseReadyHandler();
        if (configReplicationReadyHandler) configReplicationReadyHandler();
    });


    var checkDbReady = function () {
        if ($rootScope.modelDb &&
            $rootScope.modelDb.configReplicationReady &&
            $rootScope.modelDb.dataReady &&
            $rootScope.modelDb.freezeReady &&
            $rootScope.modelDb.zposReady &&
            $rootScope.modelDb.replicateReady &
            $rootScope.modelDb.orderReady) {

            $rootScope.modelDb.databaseReady = true;
            $rootScope.$evalAsync();

            initServices($rootScope, $injector);
        }
    };


    $scope.init = function () {
        //CouchDb
        app.configPouchDb($rootScope, $q, zposService, posService);

        $scope.loading = false;
        $scope.percentProgress = 0;
        $scope.downloading = false;
        $scope.downloadProgress = 0;

        initGauges();

        if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
            $rootScope.loaded = true;
            console.log("Loading : init db ready");
            next();
        }
    };
<<<<<<< HEAD

    var initGauges = function () {
        $scope.gauges = {};

        var opts = {
            angle: 0.5, // The span of the gauge arc
            lineWidth: 0.07, // The line thickness
            radiusScale: 1, // Relative radius
            pointer: {
                length: 0.6, // // Relative to gauge radius
                strokeWidth: 0.035, // The thickness
                color: '#000000' // Fill color
            },
            limitMax: false,     // If false, max value increases automatically if value > maxValue
            limitMin: false,     // If true, the min value of the gauge will be fixed
            colorStart: '#d83448',   // Colors
            colorStop: '#d83448',    // just experiment with them
            strokeColor: '#EEEEEE',  // to see which ones work best for you
            generateGradient: true,
            highDpiSupport: true,     // High resolution support
        };

        var createGauge = function (gaugeName) {
            var target = document.getElementById('gauge' + gaugeName); // your canvas element
            var gaugeValue = document.getElementById('gauge' + gaugeName + 'Value');
            var gauge = new Donut(target).setOptions(opts); // create sexy gauge!
            gauge.setTextField(gaugeValue);
            gauge.maxValue = 100; // set max gauge value
            gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
            gauge.animationSpeed = 20; // set animation speed (32 is default value)
            gauge.set(0); // set actual value
            return gauge;
        };

        $scope.gauges.loading = createGauge('Loading');
        $scope.gauges.freezeloading = createGauge('FreezeLoading');
        $scope.gauges.replicloading = createGauge('ReplicLoading');
        $scope.gauges.orderloading = createGauge('OrderLoading');
    };

=======
    
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
    var next = function () {
        // console.log("Loading complete");
        var nextLocation = function () {
            $scope.gauges.loading.set(100);
            $scope.gauges.freezeloading.set(100);
            $scope.gauges.replicloading.set(100);
            $scope.gauges.orderloading.set(100);

            setTimeout(function () {
                $location.path("/catalog");
            }, 500);
        };

        // Initializing empty iziposconfiguration
        if (!$rootScope.IziPosConfiguration) {
            $rootScope.IziPosConfiguration = {};
        }

        // Loading currency
        settingService.getCurrencyAsync().then(function (currency) {
            if (currency) {
                $rootScope.IziPosConfiguration.Currency = currency;
            } else {
                $rootScope.IziPosConfiguration.Currency = { DisplayLocale: "fr-FR", CurrencyCode: "EUR" }; // Default currency 
            }
            nextLocation();
        }, function (err) {
            $rootScope.IziPosConfiguration.Currency = { DisplayLocale: "fr-FR", CurrencyCode: "EUR" };
            nextLocation();
        })
    };

	/**
	 * Check the availability of new app version
	 **/
    var checkUpdate = function () {
        updateService.getUpdateAsync().then(function (update) {
            if (update) {
                if (update.Version != $rootScope.Version) {
                    sweetAlert({ title: "New update : " + update.Version }, function () {

                        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                            downloadUpdate(update.Url);
                        } else {
                            next();
                        }
                    });
                } else {
                    next();
                }
            } else {
                next();
            }
        }, function (err) {
            console.log(err);

        });
    };

	/**
	 * Updates the application - android only
	 **/
    var downloadUpdate = function (apkUrl) {
        window.resolveLocalFileSystemURL(cordova.file.externalCacheDirectory, function (fileSystem) {
            var fileApk = "izipos.apk";
            fileSystem.getFile(fileApk, {
                create: true
            }, function (fileEntry) {
                $scope.downloading = true;
                $scope.$digest();

                var localPath = fileEntry.nativeURL.replace("file://", "");
                var fileTransfer = new FileTransfer();
                fileTransfer.onprogress = function (progressEvent) {
                    if (progressEvent.lengthComputable) {
                        var percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        $scope.downloadProgress = percent;
                        $scope.$digest();
                    } else {

                    }
                };
                fileTransfer.download(apkUrl, localPath, function (entry) {
                    console.log(entry);
                    installUpdate(entry);
                }, function (error) {

                    sweetAlert({ title: "Error downloading APK: " + error.exception }, function () {
                        next();
                    });
                });
            }, function (evt) {
                sweetAlert({ title: "Error downloading APK: " + evt.target.error.exception }, function () {
                    next();
                });
            });
        }, function (evt) {
            sweetAlert({ title: "Error downloading APK: " + evt.target.error.exception }, function () {
                next();
            });
        });
    };

    /**
	 * Updates the application
     * @param entry
     */
    var installUpdate = function (entry) {
        window.plugins.webintent.startActivity({
            action: window.plugins.webintent.ACTION_VIEW,
            url: entry.nativeURL,
            type: 'application/vnd.android.package-archive'
        },
            function () { navigator.app.exitApp(); },
            function (e) {
                $rootScope.hideLoading();

                sweetAlert({ title: 'Error launching app update' }, function () {
                    next();
                });
            }
        );
    }
});