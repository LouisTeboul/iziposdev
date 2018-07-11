app.directive('tableRepeat', function ($rootScope, $compile, $filter) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: function (scope, element) {

            let template = `<div class="mainAllMapAreaTable">`;
            let storeMap = scope.storeMap.data;
            let firstMap, first = true;

            template += `<div id="allMapsOnglet">`;
            for (let map of storeMap) {
                if (first) {
                    template += `<div class="tableOnglet tableOngletFocus"
                                    id="${map.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showMap('${map.Name}',${storeMap.indexOf(map)})">${map.Name}</div>`;
                    firstMap = map;
                    first = false;
                } else {
                    template += `<div class="tableOnglet"
                                    id="${map.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showMap('${map.Name}',${storeMap.indexOf(map)})">${map.Name}</div>`;
                }
            }
            template += `</div><hr style="margin:0;">`;

            let firstArea;
            first = true;
            template += `<div id="allAreasOnglet">
                            <div class="${firstMap.Name.split(' ').join('')}AreaOnglet"
                            style="display:flex;flex-direction:row;">`;
            for (let area of firstMap.Areas) {
                if (first) {
                    template += `<div class="tableOnglet tableOngletFocus"
                                    id="${firstMap.Name.split(' ').join('') + area.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showArea('${firstMap.Name}','${area.Name}',${firstMap.Areas.indexOf(area)})">${area.Name}</div>`;
                    firstArea = area;
                    first = false;
                } else {
                    template += `<div class="tableOnglet"
                                    id="${firstMap.Name.split(' ').join('') + area.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showArea('${firstMap.Name}','${area.Name}',${firstMap.Areas.indexOf(area)})">${area.Name}</div>`;
                }
            }

            for (let map of storeMap) {
                if (map.Name !== firstMap.Name) {
                    let fArea = true;
                    template += `<div class="${map.Name.split(' ').join('')}AreaOnglet"
                            style="display:none;flex-direction:row;">`;
                    for (let area of map.Areas) {
                        if (fArea) {
                            template += `<div class="tableOnglet tableOngletFocus"
                                            id="${map.Name.split(' ').join('') + area.Name.split(' ').join('')}onglet"
                                            onclick="$('#modalTablePlan').scope().showArea('${map.Name}','${area.Name}',${map.Areas.indexOf(area)})">${area.Name}</div>`;
                            fArea = false;
                        } else {
                            template += `<div class="tableOnglet"
                                            id="${map.Name.split(' ').join('') + area.Name.split(' ').join('')}onglet"
                                            onclick="$('#modalTablePlan').scope().showArea('${map.Name}','${area.Name}',${map.Areas.indexOf(area)})">${area.Name}</div>`;
                        }
                    }
                }
                template += `</div>`;
            }
            template += `</div><hr style="margin:0;">`;
            firstArea.Objects.sort(function (a, b) {
                return a["TableNumber"] - b["TableNumber"]
            });
            template += `<div id="allGroupsTable"><div class="groupTableList"
                        id="${firstMap.Name.split(' ').join('') + firstArea.Name.split(' ').join('')}"><div class="groupTableList" id="tablePlanList">`;
            for (let table of firstArea.Objects) {
                template += `<div class="tableMain"
                                id="table${table.Id + firstMap.Name.split(' ').join('') + firstArea.Name.split(' ').join('')}"
                                onclick="$('#modalTablePlan').scope().selectTableById('${firstMap.Name}','${firstArea.Name}',${table.Id})">
                                <div class="tableTitle">${table.TableNumber}</div>
                                <div class="tableImg"><img src="img/icons/table-w.svg" alt=""/></div>
                                <div class="tableInfo"
                                id="table${table.Id + firstMap.Name.split(' ').join('') + firstArea.Name.split(' ').join('')}Info">
                                <img src="img/icons/cutleries-w.svg" alt="" height="15" width="24"/>`;
                if (table.inUseCutleries) {
                    template += `<div class="tableState">${table.inUseCutleries} / ${table.Cutleries}</div></div></div>`;
                } else {
                    template += `<div class="tableState">${table.Cutleries}</div></div></div>`;
                }
            }
            template += `</div></div>`;
            for (let map of storeMap) {
                for (let area of map.Areas) {
                    if (area.Name !== firstArea.Name) {
                        template += `<div class="groupTableList"
                                        id="${map.Name.split(' ').join('') + area.Name.split(' ').join('')}" style="display:none;">
                                        <div class="groupTableList" id="tablePlanList">`;
                        area.Objects.sort(function (a, b) {
                            return a["TableNumber"] - b["TableNumber"]
                        });
                        for (let table of area.Objects) {
                            template += `<div class="tableMain"
                                id="table${table.Id + map.Name.split(' ').join('') + area.Name.split(' ').join('')}"
                                onclick="$('#modalTablePlan').scope().selectTableById('${map.Name}','${area.Name}',${table.Id})">
                                <div class="tableTitle">${table.TableNumber}</div>
                                <div class="tableImg"><img src="img/icons/table-w.svg" alt=""/></div>
                                <div class="tableInfo"
                                id="table${table.Id + map.Name.split(' ').join('') + area.Name.split(' ').join('')}Info">
                                <img src="img/icons/cutleries-w.svg" alt="" height="15" width="24"/>`;
                            if (table.inUseCutleries) {
                                template += `<div class="tableState">${table.inUseCutleries} / ${table.Cutleries}</div></div></div>`;
                            } else {
                                template += `<div class="tableState">${table.Cutleries}</div></div></div>`;
                            }
                        }
                        template += `</div></div>`;
                    }
                }
            }
            template += `</div></div>`;

            element.append(template);
        }
    }
});