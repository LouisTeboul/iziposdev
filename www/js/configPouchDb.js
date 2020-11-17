app.configPouchDb = function ($rootScope, $q, $http, zposService, posService, repositoryLoaderService) {

    const onDeviceReady = () => {
        var adapter = !!window.sqlitePlugin && !navigator.userAgent.match(/(Android)/) ? 'cordova-sqlite' : 'idb';
        $rootScope.settingsPouchDB = {
            typeDB: adapter,
            opts: {
                live: true,
                retry: true,
                batch_size: 50,
                batches_limit: 100,
                heartbeat: 5000
            },
            optsReplicate: {
                live: true,
                retry: true,
                batch_size: 10,
                batches_limit: 8,
                heartbeat: 5000
            },
            optsSync: {
                live: false,
                retry: false,
                batch_size: 10,
                batches_limit: 8
            },
            // auth: {username: 'posnf', password: 'Izipass2018'}
        };

        // Recreates database
        setupDatabases($rootScope, $q, $http, zposService, posService, repositoryLoaderService);
    }
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
        console.log('Android / iOs Detected');
        if ($rootScope.deviceReady) {
            onDeviceReady();
        } else {
            document.addEventListener("deviceready", onDeviceReady, false);
        }

    } else {
        onDeviceReady();
    }


};

/*
 * Create the local databases
 */
const setupDatabases = ($rootScope, $q, $http, zposService, posService, repositoryLoaderService) => {
    // PouchDB.debug.enable('*');

    // Instantiate PouchDB


    $rootScope.dbValidatePool = new PouchDB('izipos_validatepool', {
        adapter: $rootScope.settingsPouchDB.typeDB
    });

    console.info("PouchDb adapter : " + $rootScope.settingsPouchDB.typeDB); // prints either 'idb' or 'sqlite'

    $rootScope.modelDb = {};
    $rootScope.modelDb.databaseReady = false;
    $rootScope.modelDb.dataReady = false;
    //$rootScope.modelDb.replicateReady = false;
    //$rootScope.modelDb.freezeReady = false;
    $rootScope.modelDb.stockReady = false;
    $rootScope.modelDb.orderReady = false;
    $rootScope.modelDb.zposReady = false;
    $rootScope.modelDb.configReplicationReady = false;

    //#region dbStock
    let stockRemoteInfo = undefined;


    const setupDbStock = () => {
        $rootScope.dbStock = new PouchDB('izipos_stock', {
            adapter: $rootScope.settingsPouchDB.typeDB
        });
        $rootScope.dbStock.setSchema([{
            singular: 'ProductQuantity',
            plural: 'ProductQuantities'
        }]);

        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {

            const urlStockCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb;
            const remoteDbStock = new PouchDB(urlStockCouchDb);

            // Getting info from the remote freeze database
            remoteDbStock.info().then((resRemoteInfo) => {
                stockRemoteInfo = resRemoteInfo;
            }).catch(() => {
                $rootScope.modelDb.stockReady = true;
                $rootScope.$evalAsync();
            });

            // Setting the synchronization between remote and local stockdb
            //$rootScope.dbStock.replicate.to(remoteDbStock, $rootScope.settingsPouchDB.opts, null);
            $rootScope.dbStock.replicate.from(remoteDbStock, {
                    live: true,
                    retry: true,
                    filter: 'index/productQuantity'
                }).on('change', (info) => {
                    if (!info) {
                        info = {};
                    }
                    info.remoteInfo = stockRemoteInfo;
                    info.status = "Change";
                    $rootScope.$emit("dbStockChange", info);
                }).on('paused', (err) => {
                    // if (!err) {
                    if ($rootScope.modelDb.databaseReady) {
                        posService.getPosNameAsync($rootScope.modelPos.hardwareId).then((alias) => {
                            $rootScope.modelPos.aliasCaisse = alias;
                        });
                        $rootScope.$emit("dbStockReplicate", {});
                    }
                    $rootScope.modelDb.stockReady = true;
                    $rootScope.$evalAsync();
                    //} else {
                    //    console.error(err);
                    //}
                })
                .on('error', () => {
                    $rootScope.modelDb.stockReady = true;
                    $rootScope.$evalAsync();
                });
        } else {
            $rootScope.modelDb.stockReady = true;
        }        
    }

    setupDbStock();
    // if (!$rootScope.noIzibox) {
    //     new PouchDB('izipos_stock').destroy().then(() => {
    //         setupDbStock();
    //     }, () => {
    //         setupDbStock();
    //     })
    // } else {
    //     setupDbStock();
    // }

    //#endregion

    //#region dbStores
    let storesRemoteInfo = undefined;

    const setupDbStore = () => {
        $rootScope.dbStores = new PouchDB('izipos_stores', {
            adapter: $rootScope.settingsPouchDB.typeDB
        });
        $rootScope.dbStores.setSchema([{
            singular: 'Stores',
            plural: 'Stores'
        }, ]);
        if ($rootScope.IziBoxConfiguration.LocalIpIziBox && true) {

            const urlStoresCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb;
            const remoteDbStores = new PouchDB(urlStoresCouchDb);
            // Getting info from the remote freeze database
            remoteDbStores.info().then((resRemoteInfo) => {
                storesRemoteInfo = resRemoteInfo;
            }).catch(() => {
                $rootScope.modelDb.storesReady = true;
                $rootScope.$evalAsync();
            });

            // Setting the synchronization between remote and local stockdb
            $rootScope.dbStores.replicate.from(remoteDbStores, {
                    live: true,
                    retry: true,
                    filter: 'index/storeDoc'
                }).on('change', (info) => {
                    if (!info) {
                        info = {};
                    }
                    info.remoteInfo = storesRemoteInfo;
                    info.status = "Change";
                    $rootScope.$emit("dbStoresChange", info);
                }).on('paused', (err) => {
                    // if (!err) {
                    if ($rootScope.modelDb.databaseReady) {
                        posService.getPosNameAsync($rootScope.modelPos.hardwareId).then((alias) => {
                            $rootScope.modelPos.aliasCaisse = alias;
                        });
                        $rootScope.$emit("dbStoresReplicate", {});
                    }
                    $rootScope.modelDb.storesReady = true;
                    $rootScope.$evalAsync();
                    //} else {
                    //    console.error(err);
                    //}
                })
                .on('error', () => {
                    $rootScope.modelDb.storesReady = true;
                    $rootScope.$evalAsync();
                });
        } else {
            $rootScope.modelDb.storesReady = true;
        }
    }

    setupDbStore();
    // if (!$rootScope.noIzibox) {
    //     new PouchDB('izipos_stores').destroy().then(() => {
    //         setupDbStore();
    //     }, () => {
    //         setupDbStore();
    //     })
    // } else {
    //     setupDbStore();
    // }
    //#endregion

    //#region dbInstance
    /**
     * This database contains all the data (product, category, pictures, POS user
     */

    repositoryLoaderService.load();

    //#endregion

    //#region dbOrder
    let orderRemoteInfo = undefined;
    const setupDbOrder = () => {
        $rootScope.dbOrder = new PouchDB('izipos_order', {
            adapter: $rootScope.settingsPouchDB.typeDB
        });

        let urlOrderCouchDb = $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order";

        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
            urlOrderCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order";

            $rootScope.remoteDbOrder = new PouchDB(urlOrderCouchDb);
            $rootScope.remoteDbOrder.setSchema([{
                singular: 'ShoppingCart',
                plural: 'ShoppingCarts'
            }]);

            $rootScope.remoteDbOrder.info().then((resRemoteInfo) => {
                orderRemoteInfo = resRemoteInfo;
            }).catch((err) => {
                $rootScope.modelDb.orderReady = true;
                $rootScope.$evalAsync();
            });
            $rootScope.dbOrder.replicate.to($rootScope.remoteDbOrder, $rootScope.settingsPouchDB.opts, null);

            $rootScope.dbOrderFrom = $rootScope.dbOrder.replicate.from($rootScope.remoteDbOrder, {
                live: true,
                retry: true,
                filter: 'order/deletedfilter'
            }).on('paused', function (err) {
                    setTimeout(() => {
                        if ($rootScope.modelDb.databaseReady) {
                            $rootScope.$emit("dbOrderReplicate", {});
                        }
                        $rootScope.modelDb.orderReady = true;
                        $rootScope.$evalAsync();
                    }, 1000);
                })
                .on('change', function (change) {
                    change.remoteInfo = orderRemoteInfo;
                    $rootScope.$emit("dbOrderChange", change);
                })
                .on('error', () => {
                    $rootScope.modelDb.orderReady = true;
                    $rootScope.$evalAsync();
                });

        } else {
            $rootScope.modelDb.orderReady = true;
        }

        $rootScope.dbOrder.setSchema([{
            singular: 'ShoppingCart',
            plural: 'ShoppingCarts'
        }]);

        $rootScope.dbOrder.compact();
    }

    setupDbOrder();
    // if (!$rootScope.noIzibox) {
    //     new PouchDB('izipos_order').destroy().then(() => {
    //         setupDbOrder();
    //     }, () => {
    //         setupDbOrder();
    //     })
    // } else {
    //     setupDbOrder();
    // }

    //#endregion

    //#region dbZPos    
    const setupDbZPos = () => {
        let urlZPosCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/zpos";
        // $rootScope.dbZPos = new PouchDB('izipos_zpos', {
        //     adapter: $rootScope.settingsPouchDB.typeDB
        // });

        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
            $rootScope.remoteDbZPos = new PouchDB(urlZPosCouchDb);
            $rootScope.modelDb.zposReady = true;

        } else {
            $rootScope.modelDb.zposReady = true;
        }

        $rootScope.remoteDbZPos.setSchema([{
            singular: 'ShoppingCart',
            plural: 'ShoppingCarts'
        }]);

        if ($rootScope.noIzibox) {
            $rootScope.modelDb.zposReady = true;
        }
    }

    setupDbZPos();
    // if (!$rootScope.noIzibox) {
    //     // Si on est connecté, on destroy
    //     new PouchDB('izipos_zpos').destroy().then(() => {
    //         setupDbZPos();
    //     }, (err) => {
    //         setupDbZPos();
    //     })
    // } else {
    //     setupDbZPos();
    // }

    //#endregion


    $rootScope.syncValidatePoolDb = ($rootScope) => {
        let syncRunning = false;

        $rootScope.dbValidatePool = new PouchDB('izipos_validatepool', {
            adapter: $rootScope.settingsPouchDB.typeDB
        });
        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
            let urlValidatePoolCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/validatepool";
            let remoteDbValidatePool = new PouchDB(urlValidatePoolCouchDb);

            const runpoolSync = (immediately) => {
                if (!syncRunning) {

                    syncRunning = true;

                    setTimeout(() => {
                        syncRunning = false;

                        $rootScope.dbValidatePoolHandler = $rootScope.dbValidatePool.sync(remoteDbValidatePool, $rootScope.settingsPouchDB.optsSync);

                        $rootScope.dbValidatePoolHandler.on('active', () => {
                            console.log("validatepool_sync active");
                        }).on('denied', (err) => {
                            console.log("validatepool_sync denied");
                            $rootScope.dbValidatePoolHandler.removeAllListeners();
                            runpoolSync();
                        }).on('complete', (info) => {
                            $rootScope.dbValidatePoolHandler.removeAllListeners();
                            runpoolSync();
                        }).on('error', (err) => {
                            console.log("validatepool_sync error");
                            $rootScope.dbValidatePoolHandler.removeAllListeners();
                            runpoolSync();
                        });
                    }, immediately ? 0 : 30000);
                }
            };

            runpoolSync(true);
        }
    };
};