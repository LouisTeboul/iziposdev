app.controller('ModalStatsPeriodController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $http, zposService, closePosParameters) {

    $scope.printY = undefined;
    $scope.closePosParameters = closePosParameters;
    console.log($scope.closePosParameters);
    $scope.loading = true;
    $scope.emptyData = false;

    $scope.zheaders = [];
    $scope.zlines = [];
    $scope.ztotal = [];
    $scope.ztotalET = [];

    $scope.init = function () {
        if ($scope.closePosParameters.mode && ($scope.closePosParameters.mode.idMode === 1 || $scope.closePosParameters.mode.idMode === 2 || $scope.closePosParameters.mode.idMode === 3)) {
            $scope.closePosText = $scope.closePosParameters.mode.text;
            $scope.titleText = $scope.closePosParameters.mode.title;
        }
        else {
            $scope.closePosParameters.mode = 0;
            $scope.closePosText = "Erreur";
        }

        const yperiodId = $scope.closePosParameters.yperiod ? $scope.closePosParameters.yperiod.id : null;
        const hardwareId = $scope.closePosParameters.hid ? $scope.closePosParameters.hid : null;
        const periodRequest = {
            ZperiodId : closePosParameters.zperiod.id,
            YperiodId : yperiodId,
            HardwareId : hardwareId
        };
        const periodStatsApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/zpos/getPeriodStats";

        if(yperiodId) {
            $scope.printMode = StatsPrintMode.Y;
        } else {
            $scope.printMode = StatsPrintMode.Z;
        }

        $http.post(periodStatsApiUrl, periodRequest).then((stats) => {
            if (stats && stats.data) {
                $scope.stats = stats.data;
                // Tableau
                $scope.columns = zposService.getStatsColumnsTitles(stats.data.Rows);
                $scope.totalITPeriod = stats.data.TotalIT;
                $scope.totalETPeriod = stats.data.TotalET;
                $scope.columnsCompta = $scope.columns[0];
                $scope.rowsCompta = zposService.getStatsRowsByColumns($scope.columnsCompta, stats.data.Rows, 0);
                $scope.columnsMetier = $scope.columns[2];
                $scope.rowsMetier = zposService.getStatsRowsByColumns($scope.columnsMetier, stats.data.Rows, 2);
                $scope.columnsOperat = $scope.columns[1];
                $scope.rowsOperat = [];
                for (let user of $scope.columnsOperat) {
                    $scope.rowsOperat.push(zposService.getStatsRowsByColumns(user, stats.data.Rows, 1));
                }
                setTimeout(function () {
                    let dataTableSettings = {
                        "lengthMenu": [[10, 25, 50, 100, 250, -1], [10, 25, 50, 100, 250, "All"]],
                        "pageLengtht": 10,
                        "bPaginate": true,
                        "bLengthChange": false,
                        "bFilter": false,
                        "bInfo": false,
                        "bAutoWidth": false
                    };
                    if($scope.rowsCompta.length > 0 || $scope.rowsMetier.length > 0 || $scope.rowsOperat.length > 0) {
                        $('#tableCompta').DataTable(dataTableSettings);
                        $('#tableMetier').DataTable(dataTableSettings);

                        for (let user of $scope.rowsOperat) {
                            $('#table' + user.name).DataTable(dataTableSettings);
                        }
                        $scope.loading = false;
                    } else {
                        $scope.emptyData = true;
                        $scope.loading = false;
                    }
                }, 100);
            }
            else {
                $scope.emptyData = true;
                $scope.loading = false;
            }
        }, function (err) {
            const message = err ? err : $translate.instant("Erreur lors de la récupération des données");
            sweetAlert({ title: message }, function () {
            });
        });
    };

    $scope.closePos = function () {
        if($rootScope.modalStatsEnabled) {
            $rootScope.modalStatsEnabled.close();
        }
        $uibModal.open({
            templateUrl: 'modals/modalClosePos.html',
            controller: 'ModalClosePosController',
            size: 'lg',
            resolve: {
                closePosParameters: function () {
                    console.log($scope.closePosParameters);
                    return $scope.closePosParameters;

                },
                modalStats: function () {
                    return $uibModalInstance;
                }
            },
            backdrop: 'static'
        });
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
        $uibModal.open({
            templateUrl: 'modals/modalYperiodPick.html',
            controller: 'ModalYperiodPickController',
            size: 'lg',
            backdrop: 'static'
        });
    };

    $scope.printZPos = function () {
        $uibModal.open({
            templateUrl: 'modals/modalPrintStats.html',
            controller: 'ModalPrintStatsController',
            resolve: {
                datas: function () {
                    return $scope.stats;
                },
                printMode : function() {
                    return $scope.printMode;
                }
            },
            backdrop: 'static'
        });
    };

    $scope.emailZPos = function () {
        zposService.emailStatsAsync($scope.stats, true);
    };
});