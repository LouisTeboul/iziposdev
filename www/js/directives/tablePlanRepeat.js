app.directive('tablePlanRepeat', function () {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: (scope, element) => {
            let template = `<div class="mainAllMapAreaTable">`;
            let storeMap = scope.storeMap.data;
            let firstMap, first = true;

            template += `<div id="allMapsOnglet" style="flex-wrap:wrap">`;
            for (let map of storeMap) {
                if (first) {
                    template += `<div class="tableOnglet tableOngletFocus"
                                    id="${map.Name.replace(/[^a-zA-Z0-9]/g, "")}onglet"
                                    onclick="$('#modalTablePlan').scope().showMap('${map.Name}',${storeMap.indexOf(map)})">${map.Name}</div>`;
                    firstMap = map;
                    first = false;
                } else {
                    template += `<div class="tableOnglet"
                                    id="${map.Name.replace(/[^a-zA-Z0-9]/g, "")}onglet"
                                    onclick="$('#modalTablePlan').scope().showMap('${map.Name}',${storeMap.indexOf(map)})">${map.Name}</div>`;
                }
            }
            template += `</div><hr style="margin:0;">`;

            let firstArea;
            first = true;
            template += `<div id="allAreasOnglet">
                            <div class="${firstMap.Name.replace(/[^a-zA-Z0-9]/g, "")}AreaOnglet" style="display:flex;flex-wrap:wrap">`;
            for (let area of firstMap.Areas) {
                if (first) {
                    template += `<div class="tableOnglet tableOngletFocus"
                                    id="${firstMap.Name.replace(/[^a-zA-Z0-9]/g, "") + area.Name.replace(/[^a-zA-Z0-9]/g, "")}onglet"
                                    onclick="$('#modalTablePlan').scope().showArea('${firstMap.Name}','${area.Name}',${firstMap.Areas.indexOf(area)})">${area.Name}</div>`;
                    firstArea = area;
                    first = false;
                } else {
                    template += `<div class="tableOnglet"
                                    id="${firstMap.Name.replace(/[^a-zA-Z0-9]/g, "") + area.Name.replace(/[^a-zA-Z0-9]/g, "")}onglet"
                                    onclick="$('#modalTablePlan').scope().showArea('${firstMap.Name}','${area.Name}',${firstMap.Areas.indexOf(area)})">${area.Name}</div>`;
                }
            }

            for (let map of storeMap) {
                if (map.Name !== firstMap.Name) {
                    let fArea = true;
                    template += `<div class="${map.Name.replace(/[^a-zA-Z0-9]/g, "")}AreaOnglet"
                            style="display:none;flex-direction:row;">`;
                    for (let area of map.Areas) {
                        if (fArea) {
                            template += `<div class="tableOnglet tableOngletFocus"
                                            id="${map.Name.replace(/[^a-zA-Z0-9]/g, "") + area.Name.replace(/[^a-zA-Z0-9]/g, "")}onglet"
                                            onclick="$('#modalTablePlan').scope().showArea('${map.Name}','${area.Name}',${map.Areas.indexOf(area)})">${area.Name}</div>`;
                            fArea = false;
                        } else {
                            template += `<div class="tableOnglet"
                                            id="${map.Name.replace(/[^a-zA-Z0-9]/g, "") + area.Name.replace(/[^a-zA-Z0-9]/g, "")}onglet"
                                            onclick="$('#modalTablePlan').scope().showArea('${map.Name}','${area.Name}',${map.Areas.indexOf(area)})">${area.Name}</div>`;
                        }
                    }
                }
                template += `</div>`;
            }
            template += `</div><hr style="margin:0;"><div id="mainCanvasTables" style="flex:1"></div></div></div>`;

            element.append(template);
        }
    };
});