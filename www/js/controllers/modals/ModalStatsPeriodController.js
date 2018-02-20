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

        var yperiodId = $scope.closePosParameters.yperiod ? $scope.closePosParameters.yperiod.id : undefined;

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
            Enumerable.from(resZpos.taxDetails).forEach(function (tax) {
                $scope.zheaders.push(tax.taxCode);
            });

            ////Headers Modes de paiement
            Enumerable.from(resZpos.paymentModes).forEach(function (pm) {// Des moyens de paiement utilise des - !!! pk?
                var pmTitle = pm.type;

                if (pm.type.indexOf("-") != -1) {
                    var tmp = pm.type.split("-");
                    pmTitle = "";
                    Enumerable.from(tmp).forEach(function (t) {
                        pmTitle = pmTitle + " " + t[0];
                    });
                    pmTitle = pmTitle.trim().replace(" ", "-");
                }

                $scope.zheaders.push(pmTitle);
            });

            $scope.zheaders.push("Cagnotte");

            //Values
            var lineValues = [];
            Enumerable.from(resZpos.totalsByPeriod).forEach(function (line) {
                var columnValues = [];

                var dateStartDisp = dateFormat(line.start);
                if (line.end) {
                    var dateEndDisp = dateFormat(line.end)
                }

                columnValues.push(dateStartDisp);//date
                columnValues.push(dateEndDisp || '-');//date
                columnValues.push(line.count);//nb
                columnValues.push(roundValue(line.totalIT));//total

                //Cutleries
                var lineCutleries = Enumerable.from(resZpos.cutleries.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });
                columnValues.push(lineCutleries ? lineCutleries.count : 0);

                //Sur place
                var lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.FORHERE;
                });
                var lineTotalForHere = lineForHere ? Enumerable.from(lineForHere.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                }) : undefined;
                columnValues.push(lineTotalForHere ? roundValue(lineTotalForHere.total) : 0);

                //Emporté
                var lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.TAKEOUT;
                });
                var lineTotalTakeOut = lineTakeOut ? Enumerable.from(lineTakeOut.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                }) : undefined;
                columnValues.push(lineTotalTakeOut ? roundValue(lineTotalTakeOut.total) : 0);

                //Livré
                var lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.DELIVERY;
                });
                var lineTotalDelivery = lineDelivery ? Enumerable.from(lineDelivery.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                }) : undefined;
                columnValues.push(lineTotalDelivery ? roundValue(lineTotalDelivery.total) : 0);

                //Avoirs émis
                var lineCredit = Enumerable.from(resZpos.credit.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });
                columnValues.push(lineCredit ? roundValue(lineCredit.total) : 0);


                //Taxes
                Enumerable.from(resZpos.taxDetails).forEach(function (tax) {
                    var lineTax = Enumerable.from(tax.byPeriod).firstOrDefault(function (value) {
                        return value.start == line.start;
                    });
                    columnValues.push(lineTax ? roundValue(String(lineTax.total).substring(0, 4)) : 0);
                });

                //Rendu
                var lineRepaid = Enumerable.from(resZpos.repaid.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });

                //PaymentModes
                Enumerable.from(resZpos.paymentModes).forEach(function (pm) {
                    if (pm.type_id == 1) {
                        var linePM = Enumerable.from(pm.byPeriod).firstOrDefault(function (value) {
                            return value.start == line.start;
                        });
                        columnValues.push(linePM ? roundValue(linePM.total - lineRepaid.total) : 0);
                    } else {
                        var linePM = Enumerable.from(pm.byPeriod).firstOrDefault(function (value) {
                            return value.start == line.start;
                        });
                        columnValues.push(linePM ? roundValue(linePM.total) : 0);
                    }

                });

                //Cagnotte
                console.log(resZpos.balance.byPeriod);
                console.log(line.start);
                var lineBalance = Enumerable.from(resZpos.balance.byPeriod).firstOrDefault(function (value) {
                    return value.start == line.start;
                });
                columnValues.push(lineBalance ? roundValue(lineBalance.total) : 0);

                lineValues.push(columnValues);

            });

            $scope.zlines = lineValues;


            //TotalIT
            $scope.ztotal.push("Total TTC");
            $scope.ztotal.push("");
            $scope.ztotal.push(resZpos.count);
            $scope.ztotal.push(roundValue(resZpos.totalIT));
            $scope.ztotal.push(resZpos.cutleries.count);

            var lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.FORHERE;
            });
            $scope.ztotal.push(lineForHere ? roundValue(lineForHere.total) : 0);

            var lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.TAKEOUT;
            });
            $scope.ztotal.push(lineTakeOut ? roundValue(lineTakeOut.total) : 0);

            var lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
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