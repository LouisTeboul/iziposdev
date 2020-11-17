app.controller('ModalYperiodPickController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate, posPeriodService, posService, posUserService) {
    $scope.init = () => {
        $scope.PosStatus = PosStatus;
        $scope.loading = true;
        $scope.model = {
            yPeriodByHid: [],
            mode: undefined,
            hids: [],
            closingEnable: posUserService.isEnable('CLOS', true)
        };

        $scope.activeHidBtn = undefined;
        $scope.activeYpidBtn = undefined;

        $scope.dateFormat = dateFormat;

        // Recupere l'id de la ZPeriod en cours

        posPeriodService.getZPeriodAsync(false).then((z) => {
            $scope.zp = z;
            //Recupere la liste de tout les HID associés a un tickets dans zpos
            //Il faut recup toutes les caisse associé à une periode Y
            posPeriodService.getAllYPeriodAsync('*').then((yp) => {
                $scope.yperiods = yp;
                if (!yp) {
                    $scope.loading = false;
                } else {
                    posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId).then((currentPeriods) => {
                        // TODO : Highlight la yperiod courante
                        if (currentPeriods.YPeriod && yp) {
                            let matchedY = yp.find(y => y.id === currentPeriods.YPeriod.yPeriodId);
                            if (matchedY) {
                                matchedY.IsOwnYPeriod = true;
                                console.log(yp);
                            }
                        }
                    });

                    let ypByHid = groupBy(yp, 'hardwareId');
                    $scope.loading = false;
                    for (let hid in ypByHid) {
                        if (ypByHid.hasOwnProperty(hid)) {
                            posService.getPosNameAsync(hid).then((alias) => {
                                let discr = false;
                                let allCashMovementLines = ypByHid[hid].map(y => y.YCashMovementLines).reduce((acc, cur) => acc.concat(cur));
                                if (allCashMovementLines) {
                                    discr = allCashMovementLines.some(cml => cml.CashDiscrepancyYs !== 0);
                                }

                                let hasYOpen = ypByHid[hid].some(yp => !yp.endDate);
                                let status = null;
                                if (hasYOpen) {
                                    if (discr) {
                                        status = PosStatus.OPENDIRTY;
                                    } else {
                                        status = PosStatus.OPENCLEAN;
                                    }
                                } else {
                                    if (discr) {
                                        status = PosStatus.CLOSEDDIRTY;
                                    } else {
                                        status = PosStatus.CLOSEDCLEAN;
                                    }
                                }

                                let obj = {
                                    "Alias": alias || hid,
                                    "Hid": hid,
                                    "Status": status,
                                    "IsOwnPos": hid === $rootScope.modelPos.hardwareId,
                                    "HasOpenYps": hasYOpen,
                                    "HasDiscrepancies": discr,
                                    "yps": ypByHid[hid]
                                };
                                $scope.model.yPeriodByHid.push(obj);
                            });
                        }
                    }
                }
            });
        }).catch((err) => {
            $scope.loading = false;
            console.error(err);
        });
    };

    $scope.HasDiscrepency = (yp) => {
        if (yp.YCashMovementLines && yp.YCashMovementLines.length > 0) {
            return yp.YCashMovementLines.some(cml => cml.CashDiscrepancyYs !== 0);
        } else {
            return false;
        }
    };

    $scope.printDate = (yp) => {
        return dateFormat(yp.startDate);
    };

    $scope.closeYPeriod = (yp) => {
        $scope.model.chosenYpid = yp.yPeriodId;
        $scope.closePeriod(yp, false);
    };

    $scope.determineMode = (chosenY, closeZ) => {
        /** Il faut set le mode
         *  Mode 1 : Fermeture Service = Une caisse une periode
         *  Mode 2 : Fermeture Caisse = Une caisse toutes les periodes <-- Sert a rien ? Car impossible d'avoir plus d'une periode par caisse
         *  Mode 3 : Fermeture journée = toutes les caisses (ou caisse unique) toutes les periodes
         */
        // Si cloture du Z
        if (closeZ) {
            // Mode 3
            $scope.model.mode = {
                idMode: 3,
                text: "Fermeture de journée",
                title: "Z de journée"
            };
        } else {
            // Si on a selectionné un Y
            if (chosenY) {
                // Mode 2
                $scope.model.mode = {
                    idMode: 1,
                    text: "Fermeture de service",
                    title: "Z de service"
                };
            }
        }
    };

    $scope.openStats = (chosenY, closeZ = false) => {
        $uibModalInstance.close();
        let hid = null;
        if (chosenY && chosenY.hardwareId) {
            hid = chosenY.hardwareId;
        }

        $scope.determineMode(chosenY, closeZ);

        $scope.currentYPeriod = chosenY;

        $rootScope.modalStatsEnabled = $uibModal.open({
            templateUrl: 'modals/modalStatsPeriod.html',
            controller: 'ModalStatsPeriodController',
            size: 'wide',
            resolve: {
                closePosParameters: () => {
                    return {
                        hid: hid,
                        hidList: $scope.model.hids,
                        posList: $scope.model.yPeriodByHid,
                        mode: $scope.model.mode,
                        yperiod: $scope.currentYPeriod,
                        yperiods: $scope.yperiods,
                        zperiod: $scope.zp
                    };
                }
            },
            backdrop: 'static'
        });
    };

    $scope.closePeriod = (chosenY, closeZ = false) => {
        let pendingUnlocked = $rootScope.OrderCount.total.unlocked || 0 + $rootScope.FreezeCount.total.unlocked || 0;
        let pendingLocked = $rootScope.OrderCount.total.locked || 0 + $rootScope.FreezeCount.total.locked || 0;

        let pendingTotal = pendingLocked + pendingUnlocked;

        let textFreeze = pendingTotal && pendingTotal > 0 ? "Vous avez " + pendingTotal + " ticket(s) en attente\n" : "";
        if (pendingLocked && pendingLocked > 0) {
            textFreeze += "Dont " + pendingLocked + " verrouillé(s)\n";
        }

        const continueClosing = () => {
            $uibModalInstance.close();
            let hid = null;
            if (chosenY) {
                if (chosenY.endDate) {
                    // Si on click sur une periode Y fermé, on affiche les stats
                    $scope.openStats(chosenY, closeZ);

                    return;
                }
                if (chosenY.hardwareId) {
                    hid = chosenY.hardwareId;
                }
            }

            $scope.determineMode(chosenY, closeZ);

            if (!chosenY) {
                $scope.currentYPeriod = $scope.model.chosenYpid ? Enumerable.from($scope.yperiods).firstOrDefault(function (yP) {
                    return yP.id === $scope.model.chosenYpid;
                }) : undefined;
            } else {
                $scope.currentYPeriod = chosenY;
            }

            $uibModal.open({
                templateUrl: 'modals/modalClosePos.html',
                controller: 'ModalClosePosController',
                size: 'full',
                resolve: {
                    closePosParameters: function () {
                        return {
                            hid: hid,
                            hidList: $scope.model.hids,
                            posList: $scope.model.yPeriodByHid,
                            mode: $scope.model.mode,
                            yperiod: $scope.currentYPeriod,
                            yperiods: $scope.yperiods,
                            zperiod: $scope.zp
                        };
                    },
                    modalStats: function () {
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

        setTimeout(() => {
            $rootScope.closeKeyboard();
            $rootScope.closeKeyboard();
        }, 500);
    };
});