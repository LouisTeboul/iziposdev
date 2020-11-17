app.controller('ModalTablePlanController', function ($scope, $rootScope, $uibModalInstance, $translate, $interval, $mdMedia, currentStoreMap, currentTableId, currentTableNumber, currentTableCutleries, posPeriodService, posService) {
    let areaSelectedIndexHandler;
    let dbFreezeChangedHandler;
    let mapSelectHandler;
    let enablePlanHandler;

    $scope.currentCanvas = null;
    $scope.currentMap = null;
    $scope.currentArea = null;
    $scope.isLoading = false;
    $scope.mapSelectedIndex = 0;
    $scope.mdMedia = $mdMedia;
    $scope.storeMap = currentStoreMap;
    $scope.freezedShoppingCarts = undefined;

    $scope.isReaffectation = !!currentTableNumber;
    $scope.titleText = !currentTableNumber ? "Tables" : "Réaffecter la table";
    $scope.validText = !currentTableNumber ? "OK" : "Réaffecter";

    $scope.tableModel = {
        valueTable: currentTableNumber,
        valueCutleries: currentTableCutleries,
        valueTableId: currentTableId,
        criterias: undefined,
        allCriteriasSelected: true
    };

    $scope.EnablePlanBO = $rootScope.IziBoxConfiguration.EnableTablePlan;
    $scope.EnablePlanLocal = getStringBoolValue(localStorage.getItem("EnablePlanLocal")) || false;

    $scope.TablePlanEnabled = () => {
        return $scope.EnablePlanBO && $scope.EnablePlanLocal;
    };

    dbFreezeChangedHandler = $rootScope.$on('dbFreezeReplicate', () => {
        refreshFreeze();
    });

    const handleResize = () => {
        setTimeout(() => {
            if ($mdMedia('min-width: 800px') && $scope.EnablePlanBO) {
                const divCanvas = document.querySelector('#mainCanvasTables');
                if (divCanvas) {
                    divCanvas.innerHTML = "";
                    $scope.canvasPlanBO = new Raphael(divCanvas, divCanvas.offsetWidth, divCanvas.offsetHeight);
                    $scope.canvasPlanBO.clear();
                    drawTablePlan();
                }
            }
            updateStoreMap();
            updateModalTables();
            selectCurrentTable();
        }, 100);
    };

    $scope.init = () => {
        posService.getFreezeShoppingCartsAsync().then((freezedShoppingCarts) => {
            $scope.freezedShoppingCarts = freezedShoppingCarts;
            updateStoreMap();
            if ($mdMedia('min-width: 800px') && $scope.EnablePlanBO) {
                const divCanvas = document.querySelector('#mainCanvasTables');
                if (divCanvas) {
                    //divCanvas.innerHTML = "";
                    $scope.canvasPlanBO = new Raphael(divCanvas, divCanvas.offsetWidth, divCanvas.offsetHeight);
                    $scope.canvasPlanBO.clear();
                    drawTablePlan();
                }
            }
            updateModalTables();
            resetDefaultColor();
            selectCurrentTable();

            //#region watchers
            mapSelectHandler = $scope.$watch("mapSelectedIndex", () => {
                updateWatchers();
            });

            enablePlanHandler = $scope.$watch("EnablePlanLocal", (newV, oldV) => {
                if (newV !== undefined && oldV !== undefined && getStringBoolValue(newV) !== getStringBoolValue(oldV)) {
                    const newBoolV = getStringBoolValue(newV);
                    localStorage.setItem('EnablePlanLocal', newV);
                    setTimeout(() => {
                        //updateStoreMap();
                        if ($scope.EnablePlanBO && newBoolV) {
                            const divCanvas = document.querySelector('#mainCanvasTables');
                            if (divCanvas) {
                                $scope.canvasPlanBO = new Raphael(divCanvas, divCanvas.offsetWidth, divCanvas.offsetHeight);
                                $scope.canvasPlanBO.clear();
                                drawTablePlan();
                            }
                        }
                        updateModalTables();
                        resetDefaultColor();
                        selectCurrentTable();
                    }, 100);
                }
            });

            window.removeEventListener("resize", handleResize);
            window.addEventListener("resize", handleResize);
        });
    };

    const refreshFreeze = () => {
        posService.getFreezeShoppingCartsAsync().then((freezedShoppingCarts) => {
            $scope.freezedShoppingCarts = freezedShoppingCarts;
            updateStoreMap();
            updateModalTables();
            resetDefaultColor();
            selectCurrentTable();

            drawTablePlan();
        });
    };

    $scope.$on("$destroy", () => {
        if (areaSelectedIndexHandler)
            areaSelectedIndexHandler();
        if (dbFreezeChangedHandler)
            dbFreezeChangedHandler();
        if (mapSelectHandler)
            mapSelectHandler();
        if (enablePlanHandler)
            enablePlanHandler();
        window.removeEventListener("resize", handleResize);
    });

    const updateStoreMap = () => {
        if ($scope.storeMap) {
            if (!$scope.currentMap) {
                $scope.currentMap = $scope.storeMap.data[$scope.mapSelectedIndex];
            }
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
                    isUsed = $scope.freezedShoppingCarts.find(el => el.TableId == table.Id);
                }
                if (isUsed) {
                    table.locked = isUsed.FreezeLockedBy;
                    table.inUseCutleries = isUsed.TableCutleries;
                } else {
                    delete table.locked;
                    delete table.inUseCutleries;
                }
            }
        }
    };

    const updateWatchers = () => {
        if ($scope.storeMap) {
            $scope.currentMap = $scope.storeMap.data[$scope.mapSelectedIndex];
            if (areaSelectedIndexHandler) {
                areaSelectedIndexHandler();
            }
            areaSelectedIndexHandler = $scope.$watch("currentMap.areaSelectedIndex", () => {
                updateStoreMap();
                loadAreaCriterias();
            });
        }
    };

    const isCriteriaEnabled = (table) => {
        if ($scope.tableModel.allCriteriasSelected) {
            return true;
        } else {
            let ret = false;
            if ($scope.tableModel && $scope.tableModel.criterias) {
                let selectedCriterias = $scope.tableModel.criterias.filter(c => c.IsSelected);
                if (selectedCriterias && selectedCriterias.length > 0) {
                    ret = selectedCriterias.every(sc => table.Criterias && table.Criterias.some(c => c.Id === sc.Id));
                } else {
                    ret = true;
                }
            }

            return ret;
        }
    };

    const getTableColorStyle = (table) => {
        let isUsed = undefined;
        if (table && $scope.freezedShoppingCarts) {
            if (currentTableId === table.Id) {
                isUsed = $rootScope.currentShoppingCart;
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

    const loadAreaCriterias = () => {
        $scope.tableModel.criterias = [];
        if ($scope.currentArea) {
            const enumCriterias = Enumerable.from($scope.tableModel.criterias);
            for (let o of $scope.currentArea.Objects) {
                for (let c of o.Criterias) {
                    if (!enumCriterias.any((ec) => {
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

    $scope.toggleAllCriterias = () => {
        $scope.tableModel.allCriteriasSelected = !$scope.tableModel.allCriteriasSelected;
        $scope.$evalAsync();

        updateStoreMap();
        updateModalTables();
    };

    $scope.toggleCriteria = (criteria) => {
        if (!$scope.tableModel.allCriteriasSelected) {
            criteria.IsSelected = !criteria.IsSelected;
            $scope.$evalAsync();

            updateStoreMap();
            updateModalTables();
        }
    };

    $scope.selectTable = (table) => {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        delete $scope.tableModel.hasShoppingCart;

        if (table) {
            $scope.tableModel.valueTable = table.TableNumber;
            $scope.tableModel.valueCriterias = table.Criterias;
            $scope.tableModel.valueTableId = table.Id;
            $scope.tableModel.valueCutleries = table.Id === currentTableId ? currentTableCutleries : table.Cutleries;
            if ($scope.freezedShoppingCarts) {
                const freezedShoppingCart = $scope.freezedShoppingCarts.filter(el => el.TableId === table.Id)[0];
                if (freezedShoppingCart) {
                    $scope.tableModel.hasShoppingCart = true;
                    $scope.tableModel.valueCutleries = freezedShoppingCart.TableCutleries;
                    $scope.currentTimer = $interval(() => {
                        $scope.tableModel.activeTimer = Date.now() - freezedShoppingCart.Timestamp - 3600000;
                    }, 1000);
                }
            }

            if (!isCriteriaEnabled(table)) {
                $scope.errorMessage = "Critère(s)";
            } else {
                delete $scope.errorMessage;
            }
        }
        $scope.$evalAsync();
    };

    $scope.selectTableById = (mapName, areaName, tableId) => {
        resetDefaultColor();

        let tableElem = $("#table" + tableId + mapName.replace(/[^a-zA-Z0-9]/g, "") +
            areaName.replace(/[^a-zA-Z0-9]/g, ""));
        if (tableElem) {
            tableElem.css("background-color", "#E0B20B");
        }

        let table = angular.copy($scope.storeMap.data).find(el => el.Name === mapName);
        if (table) {
            let area = table.Areas.find(el => el.Name === areaName);
            table = area.Objects.find(el => el.Id === tableId);
        }

        $scope.selectTable(table);
    };

    const selectCurrentTable = () => {
        if (currentTableId) {
            const maps = $scope.storeMap.data;
            mapsLoop: for (let map of maps) {
                for (let area of map.Areas) {
                    for (let table of area.Objects) {
                        if (table.Id === currentTableId) {
                            $scope.showMap(map.Name, maps.indexOf(map));
                            $scope.showArea(map.Name, area.Name, map.Areas.indexOf(area));
                            $scope.selectTableById(map.Name, area.Name, currentTableId);
                            if ($scope.TablePlanEnabled() && $mdMedia('min-width: 800px') && $scope.currentArea.objCanvas) {
                                for (const obj of $scope.currentArea.objCanvas) {
                                    if (obj[2] === currentTableId) {
                                        obj[1].attr({
                                            "text": obj[3] + '(' + currentTableCutleries + '/' + table.Cutleries + ')',
                                            "fill": "#f00"
                                        });
                                        obj[0].attr({
                                            "stroke": "#f00",
                                            "stroke-width": 3,
                                            "fill": "#E0B20B"
                                        });
                                    }
                                }
                            } else {
                                let tableStateElem = $('#table' + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "") +
                                    area.Name.replace(/[^a-zA-Z0-9]/g, "") + 'Info .tableState');
                                if (tableStateElem) {
                                    tableStateElem.html(currentTableCutleries + '/' + table.Cutleries);
                                }
                            }
                            break mapsLoop;
                        }
                    }
                }
            }
        }
    };

    const updateModalTables = () => {
        if ($scope.TablePlanEnabled() && $mdMedia('min-width: 800px')) {
            drawTablePlan();
        }
        const maps = $scope.storeMap.data;
        for (const map of maps) {
            for (const area of map.Areas) {
                for (const table of area.Objects) {
                    const tab = $('#table' + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "") +
                        area.Name.replace(/[^a-zA-Z0-9]/g, "") + 'Info');

                    const tableElement = $('#table' + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "") +
                        area.Name.replace(/[^a-zA-Z0-9]/g, ""));

                    tableElement.css('display', 'flex');

                    let tableColor = isCriteriaEnabled(table) ? getTableColorStyle(table) : "#adadad";
                    if (table.inUseCutleries) {
                        tab.find('.tableState').html(table.inUseCutleries + '/' + table.Cutleries);
                        tab.css('background-color', tableColor);
                    } else {
                        tab.find('.tableState').html(table.Cutleries);
                        tab.css('background-color', tableColor);
                    }

                    if (area.Geo) {
                        let matchingGeo = area.Geo.objects.find(geo => geo.id === table.Id);
                        if (matchingGeo) {
                            if (matchingGeo.type === 'Labeledcircle') {
                                tableElement.css('border-radius', '85px');
                            }
                            tableElement.css('background-color', isCriteriaEnabled(table) ? matchingGeo.fill : "#adadad");
                        }
                    } else if (!isCriteriaEnabled(table)) {
                        tableElement.css('background-color', "#adadad");
                    }
                }
            }
        }
    };

    const drawTablePlan = () => {
        if ($scope.canvasPlanBO) {
            $scope.canvasPlanBO.clear();
            const divCanvas = document.querySelector('#mainCanvasTables');
            let ratio;
            if (!divCanvas) return;
            if (divCanvas.offsetWidth > divCanvas.offsetHeight) {
                ratio = (divCanvas.offsetHeight - 11) / 800;
            } else {
                ratio = (divCanvas.offsetWidth - 5) / 800;
            }
            $scope.canvasPlanBO.rect(0, 0, divCanvas.offsetWidth, divCanvas.offsetHeight - 10)
                .attr({
                    "fill": "lightgray",
                    "stroke": "black"
                });
            const offset = (divCanvas.offsetWidth / 2) - ((800 * ratio) / 2);
            $scope.currentArea.objCanvas = [];
            for (const table of $scope.currentArea.Objects) {
                let matchCriterias = isCriteriaEnabled(table);
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


                if (tableDetails) {
                    let fill = matchCriterias ? tableDetails.fill : "#adadad";
                    if (tableDetails.type === 'Labeledcircle') {
                        let circle = $scope.canvasPlanBO.ellipse(
                                (tableDetails.left * ratio) + (((tableDetails.width * tableDetails.scaleX) * ratio) / 2) + offset,
                                (tableDetails.top * ratio) + (((tableDetails.height * tableDetails.scaleY) * ratio) / 2) + 1,
                                ((tableDetails.width * tableDetails.scaleX) * ratio) / 2,
                                ((tableDetails.height * tableDetails.scaleY) * ratio) / 2)
                            .attr({
                                "fill": fill,
                                "stroke": color,
                                "stroke-width": stroke
                            })
                            .rotate(tableDetails.angle)
                            .click(() => {
                                $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                                circle.attr("fill", "#E0B20B");
                            });
                        let cText = $scope.canvasPlanBO.text(
                                (tableDetails.left * ratio) + (((tableDetails.width * tableDetails.scaleX) * ratio) / 2) + offset,
                                (tableDetails.top * ratio) + (((tableDetails.height * tableDetails.scaleY) * ratio) / 2) + 1,
                                tableText)
                            .attr({
                                "fill": "#fff",
                                "font-size": "14px"
                            })
                            .click(() => {
                                $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                                circle.attr("fill", "#E0B20B");
                            });
                        if (color === "#f00") {
                            cText.attr("stroke", color);
                        }
                        circle.defaultColor = fill;
                        $scope.currentArea.objCanvas.push([circle, cText, table.Id, table.TableNumber]);
                    } else {
                        let rect = $scope.canvasPlanBO.rect(
                                tableDetails.left * ratio + offset,
                                tableDetails.top * ratio + 1,
                                (tableDetails.width * tableDetails.scaleX) * ratio,
                                (tableDetails.height * tableDetails.scaleY) * ratio)
                            .attr({
                                "fill": fill,
                                "stroke": color,
                                "stroke-width": stroke
                            })
                            .rotate(tableDetails.angle)
                            .click(() => {
                                $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                                rect.attr("fill", "#E0B20B");
                            });

                        let rText = $scope.canvasPlanBO.text(
                                tableDetails.left * ratio + ((tableDetails.width * tableDetails.scaleX) * ratio) / 2 + offset,
                                tableDetails.top * ratio + ((tableDetails.height * tableDetails.scaleY) * ratio) / 2 + 1,
                                tableText)
                            .attr({
                                "fill": "#fff",
                                "font-size": "14px"
                            })
                            .click(() => {
                                $scope.selectTableById($scope.currentMap.Name, $scope.currentArea.Name, tableDetails.id);
                                rect.attr("fill", "#E0B20B");
                            });
                        if (color === "#f00") {
                            rText.attr({
                                "fill": color,
                                "stroke": color
                            });
                        }
                        rect.defaultColor = matchCriterias ? tableDetails.fill : "#adadad";
                        $scope.currentArea.objCanvas.push([rect, rText, table.Id, table.TableNumber]);
                    }
                }
            }
        }
    };

    const resetDefaultColor = () => {
        if ($scope.TablePlanEnabled() && $mdMedia('min-width: 800px') && $scope.currentArea.objCanvas) {
            for (const obj of $scope.currentArea.objCanvas) {
                obj[0].attr("fill", obj[0].defaultColor);
            }
        } else {
            const maps = $scope.storeMap.data;
            for (const map of maps) {
                for (const area of map.Areas) {
                    for (const table of area.Objects) {
                        if (table.options) {
                            $("#table" + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "") +
                                    area.Name.replace(/[^a-zA-Z0-9]/g, ""))
                                .css('background-color', table.options.fill);
                        } else {
                            $("#table" + table.Id + map.Name.replace(/[^a-zA-Z0-9]/g, "") +
                            area.Name.replace(/[^a-zA-Z0-9]/g, "")).css('background-color', 'green');
                        }
                    }
                }
            }
        }
    };

    // ATTENTION : Ne pas remplacer les fonctions anonyme avec des fonctions fléché !
    // Ca casse la ref du this
    $scope.showArea = (mapName, areaName, idArea) => {
        $('.' + mapName.replace(/[^a-zA-Z0-9]/g, "") + 'AreaOnglet > div').each(function () {
            $(this).removeClass('tableOngletFocus');
        });
        $('#' + mapName.replace(/[^a-zA-Z0-9]/g, "") + areaName.replace(/[^a-zA-Z0-9]/g, "") + "onglet").addClass('tableOngletFocus');

        $('#allGroupsTable > div').each(function () {
            $(this).hide();
        });
        $('#' + mapName.replace(/[^a-zA-Z0-9]/g, "") + areaName.replace(/[^a-zA-Z0-9]/g, "")).css('display', 'flex');

        if ($scope.currentMap) {
            $scope.currentMap.areaSelectedIndex = idArea;
        }
        let areas = $scope.storeMap.data;
        areas = areas.filter(el => el.Name === mapName)[0];
        $scope.currentArea = areas.Areas[idArea];

        updateStoreMap();
        updateModalTables();
        resetDefaultColor();
    };

    // ATTENTION : Ne pas remplacer les fonctions anonyme avec des fonctions fléché !
    // Ca casse la ref du this
    $scope.showMap = (mapName, idMap) => {
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

        $scope.showArea(mapName, areas.Areas[0].Name, 0);
    };

    $scope.ok = () => {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        delete $scope.tableModel.hasShoppingCart;
        $rootScope.closeKeyboard();

        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {
            const tableNumberValue = parseInt($scope.tableModel.valueTable);
            const tableCutleriesValue = parseInt($scope.tableModel.valueCutleries);
            const tableId = parseInt($scope.tableModel.valueTableId);

            if (tableNumberValue > 10000) {
                $scope.errorMessage = $translate.instant("Le numéro de table doit être inférieur à 10000");
                $scope.$evalAsync();
            } else if (tableCutleriesValue > 100) {
                $scope.errorMessage = $translate.instant("Le nombre de couverts doit être inférieur à 100");
                $scope.$evalAsync();
            } else if (isNaN(tableId) || isNaN(tableCutleriesValue) || tableId < 0 || tableCutleriesValue < 0) {
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
        }, (err) => {
            console.error(err);
        });
    };

    $scope.cancel = () => {
        $interval.cancel($scope.currentTimer);
        delete $scope.tableModel.activeTimer;
        delete $scope.tableModel.hasShoppingCart;
        $rootScope.closeKeyboard();
        window.removeEventListener("resize", null);
        $uibModalInstance.dismiss('cancel');
    };
});