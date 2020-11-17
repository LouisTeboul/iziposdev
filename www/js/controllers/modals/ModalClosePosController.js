app.controller('ModalClosePosController', function ($scope, $rootScope, $uibModal, $uibModalInstance, $translate, settingService, zposService, posPeriodService, closePosParameters, modalStats, posUserService, posService) {
    $scope.PosStatus = PosStatus;
    $scope.closePosParameters = closePosParameters;
    $scope.paymentType = PaymentType;
    $scope.PaymentValues = null;

    $scope.init = (keepPreviousCloseParameter = false, newClosePosParameters = {}) => {
        $scope.loading = true;

        if (keepPreviousCloseParameter) {
            $scope.previousClosePosParameters = $scope.closePosParameters;
        } else {
            $scope.previousClosePosParameters = null;
        }
        if (newClosePosParameters && !angular.equals(newClosePosParameters, {})) {
            $scope.closePosParameters = newClosePosParameters;
        }

        let preSelectedPos = null;
        if ($scope.model && $scope.model.selectedPos) {
            preSelectedPos = $scope.model.selectedPos;
        } else {
            if ($scope.closePosParameters && $scope.closePosParameters.yperiod) {
                preSelectedPos = $scope.closePosParameters.yperiod.hardwareId;
            }
        }

        let oldhwidM = null
        if ($scope.model && $scope.model.hardwareIdModels) {
            oldhwidM = $scope.model.hardwareIdModels;
        } else if ($rootScope.savedClosePosData) {
            oldhwidM = $rootScope.savedClosePosData;
        }

        $scope.model = {
            selectedPos: preSelectedPos,
            hardwareIdModels: [],
            zRecapGlobal: {},
            closingEnable: posUserService.isEnable('CLOS', true),
            showCloseButton: true,
            cashManagementDisable: false
        };

        if (oldhwidM) {
            $scope.model.hardwareIdModels = oldhwidM;
        }

        $scope.model.zRecapGlobal = {};

        settingService.getPaymentModesAsync(true).then((paymentSetting) => {
            const paymentModes = paymentSetting;
            const dateClose = new Date().toString('dd/MM/yyyy H:mm:ss');

            if ($scope.closePosParameters.zperiod) {
                $scope.closePosValues = {
                    HardwareId: $rootScope.modelPos.hardwareId,
                    PosUserId: $rootScope.PosUserId,
                    Date: dateClose,
                    MovementType_Id: 0,
                    zPeriodId: $scope.closePosParameters.zperiod.id,
                    StoreId: $rootScope.IziBoxConfiguration.StoreId,
                    CashMovementLines: []
                };

                for (let p of paymentModes) {
                    let addPaymentMode = {
                        PaymentType: p.PaymentType,
                        Value: p.Value,
                        Text: p.Text,
                        Total: 0,
                        IsBalance: p.IsBalance ? true : false
                    };

                    let lineClosePos = {
                        PaymentMode: addPaymentMode,
                        Count: 0,
                        TotalKnown: 0,
                        CashDiscrepancyYs: 0
                    };
                    $scope.closePosValues.CashMovementLines.push(lineClosePos);
                }

                switch ($scope.closePosParameters.mode.idMode) {
                    case 1:
                    case 2:
                        //Fermeture de Y
                        let ypId = null;

                        if ($scope.closePosParameters.mode.idMode === 1) {
                            if ($scope.closePosParameters && $scope.closePosParameters.yperiod) {
                                ypId = $scope.closePosParameters.yperiod.id;

                                if ($scope.closePosParameters.yperiod.endDate) {
                                    $scope.model.showCloseButton = false;
                                    swal({
                                        title: $translate.instant("Ce service est déjà fermé")
                                    });
                                }
                            }
                        } else if ($scope.closePosParameters.mode.idMode === 2) {
                            //Vérification si il y a une yPeriod a fermer
                            let ypOpen = Enumerable.from($scope.closePosParameters.yperiods).firstOrDefault((yp) => {
                                return !yp.endDate;
                            });

                            if (!ypOpen) {
                                $scope.model.showCloseButton = false;
                                swal({
                                    title: $translate.instant("Tous les services de cette caisse sont fermés")
                                });
                            }
                        }

                        const reloadDatas = (yperiodId) => {
                            posPeriodService.getPaymentValuesAsync($scope.closePosParameters.zperiod.id, yperiodId, $scope.closePosParameters.hid).then((paymentValues) => {
                                if (paymentValues) {
                                    let found = $scope.model.hardwareIdModels.find(m => m.hid === $scope.closePosParameters.hid);

                                    if (found) {
                                        for (let line of found.CashMovementLines) {
                                            let payment = paymentValues.PaymentLines.find(c => c.PaymentMode.Value === line.PaymentMode.Value);

                                            if (payment) {
                                                line.TotalKnown = payment.PaymentMode.Total;
                                            }
                                            else
                                            {
                                                line.TotalKnown = 0;
                                            }
                                        }
                                    }
                                    $scope.PaymentValues = paymentValues;
                                }
                            }).catch((err) => { }).then(() => {
                                $scope.loading = false;
                            });
                        };

                        let exist = $scope.model.hardwareIdModels.find(m => m.hid === $scope.closePosParameters.hid);

                        if (!exist) {
                            posService.getPosNameAsync($scope.closePosParameters.hid).then((alias) => {
                                let newHidModel = {
                                    hid: $scope.closePosParameters.hid,
                                    ypid: ypId,
                                    alias: alias,
                                    CashMovementLines: [],
                                    hasYPeriodOpen: $scope.closePosParameters.yperiod && !$scope.closePosParameters.yperiod.endDate
                                };
                                for (let line of $scope.closePosValues.CashMovementLines) {
                                    line.Count = 0;
                                    line.PaymentMode.Total = 0;
                                    newHidModel.CashMovementLines.push(clone(line));
                                }
                                $scope.model.hardwareIdModels.push(newHidModel);
                                reloadDatas(ypId);
                            });
                        } else {
                            reloadDatas(ypId);
                        }
                        break;
                    case 3:
                        //Fermeture de Z
                        posPeriodService.getZPeriodRecapAsync(paymentModes).then((zPeriodRecap) => {
                            // Met a null les valeur de pré-remplissage
                            zPeriodRecap.RecapByPoss = zPeriodRecap.RecapByPoss.map(rbp => {
                                rbp.CashMovementLines = rbp.CashMovementLines.map(cml => {
                                    if (![PaymentType.FIDELITE, PaymentType.INTERNET, PaymentType.ENCOMPTE].includes(cml.PaymentMode.PaymentType)) {
                                        cml.Count = 0;
                                        // Si la caisse a une periode ouverte
                                        if (rbp.hasYPeriodOpen) {
                                            // Si le montant compté des précédents services = a l'attentu
                                            if (cml.TotalYs === cml.TotalKnown) {
                                                // On prérempli
                                                cml.PaymentMode.Total = cml.TotalYs || 0;
                                            } else {
                                                cml.PaymentMode.Total = 0;
                                            }
                                        } else {
                                            // Sinon, si elle n'a aucune periode ouverte
                                            // On prérempli
                                            cml.PaymentMode.Total = cml.TotalYs || 0;
                                        }
                                    }
                                    return cml;
                                });

                                return rbp;
                            });

                            $scope.zPeriodRecap = zPeriodRecap;
                            console.log(zPeriodRecap);

                            if (zPeriodRecap) {
                                if (zPeriodRecap.RecapByPoss) {
                                    for (let recapByPos of zPeriodRecap.RecapByPoss) {
                                        if ($scope.model.hardwareIdModels.length > 0) {
                                            let matchHid = $scope.model.hardwareIdModels.find(h => h.hid === recapByPos.hid);
                                            if (matchHid) {
                                                if (recapByPos.yPeriodStillOpen && !matchHid.yPeriodStillOpen) {
                                                    matchHid.yPeriodStillOpen = recapByPos.yPeriodStillOpen;
                                                }
                                                for (let cashLine of recapByPos.CashMovementLines) {
                                                    let matchLine = matchHid.CashMovementLines.find(
                                                        l => l.PaymentMode.Value === cashLine.PaymentMode.Value && l.PaymentMode.PaymentType === cashLine.PaymentMode.PaymentType
                                                    );
                                                    if (matchLine) {
                                                        if (cashLine.PaymentMode.Total != matchLine.PaymentMode.Total || cashLine.Count != matchLine.Count) {
                                                            cashLine.PaymentMode.Total = matchLine.PaymentMode.Total;
                                                            cashLine.Count = matchLine.Count;
                                                        }
                                                    }
                                                    if (!cashLine.PaymentMode.Total && cashLine.PaymentMode.Total != 0) {
                                                        cashLine.PaymentMode.Total = 0;
                                                    }
                                                    if (!cashLine.Count && cashLine.Count != 0) {
                                                        cashLine.Count = 0;
                                                    }
                                                    if (!cashLine.Total && cashLine.Total != 0) {
                                                        cashLine.Total = 0;
                                                    }
                                                }
                                            } else {
                                                $scope.model.hardwareIdModels.push(recapByPos);
                                            }
                                        } else {
                                            $scope.model.hardwareIdModels.push(recapByPos);
                                        }
                                    }
                                    for (let recap of $scope.model.hardwareIdModels) {
                                        if (recap.yPeriodStillOpen != null) {
                                            posPeriodService.getPaymentValuesAsync(recap.yPeriodStillOpen.zPeriodId, recap.yPeriodStillOpen.yPeriodId, recap.hid).then((paymentValues) => {
                                                if (paymentValues) {
                                                    for (let line of recap.CashMovementLines) {
                                                        let payment = paymentValues.PaymentLines.find(c => c.PaymentMode.Value === line.PaymentMode.Value);

                                                        if (payment) {
                                                            line.TotalKnown = payment.PaymentMode.Total;
                                                        }
                                                        else {
                                                            line.TotalKnown = 0;
                                                        }
                                                    }
                                                }
                                            }).catch((err) => { }).then(() => {
                                                $scope.loading = false;
                                            });
                                        }
                                    }
                                }
                                if (zPeriodRecap.RecapGlobal) {
                                    $scope.model.zRecapGlobal = zPeriodRecap.RecapGlobal;
                                }
                            }
                        }).catch((err) => {}).then(() => {
                            $scope.loading = false;
                        });
                        break;
                }
            } else {
                $scope.loading = false;
                swal({
                    title: $translate.instant("La journée est déjà fermée")
                });
            }
        }, (err) => {
            $scope.loading = false;
            console.error(err);
        });
    };

    $scope.selectMotif = (motif) => {
        $scope.openPosValues.Motif = motif;
    };

    $scope.editCashValues = (paymentValue) => {
        /*if (window.glory) {
            $scope.loading = true;
            const gloryPromise = new Promise((resolve, reject) => {
                window.glory.getInventory(resolve, reject);
            });
            gloryPromise.then((res) => {
                let inventory = JSON.parse(res);
                $scope.loading = false;
                openModalCash(inventory);
            }, (err) => {
                console.error(err);
                $scope.loading = false;
                openModalCash();
            });
        } else {
            openModalCash();
        }*/
        openModalCash(paymentValue);
    };

    const openModalCash = (paymentValue) => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                moneyInventory: () => {
                    return null;
                },
                allowEdit: () => {
                    return true;
                },
                returnListBC: () => {
                    return false;
                },
                isGlory: () => {
                    return false;
                }
            }
        });

        modalInstance.result.then((total) => {
            paymentValue.PaymentMode.Total = total;
        }, () => {
            console.error("Error cash values modal");
        });
    };

    $scope.editTRValues = (TRValue, yperiodId, mode) => {
        if (!$scope.PaymentValues || mode == 3) {
            if ($scope.zPeriodRecap && $scope.zPeriodRecap.RecapByPoss) {
                let pos = $scope.zPeriodRecap.RecapByPoss.find((p) => {
                    return p.hid === yperiodId;
                });
                if (pos) {
                    $scope.PaymentValues = pos.yPeriodStillOpen.PaymentValues;
                } else {
                    return;
                }
            } else {
                return;
            }
        }

        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalTRValues.html',
            controller: 'ModalTRValuesController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                paymentValues: $scope.PaymentValues
            }
        });

        modalInstance.result.then((data) => {
            TRValue.PaymentMode.Total = data.total;
            TRValue.Count = data.count;
        }, (err) => {
            console.error(err);
        });
    };

    //Display all tickets related to a cash register
    //Enable user to modify said tickets
    $scope.correctTickets = (hid) => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCashRegisterShoppingCarts.html',
            controller: 'ModalCashRegisterShoppingCartsController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                hid: () => {
                    return hid;
                },
                zpid: () => {
                    return $scope.closePosParameters.zperiod.id;
                },
                ypid: () => {
                    if ($scope.closePosParameters.yperiod) {
                        return $scope.closePosParameters.yperiod.id;
                    } else {
                        return null;
                    }
                }
            }
        });
        modalInstance.result.then(() => {
            $scope.init();
        });
    };

    $scope.displayAllPosRecap = () => {
        $scope.model.selectedPos = null;
    };

    $scope.displayPosDetail = (pos) => {
        $scope.model.selectedPos = pos.hid;
    };

    $scope.getPosStatus = (hid) => {
        //Status :
        //0 : Open
        //1 : Closed clean
        //2 : Closed with discrepency
        let matchingPos = $scope.closePosParameters.posList.find(p => p.Hid == hid);
        if (matchingPos) {
            return matchingPos.Status;
        } else {
            return null;
        }
    };

    //Open the view to manage cash
    $scope.cashManagement = (hid) => {
        if (posUserService.isEnable('CASH')) {
            $scope.model.cashManagementDisabled = true;
            posPeriodService.getYPeriodAsync(hid, $rootScope.PosUserId, false, true).then((periodPair) => {
                const callOpenPosModal = (YPeriod, forceOpen) => {
                    let modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalOpenPos.html',
                        controller: 'ModalOpenPosController',
                        resolve: {
                            openPosParameters: () => {
                                return {
                                    isOpenPos: false,
                                    zPeriodId: YPeriod.zPeriodId,
                                    yPeriodId: YPeriod.id,
                                    forceOpen: forceOpen
                                };
                            }
                        },
                        backdrop: 'static'
                    });
                    modalInstance.result.then(() => {
                        $scope.model.cashManagementDisabled = false;
                        $scope.init();
                    }, () => {
                        $scope.model.cashManagementDisabled = false;
                    });
                };

                if (!periodPair.YPeriod) {
                    if ($scope.model.closingEnable) {
                        // ForceOpen
                        let openPosValues = {
                            HardwareId: hid,
                            PosUserId: $rootScope.PosUserId,
                            zPeriodId: periodPair.ZPeriod ? periodPair.ZPeriod.zPeriodId : undefined,
                            StoreId: $rootScope.IziBoxConfiguration.StoreId,
                            CashMovementLines: []
                        };

                        posPeriodService.CreateOrUpdateYPeriodAsync(openPosValues, undefined, true).then((periodPair) => {
                            callOpenPosModal(periodPair.YPeriod, true);
                        }, () => {
                            $scope.model.cashManagementDisabled = false;
                            console.log("Error in force open Y");
                            swal({
                                title: $translate.instant("Veuillez renseigner le fond de caisse")
                            });
                        });
                    } else {
                        $scope.model.cashManagementDisabled = false;
                    }
                } else if (periodPair.YPeriod && !periodPair.YPeriod.endDate) {
                    callOpenPosModal(periodPair.YPeriod, false);
                } else if (periodPair.YPeriod && periodPair.YPeriod.endDate) {
                    $scope.init();
                }
            }, () => {
                $scope.model.cashManagementDisabled = false;
                swal({
                    title: $translate.instant("Veuillez renseigner le fond de caisse")
                });
            });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    $scope.openDrawer = () => {
        posService.openDrawer();
    };

    $scope.openZ = () => {
        $uibModalInstance.close();

        $rootScope.modalStatsEnabled = $uibModal.open({
            templateUrl: 'modals/modalStatsPeriod.html',
            controller: 'ModalStatsPeriodController',
            size: 'max',
            resolve: {
                closePosParameters: () => {
                    return $scope.closePosParameters;
                }
            },
            backdrop: 'static'
        });
    };

    // Fermeture de caisse. Doit purger les tickets
    $scope.ok = () => {
        //Ferme la modal de stats, qui etait invisible
        modalStats.dismiss();

        let hasGapGlobal = false;
        let hardwareIdModelsWithGap = [];
        for (let hidModel of $scope.model.hardwareIdModels) {
            let hasGapHid = false;
            if (hidModel.hasYPeriodOpen) {
                for (let lines of hidModel.CashMovementLines) {
                    if ([PaymentType.FIDELITE, PaymentType.INTERNET, PaymentType.ENCOMPTE].includes(lines.PaymentMode.PaymentType)) {
                        lines.PaymentMode.Total = lines.TotalKnown;
                    }
                    if (!hasGapHid && Number(lines.TotalKnown) !== Number(lines.PaymentMode.Total)
                        && ![PaymentType.FIDELITE, PaymentType.INTERNET, PaymentType.ENCOMPTE].includes(lines.PaymentMode.PaymentType)) {
                        hasGapGlobal = true;
                        hasGapHid = true;
                        hardwareIdModelsWithGap.push(hidModel);
                    }
                }
            }
        }

        if (hasGapGlobal) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalClosePosJustification.html',
                controller: 'ModalClosePosJustificationController',
                size: 'lg',
                resolve: {
                    justificationParameters: () => {
                        return {
                            closePosParameters: $scope.closePosParameters,
                            hardwareIdModelsWithGap: hardwareIdModelsWithGap
                        };
                    }
                }
            });
            modalInstance.result.then((ret) => {
                if (ret && ret.refresh) {
                    $scope.init();
                } else {
                    closeCashMachine();
                }
            }, (err) => {
                console.log(err);
            });
        } else {
            closeCashMachine();
        }
    };

    $scope.detailsServices = (hid) => {
        $uibModal.open({
            templateUrl: 'modals/modalDetailsServicesCount.html',
            controller: 'ModalDetailsServicesCountController',
            size: 'xlg',
            resolve: {
                detailsServicesParameters: () => {
                    return {
                        hid: hid,
                        zPeriodId: $scope.closePosParameters.zperiod.id
                    };
                }
            },
            backdrop: 'static'
        });
    };

    $scope.closeServices = (yperiodStillOpen) => {
        const newClosePosParameters = {
            hid: yperiodStillOpen ? yperiodStillOpen.hardwareId : null,
            hidList: $scope.closePosParameters.hidList,
            posList: $scope.closePosParameters.posList,
            mode: {
                idMode: 1,
                text: "Fermeture de service",
                title: "Z de service"
            },
            yperiod: yperiodStillOpen,
            zperiod: $scope.closePosParameters.zperiod
        };
        $scope.init(true, newClosePosParameters);
    };

    $scope.cancel = () => {
        $rootScope.savedClosePosData = $scope.model.hardwareIdModels;
        $uibModalInstance.dismiss('cancel');
        $rootScope.closeKeyboard();
    };

    $scope.closeK = () => {
        $rootScope.closeKeyboard();
    };

    const closeCashMachine = () => {
        if (!$rootScope.modelPos.iziboxConnected) {
            swal({
                title: $translate.instant("La izibox n'est pas accessible")
            });
        } else if (!$scope.closePosParameters.zperiod) {
            swal({
                title: $translate.instant("La journée est déjà fermée")
            });
        } else {
            // let pendingUnlocked = $rootScope.OrderCount.total.unlocked || 0 + $rootScope.FreezeCount.total.unlocked || 0;
            // let pendingLocked = $rootScope.OrderCount.total.locked || 0 + $rootScope.FreezeCount.total.locked || 0;

            // let pendingTotal = pendingLocked + pendingUnlocked;

            // let textFreeze = pendingTotal && pendingTotal > 0 ? "Vous avez " + pendingTotal + " ticket en attente\n" : "";
            // if (pendingLocked && pendingLocked > 0) {
            //     textFreeze += "Dont " + pendingLocked + " verrouillé(s)\n";
            // }

            // textFreeze += "Fermer quand même ?";

            // swal({
            //     title: $translate.instant($scope.closePosParameters.mode.text),
            //     text: textFreeze,
            //     buttons: [$translate.instant("Non"), $translate.instant("Oui")],
            //     dangerMode: true,
            //     icon: "info"
            // }).then((confirm) => {
            //     // Close anyway
            //     if (confirm) {
            // Met a 0 le payment mode total et le count qui était null
            for (let hidModel of $scope.model.hardwareIdModels) {
                if (hidModel.hasYPeriodOpen) {
                    for (let lines of hidModel.CashMovementLines) {
                        if (!lines.PaymentMode.Total) {
                            lines.PaymentMode.Total = 0;
                        }
                        if (!lines.Count) {
                            lines.Count = 0;
                        }
                    }
                }
            }

            $scope.loading = true;
            const yperiodId = $scope.closePosParameters.yperiod ? $scope.closePosParameters.yperiod.id : null;

            let printMode = null;
            if (yperiodId) {
                printMode = StatsPrintMode.Y;
            } else {
                printMode = StatsPrintMode.Z;
            }

            $rootScope.clearShoppingCart();

            switch ($scope.closePosParameters.mode.idMode) {
                //Fermeture de Y
                case 1:
                case 2:
                    let yPeriod = null;
                    // Fermeture de service
                    if ($scope.closePosParameters.mode.idMode === 1) {
                        yPeriod = $scope.closePosParameters.yperiod;
                    }
                    // Fermeture de caisse
                    else if ($scope.closePosParameters.mode.idMode === 2) {
                        yPeriod = Enumerable.from($scope.closePosParameters.yperiods).firstOrDefault((yP) => {
                            return yP.hardwareId === $scope.closePosParameters.hid && !yP.endDate;
                        });
                    }

                    if (yPeriod) {
                        // Récupération des montants saisies pour les stocker dans le yPeriod
                        let hardwareIdModel = Enumerable.from($scope.model.hardwareIdModels).firstOrDefault((hidModel) => {
                            return hidModel.hid === $scope.closePosParameters.hid;
                        });

                        let args = {
                            StoreId: $scope.closePosValues.StoreId,
                            PosUserId: $scope.closePosValues.PosUserId,
                            HardwareId: $scope.closePosParameters.hid
                        };

                        posPeriodService.closeYPeriodAsync(yPeriod, hardwareIdModel.CashMovementLines, args).then((statsAfterClose) => {
                            // Impression du récap :

                            const closingTicketHtml = zposService.composeStatsHTML(statsAfterClose, printMode, $scope.model.hardwareIdModels, false);
                            zposService.printZPosAsync(closingTicketHtml);

                            if ($rootScope.savedClosePosData) {
                                $rootScope.savedClosePosData = $rootScope.savedClosePosData.filter(p => p.hid !== $scope.closePosParameters.hid);
                            }
                            $scope.loading = false;

                            // ReOpen previousClosePosParameter
                            if ($scope.previousClosePosParameters && !angular.equals($scope.previousClosePosParameters, {})) {
                                $scope.init(false, $scope.previousClosePosParameters);
                            } else {
                                $uibModalInstance.close();
                            }
                        }, (err) => {
                            $scope.loading = false;
                            const message = err ? err : $translate.instant("La izibox n'est pas accessible");
                            swal({
                                title: message
                            });
                        });
                    } else {
                        $scope.loading = false;
                        swal({
                            title: "Aucune période sélectionnée"
                        });
                    }
                    break;
                case 3:
                    //Fermeture de Z
                    // Fermeture de la période
                    posPeriodService.closeZPeriodAsync($scope.closePosParameters.zperiod, $scope.model.hardwareIdModels, $scope.closePosValues).then((statsAfterClose) => {
                        // Impression du récap :
                        const closingTicketHtml = zposService.composeStatsHTML(statsAfterClose, printMode, $scope.model.hardwareIdModels, false);
                        // Et on le stock dans la base Zarchive
                        zposService.saveZArchiveAndPrint("Zarchive_" + statsAfterClose.zPeriodId, statsAfterClose, closingTicketHtml);

                        $rootScope.savedClosePosData = null;
                        $scope.loading = false;

                        $uibModalInstance.close();
                    }).catch((err) => {
                        console.error(err);

                        const message = err ? !err.Result ? err : err.Result : $translate.instant("La izibox n'est pas accessible");
                        swal({
                            title: message
                        });
                    }).then(() => {
                        $scope.loading = false;
                    });
                    break;
                    //}
            }
            $rootScope.closeKeyboard();
            //});
        }
    };
});