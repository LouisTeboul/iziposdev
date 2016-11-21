var config = undefined;
var defaultConfig = undefined;

app.getConfigIziBoxAsync = function ($rootScope, $q, $http, ipService, $translate, $location) {
	var configDefer = $q.defer();

	var configJSON = window.localStorage.getItem("IziBoxConfiguration");

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
	}

	if (/*!defaultConfig.WithoutIzibox*/true) {
		defaultConfig.deleteCouchDb = false;

	    try {
            //Mis en commentaire pour désactiver la gestion de l'UDP sur android
			//if (navigator.userAgent.match(/(Android)/)) {
			//	$rootScope.isAndroid = true;
			//	createAndSendUdpGetConfig($rootScope, configDefer, $translate);
			//} else {
			//	$rootScope.isAndroid = false;
			//	throw "Not Android";
	        //}

	        //on force le mode "standard"
	        throw "Not UDP";

		} catch (err) {
			var ips = [];

			//ipService.getLocalIpAsync(defaultConfig.LocalIpIziBox).then(function (ip) {
			ipService.getLocalIpAsync().then(function (ip) {
				console.log(ip);

				if (ip.izibox) {
					ips.push(ip.izibox);
				} else if (ip.local) {
					
					//first add last finded izibox ip
					if (defaultConfig.LocalIpIziBox) {
						ips.push(defaultConfig.LocalIpIziBox);
					}

					//get last part of ip
					var ipBody = ip.local.substring(0, Enumerable.from(ip.local).lastIndexOf(".") + 1);
					for (var i = 1; i < 255; i++) {
						var newIp = ipBody + i;
						if (true /*newIp != ip.local*/) {
							ips.push(newIp);
						}
					}
				}
				searchRestConfigurationAsync($rootScope,$q, $http, ips,$translate).then(function (msg) {
					window.localStorage.setItem("IziBoxConfiguration", msg);
					config = JSON.parse(msg);
					config.deleteCouchDb = config.IdxCouchDb != defaultConfig.IdxCouchDb;
					configDefer.resolve(config);
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

var searchRestConfigurationAsync = function ($rootScope,$q, $http, ips, $translate) {
	var searchDefer = $q.defer();

	if (!ips || ips.length == 0) {
		searchDefer.reject();
	} else {
		var noip = true;
		var i = 0;

		var callRest = function(){
			if (i < ips.length && noip && !$rootScope.ignoreSearchIzibox) {
				$rootScope.$emit("searchIziBoxProgress", { step: i, total: ips.length });
				var ip = ips[i];
				getRestConfigurationAsync($q, $http, ip, 8080).then(function (config) {
					noip = false;
					searchDefer.resolve(config);
				}, function () {
					i++;
					callRest();
				});
			} else {
				searchDefer.reject();
			}
		}

		callRest();
	}

	return searchDefer.promise;
}

var getRestConfigurationAsync = function ($q, $http, localIpIziBox, restPort) {
	var restConfigDefer = $q.defer();

	if (localIpIziBox) {
		var configApiUrl = "http://" + localIpIziBox + ":" + restPort + "/configuration";
		$http.get(configApiUrl, { timeout: 500 }).
            success(function (data, status, headers, config) {
            	var msg = JSON.stringify(data);
            	restConfigDefer.resolve(msg);
            }).
            error(function (data, status, headers, config) {
            	restConfigDefer.reject("config error");
            });
	} else {
		restConfigDefer.reject("Izibox not found");
	}

	return restConfigDefer.promise;
}

// Cordova UDP
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


//Chrome UDP
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
}

var sendUdpGetConfigChrome = function (socketId, configDefer, tryUdp,$translate) {
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
}