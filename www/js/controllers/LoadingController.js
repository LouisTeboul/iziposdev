app.config(function ($stateProvider) {
	$stateProvider
        .state('loading', {
        	url: '/loading',
        	templateUrl: 'views/loading.html'
        })
})


app.controller('LoadingController', function ($scope, $rootScope, $location, $timeout, $q, updateService, zposService, settingService) {

	$rootScope.$on('dbDatasReplicate', function (event, args) {
		if (args.status == "Change") {
			//console.log(args);

			$scope.$apply(function () {
				if (args && args.remoteInfo && args.last_seq && args.remoteInfo.update_seq && args.remoteInfo.update_seq > 0) {
					var percent = Math.round((args.last_seq * 100) / args.remoteInfo.update_seq);
					if (percent > 100) percent = 100;
					$scope.percentProgress = percent;
				}

				$scope.loading = true;
			});
		} else {
			//TODO ?
			//console.log("Loading : Status => "+args.status);
			////pouchDb Complete Or error
			//$rootScope.$apply(function () {
			//    if ($rootScope.modelDb.databaseReady && !$rootScope.loaded) {
			//        $rootScope.loaded = true;
			//        console.log("Loading : Event db ready");
			//        checkUpdate();
			//     }
			//});
		}
	});


	$rootScope.$on('dbFreezeChange', function (event, args) {
		$scope.$apply(function () {
			if (args && args.remoteInfo && args.last_seq && args.remoteInfo.update_seq && args.remoteInfo.update_seq > 0) {
				var percent = Math.round((args.last_seq * 100) / args.remoteInfo.update_seq);
				if (percent > 100) percent = 100;
				$scope.freezeProgress = percent;
			}

			$scope.freezeLoading = true;
		});
	});

	$rootScope.$on('dbReplicChange', function (event, args) {
		$scope.$apply(function () {
			if (args && args.remoteInfo && args.last_seq && args.remoteInfo.update_seq && args.remoteInfo.update_seq > 0) {
				var percent = Math.round((args.last_seq * 100) / args.remoteInfo.update_seq);
				if (percent > 100) percent = 100;
				$scope.replicProgress = percent;
			}

			$scope.replicLoading = true;
		});
	});

	$rootScope.$on('dbOrderChange', function (event, args) {
		$scope.$apply(function () {
			if (args && args.remoteInfo && args.last_seq && args.remoteInfo.update_seq && args.remoteInfo.update_seq > 0) {
				var percent = Math.round((args.last_seq * 100) / args.remoteInfo.update_seq);
				if (percent > 100) percent = 100;
				$scope.orderProgress = percent;
			}

			$scope.orderLoading = true;
		});
	});

	$rootScope.$on('dbZposChange', function (event, args) {
		$scope.$apply(function () {
			if (args && args.remoteInfo && args.last_seq && args.remoteInfo.update_seq && args.remoteInfo.update_seq > 0) {
				var percent = Math.round((args.last_seq * 100) / args.remoteInfo.update_seq);
				if (percent > 100) percent = 100;
				$scope.zposPurgeProgress = percent;
			}

			$scope.zposPurge = true;
		});
	});

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

			zposService.getPaymentValuesAsync();
			checkUpdate();

			//zposService.purgeZPosAsync().then(function () {
			//    zposService.getPaymentValuesAsync();
			//    checkUpdate();
			//});
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
		}
	}


	$scope.init = function () {
		//CouchDb
		app.configPouchDb($rootScope, $q, zposService);

		$scope.loading = false;
		$scope.percentProgress = 0;
		$scope.downloading = false;
		$scope.downloadProgress = 0;

		if ($rootScope.modelDb && $rootScope.modelDb.databaseReady) {
			$rootScope.loaded = true;
			console.log("Loading : init db ready");
			next();
		}
	};

	var next = function () {
		console.log("Loading complete");
		var nextLocation = function () {
			$location.path("/catalog");
		}

		if (!$rootScope.IziPosConfiguration) {
			$rootScope.IziPosConfiguration = {};
		}
		
		//Loading currency
		settingService.getCurrencyAsync().then(function (currency) {

			if (currency) {
				$rootScope.IziPosConfiguration.Currency = currency;
			} else {
				$rootScope.IziPosConfiguration.Currency = { DisplayLocale: "fr-FR", CurrencyCode: "EUR" };
			}

			nextLocation();			
		}, function (err) {
			$rootScope.IziPosConfiguration.Currency = { DisplayLocale: "fr-FR", CurrencyCode: "EUR" };
			nextLocation();
		})

		
	}

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

		});
	}

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
	}

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