app.configPouchDb = function ($rootScope, $q, zposService, posService) {

    // Destroy local database if changed
    if ($rootScope.IziBoxConfiguration.deleteCouchDb != undefined && $rootScope.IziBoxConfiguration.deleteCouchDb) {
        new PouchDB('izipos_datas').destroy().then(function () {
            new PouchDB('izipos_replicate').destroy().then(function () {
                new PouchDB('izipos_zpos').destroy().then(function () {
                    new PouchDB('izipos_freeze').destroy().then(function () {
                        new PouchDB('utils').destroy().then(function () {
                            console.log("Datas destroyed");
                            setupDatabases($rootScope, $q, zposService, posService);
                        });
                    });
                });
            });
        });
    } else {
        // Recreates database
        setupDatabases($rootScope, $q, zposService, posService);
    }
};

var settingsPouchDB = {
    typeDB: 'websql',
    opts: { live: true, retry: true, batch_size: 50, batches_limit: 100, heartbeat: 5000 },
    optsReplicate: { live: true, retry: true, batch_size: 10, batches_limit: 8, heartbeat: 5000 },
    optsSync: { live: false, retry: false, batch_size: 10, batches_limit: 8 },
    // auth: {username: 'posnf', password: 'Izipass2018'}
};

/**
 * Create the local databases
 * @param $rootScope
 */
var setupDatabases = function ($rootScope, $q, zposService, posService) {

    // TODO: comment  for release
    // PouchDB.debug.enable('*');


    // Instantiate PouchDB
    $rootScope.dbInstance = new PouchDB('izipos_datas', { adapter: settingsPouchDB.typeDB });
    $rootScope.dbOrder = new PouchDB('izipos_order', { adapter: settingsPouchDB.typeDB });
    $rootScope.dbFreeze = new PouchDB('izipos_freeze', { adapter: settingsPouchDB.typeDB });

    console.info("PouchDb adapter : " + $rootScope.dbInstance.adapter); // prints either 'idb' or 'websql'

    //$rootScope.dbInstance.info().then(console.log.bind(console));

    $rootScope.modelDb = {};
    $rootScope.modelDb.databaseReady = false;
    $rootScope.modelDb.dataReady = false;
    $rootScope.modelDb.replicateReady = false;
    $rootScope.modelDb.freezeReady = false;
    $rootScope.modelDb.orderReady = false;
    $rootScope.modelDb.zposReady = false;
    $rootScope.modelDb.configReplicationReady = false;

    /**
	 * 	Freeze - Database  for the shared ticket queue for pos user information
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
                            $rootScope.$emit("dbDatasReplicate", { status:"UpToDate"});
                        }
                    } else {
                        $rootScope.modelDb.dataReady = true;
                        $rootScope.$evalAsync();
                        $rootScope.$emit("dbDatasReplicate", { status: "UpToDate"});
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
                'PictureId': { belongsTo: 'Picture' },
                'CategoryTemplateId': { belongsTo: 'CategoryTemplate' }
            }
        },
        {
            singular: 'PosUser',
            plural: 'PosUsers',
            relations: {
                'PictureId': { belongsTo: 'Picture' }
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
                'ProductTemplateId': { belongsTo: 'ProductTemplate' }
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
        $rootScope.dbReplicate = new PouchDB('izipos_replicate', { adapter: settingsPouchDB.typeDB });

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
        $rootScope.dbZPos = new PouchDB('izipos_zpos', { adapter: settingsPouchDB.typeDB });

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

            $rootScope.dbZPos.info().then(function (resInfo) {
                zposInfo = resInfo;
                if (!zposInfo) {
                    $rootScope.modelDb.zposReady = true;
                }
            }).catch(function (err) {
                $rootScope.modelDb.zposReady = true;
            });

            // TODO: remove
            $rootScope.dbZPos.replicate.to($rootScope.remoteDbZPos, settingsPouchDB.optsReplicate)
                .on('change', function (info) {
                    if (!info) {
                        info = {};
                    }
                    info.remoteInfo = zposInfo;
                    $rootScope.modelDb.zposReady = false;
                    info.status = "Change";
                    $rootScope.$emit("dbZposChange", info);
                })
                .on('error', function (info) {
                    $rootScope.modelDb.zposReady = true;
                    $rootScope.$evalAsync();
                })
                //.on('complete', function () {
                //    $rootScope.modelDb.zposReady = true;
                //    $rootScope.$evalAsync();
                //})
                .on('paused', function (err) {
                    //if (!err) {

                        if (!$rootScope.modelDb.zposReady) {
                            $rootScope.modelDb.zposReady = true;
                            $rootScope.dbZPos.destroy().then(function () {
                                $rootScope.InitDBZpos();
                            });
                        }

                        $rootScope.$evalAsync();
                    //} else {
                    //    console.error(err);
                    //}
                });
        } else {
            $rootScope.modelDb.zposReady = true;
        }

        $rootScope.dbZPos.setSchema([
            {
                singular: 'ShoppingCart',
                plural: 'ShoppingCarts'
            },
            {
                singular: 'PaymentValues',
                plural: 'AllPaymentValues'
            }
        ]);
    };


    $rootScope.InitDBZpos();

    if ($rootScope.noIzibox) {
        $rootScope.modelDb.zposReady = true;
    }
    //#endregion
};

/**
 * Create the replication document on the couchDb
 * @deprecated
 * @param $rootScope
 * @param $q
 */
var setupReplicationIzibox = function ($rootScope, $q) {
    var urlReplicator = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/_replicator";

    var dataFrom = {
        _id: "dataFrom",
        source: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb,
        target: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb,
        continuous: true
    };

    var replicFrom = {
        _id: "replicFrom",
        source: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",
        target: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",
        continuous: true
    };

    var replicTo = {
        _id: "replicTo",
        source: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",
        target: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",

        continuous: true
    };

    var orderFrom = {
        _id: "orderFrom",
        source: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",
        target: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",
        continuous: true
    };

    var orderTo = {
        _id: "orderTo",
        source: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",
        target: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",

        continuous: true
    };

    /**
	 *  Add replication Doc asynchronously
	 *
     */
    var addFuncAsync = function () {
        var addFuncDefer = $q.defer();

        var replicator = new PouchDB(urlReplicator);
        var allAdded = false;

        addReplicationAsync($q, replicator, "dataFrom", dataFrom).then(function (r) {
            allAdded = r;
            addReplicationAsync($q, replicator, "replicFrom", replicFrom).then(function (r) {
                allAdded = r;
                addReplicationAsync($q, replicator, "replicTo", replicTo).then(function (r) {
                    allAdded = r;
                    addReplicationAsync($q, replicator, "orderFrom", orderFrom).then(function (r) {
                        allAdded = r;
                        addReplicationAsync($q, replicator, "orderTo", orderTo).then(function (r) {
                            allAdded = r;
                            if (allAdded) {
                                console.log("Replication OK");
                                $rootScope.modelDb.configReplicationReady = true;
                                addFuncDefer.resolve();
                            } else {
                                addFuncAsync().then(function () {
                                    addFuncDefer.resolve();
                                });
                            }
                        });
                    });
                });
            });
        });

        return addFuncDefer.promise;
    };

    /**
	 * Remove the replication doc asynchronously
     */
    var removeFuncAsync = function () {
        var removeFuncDefer = $q.defer();

        var replicator = new PouchDB(urlReplicator);

        removeReplicationAsync($q, replicator, "dataFrom").then(function () {
            removeReplicationAsync($q, replicator, "replicFrom").then(function () {
                removeReplicationAsync($q, replicator, "replicTo").then(function () {
                    removeReplicationAsync($q, replicator, "orderFrom").then(function () {
                        removeReplicationAsync($q, replicator, "orderTo").then(function () {
                            console.log("Remove Replication OK");
                            removeFuncDefer.resolve();
                        });
                    });
                });
            });
        });

        return removeFuncDefer.promise;
    };

    // Recreation of documents
    if ($rootScope.IziBoxConfiguration.deleteCouchDb) {
        removeFuncAsync().then(function () {
            addFuncAsync();
        });
    } else {
        addFuncAsync();
    }
};

/**
* Add a replication document in the couchDb
 *
 * TODO : Filter the replication
 * =>  https://pouchdb.com/2015/04/05/filtered-replication.html
 */
var addReplicationAsync = function ($q, replicator, name, obj) {
    var replicDefer = $q.defer();

    obj._deleted = false;

    replicator.get(name).then(function (res) {
        replicDefer.resolve(true);
    }, function () {
        replicator.post(obj).then(function () {
            replicDefer.resolve(false);
        }, function (errPut) {
            console.log(errPut);
            replicDefer.resolve(false);
        })
    });

    return replicDefer.promise;
};

/**
 * Remove a replication doc
 * @param $q
 * @param replicator
 * @param name
 */
var removeReplicationAsync = function ($q, replicator, name) {
    var replicDefer = $q.defer();

    replicator.get(name).then(function (res) {
        replicator.remove(res).then(function () {
            replicDefer.resolve();
        }, function () {
            replicDefer.resolve();
        });
    }, function (err) {
        replicDefer.resolve();
    });

    return replicDefer.promise;
};

/**
 * Create a zpos
 * @param $rootScope
 */
var setupZPos = function ($rootScope) {

    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
        $.getJSON("datas/zpos.json", function (data) {
            var dataJson = JSON.stringify(data);

            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            db.get("_design/zpos").then(function (resDoc) {
                data._rev = resDoc._rev;
                db.put(data).then(function (response) {
                }).catch(function () {
                    console.error("ZPOS map error !");
                });
            }).catch(function () {
                db.put(data).then(function (response) {
                }).catch(function () {
                    console.error("ZPOS map error !");
                });
            });
        });
    }
};



var syncValidatePoolDb = function ($rootScope) {
    var syncRunning = false;

    $rootScope.dbValidatePool = new PouchDB('izipos_validatepool', { adapter: settingsPouchDB.typeDB });
    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
        var urlValidatePoolCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/validatepool";
        var remoteDbValidatePool = new PouchDB(urlValidatePoolCouchDb);

        var runpoolSync = function (immediately) {
            if (!syncRunning) {

                syncRunning = true;

                setTimeout(function () {
                    syncRunning = false;

                    $rootScope.dbValidatePool.sync(remoteDbValidatePool, settingsPouchDB.optsSync).on('active', function () {
                        console.log("validatepool_sync active");
                    }).on('denied', function (err) {
                        console.log("validatepool_sync denied");
                        runpoolSync();
                    }).on('complete', function (info) {
                        //console.log("pool complete");
                        runpoolSync();
                    }).on('error', function (err) {
                        console.log("validatepool_sync error");
                        runpoolSync();
                    });
                }, immediately ? 0 : 30000);
            }
        };

        runpoolSync(true);
    }
};


var syncUtilsDb = function ($rootScope) {
    //Create local db, and sync it with couch db
    var hdid = $rootScope.modelPos.hardwareId;
    var syncRunning = false;

    $rootScope.dbUtils = new PouchDB('izipos_utils', { adapter: settingsPouchDB.typeDB });
    $rootScope.dbUtils.setSchema([
        {
            singular: 'Dailyticket',
            plural: 'Dailytickets'
        },
        {
            singular: 'RkCounter',
            plural: 'RkCounters'
        }
    ]);

    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
        $rootScope.remoteDbUtils = new PouchDB('http://' + $rootScope.IziBoxConfiguration.LocalIpIziBox + ':5984/utils');
        $rootScope.remoteDbUtils.setSchema([
            {
                singular: 'ZPeriod',
                plural: 'ZPeriods'
            },
            {
                singular: 'YPeriod',
                plural: 'YPeriods'
            }
        ]);

        var runUtilsSync = function (immediately) {

            if (!syncRunning) {

                syncRunning = true;

                setTimeout(function () {
                    syncRunning = false;

                    $rootScope.dbUtils.sync($rootScope.remoteDbUtils, settingsPouchDB.optsSync).on('active', function () {
                        //console.log("utils_sync active");
                    }).on('change', function () {
                        console.log("utils_sync change");
                        $rootScope.$emit("dbUtilsUpdated");
                    }).on('denied', function (err) {
                        console.log("utils_sync denied");
                        runUtilsSync();
                    }).on('complete', function (info) {
                        runUtilsSync();
                    }).on('error', function (err) {
                        console.log("utils_sync error");
                        runUtilsSync();
                    });
                }, immediately ? 0 : 5000);
            }
        };

        runUtilsSync(true);
    }
};
