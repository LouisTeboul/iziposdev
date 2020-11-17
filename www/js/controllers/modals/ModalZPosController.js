app.controller('ModalZPosController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $http, zposService, dateStart, dateEnd) {
    $scope.dateStart = dateStart;
    $scope.dateEnd = dateEnd;
    $scope.loading = true;
    $scope.emptyData = false;

    $scope.init = function () {
        const interval = {
            Start: moment(dateStart).startOf('day').format('x'),
            End: moment(dateEnd).endOf('day').format('x')
        };
        const intervalStatsApiUrl = $rootScope.APIBaseURL + "/zpos/getIntervalStats";

        $http.post(intervalStatsApiUrl, interval).then((stats) => {
            if (stats && stats.data) {
                $scope.stats = stats.data;
                // Tableau
                $scope.columns = zposService.getStatsColumnsTitles(stats.data.Rows);
                $scope.totalITPeriod = stats.data.TotalIT;
                $scope.totalETPeriod = stats.data.TotalET;
                $scope.totalLossPeriod = stats.data.LossAmount;
                $scope.totalEmployeeMealsPeriod = stats.data.EmployeeMealsAmount;
                $scope.columnsCompta = $scope.columns[0];
                $scope.rowsCompta = zposService.getStatsRowsByColumns($scope.columnsCompta, stats.data.Rows, 0);
                $scope.columnsMetier = $scope.columns[2];
                $scope.rowsMetier = zposService.getStatsRowsByColumns($scope.columnsMetier, stats.data.Rows, 2);
                $scope.columnsOperat = $scope.columns[1];
                $scope.rowsOperat = [];
                for (let user of $scope.columnsOperat) {
                    $scope.rowsOperat.push(zposService.getStatsRowsByColumns(user, stats.data.Rows, 1));
                }
                setTimeout(() => {
                    let dataTableSettings = {
                        "lengthMenu": [[10, 25, 50, 100, 250, -1], [10, 25, 50, 100, 250, "All"]],
                        "pageLength": 10,
                        "bPaginate": true,
                        "bLengthChange": false,
                        "bFilter": false,
                        "bInfo": false,
                        "bAutoWidth": false
                    };
                    if ($scope.rowsCompta.length > 0 || $scope.rowsMetier.length > 0 || $scope.rowsOperat.length > 0) {
                        $('#tableCompta').DataTable(dataTableSettings);
                        $('#tableMetier').DataTable(dataTableSettings);

                        for (let user of $scope.rowsOperat) {
                            $('#table' + user.name).DataTable(dataTableSettings)
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
        });
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.printZPos = function () {
        $uibModal.open({
            templateUrl: 'modals/modalPrintStats.html',
            controller: 'ModalPrintStatsController',
            resolve: {
                datas: function () {
                    return $scope.stats;
                },
                count: function () {
                    return null;
                },
                printMode: function () {
                    return StatsPrintMode.INTERVAL;
                }
            },
            backdrop: 'static'
        });
    };

    $scope.emailZPos = () => {
        zposService.emailStatsAsync($scope.stats, false);
    }
});