/**
 * TODO : Exclude this documents
 * @param $rootScope
 * @param $q
 * @param zposService
 */
app.configPouchDb = function ($rootScope, $q, zposService) {

	setTimeout(function () {
		console.log("Datas destroyed");
		setupDatabases($rootScope, $q, zposService);
	}, 5000);
};

var settingsPouchDB = {
	typeDB: 'websql',
	//opts : { live: true, retry: true },
	//optsReplicate : { live: true, retry: true },
	//optsReplicate : { live: true, retry: true, batch_size: 100, batches_limit: 4 },
	opts: { live: true, retry: true, batch_size: 50, batches_limit: 100 },
	optsReplicate: { live: true, retry: true, batch_size: 10, batches_limit: 8 }
};

var setupDatabases = function ($rootScope, $q, zposService) {
	//Instantiate PouchDB
	$rootScope.dbInstance = new PouchDB('izipos_datas', { adapter: settingsPouchDB.typeDB });
	$rootScope.dbOrder = new PouchDB('izipos_order', { adapter: settingsPouchDB.typeDB });
	$rootScope.dbFreeze = new PouchDB('izipos_freeze', { adapter: settingsPouchDB.typeDB });

	console.log($rootScope.dbInstance.adapter); // prints either 'idb' or 'websql'

	$rootScope.dbInstance.info().then(console.log.bind(console));

	$rootScope.modelDb = {};
	$rootScope.modelDb.databaseReady = false;
	$rootScope.modelDb.dataReady = false;
	$rootScope.modelDb.replicateReady = true;
	$rootScope.modelDb.freezeReady = true;
	$rootScope.modelDb.orderReady = true;
	$rootScope.modelDb.zposReady = true;
	$rootScope.modelDb.configReplicationReady = true;



	//#region dbFreeze
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

	var loadDbInstanceSuccess = function () {
		console.log("Load datas demo success !");
		var info = {};

		$rootScope.modelDb.dataReady = true;
		$rootScope.$evalAsync();
		info.status = "UpToDate";
		$rootScope.$emit("dbDatasReplicate", info);
	};

	$rootScope.dbInstance.info().then(function (dbInfo) {
		if (dbInfo.doc_count === 0) {
			$rootScope.dbInstance.load("datas/dumpDemo.txt").then(function () {
				loadDbInstanceSuccess();
			}).catch(function (err) {
				console.error(err);
			});
		} else {
			loadDbInstanceSuccess();
		}
	}).catch(function (err) {
		console.log(err);
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
		$rootScope.dbZPos = new PouchDB('izipos_zpos', { adapter: settingsPouchDB.typeDB });

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

	if ($rootScope.noIzibox) {
		$rootScope.modelDb.zposReady = true;
	}

	//#endregion


};

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

	if ($rootScope.IziBoxConfiguration.deleteCouchDb) {
		removeFuncAsync().then(function () {
			addFuncAsync();
		});
	} else {
		addFuncAsync();
	}
};

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
};

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

var setupZPos = function ($rootScope) {

	if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
		$.getJSON("datas/zpos.json", function (data) {
			var dataJson = JSON.stringify(data);

			var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

			db.get("_design/zpos").then(function (resDoc) {
				data._rev = resDoc._rev;
				db.put(data).then(function (response) {

				}).catch(function (errPut) {
					console.log("ZPOS map error !");
				});
			}).catch(function (err) {
				db.put(data).then(function (response) {
				}).catch(function (errPut) {
					console.log("ZPOS map error !");
				});
			});


		});
	}
};