app.controller('ModalTablePlanController', function ($scope, $rootScope, $uibModalInstance, $translate, $interval, currentStoreMap, currentTableId, currentTableNumber, currentTableCutleries, shoppingCartService, $mdMedia, shoppingCartModel) {
    let areaSelectedIndexHandler;

    $scope.currentCanvas = null;
    $scope.currentMap = null;
    $scope.currentArea = null;
    $scope.isLoading = false;
    $scope.mapSelectedIndex = 0;
    $scope.$mdMedia = $mdMedia;
    $scope.storeMap = currentStoreMap;
    $scope.freezedShoppingCarts = undefined;
    $scope.tableModel = {
        valueTable: currentTableNumber,
        valueCutleries: currentTableCutleries,
        valueTableId: currentTableId,
        criterias: undefined,
        allCriteriasSelected: true
    };

    $scope.$watch("mapSelectedIndex", function () {
        updateWatchers();
    });

    $scope.init = function () {
        shoppingCartService.getFreezedShoppingCartsAsync().then(function (freezedShoppingCarts) {
            $scope.freezedShoppingCarts = freezedShoppingCarts;
            updateStoreMap();
            updateModalTables();
            selectCurrentTable();
        });
    };

    let updateStoreMap = function () {
        if ($scope.storeMap) {
            if (!$scope.currentMap.areaSelectedIndex) {
                $scope.currentMap.areaSelectedIndex = 0;
            }
            $scope.currentArea = $scope.currentMap.Areas[$scope.currentMap.areaSelectedIndex];
            if (!$scope.currentArea.Geo) {
                $scope.currentArea.Geo = JSON.parse($scope.currentArea.GeoJson);
                for (let obj of $scope.currentArea.Geo.objects) {
                    let initObj = $scope.currentArea.Objects.filter(el => el.Id === obj.id)[0];
                    if (initObj) {
                        initObj.options = obj;
                    }
                }
            }
            for (let table of $scope.currentArea.Objects) {
                let isUsed;
                if ($scope.freezedShoppingCarts) {
                    isUsed = $scope.freezedShoppingCarts.filter(el => el.TableId === table.Id)[0];
                }
                if (isUsed) {
                    table.inUseCutleries = isUsed.TableCutleries;
                }
                table.ihm = {
                    backcolor: getTableColorStyle(table),
                    enabled: isCriteriaEnabled(table)
                };
            }
        }
    };

    let updateWatchers = function () {
        if ($scope.storeMap) {
            $scope.currentMap = $scope.storeMap.data[$scope.mapSelectedIndex];
            if (areaSelectedIndexHandler) {
                areaSelectedIndexHandler();
            }
            areaSelectedIndexHandler = $scope.$watch("currentMap.areaSelectedIndex", function () {
                updateStoreMap();
                loadAreaCriterias();
            });
        }
    };

    let isCriteriaEnabled = function (table) {
        if ($scope.tableModel.allCriteriasSelected) {
            return true;
        } else {
            let ret = false;
            for (let c of table.Criterias) {
                let exist = Enumerable.from($scope.tableModel.criterias).any(function (x) {
                    return x.Id === c.Id && x.IsSelected === true;
                });
                if (exist) {
                    ret = true;
                }
            }
            return ret;
        }
    };

    let getTableColorStyle = function (table) {
        let isUsed = undefined;
        if (table && $scope.freezedShoppingCarts) {
            if (currentTableId === table.Id) {
                isUsed = shoppingCartModel.getCurrentShoppingCart();
            } else {
                isUsed = $scope.freezedShoppingCarts.filter(el => el.TableId === table.Id)[0];
            }
        }
        if (isUsed && isUsed.Items.length > 0) {
            return 'rgba(255, 43, 43, 0.75)';
        } else if (isUsed) {
            return 'rgba(255, 156, 24, 0.75)';
        } else {
            return 'rgba(255, 255, 255, 0.5)';
        }
    };

    let loadAreaCriterias = function () {
        $scope.tableModel.criterias = [];
        if ($scope.currentArea) {
            let enumCriterias = Enumerable.from($scope.tableModel.criterias);
            for (let o of $scope.currentArea.Objects) {
                for (let c of o.Criterias) {
                    if (!enumCriterias.any(function (ec) {
                        return ec.Id === c.Id;
                    })) {
                        let newCriteria = clone(c);
                        newCriteria.IsSelected = true;

                        $scope.tableModel.criterias.push(newCriteria);
                    }
                }
            }
        }
    };

    $scope.toggleAllCriterias = function () {
        $scope.tableModel.allCriteriasSelected = !$scope.tableModel.allCriteriasSelected;
        $scope.$evalAsync();

        updateStoreMap();
    };

    $scope.toggleCriteria = function (criteria) {
        criteria.IsSelected = !criteria.IsSelected;
        $scope.$evalAsync();

        updateStoreMap();
    };


    $scope.ok = function () {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        $rootScope.closeKeyboard();

        let tableNumberValue = parseInt($scope.tableModel.valueTable);
        let tableCutleriesValue = parseInt($scope.tableModel.valueCutleries);
        let tableId = parseInt($scope.tableModel.valueTableId);

        if (isNaN(tableId) || isNaN(tableCutleriesValue) || tableId < 0 || tableCutleriesValue < 0) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
            $scope.$evalAsync();
        } else if (tableNumberValue === 0 && $rootScope.IziBoxConfiguration.TableRequired) {
            $scope.errorMessage = $translate.instant("No de table obligatoire");
            $scope.$evalAsync();
        } else if (tableCutleriesValue === 0 && $rootScope.IziBoxConfiguration.CutleriesRequired) {
            $scope.errorMessage = $translate.instant("Nb de couvert obligatoire");
            $scope.$evalAsync();
        } else {
            let tableValues = {
                tableNumber: tableNumberValue > 0 ? tableNumberValue : undefined,
                tableCutleries: tableCutleriesValue > 0 ? tableCutleriesValue : undefined,
                tableId: tableId > 0 ? tableId : undefined
            };
            $uibModalInstance.close(tableValues);
        }
    };

    $scope.cancel = function () {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.selectTable = function (table) {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        if (table) {
            $scope.tableModel.valueTable = table.TableNumber;
            $scope.tableModel.valueTableId = table.Id;
            $scope.tableModel.valueCutleries = table.Id === currentTableId ? currentTableCutleries : table.Cutleries;
            if ($scope.freezedShoppingCarts) {
                let freezedShoppingCart = $scope.freezedShoppingCarts.filter(el => el.TableId === table.Id)[0];
                if (freezedShoppingCart) {
                    $scope.tableModel.valueCutleries = freezedShoppingCart.TableCutleries;
                    $scope.currentTimer = $interval(function () {
                        $scope.tableModel.activeTimer = Date.now() - freezedShoppingCart.Timestamp - 3600000;
                    }, 1000);
                }
            }
        }
        $scope.$evalAsync();
    };

    $scope.selectTableById = function (mapName, areaName, tableId) {
        resetDefaultColor();

        $("#table" + tableId + mapName.split(' ').join('') + areaName.split(' ').join('')).css("background-color", "#E0B20B");

        let table = $scope.storeMap.data;
        table = table.filter(el => el.Name === mapName)[0];
        table = table.Areas.filter(el => el.Name === areaName)[0];
        table = table.Objects.filter(el => el.Id === tableId)[0];

        this.selectTable(table);
    };

    let selectCurrentTable = function () {
        if (currentTableId) {
            let maps = $scope.storeMap.data;
            mapsLoop : for (let map of maps) {
                for (let area of map.Areas) {
                    for (let table of area.Objects) {
                        if (table.Id === currentTableId) {
                            $scope.showMap(map.Name, maps.indexOf(map));
                            $scope.showArea(map.Name, area.Name, map.Areas.indexOf(area));
                            $scope.selectTableById(map.Name, area.Name, currentTableId);

                            $('#table' + table.Id + map.Name.split(' ').join('') + area.Name.split(' ').join('') + 'Info .tableState')
                                .html(currentTableCutleries + '/' + table.Cutleries);
                            break mapsLoop;
                        }
                    }
                }
            }
        }
    };

    $scope.showArea = function (mapName, areaName, idArea) {
        $('.' + mapName.split(' ').join('') + 'AreaOnglet > div').each(function () {
            $(this).removeClass('tableOngletFocus');
        });
        $('#' + mapName.split(' ').join('') + areaName.split(' ').join('') + "onglet").addClass('tableOngletFocus');

        $('#allGroupsTable > div').each(function () {
            $(this).hide();
        });
        $('#' + mapName.split(' ').join('') + areaName.split(' ').join('')).css('display', 'flex');

        $scope.currentMap.areaSelectedIndex = idArea;
        let areas = $scope.storeMap.data;
        areas = areas.filter(el => el.Name === mapName)[0];
        $scope.currentArea = areas.Areas[idArea];

        updateStoreMap();
        updateModalTables();
    };

    $scope.showMap = function (mapName, idMap) {
        $('#allMapsOnglet > div').each(function () {
            $(this).removeClass('tableOngletFocus');
        });
        $('#' + mapName.split(' ').join('') + "onglet").addClass('tableOngletFocus');

        $('#allAreasOnglet > div').each(function () {
            $(this).hide();
        });
        $('#allAreasOnglet .' + mapName.split(' ').join('') + 'AreaOnglet').each(function () {
            $(this).css('display', 'flex');
        });

        $scope.currentMap = $scope.storeMap.data[idMap];
        $scope.currentMap.areaSelectedIndex = 0;
        let areas = $scope.storeMap.data;
        areas = areas.filter(el => el.Name === mapName)[0];

        this.showArea(mapName, areas.Areas[0].Name, 0);
    };

    let updateModalTables = function () {
        let maps = $scope.storeMap.data;
        for (let map of maps) {
            for (let area of map.Areas) {
                for (let table of area.Objects) {
                    let tab = $('#table' + table.Id + map.Name.split(' ').join('') + area.Name.split(' ').join('') + 'Info');
                    if (table.inUseCutleries) {
                        tab.find('.tableState').html(table.inUseCutleries + '/' + table.Cutleries);
                        tab.css('background-color', getTableColorStyle(table));
                    } else {
                        tab.find('.tableState').html(table.inUseCutleries);
                        tab.css('background-color', getTableColorStyle(table));
                    }
                }
                if (area.Geo) {
                    for (let shape of area.Geo.objects) {
                        let table = $("#table" + shape.id + map.Name.split(' ').join('') + area.Name.split(' ').join(''));
                        if (shape.type === 'Labeledcircle') {
                            table.css('border-radius', '85px');
                        }
                        table.css('background-color', shape.fill);
                    }
                }
            }
        }
    };

    let resetDefaultColor = function () {
        let maps = $scope.storeMap.data;
        for (let map of maps) {
            for (let area of map.Areas) {
                if (area.Geo) {
                    for (let shape of area.Geo.objects) {
                        $("#table" + shape.id + map.Name.split(' ').join('') + area.Name.split(' ').join(''))
                            .css('background-color', shape.fill);
                    }
                }
            }
        }
    };
});