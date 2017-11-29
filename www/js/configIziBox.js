var config = undefined;
var defaultConfig = undefined;

/**
 * Retrieve the configuration parameters
 * TODO: In case there is no network alert the user
 * @param $rootScope
 * @param $q
 * @param $http
 * @param ipService
 * @param $translate
 * @param $location
 * @param $uibModal
 */
app.getConfigIziBoxAsync = function ($rootScope, $q, $http, ipService, $translate, $location, $uibModal) {
	var configDefer = $q.defer();

	// Look for configuration in cache
	var configJSON = window.localStorage.getItem("IziBoxConfiguration");
	var existingConfig = false;

	if (!configJSON) {
		defaultConfig = {
			UrlSmartStoreApi: undefined,
			UrlCouchDb: undefined,
			IdxCouchDb: undefined,
			RestPort: 8080,
			LocalIpIziBox: undefined,
			UseFID: false,
			ConfirmPrint: false,
			CanFreezeShoppingCart: false,
			UseProdPrinter: false,
			UseTable: false,
			StoreId: undefined,
			UseCashMovement: false,
			LoginRequired: false,
			LoginTimeout: 0
		};
	} else {
		defaultConfig = JSON.parse(configJSON);
		existingConfig = true;
	}

	if (/*!defaultConfig.WithoutIzibox*/true) {
		defaultConfig.deleteCouchDb = false;

		try {
			//on force le mode "standard"
			throw "Not UDP";

		} catch (err) {
			var ips = [];

			ipService.getLocalIpAsync().then(function (ip) {
				if (ip.local) {

					// First add last finded izibox ip
					if (defaultConfig.LocalIpIziBox) {
						ips.push(defaultConfig.LocalIpIziBox);
					}

					// Get last part of ip
					var ipBody = ip.local.substring(0, Enumerable.from(ip.local).lastIndexOf(".") + 1);
					for (var i = 1; i < 255; i++) {
						var newIp = ipBody + i;
						if (true /*newIp != ip.local*/) {
							ips.push(newIp);
						}
					}
                } else if (ip.izibox) {
                    ips.push(ip.izibox);
                }

				// Get Settings and store them in the browser cache
				searchRestConfigurationAsync($rootScope, $q, $http, ips, $translate, existingConfig).then(function (configs) {
					var returnResult = function (selectedConfig) {
						window.localStorage.setItem("IziBoxConfiguration", selectedConfig);
						config = JSON.parse(selectedConfig);
						config.deleteCouchDb = config.IdxCouchDb != defaultConfig.IdxCouchDb;
						configDefer.resolve(config);
					};

					if (configs.length === 1) {
						returnResult(configs[0]);
					} else {
						var modalInstance = $uibModal.open({
							templateUrl: 'modals/modalSelectConfig.html',
							controller: 'ModalSelectConfigController',
							resolve: {
								configs: function () {
									return configs;
								}
							},
							backdrop: 'static'
						});

						modalInstance.result.then(function (selectedConfig) {
							returnResult(selectedConfig);
						});
					}

				}, function (errSearch) {
					swal({
						title: $translate.instant("Izibox non trouvée !"),
						showCancelButton: true,
						confirmButtonText: $translate.instant("Continuer"),
						cancelButtonText: $translate.instant("Réessayer"),
						closeOnConfirm: true,
						closeOnCancel: true
					}, function (isConfirm) {
						if (isConfirm) {
							$rootScope.noIzibox = true;
							config = defaultConfig;
							configDefer.resolve(defaultConfig);
						} else {
							window.location.reload();
							configDefer.reject();
						}
					});
				});
			});
		}
	} else {
		setTimeout(function () {
			configDefer.resolve(defaultConfig);
		}, 200);
	}

	return configDefer.promise;
}

/**
 * Look for the izibox using the rest service Nancy
 * Looks for all the IP in the same subnetwok and call the configuration services
 * @param $rootScope
 * @param $q
 * @param $http
 * @param ips
 * @param $translate
 * @param existingConfig
 */
var searchRestConfigurationAsync = function ($rootScope,$q, $http, ips, $translate, existingConfig) {
	var searchDefer = $q.defer();

	if (!ips || ips.length == 0) {
		searchDefer.reject();
	} else {
		var i = 0;
		var configs = [];

		var callRest = function(retry){
			if (i < ips.length && !$rootScope.ignoreSearchIzibox) {
				$rootScope.$emit("searchIziBoxProgress", { step: i, total: ips.length, find: configs.length });

				var ip = ips[i];
                var pingApiUrl = "http://" + ip + ":" + 5984;

                // We're scanning the ping rest service and THEN retrieving configuration because there was too much delay
                // with the configuration service causing the BOX not being detected by the POS
                var timeoutSearch = existingConfig && i == 0 ? 500 : 200;
                $http.get(pingApiUrl, { timeout: timeoutSearch }).
                success(function (data, status, headers, config) {

                    getRestConfigurationAsync($q, $http, ip, 8080).then(function (config) {

                        configs.push(config);
                        if (i === 0 && existingConfig) {
                            searchDefer.resolve(configs);
                        } else {
                            i++;
                            callRest();
                        }
                    }, function () {
                        i++;
                        callRest();
                       //console.log("error retrieving configuration"+ ip + pingApiUrl );
                    });
                }).
                error(function (data, status, headers, config) {

                    if (i===0 && existingConfig && !retry) {
                        callRest(true);
                    }
                    else {
                        i++;
                        callRest();
                    }
                });
			}
			else
			{
				if (configs.length > 0) {
					searchDefer.resolve(configs);
				} else {
					searchDefer.reject();
				}
			}
		};

		callRest();
	}

	return searchDefer.promise;
};


/**
 * Get configuration information from the izibox
 * @param $q
 * @param $http
 * @param localIpIziBox
 * @param restPort
 */
var getRestConfigurationAsync = function ($q, $http, localIpIziBox, restPort) {
	var restConfigDefer = $q.defer();

	if (localIpIziBox) {
		var configApiUrl = "http://" + localIpIziBox + ":" + restPort + "/configuration";

		// Time out needs to be at least 500 for the configuration service
		// We're setting it to 1000 to be sure to have a result for the first connection
		$http.get(configApiUrl, { timeout: 1000 }).
			success(function (data) {
				console.log("Configuration : ok");
				var msg = JSON.stringify(data);
				restConfigDefer.resolve(msg);
			}).
			error(function (data) {
				console.log(data);
				restConfigDefer.reject("config error");
			});
	} else {
		restConfigDefer.reject("Izibox not found");
	}

	return restConfigDefer.promise;
};

/**
* ------- All the function to manage UDP are deprecated - We were having difficulties to get it to work in all the
* ------- network configurations
* */

/**
 *
 * @deprecated
 * @param $rootScope
 * @param configDefer
 * @param $translate
 */
var createAndSendUdpGetConfig = function ($rootScope, configDefer, $translate) {
	var tryUdp = 0;
	var udpSocket = Datagram.createSocket('udp4');
	udpSocket.bind(0);
	udpSocket.on('message', function (msg) {
		window.localStorage.setItem("IziBoxConfiguration", msg);
		config = JSON.parse(msg);
		config.deleteCouchDb = config.IdxCouchDb != defaultConfig.IdxCouchDb;
		configDefer.resolve(config);
	});

	sendUdpGetConfig($rootScope, udpSocket, configDefer, tryUdp, $translate);
}

/**
 * Looking for a izibox using UDP packets
 * @deprecated
 * @param $rootScope
 * @param udpSocket
 * @param configDefer
 * @param tryUdp
 * @param $translate
 */
var sendUdpGetConfig = function ($rootScope,udpSocket, configDefer, tryUdp, $translate) {
	udpSocket.send('getConfig', '255.255.255.255', '9050');

	setTimeout(function () {
		tryUdp++;
		if (tryUdp < 4 && !config) {
			sendUdpGetConfig($rootScope,udpSocket, configDefer, tryUdp, $translate);
		} else {
			if (!config) {
				swal({
					title: $translate.instant("Izibox non trouvée !"),
					showCancelButton: true,
					confirmButtonText: $translate.instant("Continuer"),
					cancelButtonText: $translate.instant("Réessayer"),
					closeOnConfirm: true,
					closeOnCancel: true
				},function(isConfirm){   
					if (isConfirm) {     
						$rootScope.noIzibox = true;
						config = defaultConfig;
						configDefer.resolve(defaultConfig);
					} else {
						window.location.reload();
						configDefer.reject();
					}
				});


			} else {
				configDefer.resolve(config);
			}
		}

	}, 5000);
}

/**
 * Manage UDP packets in chrome
 * @deprecated
 * @param $rootScope
 * @param configDefer
 * @param $translate
 */
var createAndSendUdpGetConfigChrome = function ($rootScope,configDefer,$translate) {
	var tryUdp = 0;
	chrome.sockets.udp.create({}, function (socketInfo) {
		var socketId = socketInfo.socketId;
		chrome.sockets.udp.bind(socketId, "0.0.0.0", 0, function (result) {

			chrome.sockets.udp.getInfo(socketId, function (result) {
				console.log(result);
			});

			if (result < 0) {
				console.log(chrome.runtime.lastError.message);
				sweetAlert($translate.instant("Izibox non trouvée !"));
				$rootScope.noIzibox = true;
				configDefer.resolve(defaultConfig);
			} else {
				sendUdpGetConfigChrome(socketId, configDefer, tryUdp, $translate);

			}
		});
	});

	chrome.sockets.udp.onReceive.addListener(function (result) {
		console.log(result);
		if (result.data) {
			var dataView = new DataView(result.data);
			var decoder = new TextDecoder('utf-8');
			var decodedString = decoder.decode(dataView);
			window.localStorage.setItem("IziBoxConfiguration", decodedString);
			config = JSON.parse(decodedString);
			config.deleteCouchDb = config.IdxCouchDb != defaultConfig.IdxCouchDb;
			configDefer.resolve(config);
		}
	});
};

/**
 * @deprecated
 * @param socketId
 * @param configDefer
 * @param tryUdp
 * @param $translate
 */
var sendUdpGetConfigChrome = function (socketId, configDefer, tryUdp, $translate) {
	var data = new ArrayBuffer("getConfig");

	chrome.sockets.udp.send(socketId, data, "255.255.255.255", 9050, function (sendInfo) {
		if (sendInfo.resultCode < 0) {
			console.log(chrome.runtime.lastError.message);
		} else {
			console.log(sendInfo);
		}
	});

	setTimeout(function () {
		tryUdp++;
		if (tryUdp < 4 && !config) {
			sendUdpGetConfigChrome(socketId, configDefer, tryUdp, $translate);
		} else {
			if (!config) {
				sweetAlert($translate.instant("Izibox non trouvée !"));
				$rootScope.noIzibox = true;
				config = defaultConfig;
			}

			configDefer.resolve(config);
		}

	}, 5000);
};