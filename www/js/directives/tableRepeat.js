app.directive('tableRepeat', function ($rootScope, $compile, $filter) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: function (scope, element) {

            var template = `<div class="mainAllMapAreaTable">`;

            var storeMap = scope.storeMap.data;
            var firstMap, first = true;
            template += `<div id="allMapsOnglet">`;
            for (var fmap of storeMap) {
                if (first) {
                    template += `<div class="tableOnglet tableOngletFocus"
                                    id="${fmap.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showMap('${fmap.Name}',${storeMap.indexOf(fmap)})">${fmap.Name}</div>`;
                    firstMap = fmap;
                    first = false;
                } else {
                    template += `<div class="tableOnglet"
                                    id="${fmap.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showMap('${fmap.Name}',${storeMap.indexOf(fmap)})">${fmap.Name}</div>`;
                }
            }
            template += `</div><hr style="margin:0;">`;

            var firstArea;
            first = true;
            template += `<div id="allAreasOnglet">
                            <div class="${firstMap.Name.split(' ').join('')}AreaOnglet"
                            style="display:flex;flex-direction:row;">`;
            for (var farea of firstMap.Areas) {
                if (first) {
                    template += `<div class="tableOnglet tableOngletFocus"
                                    id="${firstMap.Name.split(' ').join('') + farea.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showArea('${firstMap.Name}','${farea.Name}',${firstMap.Areas.indexOf(farea)})">${farea.Name}</div>`;
                    firstArea = farea;
                    first = false;
                } else {
                    template += `<div class="tableOnglet"
                                    id="${firstMap.Name.split(' ').join('') + farea.Name.split(' ').join('')}onglet"
                                    onclick="$('#modalTablePlan').scope().showArea('${firstMap.Name}','${farea.Name}',${firstMap.Areas.indexOf(farea)})">${farea.Name}</div>`;
                }
            }

            for (var smap of storeMap) {
                if (smap.Name !== firstMap.Name) {
                    var fArea = true;
                    template += `<div class="${smap.Name.split(' ').join('')}AreaOnglet"
                            style="display:none;flex-direction:row;">`;
                    for (var sarea of smap.Areas) {
                        if (fArea) {
                            template += `<div class="tableOnglet tableOngletFocus"
                                            id="${smap.Name.split(' ').join('') + sarea.Name.split(' ').join('')}onglet"
                                            onclick="$('#modalTablePlan').scope().showArea('${smap.Name}','${sarea.Name}',${smap.Areas.indexOf(sarea)})">${sarea.Name}</div>`;
                            fArea = false;
                        } else {
                            template += `<div class="tableOnglet"
                                            id="${smap.Name.split(' ').join('') + sarea.Name.split(' ').join('')}onglet"
                                            onclick="$('#modalTablePlan').scope().showArea('${smap.Name}','${sarea.Name}',${smap.Areas.indexOf(sarea)})">${sarea.Name}</div>`;
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
            for (var ftable of firstArea.Objects) {
                template += `<div class="tableMain"
                                id="table${ftable.Id + firstMap.Name.split(' ').join('') + firstArea.Name.split(' ').join('')}"
                                onclick="$('#modalTablePlan').scope().selectTableById('${firstMap.Name}','${firstArea.Name}',${ftable.Id})">
                                <div class="tableTitle">${ftable.TableNumber}</div>
                                <div class="tableImg"><img src="img/icons/table-w.svg" alt=""/></div>
                                <div class="tableInfo"
                                id="table${ftable.Id + firstMap.Name.split(' ').join('') + firstArea.Name.split(' ').join('')}Info">
                                <img src="img/icons/cutleries-w.svg" alt="" height="15" width="24"/>`;
                if (ftable.inUseCutleries) {
                    template += `<div class="tableState">${ftable.inUseCutleries} / ${ftable.Cutleries}</div></div></div>`;
                } else {
                    template += `<div class="tableState">${ftable.Cutleries}</div></div></div>`;
                }
            }
            template += `</div></div>`;
            for (var map of storeMap) {
                for (var area of map.Areas) {
                    if (area.Name !== firstArea.Name) {
                        template += `<div class="groupTableList"
                                        id="${map.Name.split(' ').join('') + area.Name.split(' ').join('')}" style="display:none;">
                                        <div class="groupTableList" id="tablePlanList">`;
                        area.Objects.sort(function (a, b) {
                            return a["TableNumber"] - b["TableNumber"]
                        });
                        for (var table of area.Objects) {
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