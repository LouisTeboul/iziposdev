﻿app.controller('ModalZPosController', function ($scope, $rootScope, $uibModalInstance, zposService, dateStart, dateEnd, $translate) {
    $scope.dateStart = dateStart;
    $scope.dateEnd = dateEnd;
    $scope.zheaders = [];
    $scope.zlines = [];
    $scope.ztotal = [];
    $scope.ztotalET = [];


    $scope.zpos = undefined;

    $scope.init = function () {
        zposService.getZPosValuesAsync($scope.dateStart, $scope.dateEnd).then(function (resZpos) {
            console.log(resZpos);
            $scope.zpos = resZpos;

            //Headers && total
            $scope.zheaders.push("Date");
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
                    if(pm.type.indexOf("-") == 0) {
                        pmTitle = pmTitle.replace('-', '');
                        pmTitle = pmTitle.replace('-', ' ');
                    } else {
                        pmTitle = pmTitle.replace('-', ' ');
                    }
                }

                $scope.zheaders.push(pmTitle);
            }

            $scope.zheaders.push("Cagnotte");

            //Values
            let lineValues = [];
            for(let line of resZpos.totalsByDate) {
                let columnValues = [];
                columnValues.push(Date.parseExact(line.date, "yyyyMMdd").toString("dd/MM/yyyy"));//date
                columnValues.push(line.count);//nb
                columnValues.push(roundValue(line.totalIT));//total

                //Cutleries
                const lineCutleries = Enumerable.from(resZpos.cutleries.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                });
                columnValues.push(lineCutleries ? lineCutleries.count : 0);

                //Sur place
                const lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.FORHERE;
                });
                const lineTotalForHere = lineForHere ? Enumerable.from(lineForHere.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                }) : undefined;
                columnValues.push(lineTotalForHere ? roundValue(lineTotalForHere.total) : 0);

                //Emporté
                const lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.TAKEOUT;
                });
                const lineTotalTakeOut = lineTakeOut ? Enumerable.from(lineTakeOut.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                }) : undefined;
                columnValues.push(lineTotalTakeOut ? roundValue(lineTotalTakeOut.total) : 0);

                //Livré
                const lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) {
                    return value.type == DeliveryTypes.DELIVERY;
                });
                const lineTotalDelivery = lineDelivery ? Enumerable.from(lineDelivery.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                }) : undefined;
                columnValues.push(lineTotalDelivery ? roundValue(lineTotalDelivery.total) : 0);

                //Avoirs émis
                const lineCredit = Enumerable.from(resZpos.credit.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                });
                columnValues.push(lineCredit ? roundValue(lineCredit.total) : 0);


                //Taxes
                for(let tax of resZpos.taxDetails) {
                    let lineTax = Enumerable.from(tax.byDate).firstOrDefault(function (value) {
                        return value.date == line.date;
                    });
                    let dispTax;
                    if(lineTax && lineTax.total){
                        dispTax = String(lineTax.total).substring(0, 4);
                    }

                    columnValues.push(lineTax ? roundValue(dispTax) : 0);
                }


                //Rendu
                let lineRepaid = Enumerable.from(resZpos.repaid.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                });

                //PaymentModes
                for(let pm of resZpos.paymentModes) {
                    let linePM = Enumerable.from(pm.byDate).firstOrDefault(function (value) {
                        return value.date == line.date;
                    });
                    // Pour les especes
                    if (pm.type_id == 1) {
                        if(linePM && lineRepaid){
                            console.log("Especes : ", linePM.total);
                            console.log("Rendu : ", lineRepaid.total);
                            // On soustrait le montant rendu au montant du paiement en especes
                            columnValues.push(linePM ? roundValue(linePM.total - lineRepaid.total) : 0);
                        }
                    } else {
                        columnValues.push(linePM ? roundValue(linePM.total) : 0);
                    }
                }


                //Paiement cagnotte
                let lineBalance = Enumerable.from(resZpos.balance.byDate).firstOrDefault(function (value) {
                    return value.date == line.date;
                });
                columnValues.push(lineBalance ? roundValue(lineBalance.total) : 0);

                lineValues.push(columnValues);
            }

            $scope.zlines = lineValues;

            //TotalIT
            $scope.ztotal.push("Total TTC");
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
            $scope.ztotalET.push(roundValue(resZpos.totalET));
            while ($scope.ztotalET.length < $scope.zheaders.length) {
                $scope.ztotalET.push("");
            }
        });
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.printZPos = function () {
        zposService.printZPosAsync($scope.zpos, 0);
    };

    $scope.emailZPos = function () {
        zposService.emailZPosAsync($scope.zpos);
    }
});