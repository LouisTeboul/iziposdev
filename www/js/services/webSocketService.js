app.service('webSocketService', function ($rootScope, $websocket, $location, $translate, stockService, borneService) {
    const self = this;

    let alreadyClosed = true;

    let LastStockUpdate = null;

    let iziboxConnectedListener = undefined;
    let timeoutPing = null;
    let closingTimeout = null; 

    const ws = $websocket(`ws://${$rootScope.IziBoxConfiguration.LocalIpIziBox}:8080/ws?id=${$rootScope.modelPos.hardwareId}&type=${$rootScope.borne ? "BORNE" : "POS"}${$rootScope.modelPos.aliasCaisse ? "&alias=" + $rootScope.modelPos.aliasCaisse : ""}`, "IziPos",
        {
            reconnectIfNotNormalClose: false,
            maxTimeout: 5000
        });

    const stopPingTimeout = () => {
        if (timeoutPing) {
            clearTimeout(timeoutPing);
        }
    };

    const resetPingTimeout = () => {
        //console.log("Timeout reset");
        if (timeoutPing) {
            stopPingTimeout();
        }
        timeoutPing = setTimeout(() => {
            //console.log("Time over ! Closing");
            self.stopWebSocket();
        }, 14000);
    };

    const resetClosingTimeout = () => {
        if (closingTimeout) {
            clearTimeout(closingTimeout);
        }

        closingTimeout = setTimeout(() => {
            $rootScope.modelPos.iziboxConnected = false;
            $rootScope.modelPos.iziboxStatus.LocalDb = false;
            $rootScope.modelPos.iziboxStatus.DistantDb = false;
            //Arrete le timeout ping
            console.log("WebSocket closed !");
            //$rootScope.$emit("iziboxConnected", $rootScope.modelPos.iziboxConnected);
            //self.stopWebSocket();
            $rootScope.$evalAsync();
            
            ws.close(true);

            setTimeout(() => {
                ws._connect(true);
            }, 1000);

        }, 5000);
    };


    const closeConnexion = () => {
        stopPingTimeout();
        // On se deconnecte au bout d'une seconde
        console.log("WebSocket closing ...");

        resetClosingTimeout();

        if (!iziboxConnectedListener) {
            iziboxConnectedListener = $rootScope.$on("iziboxConnected", (event, isConnected) => {
                // Si on reçoit une notification de connexion, on annule la deconnexion
                if (isConnected) {
                    console.log("WebSocket reconnected");
                    clearTimeout(closingTimeout);
                }
            });
        }
    };

    const sendAcknowledgement = (msg) => {
        let acknowledgementResponse = {
            MessageType: "ACKNOWLEDGEMENT",
            MessageGuid: msg.Id
        };
        ws.send(JSON.stringify(acknowledgementResponse));
    };

    // Initialise la connection au serveur de websocket et définit les message handlers
    this.startWebSocket = () => {
        $rootScope.modelPos.iziboxStatus = {
            LocalDB: false,
            DistantDb: false
        };

        ws.onOpen(() => {
            console.log('Websocket Open');
            // Lance le timeout ping

            resetPingTimeout();
            $rootScope.modelPos.iziboxConnected = true;

            // Si on a un currentShoppingCart non nul, on l'envoie a la box
            if ($rootScope.currentShoppingCart) {
                stockService.initStockBuffer();
            }
            // Si on a pas de currentShoppingCart, on clear l'eventuel buffer sauvegardé dans la box
            else {
                stockService.clearStockBuffer();
            }
            $rootScope.$emit("iziboxConnected", $rootScope.modelPos.iziboxConnected);
        });

        ws.onClose(() => {
            closeConnexion();
        });

        ws.onError(() => {
            closeConnexion();
        });

        ws.onMessage((evt) => {
            let data = JSON.parse(evt.data);

            if (data) {
                sendAcknowledgement(data);
                switch (data.MessageType) {
                    case "PING":

                    //console.log("PING!");
                        let pongMsg = {
                            MessageType: "PONG",
                            LastStockUpdate
                        };

                        ws.send(JSON.stringify(pongMsg));
                        resetPingTimeout();
                        break;
                    case "DATABASESTATUS":
                        // console.log(data);
                        $rootScope.modelPos.iziboxStatus.LocalDb = data.LocalDBStatus;
                        $rootScope.modelPos.iziboxStatus.DistantDb = data.DistantDBStatus;
                        break;

                    case "REGISTEREDDEVICES":
                        if (!$rootScope.registeredDevices) {
                            // On ne redirige pas la premiere fois
                        } else {
                            if (data.Devices) {
                                const ownDevice = data.Devices.find(d => d.Id === $rootScope.modelPos.hardwareId);
                                if (ownDevice) {
                                    $rootScope.modelPos.isPosOpen = ownDevice.HasOpenPeriod;
                                    if ($rootScope.borne && !ownDevice.HasOpenPeriod) {
                                        borneService.closeBorne();
                                    } else if ($rootScope.borne) {
                                        let currentURL = $location.path().split("/")[1];
                                        if (currentURL !== "catalogBorne" && currentURL !== "idleScreen") {
                                            // FIXME : C'est necessaire sinon on arrive pas a reouvrir un Y d'une borne
                                            setTimeout(() => {
                                                borneService.redirectToHome();
                                            }, 1000);
                                        }
                                    }
                                }
                            }
                        }
                        $rootScope.registeredDevices = data.Devices;

                        //$rootScope.modelPos.isPosOpen = true;
                        break;

                    case "STOCKUPDATE":
                        stockService.setBufferStock(data.NewStock);
                        LastStockUpdate = data.LastUpdate;
                        break;

                    case "STORESTATEUPDATE":
                        data.StoreState.Id = data.StoreState.StoreId;
                        var info = {
                            status: "Change",
                            change: {
                                docs: [{
                                    data: [data.StoreState]
                                }]
                            }
                        };
                        $rootScope.$emit("dbStoresChange", info);
                        break;

                    case "ZPERIODSTATUS":
                        // Quand on reçoit un evenement de fermeture
                        if (!data.ZperiodOpen) {
                            // if (window.tpaPayment && !alreadyClosed) {
                            //     // ON NE FORCE PAS LA TELECOLLECTE
                            //     //window.tpaPayment.forceTelecollecte();
                            // }
                        } else {
                            alreadyClosed = false;
                        }
                        break;

                    case "FREEZEUPDATE":
                        $rootScope.FreezeCount = {
                            local: {
                                unlocked: data.FreezeOrderCount.Local.Unlocked,
                                locked: data.FreezeOrderCount.Local.Locked
                            },
                            untouched: {
                                unlocked: data.FreezeOrderCount.Untouched.Unlocked,
                                locked: data.FreezeOrderCount.Untouched.Locked
                            },
                            in_kitchen: {
                                unlocked: data.FreezeOrderCount.InKitchen.Unlocked,
                                locked: data.FreezeOrderCount.InKitchen.Locked
                            },
                            ready: {
                                unlocked: data.FreezeOrderCount.Ready.Unlocked,
                                locked: data.FreezeOrderCount.Ready.Locked
                            },
                            total: {
                                unlocked: data.FreezeOrderCount.Total.Unlocked,
                                locked: data.FreezeOrderCount.Total.Locked
                            },
                            lastUpdate: moment().format('x')
                        };
                        $rootScope.$emit("dbFreezeReplicate");
                        break;
                    case "CLAIMERROR":
                        if(!$rootScope.borne) {
                            swal({
                                title: $translate.instant("L'imprimante suivante ne répond pas, veuillez la redémarrer s'il vous plaît."),
                                text: data.PrinterIP
                            });
                        }
                        break;
                    default:
                        //console.log("Type de message inconnu !");
                        break;
                }
            }
        });
    };

    this.stopWebSocket = () => {
        console.log("websocket stopped")
        //ws.close(true);
        closeConnexion();
        //setTimeout(() => ws._connect(true), 1000);
    };
});