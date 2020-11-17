let config = undefined;
let defaultConfig = undefined;

//Retrieve the configuration parameters
//TODO: In case there is no network alert the user
app.getConfigIziBoxAsync = ($rootScope, $q, $http, $translate, $uibModal, ipService) => {
    let configDefer = $q.defer();

    // Look for configuration in cache
    let configJSON = window.localStorage.getItem("IziBoxConfiguration");
    let existingConfig = false;

    let defaultConfig = {
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

    if (configJSON) {
        let savedConfig = JSON.parse(configJSON);

        if (!savedConfig.IndexIsNotDefined) {
            existingConfig = true;
            defaultConfig = savedConfig;
        }
    }

    if (!defaultConfig.WithoutIzibox) {
        defaultConfig.deleteCouchDb = false;

        try {
            //On force le mode "standard"
            throw "Not UDP";

        } catch (err) {
            let ips = [];

            ipService.getLocalIpAsync().then((ip) => {
                if (ip.local) {
                    // First add last found izibox ip
                    if (defaultConfig.LocalIpIziBox) {
                        ips.push(defaultConfig.LocalIpIziBox);
                    }

                    // Get last part of ip
                    let ipBody = ip.local.substring(0, ip.local.lastIndexOf(".") + 1);
                    for (let i = 1; i < 255; i++) {
                        let newIp = ipBody + i;
                        ips.push(newIp);

                    }
                } else if (ip.izibox) {
                    ips.push(ip.izibox);
                }

                // Get Settings and store them in the browser cache
                setTimeout(() => {
                    searchRestConfigurationAsync($rootScope, $q, $http, ips, $translate, existingConfig).then((configs) => {
                        const returnResult = (selectedConfig) => {
                            window.localStorage.setItem("IziBoxConfiguration", JSON.stringify(selectedConfig));
                            selectedConfig.deleteCouchDb = selectedConfig.IdxCouchDb != defaultConfig.IdxCouchDb;
                            configDefer.resolve(selectedConfig);
                        };

                        if (configs.length === 1) {
                            returnResult(configs[0]);
                        } else {
                            let modalInstance = $uibModal.open({
                                templateUrl: 'modals/modalSelectConfig.html',
                                controller: 'ModalSelectConfigController',
                                resolve: {
                                    configs: () => {
                                        return configs;
                                    }
                                },
                                backdrop: 'static'
                            });

                            modalInstance.result.then((selectedConfig) => {
                                returnResult(selectedConfig);
                            });
                        }
                    }, (errSearch) => {
                        let configJSON = window.localStorage.getItem("IziBoxConfiguration");
                        let currentConfig = JSON.parse(configJSON);

                        let message = $translate.instant("La izibox n'a pas été trouvée, veuillez vérifier ses branchements ou contacter le support.");
                        let actions = [null, $translate.instant("Réessayer")];

                        if (currentConfig) {
                            message = $translate.instant("La izibox n'a pas été trouvée, veuillez vérifier ses branchements ou continuer en mode hors ligne.");
                            actions = [$translate.instant("Réessayer"), $translate.instant("Continuer")];
                        }

                        //if (window.navigator.onLine && currentConfig) {
                        //    message = $translate.instant("La izibox n'a pas été trouvée, veuillez vérifier ses branchements ou continuer en mode hors ligne.");
                        //    actions = [$translate.instant("Réessayer"), $translate.instant("Continuer")];
                        //} else {
                        //    if (currentConfig) {
                        //        message = $translate.instant("Cet appareil n'est pas connecté au réseau. Veuillez le connecter ou continuer en mode hors ligne.");
                        //        actions = [$translate.instant("Réessayer"), $translate.instant("Continuer")];
                        //    } else {
                        //        message = $translate.instant("Cet appareil n'est pas connecté au réseau. Veuillez le connecter ou contacter le support.");
                        //    }
                        //}

                        swal({
                            title: message,
                            buttons: actions
                        }).then((isConfirm) => {
                            if (isConfirm && currentConfig) {
                                currentConfig.deleteCouchDb = currentConfig.IdxCouchDb != defaultConfig.IdxCouchDb;
                                configDefer.resolve(currentConfig);
                            } else {
                                window.location.reload();
                            }
                        });
                    });
                }, 500);
            });
        }
    } else {
        setTimeout(() => {
            configDefer.resolve(defaultConfig);
        }, 200);
    }

    return configDefer.promise;
};

//Look for the izibox using the rest service Nancy
//Looks for all the IP in the same subnetwok and call the configuration services
const searchRestConfigurationAsync = ($rootScope, $q, $http, ips, $translate, existingConfig) => {
    let searchDefer = $q.defer();

    if (!ips || ips.length === 0) {
        searchDefer.reject();
    } else {
        let i = 0;
        let configs = [];

        const callRest = (retry) => {
            if (i < ips.length && !$rootScope.ignoreSearchIzibox) {
                $rootScope.$emit("searchIziBoxProgress", {
                    step: i,
                    total: ips.length,
                    find: configs.length
                });

                let ip = ips[i];
                let pingApiUrl = "http://" + ip + ":" + 5984;

                // We're scanning the ping rest service and THEN retrieving configuration because there was too much delay
                // with the configuration service causing the BOX not being detected by the POS
                let timeoutSearch = existingConfig && i === 0 ? 3000 : 200;
                $http.get(pingApiUrl, {
                    timeout: timeoutSearch
                }).success((data, status, headers, configuration) => {
                    getRestConfigurationAsync($q, $http, ip, 8080).then((config) => {
                        config = JSON.parse(config);
                        config.LocalIpIziBox = ip;
                        configs.push(config);
                        if (i === 0 && existingConfig) {
                            searchDefer.resolve(configs);
                        } else {
                            i++;
                            callRest();
                        }
                    }, (errorConfig) => {
                        if (i === 0 && existingConfig) {
                            swal({
                                title: $translate.instant("Configuration trouvée, Izibox non trouvée !"),
                                buttons: [$translate.instant("Rechercher"), $translate.instant("Continuer")]
                            }).then((isConfirm) => {
                                if (isConfirm) {
                                    $rootScope.noIzibox = true;
                                    let configJSON = window.localStorage.getItem("IziBoxConfiguration");
                                    let currentConfig = JSON.parse(configJSON);
                                    configs.push(currentConfig);
                                    searchDefer.resolve(configs);
                                } else {
                                    i++;
                                    callRest();
                                }
                            });
                        } else {
                            i++;
                            callRest();
                        }
                        //console.log("error retrieving configuration"+ ip + pingApiUrl );
                    });
                }).error((data, status, headers, config) => {
                    if (i === 0 && existingConfig && !retry) {
                        callRest(true);
                    } else {
                        i++;
                        callRest();
                    }
                });
            } else {
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

//Get configuration information from the izibox
const getRestConfigurationAsync = ($q, $http, localIpIziBox, restPort) => {
    let restConfigDefer = $q.defer();

    if (localIpIziBox) {
        const configApiUrl = "http://" + localIpIziBox + ":" + restPort + "/configuration";

        // Time out needs to be at least 500 for the configuration service
        // We're setting it to 1000 to be sure to have a result for the first connection
        $http.get(configApiUrl, {
            timeout: 3000
        }).success((data) => {
            console.log("Izibox found !");
            let msg = JSON.stringify(data);
            restConfigDefer.resolve(msg);
        }).error((data) => {
            console.log(data);
            restConfigDefer.reject("config error");
        });
    } else {
        restConfigDefer.reject("Izibox not found");
    }

    return restConfigDefer.promise;
};

//All the function to manage UDP are deprecated - We were having difficulties to get it to work in all the network configurations
//deprecated
const createAndSendUdpGetConfig = ($rootScope, configDefer, $translate) => {
    let tryUdp = 0;
    let udpSocket = Datagram.createSocket('udp4');
    udpSocket.bind(0);
    udpSocket.on('message', (msg) => {
        window.localStorage.setItem("IziBoxConfiguration", msg);
        config = JSON.parse(msg);
        config.deleteCouchDb = config.IdxCouchDb != defaultConfig.IdxCouchDb;
        configDefer.resolve(config);
    });

    sendUdpGetConfig($rootScope, udpSocket, configDefer, tryUdp, $translate);
};

//Looking for a izibox using UDP packets
//deprecated
const sendUdpGetConfig = ($rootScope, udpSocket, configDefer, tryUdp, $translate) => {
    udpSocket.send('getConfig', '255.255.255.255', '9050');

    setTimeout(() => {
        tryUdp++;
        if (tryUdp < 4 && !config) {
            sendUdpGetConfig($rootScope, udpSocket, configDefer, tryUdp, $translate);
        } else {
            if (!config) {
                swal({
                    title: $translate.instant("Izibox non trouvée !"),
                    buttons: [$translate.instant("Rechercher"), false]
                }).then(() => {
                    window.location.reload();
                    configDefer.reject();
                });
            } else {
                configDefer.resolve(config);
            }
        }
    }, 5000);
};

//Manage UDP packets in chrome
//deprecated
const createAndSendUdpGetConfigChrome = ($rootScope, configDefer, $translate) => {
    let tryUdp = 0;
    chrome.sockets.udp.create({}, (socketInfo) => {
        let socketId = socketInfo.socketId;
        chrome.sockets.udp.bind(socketId, "0.0.0.0", 0, (result) => {
            chrome.sockets.udp.getInfo(socketId, (result) => {
                console.log(result);
            });

            if (result < 0) {
                console.log(chrome.runtime.lastError.message);
                swal({
                    title: $translate.instant("Izibox non trouvée !")
                });
                $rootScope.noIzibox = true;
                configDefer.resolve(defaultConfig);
            } else {
                sendUdpGetConfigChrome(socketId, configDefer, tryUdp, $translate);

            }
        });
    });

    chrome.sockets.udp.onReceive.addListener((result) => {
        console.log(result);
        if (result.data) {
            let dataView = new DataView(result.data);
            let decoder = new TextDecoder('utf-8');
            let decodedString = decoder.decode(dataView);
            window.localStorage.setItem("IziBoxConfiguration", decodedString);
            config = JSON.parse(decodedString);
            config.deleteCouchDb = config.IdxCouchDb != defaultConfig.IdxCouchDb;
            configDefer.resolve(config);
        }
    });
};

//deprecated
const sendUdpGetConfigChrome = (socketId, configDefer, tryUdp, $translate) => {
    let data = new ArrayBuffer("getConfig");

    chrome.sockets.udp.send(socketId, data, "255.255.255.255", 9050, (sendInfo) => {
        if (sendInfo.resultCode < 0) {
            console.log(chrome.runtime.lastError.message);
        } else {
            console.log(sendInfo);
        }
    });

    setTimeout(() => {
        tryUdp++;
        if (tryUdp < 4 && !config) {
            sendUdpGetConfigChrome(socketId, configDefer, tryUdp, $translate);
        } else {
            if (!config) {
                swal({
                    title: $translate.instant("Izibox non trouvée !")
                });
                $rootScope.noIzibox = true;
                config = defaultConfig;
            }
            configDefer.resolve(config);
        }
    }, 5000);
};