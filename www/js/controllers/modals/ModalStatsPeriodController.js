app.controller('ModalStatsPeriodController', function ($scope, $rootScope, $uibModalInstance, $uibModal, zposService, closePosParameters, $translate) {

    $scope.printY = undefined;
    $scope.closePosParameters = closePosParameters;
    console.log($scope.closePosParameters);

    $scope.zheaders = [];
    $scope.zlines = [];
    $scope.ztotal = [];
    $scope.ztotalET = [];


    $scope.zpos = undefined;

    $scope.init = function () {
        if ($scope.closePosParameters.mode && ($scope.closePosParameters.mode.idMode == 1 || $scope.closePosParameters.mode.idMode == 2 || $scope.closePosParameters.mode.idMode == 3)) {
            $scope.closePosText = $scope.closePosParameters.mode.text;
            $scope.titleText = $scope.closePosParameters.mode.title;
        }
        else {
            $scope.closePosParameters.mode = 0;
            $scope.closePosText = "Erreur";
        }

        const yperiodId = $scope.closePosParameters.yperiod ? $scope.closePosParameters.yperiod.id : undefined;


        zposService.getZPosValuesAsync_v2($scope.closePosParameters.zperiod.id, yperiodId, $scope.closePosParameters.hid).then(function (resZpos) {
            $scope.zpos = resZpos;
            console.log(resZpos);

            //Headers && total
            $scope.zheaders.push("Date début");
            $scope.zheaders.push("Date fin");
            $scope.zheaders.push("Nb");
            $scope.zheaders.push("Total");
            $scope.zheaders.push($translate.instant("Couvert(s)"));
            $scope.zheaders.push($translate.instant("Sur place"));
            $scope.zheaders.push($translate.instant("Emporté"));
            $scope.zheaders.push($translate.instant("Livré"));
            $scope.zheaders.push($translate.instant("Avoirs émis"));

            ////Headers TVA
            for(let tax of resZpos.taxDetails) {
                $scope.zheaders.push(tax.taxCode);
            }

            ////Headers Modes de paiement
            for(let pm of resZpos.paymentModes) {
                // Des moyens de paiement utilise des - !!! pk?
                let pmTitle = pm.type;

                if (pm.type.indexOf("-") != -1) {
                    var tmp = pm.type.split("-");
                    pmTitle = "";
                    for(let t of tmp) {
                        pmTitle = pmTitle + " " + t[0];
                    }
                    pmTitle = pmTitle.trim().replace(" ", "-");
                }
                $scope.zheaders.push(pmTitle);
            }

            $scope.zheaders.push("Cagnotte");

            //Values
            let lineValues = [];
            for(let line of resZpos.totalsByPeriod) {
                let columnValues = [];
                const dateStartDisp = dateFormat(line.start);
                let dateEndDisp;
                if (line.end) {
                    dateEndDisp = dateFormat(line.end)
                }

                columnValues.push(dateStartDisp);//date
                columnValues.push(dateEndDisp || '-');//date
                columnValues.push(line.count);//nb
                columnValues.push(roundValue(line.totalIT));//total

                //Cutleries
                const lineCutleries = Enumerable.from(resZpos.cutleries.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });
                columnValues.push(lineCutleries ? lineCutleries.count : 0);

                //Sur place
                const lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.FORHERE;
                });
                const lineTotalForHere = lineForHere ? Enumerable.from(lineForHere.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                }) : undefined;
                columnValues.push(lineTotalForHere ? roundValue(lineTotalForHere.total) : 0);

                //Emporté
                const lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.TAKEOUT;
                });
                const lineTotalTakeOut = lineTakeOut ? Enumerable.from(lineTakeOut.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                }) : undefined;
                columnValues.push(lineTotalTakeOut ? roundValue(lineTotalTakeOut.total) : 0);

                //Livré
                const lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.DELIVERY;
                });
                const lineTotalDelivery = lineDelivery ? Enumerable.from(lineDelivery.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                }) : undefined;
                columnValues.push(lineTotalDelivery ? roundValue(lineTotalDelivery.total) : 0);

                //Avoirs émis
                const lineCredit = Enumerable.from(resZpos.credit.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });
                columnValues.push(lineCredit ? roundValue(lineCredit.total) : 0);


                //Taxes
                for(let tax of resZpos.taxDetails) {
                    const lineTax = Enumerable.from(tax.byPeriod).firstOrDefault(function (value) {
                        return value.start == line.start;
                    });
                    columnValues.push(lineTax ? roundValue(String(lineTax.total).substring(0, 4)) : 0);
                }

                //Rendu
                let lineRepaid = Enumerable.from(resZpos.repaid.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });

                //PaymentModes
                for(let pm of resZpos.paymentModes) {
                    if (pm.type_id == 1) {
                        const linePM = Enumerable.from(pm.byPeriod).firstOrDefault(function (value) {
                            return value.start == line.start;
                        });
                        columnValues.push(linePM ? roundValue(linePM.total - lineRepaid.total) : 0);
                    } else {
                        const linePM = Enumerable.from(pm.byPeriod).firstOrDefault(function (value) {
                            return value.start == line.start;
                        });
                        columnValues.push(linePM ? roundValue(linePM.total) : 0);
                    }
                }

                //Cagnotte
                console.log(resZpos.balance.byPeriod);
                console.log(line.start);
                const lineBalance = Enumerable.from(resZpos.balance.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });
                columnValues.push(lineBalance ? roundValue(lineBalance.total) : 0);

                lineValues.push(columnValues);
            }

            $scope.zlines = lineValues;

            //TotalIT
            $scope.ztotal.push("Total TTC");
            $scope.ztotal.push("");
            $scope.ztotal.push(resZpos.count);
            $scope.ztotal.push(roundValue(resZpos.totalIT));
            $scope.ztotal.push(resZpos.cutleries.count);

            const lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.FORHERE;
            });
            $scope.ztotal.push(lineForHere ? roundValue(lineForHere.total) : 0);

            const lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.TAKEOUT;
            });
            $scope.ztotal.push(lineTakeOut ? roundValue(lineTakeOut.total) : 0);

            const lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.DELIVERY;
            });
            $scope.ztotal.push(lineDelivery ? roundValue(lineDelivery.total) : 0);

            $scope.ztotal.push(roundValue(resZpos.credit.total));

            while ($scope.ztotal.length < $scope.zheaders.length) {
                $scope.ztotal.push("");
            }

            //TotalET
            $scope.ztotalET.push($translate.instant("Total HT"));
            $scope.ztotalET.push("");
            $scope.ztotalET.push("");
            $scope.ztotalET.push(roundValue(resZpos.totalET));
            while ($scope.ztotalET.length < $scope.zheaders.length) {
                $scope.ztotalET.push("");
            }
        }, function (err) {
            sweetAlert({title: $translate.instant(err)}, function () {
            });
        });
    };

    $scope.closePos = function () {
        delete $rootScope.showStats;

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
                    return $uibModalInstance
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
        zposService.printZPosAsync($scope.zpos, 1, $scope.printY);
    };

    $scope.emailZPos = function () {
        zposService.emailZPosAsync($scope.zpos, true, $scope.printY);
    }
});