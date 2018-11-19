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

    $scope.modalPlanBO = $rootScope.IziBoxConfiguration.EnableTablePlan;

    $scope.$watch("mapSelectedIndex", function () {
        updateWatchers();
    });

    $scope.init = function () {
        shoppingCartService.getFreezedShoppingCartsAsync().then(function (freezedShoppingCarts) {
            $scope.freezedShoppingCarts = freezedShoppingCarts;
            updateStoreMap();
            if ($mdMedia('min-width: 800px') && $scope.modalPlanBO) {
                const divCanvas = document.querySelector('#mainCanvasTables');
                $scope.canvasPlanBO = new Raphael(divCanvas, divCanvas.offsetWidth, divCanvas.offsetHeight);
                drawTablePlan();
            }
            updateModalTables();
            selectCurrentTable();
        });

        window.addEventListener("resize", function () {
            setTimeout(() => {
                if ($mdMedia('min-width: 800px') && $scope.modalPlanBO) {
                    const divCanvas = document.querySelector('#mainCanvasTables');
                    if (divCanvas) {
                        divCanvas.innerHTML = "";
                        $scope.canvasPlanBO = new Raphael(divCanvas, divCanvas.offsetWidth, divCanvas.offsetHeight);
                        drawTablePlan();
                    }
                }
                updateStoreMap();
                updateModalTables();
                selectCurrentTable();
            }, 100);
        });
    };

    const updateStoreMap = function () {
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

    const updateWatchers = function () {
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

    const isCriteriaEnabled = function (table) {
        if ($scope.tableModel.allCriteriasSelected) {
            return true;
        } else {
            let ret = false;
            for (let c of table.Criterias) {
                const exist = Enumerable.from($scope.tableModel.criterias).any(function (x) {
                    return x.Id === c.Id && x.IsSelected === true;
                });
                if (exist) {
                    ret = true;
                }
            }
            return ret;
        }
    };

    const getTableColorStyle = function (table) {
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

    const loadAreaCriterias = function () {
        $scope.tableModel.criterias = [];
        if ($scope.currentArea) {
            const enumCriterias = Enumerable.from($scope.tableModel.criterias);
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

        const tableNumberValue = parseInt($scope.tableModel.valueTable);
        const tableCutleriesValue = parseInt($scope.tableModel.valueCutleries);
        const tableId = parseInt($scope.tableModel.valueTableId);

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
            const tableValues = {
                tableNumber: tableNumberValue > 0 ? tableNumberValue : undefined,
                tableCutleries: tableCutleriesValue > 0 ? tableCutleriesValue : undefined,
                tableId: tableId > 0 ? tableId : undefined
            };
            window.removeEventListener("resize", null);
            $uibModalInstance.close(tableValues);
        }
    };

    $scope.cancel = function () {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        $rootScope.closeKeyboard();
        window.removeEventListener("resize", null);
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
                const freezedShoppingCart = $scope.freezedShoppingCarts.filter(el => el.TableId === table.Id)[0];
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
        $("#table" + tableId + mapName.replace(/[^a-zA-Z0-9]/g, "")
            + areaName.replace(/[^a-zA-Z0-9]/g, "")).css("background-color", "#E0B20B");

        let table = $scope.storeMap.data;
        table = table.filter(el => el.Name === mapName)[0];
        table = table.Areas.filter(el => el.Name === areaName)[0];
        table = table.Objects.filter(el => el.Id === tableId)[0];

        this.selectTable(table);
    };

    const selectCurrentTable = function () {
        if (currentTableId) {
            const maps = $scope.storeMap.data;
            mapsLoop : for (let map of maps) {
                for (let area of map.Areas) {
                    for (let table of area.Objects) {
                        if (table.Id === currentTableId) {
                            $scope.showMap(map.Name, maps.indexOf(map));
                            $scope.showArea(map.Name, area.Name, map.Areas.indexOf(area));
                            $scope.selectTableById(map.Name, area.Name, currentTableId);
                            if ($scope.modalPlanBO && $mdMedia('min-width: 800px')) {
                                for (const obj of $scope.currentArea.objCanvas) {
                                    if (obj[2] === currentTableId) {
                                        obj[1].attr({
                                            "text": obj[3] + '(' + currentTableCutleries + '/' + table.Cutleries + ')',
                                            "fill": "#f00"
                                        });
                                        obj[0].attr({
                                            "stroke": "#f00",
                                            "stroke-width": 3,
                                            "fill":"#E0B20B"
                                        });
                                    }
                                }
                            } else {
                                $('#table' + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "")
                                    + area.Name.replace(/[^a-zA-Z0-9]/g, "") + 'Info .tableState')
                                    .html(currentTableCutleries + '/' + table.Cutleries);
                            }
                            break mapsLoop;
                        }
                    }
                }
            }
        }
    };

    const updateModalTables = function () {
        if ($scope.modalPlanBO && $mdMedia('min-width: 800px')) {
            drawTablePlan();
        } else {
            const maps = $scope.storeMap.data;
            for (const map of maps) {
                for (const area of map.Areas) {
                    for (const table of area.Objects) {
                        const tab = $('#table' + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "")
                            + area.Name.replace(/[^a-zA-Z0-9]/g, "") + 'Info');
                        if (table.inUseCutleries) {
                            tab.find('.tableState').html(table.inUseCutleries + '/' + table.Cutleries);
                            tab.css('background-color', getTableColorStyle(table));
                        } else {
                            tab.find('.tableState').html(table.Cutleries);
                            tab.css('background-color', getTableColorStyle(table));
                        }
                    }
                    if (area.Geo) {
                        for (const shape of area.Geo.objects) {
                            const table = $("#table" + shape.id + map.Name.replace(/[^a-zA-Z0-9]/g, "")
                                + area.Name.replace(/[^a-zA-Z0-9]/g, ""));
                            if (shape.type === 'Labeledcircle') {
                                table.css('border-radius', '85px');
                            }
                            table.css('background-color', shape.fill);
                        }
                    }
                }
            }
        }
    };

    const drawTablePlan = function () {
        $scope.canvasPlanBO.clear();
        const divCanvas = document.querySelector('#mainCanvasTables');
        let ratio;
        if(!divCanvas) return;
        if (divCanvas.offsetWidth > divCanvas.offsetHeight) {
            ratio = (divCanvas.offsetHeight - 11) / 800;
        } else {
            ratio = (divCanvas.offsetWidth - 5) / 800;
        }
        $scope.canvasPlanBO.rect(0, 0, divCanvas.offsetWidth, divCanvas.offsetHeight - 10)
            .attr({"fill": "lightgray", "stroke": "black"});
        const offset = (divCanvas.offsetWidth / 2) - ((800 * ratio) / 2);
        $scope.currentArea.objCanvas = [];
        for (const table of $scope.currentArea.Objects) {
            const tableDetails = $scope.currentArea.Geo.objects.filter(el => el.id === table.Id)[0];

            let tableText = table.TableNumber;
            let color = "#000";
            let stroke = 1;
            if (table.inUseCutleries) {
                stroke = 3;
                color = "#f00";
                tableText += "(" + table.inUseCutleries + '/' + table.Cutleries + ")";
            } else {
                tableText += "(" + table.Cutleries + ")";
            }

            if(tableDetails) {
                if (tableDetails.type === 'Labeledcircle') {
                    let circle = $scope.canvasPlanBO.ellipse(
                        (tableDetails.left * ratio) + (((tableDetails.width * tableDetails.scaleX) * ratio) / 2) + offset,
                        (tableDetails.top * ratio) + (((tableDetails.height * tableDetails.scaleY) * ratio) / 2) + 1,
                        ((tableDetails.width * tableDetails.scaleX) * ratio) / 2,
                        ((tableDetails.height * tableDetails.scaleY) * ratio) / 2)
                        .attr({
                            "fill": tableDetails.fill,
                            "stroke": color,
                            "stroke-width": stroke
                        })
                        .click(function () {
                            $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                            this.attr("fill", "#E0B20B");
                        });
                    let cText = $scope.canvasPlanBO.text(
                        (tableDetails.left * ratio) + (((tableDetails.width * tableDetails.scaleX) * ratio) / 2) + offset,
                        (tableDetails.top * ratio) + (((tableDetails.height * tableDetails.scaleY) * ratio) / 2) + 1,
                        tableText)
                        .attr({
                            "fill": "#fff",
                            "font-size": "14px"
                        })
                        .click(function () {
                            $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                            circle.attr("fill", "#E0B20B");
                        });
                    if (color === "#f00") {
                        cText.attr("stroke", color);
                    }
                    circle.defaultColor = tableDetails.fill;
                    $scope.currentArea.objCanvas.push([circle, cText, table.Id, table.TableNumber]);
                } else {
                    let rect = $scope.canvasPlanBO.rect(
                        tableDetails.left * ratio + offset,
                        tableDetails.top * ratio + 1,
                        (tableDetails.width * tableDetails.scaleX) * ratio,
                        (tableDetails.height * tableDetails.scaleY) * ratio)
                        .attr({
                            "fill": tableDetails.fill,
                            "stroke": color,
                            "stroke-width": stroke
                        })
                        .click(function () {
                            $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                            this.attr("fill", "#E0B20B");
                        });
                    let rText = $scope.canvasPlanBO.text(
                        tableDetails.left * ratio + ((tableDetails.width * tableDetails.scaleX) * ratio) / 2 + offset,
                        tableDetails.top * ratio + ((tableDetails.height * tableDetails.scaleY) * ratio) / 2 + 1,
                        tableText)
                        .attr({
                            "fill": "#fff",
                            "font-size": "14px"
                        })
                        .click(function () {
                            $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                            rect.attr("fill", "#E0B20B");
                        });
                    if (color === "#f00") {
                        rText.attr({
                            "fill": color,
                            "stroke": color
                        });
                    }
                    rect.defaultColor = tableDetails.fill;
                    $scope.currentArea.objCanvas.push([rect, rText, table.Id, table.TableNumber]);
                }
            }
        }
    };

    const resetDefaultColor = function () {
        if ($scope.modalPlanBO && $mdMedia('min-width: 800px') && $scope.currentArea.objCanvas) {
            for (const obj of $scope.currentArea.objCanvas) {
                obj[0].attr("fill", obj[0].defaultColor);
            }
        } else {
            const maps = $scope.storeMap.data;
            for (const map of maps) {
                for (const area of map.Areas) {
                    if (area.Geo) {
                        for (const shape of area.Geo.objects) {
                            $("#table" + shape.id + map.Name.replace(/[^a-zA-Z0-9]/g, "")
                                + area.Name.replace(/[^a-zA-Z0-9]/g, ""))
                                .css('background-color', shape.fill);
                        }
                    }
                }
            }
        }
    };

    $scope.showArea = function (mapName, areaName, idArea) {
        $('.' + mapName.replace(/[^a-zA-Z0-9]/g, "") + 'AreaOnglet > div').each(function () {
            $(this).removeClass('tableOngletFocus');
        });
        $('#' + mapName.replace(/[^a-zA-Z0-9]/g, "") + areaName.replace(/[^a-zA-Z0-9]/g, "") + "onglet").addClass('tableOngletFocus');

        $('#allGroupsTable > div').each(function () {
            $(this).hide();
        });
        $('#' + mapName.replace(/[^a-zA-Z0-9]/g, "") + areaName.replace(/[^a-zA-Z0-9]/g, "")).css('display', 'flex');

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
        $('#' + mapName.replace(/[^a-zA-Z0-9]/g, "") + "onglet").addClass('tableOngletFocus');

        $('#allAreasOnglet > div').each(function () {
            $(this).hide();
        });
        $('#allAreasOnglet .' + mapName.replace(/[^a-zA-Z0-9]/g, "") + 'AreaOnglet').each(function () {
            $(this).css('display', 'flex');
        });

        $scope.currentMap = $scope.storeMap.data[idMap];
        $scope.currentMap.areaSelectedIndex = 0;
        let areas = $scope.storeMap.data;
        areas = areas.filter(el => el.Name === mapName)[0];

        this.showArea(mapName, areas.Areas[0].Name, 0);
    };
});