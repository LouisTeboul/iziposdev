app.controller('ModalTablePlanController', function ($scope, $rootScope, $uibModalInstance, $translate, currentStoreMap, currentTableNumber, currentTableCutleries, shoppingCartService, $mdMedia) {
	var areaSelectedIndexHandler;
	var areaCanvas;
	var initCurrentTableNumber = currentTableNumber;
	var initCurrentTableCutleries = currentTableCutleries;

	$scope.currentCanvas;
	$scope.currentMap;
	$scope.currentArea;
	$scope.isLoading = false;
	$scope.mapSelectedIndex = 0;
	$scope.$mdMedia = $mdMedia;

	$scope.storeMap = currentStoreMap;

	$scope.freezedShoppingCarts = undefined;

	$scope.tableModel = {
		valueTable: currentTableNumber,
		valueCutleries: currentTableCutleries,
		criterias: undefined,
		allCriteriasSelected: true
	}
	
	var mapSelectedIndexhandler = $scope.$watch("mapSelectedIndex", function () {
		updateWatchers();
	});

	var updateWatchers = function () {
		if ($scope.storeMap) {

			$scope.currentMap = $scope.storeMap.data[$scope.mapSelectedIndex];

			if (areaSelectedIndexHandler) areaSelectedIndexHandler();

			areaSelectedIndexHandler = $scope.$watch("currentMap.areaSelectedIndex", function () {
				if ($scope.storeMap) {
					$scope.currentArea = $scope.currentMap.Areas[$scope.currentMap.areaSelectedIndex];
					loadAreaCanvas();
					loadAreaCriterias();
				}
			});

			loadAreaCanvas();
		}
	}

	$scope.init = function () {

		initializeFabric();

		setTimeout(function () {
			updateWatchers();
		}, 100);


		//ResizeEvent
    	window.addEventListener('resize', function () {
    		resizeAreaCanvas();
    	});
	}

	var initializeFabric = function () {
		
		var movingBox;

		//fabric.Labeledrect = fabric.util.createClass(fabric.Rect, {
		//	type: 'Labeledrect',
		//	initialize: function (options) {
		//		options || (options = {});
		//		this.callSuper('initialize', options);
		//		this.set('label', options.label);
		//		this.set('id', options.id);
		//	},
		//	toObject: function () {
		//		return fabric.util.object.extend(this.callSuper('toObject'), {
		//			label: this.get('label'),
		//			id: this.get('id')
		//		});
		//	},
		//	_render: function (ctx) {
		//		this.callSuper('_render', ctx);
		//		ctx.font = '10px Helvetica';
		//		ctx.fillStyle = '#333';
		//		ctx.fillText(this.table.TableNumber, -5,0);
		//	}

		//});

		fabric.Labeledrect = fabric.util.createClass(fabric.Group, {
			type: 'Labeledrect',
			initialize: function (options) {
				options || (options = {});
				this.callSuper('initialize', options);
				this.set('label', options.label);
				this.set('id', options.id);
				this.set('type', 'Labeledrect');
				this.set('fill', options.fill);

				var w = options.width * options.scaleX;
				var h = options.height * options.scaleY;
				var text = options.label.replace(/ \(.*\)/g, "");

				this._objects = [
					new fabric.Rect({ top: -h/2, left: -w / 2, width: w, height: h, fill: options.fill }),
					new fabric.Text(text, { top: (-h / 2)+5, left: (-w / 2)+5, fill: 'white', fontSize: 28 })
				];
				this.top = options.top;
				this.left = options.left;
				this.width = w;
				this.height = h;
				this.selectable = true;
				}
		});

		fabric.Labeledrect.fromObject = function (object, callback) {
			callback && callback(new fabric.Labeledrect(object));
		};

		fabric.Labeledrect.async = true;

		//fabric.Labeledcircle = fabric.util.createClass(fabric.Circle, {
		//	type: 'Labeledcircle',
		//	initialize: function (options) {
		//		options || (options = {});
		//		this.callSuper('initialize', options);
		//		this.set('label', options.label);
		//		this.set('id', options.id);
		//	},
		//	toObject: function () {
		//		return fabric.util.object.extend(this.callSuper('toObject'), {
		//			label: this.get('label'),
		//			id: this.get('id')
		//		});
		//	},
		//	_render: function (ctx) {
		//		this.callSuper('_render', ctx);
		//		ctx.font = '10px Helvetica';
		//		ctx.fillStyle = '#333';
		//		ctx.fillText(this.table.TableNumber, -5, 0);
		//	}

		//});

		fabric.Labeledcircle = fabric.util.createClass(fabric.Group, {
			type: 'Labeledcircle',
			initialize: function (options) {
				options || (options = {});
				this.callSuper('initialize', options);
				this.set('label', options.label);
				this.set('id', options.id);
				this.set('type', 'Labeledcircle');
				this.set('fill', options.fill);

				var w = options.width * options.scaleX;
				var h = options.height * options.scaleY;
				
				var text = options.label.replace(/ \(.*\)/g, "");

				this._objects = [
					new fabric.Circle({ top: -options.height / 2, left: -options.width / 2, width: options.width, height: options.height, scaleX: options.scaleX, scaleY: options.scaleY, radius: options.radius, fill: options.fill }),
					new fabric.Text(text, { top: (-h / 2) + 15, left: (-w / 2) + 20, fill: 'white', fontSize: 28 })
				];
				this.top = options.top;
				this.left = options.left;
				this.width = w;
				this.height = h;
				this.selectable = true;
			}
		});

		fabric.Labeledcircle.fromObject = function (object, callback) {
			callback && callback(new fabric.Labeledcircle(object));
		};

		fabric.Labeledcircle.async = true;
	}

	var resizeAreaCanvas = function () {
		if ($scope.currentMap && $scope.currentArea) {

			//Récupération de la div contenant le canvas
			var canvasContainer = document.getElementById("canvasContainer" + $scope.currentMap.Id + "" + $scope.currentArea.Id);
			var mapContainer = document.getElementById("mapContainer" + $scope.currentMap.Id + "" + $scope.currentArea.Id);
			var modalSection = document.getElementById("modalTablePlan");

			if (canvasContainer) {
				//Récupération de sa taille
				var containerSize = (modalSection.clientHeight <= modalSection.clientWidth) ? mapContainer.clientHeight - 5 : mapContainer.clientWidth - 5;

				if (containerSize > 0) {
					var scale = containerSize / 800;

					canvasContainer.style.webkitTransform = "scale(" + scale + ")";
					canvasContainer.style.webkitTransformOriginX = 0;
					canvasContainer.style.webkitTransformOriginY = 0;
					canvasContainer.style.width = containerSize + "px";
					canvasContainer.style.height = containerSize + "px";
				} else {
					setTimeout(resizeAreaCanvas, 500);
				}
			}

		}
	}

	var loadAreaCriterias = function () {

		$scope.tableModel.criterias = [];

		if ($scope.currentArea) {
			var enumCriterias = Enumerable.from($scope.tableModel.criterias);

			Enumerable.from($scope.currentArea.Objects).forEach(function (o) {
				Enumerable.from(o.Criterias).forEach(function (c) {
					if (!enumCriterias.any(function (ec) { return ec.Id == c.Id; })) {
						var newCriteria = clone(c);
						newCriteria.IsSelected = true;

						$scope.tableModel.criterias.push(newCriteria);
					}
				});
			});

		}

	}

	$scope.selectTable = function (idTable) {
		var table = Enumerable.from($scope.currentArea.Objects).firstOrDefault(function (o) { return o.Id == idTable; });

		if (table) {
			$scope.tableModel.valueTable = table.TableNumber;
			$scope.tableModel.valueCutleries = table.TableNumber == initCurrentTableNumber ? initCurrentTableCutleries :  table.Cutleries;

			if ($scope.freezedShoppingCarts) {
				var freezedShoppingCart = Enumerable.from($scope.freezedShoppingCarts).firstOrDefault(function (fsc) {
					return fsc.TableNumber == table.TableNumber;
				});
				if (freezedShoppingCart) {
					$scope.tableModel.valueCutleries = freezedShoppingCart.TableCutleries;
				}
			}
		}

		$scope.$evalAsync();
	}

	var loadAreaCanvas = function () {
		

		if ($scope.currentMap && $scope.currentArea) {

			$scope.isLoading = true;
			$scope.$evalAsync();

			//Récupération de la div contenant le canvas
			var canvasContainer = document.getElementById("canvasContainer" + $scope.currentMap.Id + "" + $scope.currentArea.Id);

			if (canvasContainer) {

				var loadDatas = function (freezedShoppingCarts) {
					//Vidage de la div
					while (canvasContainer.firstChild) {
						canvasContainer.removeChild(canvasContainer.firstChild);
					}

					//Récupération de sa hauteur
					var containerHeight = canvasContainer.clientHeight - 5;

					//Création du canvas
					var idCanvas = "areaCanvas" + $scope.currentMap.Id + "" + $scope.currentArea.Id;

					//Création du canvas pour les données
					var areaCanvas = $("<canvas>").attr("width", 800).attr("height", 800).attr("id", idCanvas)[0];

					//Ajout du canvas au container
					canvasContainer.appendChild(areaCanvas);

					var fabricAreaCanvas = new fabric.Canvas(areaCanvas);
					
					fabricAreaCanvas.observe('selection:created', function (e) {
						e.target.hasControls = false;
						e.target.evented = false;
					});

					if ($scope.currentArea.GeoJson) {
						fabricAreaCanvas.loadFromJSON($scope.currentArea.GeoJson, function () {
							fabricAreaCanvas.renderAll();

							//fabricAreaCanvas.setBackgroundColor('#D3D3D3', fabricAreaCanvas.renderAll.bind(fabricAreaCanvas));

							//Abonnement à l'évenement de sélection
							fabricAreaCanvas.on('object:selected', function (options) {
								var idTable = options.target.id;
								$scope.selectTable(idTable);

							});

							$scope.isLoading = false;
							$scope.$evalAsync();

							resizeAreaCanvas();

						}, function (jsonObj, fabObj) {
							fabObj["hasRotatingPoint"] = false;
							fabObj["evented"] = false;
							fabObj["transparentCorners"] = false;
							fabObj["cornerColor"] = "#d83448";
							fabObj["borderColor"] = "#d83448";

							var table = Enumerable.from($scope.currentArea.Objects).firstOrDefault(function (o) { return o.Id == fabObj.id; });

							var isSelectable = true;

							if (!$scope.tableModel.allCriteriasSelected) {
								
								if (table) {
									var selectedCriterias = Enumerable.from($scope.tableModel.criterias).where("c => c.IsSelected").toArray();

									isSelectable = (Enumerable.from(table.Criterias).any(function (tc) {
										return Enumerable.from(selectedCriterias).any(function (sc) { return sc.Id == tc.Id; });
									}));
								}
							}

							var isUsed = false;

							if (table) {
								isUsed = initCurrentTableNumber == table.TableNumber || (freezedShoppingCarts && Enumerable.from(freezedShoppingCarts).any(function (fsc) {
									return fsc.TableNumber == table.TableNumber;
								}));
							}

							fabObj["selectable"] = isSelectable;

							if (isUsed) {
								fabObj._objects[0]["fill"] = "#FF9200";
								fabObj["fill"] = "#FF9200";
							}

							if (!isSelectable) {
								fabObj._objects[0]["fill"] = "#D3D3D3";
								fabObj["fill"] = "#D3D3D3";
							}

							//if (isUsed) {
							//	fabObj["fill"] = "#FF9200";
							//}

							//if (!isSelectable) {
							//	fabObj["fill"] = "#D3D3D3";
							//}

							fabObj["table"] = table;
							table.fabObj = fabObj;

						});
					} else {
						$scope.isLoading = false;
						$scope.$evalAsync();

						resizeAreaCanvas();
					}
				}

				shoppingCartService.getFreezedShoppingCartsAsync().then(function (freezedShoppingCarts) {
					$scope.freezedShoppingCarts = freezedShoppingCarts;
					loadDatas(freezedShoppingCarts);
				}, function () {
					loadDatas();
				});
			}
		}
	}

	$scope.toggleAllCriterias = function () {
		$scope.tableModel.allCriteriasSelected = !$scope.tableModel.allCriteriasSelected;

		$scope.$evalAsync();

		loadAreaCanvas();
	}

	$scope.toggleCriteria = function (criteria) {
		criteria.IsSelected = !criteria.IsSelected;

		$scope.$evalAsync();

		loadAreaCanvas();
	}


    $scope.ok = function () {
    	$rootScope.closeKeyboard();
    	var tableNumberValue = parseInt($scope.tableModel.valueTable);
    	var tableCutleriesValue = parseInt($scope.tableModel.valueCutleries);

    	if (isNaN(tableNumberValue) || isNaN(tableCutleriesValue) || tableNumberValue < 0 || tableCutleriesValue < 0) {
    		$scope.errorMessage = $translate.instant("Valeur non valide");
    		$scope.$evalAsync();
    	} else if (tableNumberValue == 0 && $rootScope.IziBoxConfiguration.TableRequired) {
    		$scope.errorMessage = $translate.instant("No de table obligatoire");
    		$scope.$evalAsync();
    	} else if (tableCutleriesValue == 0 && $rootScope.IziBoxConfiguration.CutleriesRequired) {
    		$scope.errorMessage = $translate.instant("Nb de couvert obligatoire");
    		$scope.$evalAsync();
    	}
    	else {

    		var tableValues = {
    			tableNumber: tableNumberValue > 0 ? tableNumberValue : undefined,
    			tableCutleries: tableCutleriesValue > 0 ? tableCutleriesValue : undefined
    		}

    		$uibModalInstance.close(tableValues);
    	}
    }

    $scope.cancel = function () {
    	$rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});