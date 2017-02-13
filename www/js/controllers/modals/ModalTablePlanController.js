app.controller('ModalTablePlanController', function ($scope, $rootScope, $uibModalInstance, $translate, currentStoreMap, currentTableNumber, currentTableCutleries, shoppingCartService, $mdMedia, shoppingCartModel) {
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

	var updateStoreMap = function () {
		if ($scope.storeMap) {
			if ($scope.currentMap.areaSelectedIndex == undefined) $scope.currentMap.areaSelectedIndex = 0;
			$scope.currentArea = $scope.currentMap.Areas[$scope.currentMap.areaSelectedIndex];
			if ($scope.currentArea.Geo == undefined) {
				$scope.currentArea.Geo = JSON.parse($scope.currentArea.GeoJson);
				Enumerable.from($scope.currentArea.Geo.objects).forEach(function (obj) {
					var initObj = Enumerable.from($scope.currentArea.Objects).firstOrDefault(function (x) {
						return x.Id == obj.id;
					});
					if (initObj != undefined) {
						initObj.options = obj;
					}
				});
			}

			Enumerable.from($scope.currentArea.Objects).forEach(function (table) {
				table.ihm = {
					backcolor: getTableColorStyle(table),
					enabled: isCriteriaEnabled(table)
				};
			});
			
		}
	};

	var updateWatchers = function () {
		if ($scope.storeMap) {

			$scope.currentMap = $scope.storeMap.data[$scope.mapSelectedIndex];

			if (areaSelectedIndexHandler) areaSelectedIndexHandler();

			areaSelectedIndexHandler = $scope.$watch("currentMap.areaSelectedIndex", function () {
				updateStoreMap();
				loadAreaCriterias();
			});
		}
	}

	$scope.init = function () {
		shoppingCartService.getFreezedShoppingCartsAsync().then(function (freezedShoppingCarts) {
			$scope.freezedShoppingCarts = freezedShoppingCarts;
			updateStoreMap();
		});
	}

	var isCriteriaEnabled = function (table) {
		if ($scope.tableModel.allCriteriasSelected) {
			return true;
		} else {
			var ret = false;
			Enumerable.from(table.Criterias).forEach(function (c) {
				if(Enumerable.from($scope.tableModel.criterias).any(function(x){
					return x.Id == c.Id && x.IsSelected == true;
				}))
				{
					ret = true;
					return;
				}
			});

			return ret;
		}
	};

	var getTableColorStyle = function (table) {
		var isUsed = undefined;

		if (table && $scope.freezedShoppingCarts) {
			if (initCurrentTableNumber == table.TableNumber) {
				isUsed = shoppingCartModel.getCurrentShoppingCart();
			} else {
				isUsed = Enumerable.from($scope.freezedShoppingCarts).firstOrDefault(function (fsc) {
					return fsc.TableNumber == table.TableNumber;
				});
			}
		}


		if (isUsed && isUsed.Items.length > 0) {
			return 'rgba(255, 43, 43, 0.75)';
		} else if (isUsed) {
			return 'rgba(255, 156, 24, 0.75)';
		} else {
			return 'rgba(211, 211, 211, 0.71)';
		}
	};

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

	$scope.selectTable = function (table) {
		if (table) {
			$scope.tableModel.valueTable = table.TableNumber;
			$scope.tableModel.valueCutleries = table.TableNumber == initCurrentTableNumber ? initCurrentTableCutleries : table.Cutleries;

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

	$scope.toggleAllCriterias = function () {
		$scope.tableModel.allCriteriasSelected = !$scope.tableModel.allCriteriasSelected;
		$scope.$evalAsync();

		updateStoreMap();
	}

	$scope.toggleCriteria = function (criteria) {
		criteria.IsSelected = !criteria.IsSelected;
		$scope.$evalAsync();

		updateStoreMap();		
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