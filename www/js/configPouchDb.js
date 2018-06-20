app.configPouchDb = function ($rootScope, $q, zposService, posService) {

    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
        console.log('Android / iOs Detected');
        document.addEventListener("deviceready", onDeviceReady, false);
    } else {
        onDeviceReady();
    }
    function onDeviceReady() {
<<<<<<< HEAD
        var adapter = !!window.sqlitePlugin ? 'cordova-sqlite' : 'websql';
=======
        var adapter = !!window.sqlitePlugin && !navigator.userAgent.match(/(Android)/) ? 'cordova-sqlite' : 'websql';
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        var settingsPouchDB = {
            typeDB: adapter,
            opts: {live: true, retry: true, batch_size: 50, batches_limit: 100, heartbeat: 5000},
            optsReplicate: {live: true, retry: true, batch_size: 10, batches_limit: 8, heartbeat: 5000},
            optsSync: {live: false, retry: false, batch_size: 10, batches_limit: 8},
            // auth: {username: 'posnf', password: 'Izipass2018'}
        };
        // Destroy local database if changed
        if ($rootScope.IziBoxConfiguration.deleteCouchDb != undefined && $rootScope.IziBoxConfiguration.deleteCouchDb) {
            new PouchDB('izipos_datas').destroy().then(function () {
                new PouchDB('izipos_replicate').destroy().then(function () {
                    new PouchDB('izipos_zpos').destroy().then(function () {
                        new PouchDB('izipos_freeze').destroy().then(function () {
                            new PouchDB('utils').destroy().then(function () {
                                console.log("Datas destroyed");
                                setupDatabases($rootScope, $q, zposService, posService, settingsPouchDB);
                            });
                        });
                    });
                });
            });
        } else {
            // Recreates database
            setupDatabases($rootScope, $q, zposService, posService, settingsPouchDB);
        }
    }
};
/**
 * Create the local databases
 * @param $rootScope
 */
var setupDatabases = function ($rootScope, $q, zposService, posService, settingsPouchDB) {
    // PouchDB.debug.enable('*');


    // Instantiate PouchDB
<<<<<<< HEAD
    $rootScope.dbInstance = new PouchDB('izipos_datas', {size: 200, adapter: settingsPouchDB.typeDB});
    $rootScope.dbOrder = new PouchDB('izipos_order', {size: 50, adapter: settingsPouchDB.typeDB});
    $rootScope.dbFreeze = new PouchDB('izipos_freeze', {size: 50, adapter: settingsPouchDB.typeDB});
=======
    $rootScope.dbInstance = new PouchDB('izipos_datas', { adapter: settingsPouchDB.typeDB});
    $rootScope.dbOrder = new PouchDB('izipos_order', { adapter: settingsPouchDB.typeDB});
    $rootScope.dbFreeze = new PouchDB('izipos_freeze', { adapter: settingsPouchDB.typeDB});
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409

    console.info("PouchDb adapter : " + $rootScope.dbInstance.adapter); // prints either 'idb' or 'websql'

    $rootScope.modelDb = {};
    $rootScope.modelDb.databaseReady = false;
    $rootScope.modelDb.dataReady = false;
    $rootScope.modelDb.replicateReady = false;
    $rootScope.modelDb.freezeReady = false;
    $rootScope.modelDb.orderReady = false;
    $rootScope.modelDb.zposReady = false;
    $rootScope.modelDb.configReplicationReady = false;

    /**
     *    Freeze - Database  for the shared ticket queue for pos user information
     */

        //#region dbFreeze
    var freezeRemoteInfo = undefined;

    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {

        var urlFreezeCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/freeze";
        var remoteDbFreeze = new PouchDB(urlFreezeCouchDb);

        // Getting info from the remote freeze database
        remoteDbFreeze.info().then(function (resRemoteInfo) {
            freezeRemoteInfo = resRemoteInfo;
        }).catch(function () {
            $rootScope.modelDb.freezeReady = true;
            $rootScope.$evalAsync();
        });

        // Setting the synchronization between remote and local freeze
        $rootScope.dbFreeze.replicate.to(remoteDbFreeze, settingsPouchDB.opts, null);
        $rootScope.dbFreeze.replicate.from(remoteDbFreeze, settingsPouchDB.opts, null)
            .on('change', function (info) {
                if (!info) {
                    info = {};
                }
                info.remoteInfo = freezeRemoteInfo;
                info.status = "Change";
                $rootScope.$emit("dbFreezeChange", info);
            })
            .on('paused', function (err) {
                // if (!err) {
                if ($rootScope.modelDb.databaseReady) {
                    posService.getPosNameAsync($rootScope.modelPos.hardwareId).then(function (alias) {
                        $rootScope.modelPos.aliasCaisse = alias;
                    });
                    $rootScope.$emit("dbFreezeReplicate", {});
                }
                $rootScope.modelDb.freezeReady = true;
                $rootScope.$evalAsync();
                //} else {
                //    console.error(err);
                //}
            })
            .on('error', function () {
                console.log("error replication");
                $rootScope.modelDb.freezeReady = true;
                $rootScope.$evalAsync();
            });
    } else {
        $rootScope.modelDb.freezeReady = true;
    }

    /**
     * The freeze manage the posuser connection and the shopping carts
     */

    $rootScope.dbFreeze.setSchema([
        {
            singular: 'ShoppingCart',
            plural: 'ShoppingCarts'
        },
        {
            singular: 'PosUser',
            plural: 'PosUsers'
        },
        {
            singular: 'Dailyticket',
            plural: 'Dailytickets'
        },
        {
            singular: 'RkCounter',
            plural: 'RkCounters'
        }
    ]);

    //#endregion


    /**
     * This database contains all the data (product, category, pictures, POS user
     */

        //#region dbInstance
    var datasRemoteInfo = undefined;

    var urlCouchDb = $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb;

    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
        urlCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb;
    }

    var remoteDbInstance = new PouchDB(urlCouchDb);

    remoteDbInstance.info().then(function (resRemoteInfo) {
        datasRemoteInfo = resRemoteInfo;
        $rootScope.modelDb.configReplicationReady = true;
    }).catch(function (err) {
        $rootScope.modelDb.dataReady = true;
        $rootScope.modelDb.configReplicationReady = true;
        $rootScope.$evalAsync();
        $rootScope.$emit("dbDatasReplicate", err);
    });


    $rootScope.dbInstance.replicate.from(remoteDbInstance, settingsPouchDB.opts, null)
        .on('change', function (info) {
            if (!info) {
                info = {};
            }
            info.remoteInfo = datasRemoteInfo;
            info.status = "Change";
            $rootScope.$emit("dbDatasReplicate", info);
        }).on('paused', function (err) {
        //if (!err) {
        $rootScope.dbInstance.info().then(function (dbInstanceInfo) {
            if (datasRemoteInfo) {
                if (dbInstanceInfo.doc_count >= datasRemoteInfo.doc_count) {
                    $rootScope.modelDb.dataReady = true;
                    $rootScope.$evalAsync();
                    $rootScope.$emit("dbDatasReplicate", {status: "UpToDate"});
                }
            } else {
                $rootScope.modelDb.dataReady = true;
                $rootScope.$evalAsync();
                $rootScope.$emit("dbDatasReplicate", {status: "UpToDate"});
            }
        });
        //} else {
        //    console.error(err);
        //}
    }).on('error', function (info) {
        if (!info) {
            info = {};
        }
        console.info(info);
        $rootScope.modelDb.dataReady = true;
        $rootScope.$evalAsync();
        info.status = "Error";
        $rootScope.$emit("dbDatasReplicate", info);

        $rootScope.replicationMessage = "Erreur de synchronisation !";
        $rootScope.$evalAsync();
    });

    $rootScope.dbInstance.changes({
        since: 'now',
        live: true,
        include_docs: false
    }).on('change', function (change) {
        // console.log("PouchDB  => Change");
        // change.id contains the doc id, change.doc contains the doc
        change.status = "Change";
        $rootScope.$emit("pouchDBChanged", change);
    });

    $rootScope.dbInstance.setSchema([
        {
            singular: 'Category',
            plural: 'Categories',
            relations: {
                'PictureId': {belongsTo: 'Picture'},
                'CategoryTemplateId': {belongsTo: 'CategoryTemplate'}
            }
        },
        {
            singular: 'PosUser',
            plural: 'PosUsers',
            relations: {
                'PictureId': {belongsTo: 'Picture'}
            }
        },
        {
            singular: 'Picture',
            plural: 'Pictures'
        },
        {
            singular: 'CategoryTemplate',
            plural: 'CategoryTemplates'
        },
        {
            singular: 'ProductCategory',
            plural: 'ProductCategories'
        },
        {
            singular: 'Product',
            plural: 'Products',
            relations: {
                'ProductTemplateId': {belongsTo: 'ProductTemplate'}
            }
        },
        {
            singular: 'ProductPicture',
            plural: 'ProductPictures'
        },
        {
            singular: 'ShoppingCart',
            plural: 'ShoppingCarts'
        },
        {
            singular: 'Setting',
            plural: 'Settings'
        },
        {
            singular: 'Update',
            plural: 'Updates'
        },
        {
            singular: 'ProductAttributeValue',
            plural: 'ProductAttributeValues'
        },
        {
            singular: 'ProductAttribute',
            plural: 'ProductAttributes'
        },
        {
            singular: 'ProductTemplate',
            plural: 'ProductTemplates'
        },
        {
            singular: 'CashMovementType',
            plural: 'CashMovementTypes'
        },
        {
            singular: 'Currency',
            plural: 'Currencies'
        },
        {
            singular: 'PosSetting',
            plural: 'PosSettings'
        },
        {
            singular: 'Pos',
            plural: 'Pos'
        }
    ]);
    //#endregion

    //#region dbOrder
    var orderRemoteInfo = undefined;

    var urlOrderCouchDb = $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order";

    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
        urlOrderCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order";

        var remoteDbOrder = new PouchDB(urlOrderCouchDb);

        remoteDbOrder.info().then(function (resRemoteInfo) {
            orderRemoteInfo = resRemoteInfo;
        }).catch(function (err) {
            $rootScope.modelDb.orderReady = true;
            $rootScope.$evalAsync();
        });

        $rootScope.dbOrder.replicate.to(remoteDbOrder, settingsPouchDB.opts, null);
        $rootScope.dbOrderFrom = $rootScope.dbOrder.replicate.from(remoteDbOrder, settingsPouchDB.opts, null);
        $rootScope.dbOrderFrom
            .on('paused', function (err) {
                //if (!err) {

                if ($rootScope.modelDb.databaseReady) {
                    $rootScope.$emit("dbOrderReplicate", {});
                }
                $rootScope.modelDb.orderReady = true;
                $rootScope.$evalAsync();
                //} else {
                //    console.error(err);
                //}
            })
            .on('change', function (change) {
                change.remoteInfo = orderRemoteInfo;
                $rootScope.$emit("dbOrderChange", change);
            })
            .on('error', function () {
                $rootScope.modelDb.orderReady = true;
                $rootScope.$evalAsync();
            });
    } else {
        $rootScope.modelDb.orderReady = true;
    }

    $rootScope.dbOrder.setSchema([
        {
            singular: 'ShoppingCart',
            plural: 'ShoppingCarts'
        }
    ]);
    //#endregion

    //#region dbReplicate
    $rootScope.InitDBReplicate = function () {
<<<<<<< HEAD
        $rootScope.dbReplicate = new PouchDB('izipos_replicate', {size: 50, adapter: settingsPouchDB.typeDB});
=======
        $rootScope.dbReplicate = new PouchDB('izipos_replicate', { adapter: settingsPouchDB.typeDB});
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409

        var replicateInfo = undefined;

        var urlReplicateCouchDb = $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate";

        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
            urlReplicateCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate";
        }

        $rootScope.remoteDbReplicate = new PouchDB(urlReplicateCouchDb);

        $rootScope.dbReplicate.info().then(function (resInfo) {
            replicateInfo = resInfo;
            if (!replicateInfo) {
                $rootScope.modelDb.replicateReady = true;
            }
        }).catch(function (err) {
            $rootScope.modelDb.replicateReady = true;
        });

        $rootScope.dbReplicate.replicate.to($rootScope.remoteDbReplicate, settingsPouchDB.optsReplicate)
            .on('change', function (info) {
                if (!info) {
                    info = {};
                }
                info.remoteInfo = replicateInfo;
                $rootScope.modelDb.replicateReady = false;
                info.status = "Change";
                $rootScope.$emit("dbReplicChange", info);
            })
            .on('error', function (info) {
                console.log("error replication");
                $rootScope.modelDb.replicateReady = true;
                $rootScope.$evalAsync();
            })
            .on('paused', function (err) {
                //if (!err) {

                if (!$rootScope.modelDb.replicateReady) {
                    $rootScope.modelDb.replicateReady = true;
                    $rootScope.dbReplicate.destroy().then(function () {
                        $rootScope.InitDBReplicate();
                    });
                }

                $rootScope.$evalAsync();
                //} else {
                //    console.error(err);
                //}
            });


        $rootScope.dbReplicate.setSchema([
            {
                singular: 'ShoppingCart',
                plural: 'ShoppingCarts'
            },
            {
                singular: 'Event',
                plural: 'Events'
            },
            {
                singular: 'CashMovement',
                plural: 'CashMovements'
            },
            {
                singular: 'PosLog',
                plural: 'PosLogs'
            },
            {
                singular: 'PaymentEdit',
                plural: 'PaymentEdits'
            },
            {
                singular: 'PaymentEditWithHistory',
                plural: 'PaymentEditWithHistorys'
            },
            {
                singular: 'ZPeriod',
                plural: 'ZPeriods'
            }
        ]);

        $rootScope.remoteDbReplicate.setSchema([
            {
                singular: 'ZPeriod',
                plural: 'ZPeriods'
            }
        ]);
    };

    $rootScope.InitDBReplicate();

    if ($rootScope.noIzibox) {
        $rootScope.modelDb.replicateReady = true;
    }
    //#endregion

    //#region dbZPos
    $rootScope.InitDBZpos = function () {
        //$rootScope.dbZPos = new PouchDB('izipos_zpos', { adapter: settingsPouchDB.typeDB });

        var zposInfo = undefined;

        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
            var urlZPosCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/zpos";
            $rootScope.remoteDbZPos = new PouchDB(urlZPosCouchDb);

            $rootScope.remoteDbZPos.setSchema([
                {
                    singular: 'ShoppingCart',
                    plural: 'ShoppingCarts'
                },
                {
                    singular: 'PaymentValues',
                    plural: 'AllPaymentValues'
                }
            ]);

            $rootScope.modelDb.zposReady = true;

            //$rootScope.dbZPos.info().then(function (resInfo) {
            //    zposInfo = resInfo;
            //    if (!zposInfo) {
            //        $rootScope.modelDb.zposReady = true;
            //    }
            //}).catch(function (err) {
            //    $rootScope.modelDb.zposReady = true;
            //});

            // TODO: remove
            //$rootScope.dbZPos.replicate.to($rootScope.remoteDbZPos, settingsPouchDB.optsReplicate)
            //    .on('change', function (info) {
            //        if (!info) {
            //            info = {};
            //        }
            //        info.remoteInfo = zposInfo;
            //        $rootScope.modelDb.zposReady = false;
            //        info.status = "Change";
            //        $rootScope.$emit("dbZposChange", info);
            //    })
            //    .on('error', function (info) {
            //        $rootScope.modelDb.zposReady = true;
            //        $rootScope.$evalAsync();
            //    })
            //    .on('paused', function (err) {
            //        //if (!err) {

            //            if (!$rootScope.modelDb.zposReady) {
            //                $rootScope.modelDb.zposReady = true;
            //                $rootScope.dbZPos.destroy().then(function () {
            //                    $rootScope.InitDBZpos();
            //                });
            //            }

            //            $rootScope.$evalAsync();
            //        //} else {
            //        //    console.error(err);
            //        //}
            //    });
        } else {
            $rootScope.modelDb.zposReady = true;
        }

        //$rootScope.dbZPos.setSchema([
        //    {
        //        singular: 'ShoppingCart',
        //        plural: 'ShoppingCarts'
        //    },
        //    {
        //        singular: 'PaymentValues',
        //        plural: 'AllPaymentValues'
        //    }
        //]);
    };


    $rootScope.InitDBZpos();

    if ($rootScope.noIzibox) {
        $rootScope.modelDb.zposReady = true;
    }
    //#endregion
};

var syncValidatePoolDb = function ($rootScope,settingsPouchDB) {
    var syncRunning = false;

<<<<<<< HEAD
    $rootScope.dbValidatePool = new PouchDB('izipos_validatepool', {size: 50, adapter: settingsPouchDB.typeDB});
=======
    $rootScope.dbValidatePool = new PouchDB('izipos_validatepool', { adapter: settingsPouchDB.typeDB});
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
        var urlValidatePoolCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/validatepool";
        var remoteDbValidatePool = new PouchDB(urlValidatePoolCouchDb);

        var runpoolSync = function (immediately) {
            if (!syncRunning) {

                syncRunning = true;

                setTimeout(function () {
                    syncRunning = false;

                    $rootScope.dbValidatePoolHandler = $rootScope.dbValidatePool.sync(remoteDbValidatePool, settingsPouchDB.optsSync);

                    $rootScope.dbValidatePoolHandler.on('active', function () {
                        console.log("validatepool_sync active");
                    }).on('denied', function (err) {
                        console.log("validatepool_sync denied");
                        $rootScope.dbValidatePoolHandler.removeAllListeners();
                        runpoolSync();
                    }).on('complete', function (info) {
                        $rootScope.dbValidatePoolHandler.removeAllListeners();
                        runpoolSync();
                    }).on('error', function (err) {
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



