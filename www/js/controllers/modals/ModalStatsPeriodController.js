app.controller('ModalStatsPeriodController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $translate, $http, zposService, closePosParameters) {
    $scope.printY = undefined;
    $scope.closePosParameters = closePosParameters;
    console.log($scope.closePosParameters);
    $scope.loading = true;
    $scope.emptyData = false;

    $scope.zheaders = [];
    $scope.zlines = [];
    $scope.ztotal = [];
    $scope.ztotalET = [];

    $scope.init = () => {
        if ($scope.closePosParameters.mode && ($scope.closePosParameters.mode.idMode === 1 || $scope.closePosParameters.mode.idMode === 2 || $scope.closePosParameters.mode.idMode === 3)) {
            $scope.closePosText = $scope.closePosParameters.mode.text;
            $scope.titleText = $scope.closePosParameters.mode.title;
        } else {
            $scope.closePosParameters.mode = 0;
            $scope.closePosText = "Erreur";
        }

        if (closePosParameters.zperiod) {
            const yperiodId = $scope.closePosParameters.yperiod ? $scope.closePosParameters.yperiod.id : null;
            const hardwareId = $scope.closePosParameters.hid ? $scope.closePosParameters.hid : null;
            const periodRequest = {
                ZperiodId: closePosParameters.zperiod.id,
                YperiodId: yperiodId,
                HardwareId: hardwareId
            };
            const periodStatsApiUrl = $rootScope.APIBaseURL + "/zpos/getPeriodStats";

            if (yperiodId) {
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
                            "lengthMenu": [
                                [10, 25, 50, 100, 250, -1],
                                [10, 25, 50, 100, 250, "All"]
                            ],
                            "pageLengtht": 10,
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
                                $('#table' + user.name + user.id).DataTable(dataTableSettings);
                            }
                            $scope.loading = false;
                        } else {
                            $scope.emptyData = true;
                            $scope.loading = false;
                        }

                        $scope.$evalAsync();
                    }, 100);
                } else {
                    $scope.emptyData = true;
                    $scope.loading = false;
                }
            }).catch((err) => {
                const message = err ? err.data.Result : $translate.instant("Erreur lors de la récupération des données");
                swal(message);
            }).then(() => {
                $scope.loading = false;
            })
        } else {
            $scope.emptyData = true;
            $scope.loading = false;
        }
    };

    $scope.closePos = () => {
        let pendingUnlocked = $rootScope.OrderCount.total.unlocked || 0 + $rootScope.FreezeCount.total.unlocked || 0;
        let pendingLocked = $rootScope.OrderCount.total.locked || 0 + $rootScope.FreezeCount.total.locked || 0;

        let pendingTotal = pendingLocked + pendingUnlocked;

        let textFreeze = pendingTotal && pendingTotal > 0 ? "Vous avez " + pendingTotal + " ticket(s) en attente\n" : "";
        if (pendingLocked && pendingLocked > 0) {
            textFreeze += "Dont " + pendingLocked + " verrouillé(s)\n";
        }

        const continueClosing = () => {
            if ($rootScope.modalStatsEnabled) {
                $rootScope.modalStatsEnabled.close();
            }
            $uibModal.open({
                templateUrl: 'modals/modalClosePos.html',
                controller: 'ModalClosePosController',
                size: 'full',
                resolve: {
                    closePosParameters: () => {
                        console.log($scope.closePosParameters);
                        return $scope.closePosParameters;
                    },
                    modalStats: () => {
                        return $uibModalInstance;
                    }
                },
                backdrop: 'static'
            });
        };

        if (pendingTotal && pendingTotal > 0) {
            let swalTitle = $translate.instant("Attention!");
            let swalButtons = [$translate.instant("Non"), $translate.instant("Oui")];
            let swalIcon = "info";
            if ($rootScope.IziBoxConfiguration.FreezeMustBeEmptyForClosing && pendingUnlocked && pendingUnlocked > 0) {
                swalTitle = $translate.instant("Erreur");
                swalButtons = [$translate.instant("Retour"), false];
                swalIcon = "error";
                textFreeze += "Veuillez cloturer tous les tickets avant de fermer la periode.";
            } else {
                textFreeze += "Continuer quand même ?";
            }
            swal({
                title: swalTitle,
                text: textFreeze,
                buttons: swalButtons,
                dangerMode: true,
                icon: swalIcon
            }).then((confirm) => {
                if (confirm) {
                    continueClosing();
                }
            });
        } else {
            continueClosing();
        }
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
        $uibModal.open({
            templateUrl: 'modals/modalYperiodPick.html',
            controller: 'ModalYperiodPickController',
            size: 'lg',
            backdrop: 'static'
        });
    };

    $scope.printZPos = () => {
        $uibModal.open({
            templateUrl: 'modals/modalPrintStats.html',
            controller: 'ModalPrintStatsController',
            resolve: {
                datas: () => {
                    return $scope.stats;
                },
                count: () => {
                    if ($scope.closePosParameters.yperiod && $scope.closePosParameters.yperiod.id) {
                        return [{
                            'CashMovementLines': $scope.closePosParameters.yperiod.YCashMovementLines
                        }];
                    } else {
                        return null;
                    }
                },
                printMode: () => {
                    return $scope.printMode;
                }
            },
            backdrop: 'static'
        });
    };

    $scope.showServiceDetails = () => {
        $uibModal.open({
            templateUrl: 'modals/modalDetailsServicesCount.html',
            controller: 'ModalDetailsServicesCountController',
            size: 'lg',
            resolve: {
                detailsServicesParameters: () => {
                    return {
                        hid: $scope.closePosParameters.yperiod.hardwareId,
                        yPeriod: $scope.closePosParameters.yperiod,
                        zPeriodId: $scope.closePosParameters.zperiod.id
                    };
                }
            },
            backdrop: 'static'
        });
    };

    $scope.emailZPos = () => {
        zposService.emailStatsAsync($scope.stats, true);
    };
});