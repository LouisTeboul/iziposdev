app.controller('ModalOpenPosController', function ($scope, $rootScope, $uibModal, $http, $uibModalInstance, settingService, cashMovementService, posPeriodService, posService, posUserService, $translate, openPosParameters) {
    $scope.openPosParameters = openPosParameters;

    $scope.init = () => {
        posService.getPosNameAsync($scope.openPosParameters.hardwareId).then((alias) => {
            $scope.alias = alias;
        });

        $scope.model = {
            motif: null,
            total: 0,
            totalKnown: 0,
            message: null,
            validateDisabled: false
        };

        cashMovementService.getMovementTypesAsync($scope.openPosParameters).then((motifs) => {
            $scope.motifs = motifs;

            if ($scope.motifs.length === 0) {
                if ($scope.openPosParameters.isOpenPos) {
                    if ($scope.openPosParameters.previousYPeriod) {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type ouverture de service dans le BO, merci";
                    }
                    else {
                        $scope.model.message = "Vous devez d&eacute;finir un mouvement de caisse de type fonds de caisse dans le BO, merci";
                    }
                }
                else {
                    $scope.model.message = "Vous devez d&eacute;finir au moins un mouvement de caisse d'entr&eacute;e, sortie dans le BO, merci";
                }
            } else if ($scope.openPosParameters.isOpenPos) {
                $scope.model.motif = motifs[0];
            }
        });

        if (window.glory && $rootScope.UserPreset && $rootScope.UserPreset.EnableGlory) {
            $scope.loading = true;
            const gloryPromise = new Promise((resolve, reject) => {
                window.glory.getInventory(resolve, reject);
            });
            gloryPromise.then((res) => {
                let inventory = JSON.parse(res);
                $scope.loading = false;

                let total = 0;
                for (let type of inventory.Values) {
                    total += type.Denomination * type.Value;
                }
                $scope.model.total = total; // TODO : Check both values
                $scope.model.totalKnown = total;
            }, (err) => {
                loadTotal();
                $scope.loading = false;
            });
        } else {
            loadTotal();
        }

        settingService.getPaymentModesAsync().then((paymentSetting) => {
            let paymentModes = paymentSetting;

            let cashPaymentMode = Enumerable.from(paymentModes).firstOrDefault((x) => {
                return x.PaymentType === PaymentType.ESPECE;
            });

            $scope.openPosValues = {
                HardwareId: $scope.openPosParameters.hardwareId ? $scope.openPosParameters.hardwareId : $rootScope.modelPos.hardwareId,
                PosUserId: $rootScope.PosUserId,
                MovementType_Id: 0,
                zPeriodId: $scope.openPosParameters.zPeriodId,
                yPeriodId: $scope.openPosParameters.yPeriodId,
                StoreId: $rootScope.IziBoxConfiguration.StoreId,
                CashMovementLines: []
            };

            if (cashPaymentMode) {
                const addPaymentMode = {
                    PaymentType: cashPaymentMode.PaymentType,
                    Value: cashPaymentMode.Value,
                    Text: cashPaymentMode.Text,
                    Total: 0,
                    IsBalance: cashPaymentMode.IsBalance
                };

                const lineOpenPos = {
                    PaymentMode: addPaymentMode
                };

                $scope.openPosValues.CashMovementLines.push(lineOpenPos);
            }
        }, (err) => {
            console.error(err);
        });
    };

    const loadTotal = () => {
        if ($scope.openPosParameters.previousYPeriod) {
            let total = 0;
            let totalKnown = 0;
            // Get the amount "cash" count in the previous yPeriod
            for (let l of $scope.openPosParameters.previousYPeriod.YCashMovementLines) {
                // Cash only
                if (l.PaymentMode && l.PaymentMode.PaymentType === PaymentType.ESPECE) {
                    total = roundValue(total + l.PaymentMode.Total);
                    totalKnown = roundValue(totalKnown + l.TotalKnown);
                }
            }
            $scope.model.total = total;
            $scope.model.totalKnown = totalKnown;
        }
        else {
            posPeriodService.getYPaymentValuesAsync($scope.openPosParameters.yPeriodId).then((paymentValues) => {
                if (paymentValues) {
                    let total = 0;
                    if (paymentValues.PaymentLines) {
                        for (let l of paymentValues.PaymentLines) {
                            // Cash only
                            if (l.PaymentMode && l.PaymentMode.PaymentType === PaymentType.ESPECE) {
                                total = roundValue(total + l.PaymentMode.Total);
                            }
                        }
                    }
                    $scope.model.total = total;
                    $scope.model.totalKnown = total;
                }
            });
        }
    };

    $scope.selectMotif = (motif) => {
        $scope.model.motif = motif;
    };

    $scope.editCashValues = () => {
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
            $scope.openPosValues.CashMovementLines[0].PaymentMode.Total = roundValue(parseFloat(total)).toFixed(2);
        }, () => {
            console.error("Error cash values modal");
        });
    };

    $scope.openRecap = () => {
        $uibModal.open({
            templateUrl: 'modals/modalAllCashMovements.html',
            controller: 'ModalAllCashMovementsController',
            size: 'lg',
            backdrop: 'static'
        });
    };

    $scope.ok = () => {
        if (!$rootScope.modelPos.iziboxConnected) {
            swal({ title: $translate.instant("La izibox n'est pas accessible") });
        }
        else {
            if ($scope.model.motif && $scope.model.motif != null) {
                $scope.model.validateDisabled = true;
                $scope.openPosValues.MovementType_Id = $scope.model.motif.Id;

                posPeriodService.CreateOrUpdateYPeriodAsync($scope.openPosValues, $scope.model.motif, false).then((periodPair) => {
                    $uibModalInstance.close(periodPair);
                }, (err) => {
                    $scope.model.validateDisabled = false;
                    if (err) {
                        swal({ title: $translate.instant("La izibox n'est pas accessible") });
                    }
                });
            }
            else {
                swal({ title: $translate.instant("Veuillez renseigner le motif") });
            }
        }
    };

    $scope.openDrawer = () => {
        /**
         * TODO: Log this event
         */
        if (posUserService.isEnable('ODRAW')) {
            let configApiUrl = $rootScope.APIBaseURL + "/open/" + $rootScope.PrinterConfiguration.POSPrinter;
            $http.get(configApiUrl, { timeout: 10000 });
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };
});