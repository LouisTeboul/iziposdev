app.configPouchDb = function ($rootScope, $q, zposService) {
	//Destroy localdb if changed
	if ($rootScope.IziBoxConfiguration.deleteCouchDb != undefined && $rootScope.IziBoxConfiguration.deleteCouchDb) {
		new PouchDB('izipos_datas').destroy().then(function () {
			new PouchDB('izipos_replicate').destroy().then(function () {
				new PouchDB('izipos_zpos').destroy().then(function () {
					new PouchDB('izipos_freeze').destroy().then(function () {
						console.log("Datas destroyed");
						setupDatabases($rootScope, $q, zposService);
					});
				});
			});
		});
	} else {
		setupDatabases($rootScope, $q, zposService);
	}
}

var setupDatabases = function ($rootScope, $q, zposService) {
	$rootScope.configPouchDB = {
		typeDB: 'websql',
		//opts : { live: true, retry: true },
		//optsReplicate : { live: true, retry: true },
		//optsReplicate : { live: true, retry: true, batch_size: 100, batches_limit: 4 },
		opts: { live: true, retry: true, batch_size: 50, batches_limit: 100 },
		optsReplicate: { live: true, retry: true, batch_size: 10, batches_limit: 8 }
	}

	//Instantiate PouchDB
	$rootScope.dbInstance = new PouchDB('izipos_datas', { adapter: $rootScope.configPouchDB.typeDB });
	$rootScope.dbOrder = new PouchDB('izipos_order', { adapter: $rootScope.configPouchDB.typeDB });
	$rootScope.dbFreeze = new PouchDB('izipos_freeze', { adapter: $rootScope.configPouchDB.typeDB });

	console.log($rootScope.dbInstance.adapter); // prints either 'idb' or 'websql'

	$rootScope.dbInstance.info().then(console.log.bind(console));

	$rootScope.modelDb = {};
	$rootScope.modelDb.databaseReady = false;
	$rootScope.modelDb.dataReady = false;
	$rootScope.modelDb.replicateReady = false;
	$rootScope.modelDb.freezeReady = false;
	$rootScope.modelDb.orderReady = false;
	$rootScope.modelDb.zposReady = false;
	$rootScope.modelDb.configReplicationReady = false;



	//#region dbFreeze
	var freezeRemoteInfo = undefined;

	if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
		var urlFreezeCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/freeze";
		var remoteDbFreeze = new PouchDB(urlFreezeCouchDb);

		remoteDbFreeze.info().then(function (resRemoteInfo) {
			freezeRemoteInfo = resRemoteInfo;
		}).catch(function (err) {
			$rootScope.modelDb.freezeReady = true;
			$rootScope.$evalAsync();
		});

		$rootScope.dbFreeze.replicate.to(remoteDbFreeze, $rootScope.configPouchDB.opts, null);
		$rootScope.dbFreeze.replicate.from(remoteDbFreeze, $rootScope.configPouchDB.opts, null)
            .on('change', function (info) {
            	if (!info) {
            		info = {};
            	}
            	info.remoteInfo = freezeRemoteInfo;
            	info.status = "Change";
            	$rootScope.$emit("dbFreezeChange", info);
            })
            .on('paused', function (info) {
            	//console.log("dbFreeze => UpToDate");
            	if (!info) {
            		info = {};
            	}

            	if ($rootScope.modelDb.databaseReady) {
            		$rootScope.$emit("dbFreezeReplicate", info);
            	}
            	$rootScope.modelDb.freezeReady = true;
            	$rootScope.$evalAsync();
            })
            .on('error', function (info) {
            	//console.log("dbFreeze => Error");
            	//console.log(info);
            	$rootScope.modelDb.freezeReady = true;
            	$rootScope.$evalAsync();
            });
	} else {
		$rootScope.modelDb.freezeReady = true;
	}

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

	//#region dbInstance
	var datasRemoteInfo = undefined;

	var urlCouchDb = $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb;

	if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
		urlCouchDb = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb;
	}

	var remoteDbInstance = new PouchDB(urlCouchDb);

	remoteDbInstance.info().then(function (resRemoteInfo) {
		datasRemoteInfo = resRemoteInfo;

		//create replication
		//Fait par l'izibox en 2.0.0.13
		//if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
		//	setupReplicationIzibox($rootScope, $q);
		//} else {
		//	$rootScope.modelDb.configReplicationReady = true;
		//}

		$rootScope.modelDb.configReplicationReady = true;


	}).catch(function (err) {
		//console.log(err);
		$rootScope.modelDb.dataReady = true;
		$rootScope.modelDb.configReplicationReady = true;
		$rootScope.$evalAsync();
		$rootScope.$emit("dbDatasReplicate", err);
	});


	$rootScope.dbInstance.replicate.from(remoteDbInstance, $rootScope.configPouchDB.opts, null)
      .on('change', function (info) {
      	if (!info) {
      		info = {};
      	}
      	//console.log("PouchDB  => Change");
      	info.remoteInfo = datasRemoteInfo;
      	info.status = "Change";
      	$rootScope.$emit("dbDatasReplicate", info);
      }).on('paused', function (info) {
      	//console.log("dbInstance => UpToDate");
      	if (!info) {
      		info = {};
      	}

      	$rootScope.modelDb.dataReady = true;
      	$rootScope.$evalAsync();
      	info.status = "UpToDate";
      	$rootScope.$emit("dbDatasReplicate", info);

      }).on('error', function (info) {
      	if (!info) {
      		info = {};
      	}
      	//console.log("PouchDB => Error");
      	console.log(info);
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
		//console.log("PouchDB  => Change");
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

		$rootScope.dbOrder.replicate.to(remoteDbOrder, $rootScope.configPouchDB.opts, null);
		$rootScope.dbOrderFrom = $rootScope.dbOrder.replicate.from(remoteDbOrder, $rootScope.configPouchDB.opts, null);
		$rootScope.dbOrderFrom
            .on('paused', function (info) {
            	//console.log("dbOrder => UpToDate");
            	if (!info) {
            		info = {};
            	}

            	if ($rootScope.modelDb.databaseReady) {
            		$rootScope.$emit("dbOrderReplicate", info);
            	}
            	$rootScope.modelDb.orderReady = true;
            	$rootScope.$evalAsync();
            })
            .on('change', function (change) {
            	change.remoteInfo = orderRemoteInfo;
            	$rootScope.$emit("dbOrderChange", change);
            })
            .on('error', function (info) {
            	//console.log("dbOrder => Error");
            	//console.log(info);
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
		$rootScope.dbReplicate = new PouchDB('izipos_replicate', { adapter: $rootScope.configPouchDB.typeDB });

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

		$rootScope.dbReplicate.replicate.to($rootScope.remoteDbReplicate, $rootScope.configPouchDB.optsReplicate, null)
            .on('change', function (info) {
            	if (!info) {
            		info = {};
            	}
            	info.remoteInfo = replicateInfo;
            	info.status = "Change";
            	$rootScope.$emit("dbReplicChange", info);
            })
            .on('error', function (info) {
            	$rootScope.modelDb.replicateReady = true;
            	$rootScope.$evalAsync();
            })
            .on('paused', function (info) {
            	if (!info) {
            		info = {};
            	}

            	if (!$rootScope.modelDb.replicateReady) {
            		$rootScope.modelDb.replicateReady = true;
            		$rootScope.dbReplicate.destroy().then(function () {
            			$rootScope.InitDBReplicate();
            		});
            	}

            	$rootScope.$evalAsync();
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
        }
		]);
	}

	$rootScope.InitDBReplicate();

	if ($rootScope.noIzibox) {
		$rootScope.modelDb.replicateReady = true;
	}

	//#endregion

	//#region dbZPos
	$rootScope.InitDBZpos = function () {
		$rootScope.dbZPos = new PouchDB('izipos_zpos', { adapter: $rootScope.configPouchDB.typeDB });

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


			$rootScope.dbZPos.replicate.to($rootScope.remoteDbZPos, $rootScope.configPouchDB.optsReplicate, null)
                .on('change', function (info) {
                	if (!info) {
                		info = {};
                	}
                	info.remoteInfo = zposInfo;
                	info.status = "Change";
                	$rootScope.$emit("dbZposChange", info);
                })
                .on('error', function (info) {
                	$rootScope.modelDb.zposReady = true;
                	$rootScope.$evalAsync();
                })
				.on('complete', function (info) {
				    $rootScope.modelDb.zposReady = true;
				    $rootScope.$evalAsync();
				})
                .on('paused', function (info) {
                	if (!info) {
                		info = {};
                	}

                	if (!$rootScope.modelDb.zposReady) {
                		$rootScope.modelDb.zposReady = true;
                		$rootScope.dbZPos.destroy().then(function () {
                			$rootScope.InitDBZpos();
                		});
                	}

                	$rootScope.$evalAsync();
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
	}


	$rootScope.InitDBZpos();
	//Create map and reduce for Z
	//Fait par l'izibox en 2.0.0.13
	//setupZPos($rootScope);

	if ($rootScope.noIzibox) {
		$rootScope.modelDb.zposReady = true;
	}

	//#endregion

	//if (remoteDbInstance) remoteDbInstance.compact().then(function (res) { console.log("remoteDbInstanceCompact OK"); }).catch(function (err) { console.log("remoteDbInstanceCompact ERROR"); });
	//if (remoteDbReplicate) remoteDbReplicate.compact().then(function (res) { console.log("remoteDbReplicateCompact OK"); }).catch(function (err) { console.log("remoteDbReplicateCompact ERROR"); });
	//if (remoteDbZPos) remoteDbZPos.compact().then(function (res) { console.log("remoteDbZPosCompact OK"); }).catch(function (err) { console.log("remoteDbZPosCompact ERROR"); });
	//if (remoteDbFreeze) remoteDbFreeze.compact().then(function (res) { console.log("remoteDbFreezeCompact OK"); }).catch(function (err) { console.log("remoteDbFreezeCompact ERROR"); });
}

var setupReplicationIzibox = function ($rootScope, $q) {
	var urlReplicator = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/_replicator";

	var dataFrom = {
		_id: "dataFrom",
		source: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb,
		target: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb,
		continuous: true
	}

	var replicFrom = {
		_id: "replicFrom",
		source: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",
		target: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",
		continuous: true
	}

	var replicTo = {
		_id: "replicTo",
		source: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",
		target: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_replicate",

		continuous: true
	}

	var orderFrom = {
		_id: "orderFrom",
		source: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",
		target: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",
		continuous: true
	}

	var orderTo = {
		_id: "orderTo",
		source: "http://127.0.0.1:5984/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",
		target: $rootScope.IziBoxConfiguration.UrlCouchDb + "/" + $rootScope.IziBoxConfiguration.IdxCouchDb + "_order",

		continuous: true
	}

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
	}

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
	}

	if ($rootScope.IziBoxConfiguration.deleteCouchDb) {
		removeFuncAsync().then(function () {
			addFuncAsync();
		});
	} else {
		addFuncAsync();
	}
}

var addReplicationAsync = function ($q, replicator, name, obj) {
	var replicDefer = $q.defer();

	obj._deleted = false;

	replicator.get(name).then(function (res) {
		replicDefer.resolve(true);
	}, function (err) {
		replicator.post(obj).then(function () {
			replicDefer.resolve(false);
		}, function (errPut) {
			console.log(errPut);
			replicDefer.resolve(false);
		})
	});

	return replicDefer.promise;
}

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
}

var setupZPos = function ($rootScope) {

	if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
		$.getJSON("datas/zpos.json", function (data) {
			var dataJson = JSON.stringify(data);

			var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

			db.get("_design/zpos").then(function (resDoc) {
				data._rev = resDoc._rev;
				db.put(data).then(function (response) {
					//console.log("ZPOS map created !");
				}).catch(function (errPut) {
					console.log("ZPOS map error !");
				});
			}).catch(function (err) {
				db.put(data).then(function (response) {
					//console.log("ZPOS map created !");
				}).catch(function (errPut) {
					console.log("ZPOS map error !");
				});
			});


		});
	}
}