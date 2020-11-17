//This is a service to manage the zpos data
app.service('zposService', function ($http, $rootScope, $q, $filter, $translate, taxesService) {
    let hardwareId = undefined;
    const maxEndDate = "9999999999999999";

    this.init = () => {
        hardwareId = $rootScope.modelPos.hardwareId;
    };

    //Get a Shopping Cart by its id
    this.getShoppingCartByIdAsync = (ShoppingCartId) => {
        let valueDefer = $q.defer();

        if (!ShoppingCartId.startsWith("ShoppingCart")) {
            ShoppingCartId = "ShoppingCart_1_" + padLeft(ShoppingCartId, 16);
        }

        let db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

        db.get(ShoppingCartId).then((shoppingCart) => {
            let item = shoppingCart.data;
            item.id = shoppingCart._id;
            item.rev = shoppingCart._rev;
            valueDefer.resolve(item);
        }, (err) => {
            valueDefer.reject(err);
        });

        return valueDefer.promise;
    };

    this.getShoppingCartsByPeriodAsync = (zpid, hid, ypid) => {
        let ShoppingCartsByPeriodDefer = $q.defer();

        const apiURL = $rootScope.APIBaseURL + "/zpos/getShoppingCartsByPeriod";

        const req = {
            ZPeriodId: zpid,
            YPeriodId: ypid,
            HardwareId: hid
        };

        $http.post(apiURL, req).then((ret) => {
            ShoppingCartsByPeriodDefer.resolve(ret.data);
        }, (err) => {
            console.error(err);
            ShoppingCartsByPeriodDefer.reject(err);
        });

        return ShoppingCartsByPeriodDefer.promise;
    };

    //Get shoppingCarts by filters
    this.getShoppingCartsByFilterDateAsync = (dateStart, dateEnd, alias, paiementMode, amount) => {
        let listShoppingCartsDefer = $q.defer();

        if (!dateEnd) {
            dateEnd = new Date(dateStart.toString());
        }
        const apiURL = $rootScope.APIBaseURL + "/zpos/shoppingCartsByFilterDate";
        dateStart = moment(dateStart).startOf("day");
        dateEnd = moment(dateEnd).endOf("day");
        const dataRequest = {
            DateStart: dateStart.format("x"),
            DateEnd: dateEnd.format("x")
        };
        if (alias) {
            dataRequest.Alias = alias;
        }
        if (paiementMode) {
            dataRequest.PaymentMode = paiementMode;
        }
        if (amount) {
            dataRequest.Amount = amount;
        }

        $http.post(apiURL, dataRequest).then((res) => {
            listShoppingCartsDefer.resolve(res.data);
        }, (err) => {
            console.error(err);
            listShoppingCartsDefer.reject(err);
        });

        return listShoppingCartsDefer.promise;
    };

    this.composeStatsHTML = (data, printMode, countByHid, details = false, isPreview = false) => {
        let tcLabels = taxesService.getTaxCategoriesLabels();

        if (data && data.Rows && data.Rows.length > 0) {
            const printRow = (paymentModes, accountConsignorPayments, deliveryValues, taxDetails, taxDetailsPerCategory, posUserStats, cashMovementSums, totalRepaid, totalCredit, totalCutleries, data, mode, lines, isDetails = false) => {
                lines.push("<br/>");
                let header = "";
                switch (mode) {
                    case StatsPrintMode.INTERVAL:
                        if (isDetails) {
                            header += "<center><strong>Details de la journée du </strong></center>";
                            header += "<center><strong>" + data.Date + "</strong></center>";
                        } else {
                            header += "<center><strong>Details de l'interval du</strong></center>";
                            header += "<center><strong>" + moment.unix(data.DateStart / 1000).format("DD/MM/YYYY") + " au " + moment.unix(data.DateEnd / 1000).format("DD/MM/YYYY") + "</strong></center>";
                        }
                        break;
                    case StatsPrintMode.Y:
                        header += "<center><strong>Y du </strong></center>";
                        header += "<center><strong>" + moment.unix(data.DateStart / 1000).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                        if (data.DateEnd && data.DateEnd !== maxEndDate) {
                            if (data.DateStart !== data.DateEnd) {
                                header += "<center><strong>au " + moment.unix(Math.floor(data.DateEnd / 1000)).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                            }
                        }
                        let b = d.Rows[0].Alias ? d.Rows[0].Alias : d.Rows[0].HardwareId;
                        header += "<p><center>" + b + "</center></p>";
                        break;
                    case StatsPrintMode.HID:
                        if (isDetails) {
                            header += "<center><strong>Y du </strong></center>";
                            header += "<center><strong>" + moment.unix(data.Start / 1000).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                            if (data.End && data.End !== maxEndDate) {
                                if (data.Start !== data.End) {
                                    header += "<center><strong>au " + moment.unix(Math.floor(data.End / 1000)).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                                }
                            }
                        } else {
                            header += "<center><strong>Stats de la caisse du </strong></center>";
                            header += "<center><strong>" + moment.unix(data.DateStart / 1000).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                            if (data.End && data.End !== maxEndDate) {
                                if (data.Start !== data.End) {
                                    header += "<center><strong>au " + moment.unix(Math.floor(data.DateEnd / 1000)).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                                }
                            }
                        }
                        let a = data.Alias ? data.Alias : data.HardwareId;
                        header += "<p><center>" + a + "</center></p>";
                        break;
                    case StatsPrintMode.Z:
                        if (isDetails) {
                            header += "<center><strong>Y du </strong></center>";
                            header += "<center><strong>" + moment.unix(data.Start / 1000).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                            if (data.End && data.End !== maxEndDate) {
                                if (data.Start !== data.End) {
                                    header += "<center><strong> au " + moment.unix(Math.floor(data.End / 1000)).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                                }
                            }
                            let c = data.Alias ? data.Alias : data.HardwareId;
                            header += "<p><center>" + c + "</center></p>";
                        } else {
                            if (isPreview) {
                                header += "<center><strong>Aperçu Z du </strong></center>";
                            } else {
                                header += "<center><strong>Z du </strong></center>";
                            }
                            header += "<center><strong>" + moment.unix(data.DateStart / 1000).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                            if (data.DateEnd && data.DateEnd !== maxEndDate) {
                                if (data.DateStart !== data.DateEnd) {
                                    header += "<center><strong>au " + moment.unix(Math.floor(data.DateEnd / 1000)).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                                    header += "<center><strong>FERMÉ</strong></center>";
                                }
                            }
                        }
                        break;
                }

                lines.push(header);

                lines.push("<br />");

                lines.push("<center><strong>Edité le</strong></center>");
                let date = moment().format("DD/MM/YYYY");
                let time = moment().format("HH:mm:ss");
                lines.push("<center>" + date + " à " + time + "</center>");

                lines.push("<br />");
                if (companyInformation) {
                    if (companyInformation.Company) {
                        lines.push("<center><strong>" + companyInformation.Company + "</strong></center>");
                    }
                    if (companyInformation.Address) {
                        lines.push("<center>" + companyInformation.Address + "</center>");
                    }
                    if (companyInformation.ZipCode && companyInformation.City) {
                        lines.push("<center>" + companyInformation.ZipCode + ' ' + companyInformation.City + "</center>");
                    }
                    if (companyInformation.SiretNumber) {
                        lines.push("<center>Siret: " + companyInformation.SiretNumber + "</center>");
                    }
                    if (companyInformation.NafCode) {
                        lines.push("<center>Code Naf: " + companyInformation.NafCode + "</center>");
                    }
                    if (companyInformation.VatNumber) {
                        lines.push("<center>TVA intra: " + companyInformation.VatNumber + "</center>");
                    }
                }
                for (let part of parts) {
                    lines.push("<center>" + part + "</center>");
                }

                lines.push("<br />");

                lines.push("<hr />");

                lines.push("<br />");

                lines.push("<p>Ventes par taux de taxe :</p>");
                //lines.push("<p>Total HT  : <strong>" + $filter('CurrencyFormat')(roundValue(data.TotalET)) + "</strong></p>");

                lines.push("<p><table>");
                if (taxDetails && taxDetails.length > 0) {
                    lines.push("<tr>");
                    lines.push("<th style='width:15%;' scope='col'>&nbsp;</th>");
                    lines.push("<th style='width:27%;text-align:right;' scope='col'>Taxes</th>");
                    lines.push("<th style='width:29%;text-align:right;' scope='col'>HT</th>");
                    lines.push("<th style='width:29%;text-align:right;' scope='col'>TTC</th>");
                    lines.push("</tr>");

                    taxDetails.forEach((td) => {
                        lines.push("<tr>");
                        lines.push("<td style='width:15%;'>" + td.TabTitleShort + "</td>");
                        lines.push("<td style='width:27%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(td.TaxAmountCustomerDisplay)) + "</td>");
                        lines.push("<td style='width:29%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(td.PriceET)) + "</td>");
                        lines.push("<td style='width:29%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(td.PriceIT)) + "</td>");
                        lines.push("</tr>");
                    });
                }

                // Total taxes
                lines.push("<tr>");
                lines.push("<td style='width:15%;'> <strong>Total</strong> </td>");
                lines.push("<td style='width:27%;text-align:right;'><strong>" + $filter('CurrencyFormat')(roundValue(Enumerable.from(taxDetails).sum(td => td.TaxAmountCustomerDisplay))) + "</strong></td>");
                lines.push("<td style='width:29%;text-align:right;'><strong>" + $filter('CurrencyFormat')(roundValue(Enumerable.from(taxDetails).sum(td => td.PriceET))) + "</strong></td>");
                lines.push("<td style='width:29%;text-align:right;'><strong>" + $filter('CurrencyFormat')(roundValue(Enumerable.from(taxDetails).sum(td => td.PriceIT))) + "</strong></td>");
                lines.push("</tr>");

                lines.push("</table></p>");

                lines.push("<hr />");

                lines.push("<p>Ventes par categorie de taxe :</p>");

                lines.push("<p><table>");

                let printedTaxCategoryId = [];

                if (taxDetailsPerCategory && taxDetailsPerCategory.length > 0) {
                    lines.push("<tr>");
                    lines.push("<th style='width:15%;' scope='col'>&nbsp;</th>");
                    lines.push("<th style='width:27%;text-align:right;' scope='col'>Taxes</th>");
                    lines.push("<th style='width:29%;text-align:right;' scope='col'>HT</th>");
                    lines.push("<th style='width:29%;text-align:right;' scope='col'>TTC</th>");
                    lines.push("</tr>");

                    taxDetailsPerCategory.forEach((tdpc) => {
                        lines.push("<tr>");
                        if (!printedTaxCategoryId.includes(tdpc.TaxCategoryId)) {
                            if (tcLabels) {
                                let matching = tcLabels.find(l => l.Id === tdpc.TaxCategoryId);
                                if (matching) {
                                    lines.push("<td colspan='4'><strong>" + matching.Name.substring(0, 40) + "</strong></td>");
                                } else {
                                    lines.push("<td colspan='4'><strong>Id de taxe : " + tdpc.TaxCategoryId + "</strong></td>");
                                }
                            } else {
                                lines.push("<td colspan='4'><strong>Id de taxe : " + tdpc.TaxCategoryId + "</strong></td>");
                            }
                        }

                        printedTaxCategoryId.push(tdpc.TaxCategoryId);
                        lines.push("</tr>");

                        lines.push("<tr>");
                        lines.push("<td style='width:15%;'>" + tdpc.TabTitleShort + "</td>");
                        lines.push("<td style='width:27%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(tdpc.TaxAmountCustomerDisplay)) + "</td>");
                        lines.push("<td style='width:29%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(tdpc.PriceET)) + "</td>");
                        lines.push("<td style='width:29%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(tdpc.PriceIT)) + "</td>");
                        lines.push("</tr>");
                    });
                }

                lines.push("<tr>");
                lines.push("<td style='width:15%;'><strong>Total</strong></td>");
                lines.push("<td style='width:27%;text-align:right;'><strong>" + $filter('CurrencyFormat')(roundValue(Enumerable.from(taxDetailsPerCategory)).sum(t => t.TaxAmountCustomerDisplay)) + "</strong></td>");
                lines.push("<td style='width:29%;text-align:right;'><strong>" + $filter('CurrencyFormat')(roundValue(Enumerable.from(taxDetailsPerCategory)).sum(t => t.PriceET)) + "</strong></td>");
                lines.push("<td style='width:29%;text-align:right;'><strong>" + $filter('CurrencyFormat')(roundValue(Enumerable.from(taxDetailsPerCategory)).sum(t => t.PriceIT)) + "</strong></td>");
                lines.push("</tr>");

                lines.push("</table></p>");

                lines.push("<hr />");
                //lines.push("<p>Total TTC : <strong>" + $filter('CurrencyFormat')(roundValue(data.TotalIT)) + "</strong></p>");

                lines.push("<p>Nb. couverts : " + (totalCutleries ? totalCutleries : "Non renseigné") + "</p>");

                if (deliveryValues && deliveryValues.length > 0) {
                    lines.push("<p>Recette par mode de conso. (TTC) :</p>");
                    lines.push("<table>");

                    deliveryValues.forEach(dv => {
                        lines.push("<tr>");
                        lines.push("<td style='width:60%'>" + $translate.instant(dv.TabTitle) + "</td>");
                        lines.push("<td style='width:25%;text-align:right'>" + $filter('CurrencyFormat')(roundValue(dv.TotalIT)) + "</td>");
                        lines.push("<td style='width:15%;text-align:center'>(" + dv.Count + ")</td>");
                        lines.push("</tr>");
                    });
                    lines.push("</table>");

                    lines.push("<br />");
                }

                if (paymentModes.length > 0) {
                    lines.push("<br />");
                    lines.push("<p>Encaissements :</p>");
                    lines.push("<p><table>");
                    lines.push("<tr>");
                    lines.push("<th style='width:50%;' scope='col'>&nbsp;</th>");
                    lines.push("<th style='width:25%;text-align:center;' scope='col'>Nb.</th>");
                    lines.push("<th style='width:25%;text-align:right;' scope='col'>Total</th>");
                    lines.push("</tr>");

                    paymentModes.forEach(pm => {
                        if (pm.Text.length > 17) {
                            pm.Text = pm.Text.substring(0, 16);
                        }
                        lines.push("<tr>");
                        lines.push("<td style='width:50%'>" + pm.Text + " : </td>");
                        lines.push("<td style='width:25%;text-align:center'>" + pm.Count + "</td>");
                        lines.push("<td style='width:25%;text-align:right'>" + $filter('CurrencyFormat')(roundValue(pm.Total)) + "</td>");
                        lines.push("</tr>");
                    });
                    // Total reglement
                    lines.push("<tr>");
                    lines.push("<td style='width:50%'><strong>Total reglements</strong></td>");
                    lines.push("<td style='width:25%;text-align:center'><strong>" + Enumerable.from(paymentModes).sum(pm => pm.Count) + "</strong></td>");
                    lines.push("<td style='width:25%; text-align:right;border-top: 1px solid black'><strong>" + $filter('CurrencyFormat')(Enumerable.from(paymentModes).sum(pm => pm.Total)) + "</strong></td>");
                    lines.push("</tr>");

                    lines.push("<tr>");
                    lines.push("<td style='width:75%' colspan='2'>Avoir émis</td>");
                    // lines.push("<td style='width:25%'></td>");
                    lines.push("<td style='width:25%; text-align:right;'>" + $filter('CurrencyFormat')(roundValue(totalCredit) * -1) + "</td>");
                    lines.push("</tr>");

                    lines.push("<tr>");
                    lines.push("<td style='width:75%' colspan='2'><strong>Total general</strong></td>");
                    // lines.push("<td style='width:25%'></td>");
                    lines.push("<td style='width:25%; text-align:right;border-top: 1px solid black'><strong>" + $filter('CurrencyFormat')(Enumerable.from(paymentModes).sum(pm => pm.Total) - roundValue(totalCredit)) + "</strong></td>");
                    lines.push("</tr>");

                    lines.push("</table></p>");
                }

                // lines.push("<p>Avoir émis : " + $filter('CurrencyFormat')(roundValue(totalCredit)) + "</p>");
                lines.push("<p>Rendu (pour info.) : " + $filter('CurrencyFormat')(roundValue(totalRepaid)) + "</p>");

                if (accountConsignorPayments.length > 0) {
                    lines.push("<hr />");
                    lines.push("<br />");
                    lines.push("<p>Règlements en compte :</p>");
                    lines.push("<p><table>");
                    lines.push("<tr>");
                    lines.push("<th style='width:50%;' scope='col'>&nbsp;</th>");
                    lines.push("<th style='width:25%;text-align:center;' scope='col'>Nb.</th>");
                    lines.push("<th style='width:25%;text-align:right;' scope='col'>Total</th>");
                    lines.push("</tr>");

                    accountConsignorPayments.forEach(pm => {
                        if (pm.Text.length > 17) {
                            pm.Text = pm.Text.substring(0, 16);
                        }
                        lines.push("<tr>");
                        lines.push("<td style='width:50%'>" + pm.Text + " : </td>");
                        lines.push("<td style='width:25%;text-align:center'>" + pm.Count + "</td>");
                        lines.push("<td style='width:25%;text-align:right'>" + $filter('CurrencyFormat')(roundValue(pm.Total)) + "</td>");
                        lines.push("</tr>");
                    });

                    //Total en compte
                    lines.push("<tr>");
                    lines.push("<td style='width:50%'><strong>Total</strong></td>");
                    lines.push("<td style='width:25%;text-align:center'><strong>" + Enumerable.from(accountConsignorPayments).sum(acpm => acpm.Count) + "</strong></td>");
                    lines.push("<td style='width:25%; text-align:right; border-top: 1px solid black'><strong>" + $filter('CurrencyFormat')(Enumerable.from(accountConsignorPayments).sum(acpm => acpm.Total)) + "</strong></td>");
                    lines.push("</tr>");

                    lines.push("</table></p>");
                }

                lines.push("<hr />");
                lines.push("<br />");

                lines.push("<p><strong>Tickets : </strong></p>");
                if (data.ValidCount)
                    lines.push("<p>   Validés : " + $filter('CurrencyFormat')(roundValue(data.TotalIT)) + " (" + data.ValidCount + ") </p>");
                if (data.CanceledCount)
                    lines.push("<p>   Annulés : " + $filter('CurrencyFormat')(roundValue(data.CanceledAmount)) + " (" + data.CanceledCount + ") </p>");
                if (data.DeletedCount)
                    lines.push("<p>   Supprimés : " + $filter('CurrencyFormat')(roundValue(data.DeletedAmount)) + " (" + data.DeletedCount + ") </p>");
                if (data.DiscountCount)
                    lines.push("<p>   Remises : " + $filter('CurrencyFormat')(roundValue(data.DiscountTotalIT ? data.DiscountTotalIT : 0)) + " (" + (data.DiscountCount ? data.DiscountCount : 0) + ") </p>");
                if (data.OffersCount)
                    lines.push("<p>   Offerts : " + $filter('CurrencyFormat')(roundValue(data.OffersAmount ? data.OffersAmount : 0)) + " (" + data.OffersCount + ") </p>");
                if ($rootScope.IziBoxConfiguration.EnableLossesAndMeal) {
                    if (data.LossCount)
                        lines.push("<p>   Pertes : " + $filter('CurrencyFormat')(roundValue(data.LossAmount)) + " (" + data.LossCount + ") </p>");
                    if (data.EmployeeMealsCount)
                        lines.push("<p>   Repas employé : " + $filter('CurrencyFormat')(roundValue(data.EmployeeMealsAmount)) + " (" + data.EmployeeMealsCount + ") </p>");
                }
                lines.push("<br />");
                lines.push("<p><strong>Par employé (TTC) :</strong></p>");
                posUserStats.forEach((employee) => {
                    if (employee.PosUserName) {
                        lines.push("<p>  " + employee.PosUserName + " : </p>");
                    } else {
                        lines.push("<p>  Utilisateur anonyme : </p>");
                    }

                    if (employee.ValidCount)
                        lines.push("<p>    CA validé : " + $filter('CurrencyFormat')(roundValue(employee.TotalIT)) + " (" + employee.ValidCount + ") </p>");
                    if (employee.CanceledCount)
                        lines.push("<p>    Annulés : " + $filter('CurrencyFormat')(roundValue(employee.CanceledAmount)) + " (" + employee.CanceledCount + ") </p>");
                    if (employee.DeletedCount)
                        lines.push("<p>    Supprimés : " + $filter('CurrencyFormat')(roundValue(employee.DeletedAmount)) + " (" + employee.DeletedCount + ") </p>");
                    if (employee.DiscountCount)
                        lines.push("<p>    Remises : " + $filter('CurrencyFormat')(roundValue(employee.DiscountTotalIT ? employee.DiscountTotalIT : 0)) + " (" + (employee.DiscountCount ? employee.DiscountCount : 0) + ") </p>");
                    if (employee.OffersCount)
                        lines.push("<p>    Offerts : " + $filter('CurrencyFormat')(roundValue(employee.OffersAmount ? employee.OffersAmount : 0)) + " (" + employee.OffersCount + ") </p>");

                    if ($rootScope.IziBoxConfiguration.EnableLossesAndMeal) {
                        if (employee.LossCount)
                            lines.push("<p>    Pertes : " + $filter('CurrencyFormat')(roundValue(employee.LossAmount)) + " (" + employee.LossCount + ") </p>");
                        if (employee.EmployeeMealsCount)
                            lines.push("<p>    Repas employé : " + $filter('CurrencyFormat')(roundValue(employee.EmployeeMealsAmount)) + " (" + employee.EmployeeMealsCount + ") </p>");
                    }
                });

                lines.push("<br />");

                if (cashMovementSums && cashMovementSums.length > 0) {
                    lines.push("<p><strong>Mouvement(s) d'espèces</strong></p>");
                    cashMovementSums.forEach((cms) => {
                        lines.push("<p>    " + cms.CashMovementName + " : " + $filter('CurrencyFormat')(roundValue(cms.Amount)) + " (" + cms.Count + ")</p>");
                    });
                }

                if (countByHid && (printMode === StatsPrintMode.Z || printMode === StatsPrintMode.Y) && !isDetails) {
                    let comptage = false;
                    const printPosCount = (groupedCount) => {
                        groupedCount.sort((a, b) => b.PaymentMode.PaymentType - a.PaymentMode.PaymentType).forEach(l => {
                            let totalknown = Number(l.TotalKnown ? l.TotalKnown : 0);
                            let totalCount = Number(l.PaymentMode && l.PaymentMode.Total ? l.PaymentMode.Total : 0);
                            let totalEcart = Number(totalknown - totalCount);
                            if (totalknown !== 0 || totalCount !== 0 || totalEcart !== 0) {
                                if (!comptage) {
                                    lines.push("<br />");
                                    lines.push('<p><strong>Comptage</strong></p>');
                                    comptage = true;
                                }
                                lines.push("<p>  " + l.PaymentMode.Text + "</p>");
                                lines.push("<p>    Attendu : " + $filter('CurrencyFormat')(roundValue(totalknown)) + "</p>");
                                lines.push("<p>    Compté : " + $filter('CurrencyFormat')(roundValue(totalCount)) + "</p>");
                                lines.push("<p>    Ecart : " + $filter('CurrencyFormat')(roundValue(totalEcart)) + "</p>");
                            }
                        });
                    };

                    // Affichage du comptage

                    // Met a plat toutes les CashMovementLines
                    let AllCashMovementLines = countByHid.map(x => x.CashMovementLines);
                    // puis les regroupé par paymentType

                    let GroupedCashMovementLines = AllCashMovementLines.reduce((acc, cur) => {
                        if (acc.length === 0) {
                            acc = angular.copy(cur);
                        } else {
                            // On check si acc a deja le mode de paiement
                            acc.map(a => {
                                cur.forEach((c) => {
                                    let existing = Enumerable.from(acc).firstOrDefault((a) => a.PaymentMode.PaymentType === c.PaymentMode.PaymentType && a.PaymentMode.Value === c.PaymentMode.Value);
                                    if (existing) {
                                        if (a.PaymentMode.PaymentType === c.PaymentMode.PaymentType && a.PaymentMode.Value === c.PaymentMode.Value) {
                                            a.PaymentMode.Total += c.PaymentMode.Total;
                                            a.Count += c.Count;
                                            a.TotalKnown += c.TotalKnown;
                                            a.CashDiscrepancyYs += c.CashDiscrepancyYs;
                                        }
                                    } else {
                                        acc.push(c);
                                    }
                                });
                            });
                        }
                        return acc;
                    }, []);

                    printPosCount(GroupedCashMovementLines);
                }

                lines.push("<br />");
                lines.push("<hr style='border-top: 2px dashed black' />");
                lines.push("<cut>");
                lines.push("</cut>");
            };

            let d = angular.copy(data);
            let htmlLines = [];
            let parts = $rootScope.IziBoxConfiguration.ShopName.split("\\r\\n");
            let companyInformation = $rootScope.cacheCompanyInfo;

            if (details && printMode !== StatsPrintMode.Y) {
                // Si on demande les details, on crée un ticket pour chaque row
                d.Rows.forEach((r) => {
                    printRow(r.PaymentModes, r.AccountConsignorPayments, r.DeliveryValues, r.TaxDetails, r.TaxDetailsPerCategory, r.PosUserStats, r.CashMovementSums, r.Repaid, r.Credit, r.Cutleries, r, printMode, htmlLines, true);
                });
            }

            // Ticket TOTAL, somme de toute la periode demandé
            // On calcul les totaux
            // PaymentModes
            let pm = d.Rows.filter(r => r.PaymentModes).map(r => r.PaymentModes);
            let pms = [];
            if (pm && pm.length > 0) {
                pms = pm.reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        // On check si acc a deja le mode de paiement
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.PaymentType === c.PaymentType && a.Value === c.Value);
                                if (existing) {
                                    if (a.PaymentType === c.PaymentType && a.Value === c.Value) {
                                        a.Total += c.Total;
                                        a.Count += c.Count;

                                        a.TabData = a.Total;
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                }, []).sort((a, b) => {
                    // Trie par paymentType, puis par TabTitle
                    if (a.PaymentType > b.PaymentType) return 1;
                    if (a.PaymentType < b.PaymentType) return -1;

                    if (a.TabTitle > b.TabTitle) return 1;
                    if (a.TabTitle < b.TabTitle) return -1;
                });
            }

            // En compte
            let cp = d.Rows.filter(r => r.AccountConsignorPayments).map(r => r.AccountConsignorPayments);
            let cps = [];
            if (cp && cp.length > 0) {
                cps = cp.reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        // On check si acc a deja le mode de paiement
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.PaymentType === c.PaymentType && a.Value === c.Value);
                                if (existing) {
                                    if (a.PaymentType === c.PaymentType && a.Value === c.Value) {
                                        a.Total += c.Total;
                                        a.Count += c.Count;

                                        a.TabData = a.Total;
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                }, []).sort((a, b) => {
                    // Trie par paymentType, puis par TabTitle
                    if (a.PaymentType > b.PaymentType) return 1;
                    if (a.PaymentType < b.PaymentType) return -1;

                    if (a.TabTitle > b.TabTitle) return 1;
                    if (a.TabTitle < b.TabTitle) return -1;
                });
            }

            // TotalRepaid
            let tr = d.Rows.map(r => r.Repaid).reduce((acc, cur) => {
                return acc += cur;
            }, 0);

            // TotalCredit
            let tc = d.Rows.map(r => r.Credit).reduce((acc, cur) => {
                return acc += cur;
            }, 0);

            // TotalCutleries
            let tct = d.Rows.map(r => r.Cutleries).reduce((acc, cur) => {
                return acc += cur;
            }, 0);

            // DeliveryValues
            let dv = d.Rows.filter(r => r.DeliveryValues).map(r => r.DeliveryValues);
            let dvs = [];
            if (dv && dv.length > 0) {
                dvs = dv.reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.Type === c.Type);

                                if (existing) {
                                    if (a.Type === c.Type) {
                                        a.TotalIT += c.TotalIT;
                                        a.TotalET += c.TotalET;
                                        a.Count += c.Count;

                                        a.TabData += a.TotalIT;
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                }, []);
            }

            // TaxDetails par taux
            let tdbr = d.Rows.map(r => r.TaxDetailsByRate);
            let tdbrs = [];
            if (tdbr && tdbr.length > 0) {
                tdbrs = angular.copy(tdbr).reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.TaxRate === c.TaxRate);

                                if (existing) {
                                    if (a.TaxRate === c.TaxRate) {
                                        a.TaxAmount += c.TaxAmount;
                                        a.TaxAmountCustomerDisplay += c.TaxAmountCustomerDisplay;
                                        a.TabData += a.TaxAmountCustomerDisplay;
                                        a.PriceET += c.PriceET;
                                        a.PriceIT += c.PriceIT;
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                }, []);
            }

            // Tax details par categoryId
            let tdpc = d.Rows.map(r => r.TaxDetailsByTaxCategoryId);
            let tdpcs = [];
            if (tdpc && tdpc.length > 0) {
                // TaxDetails par category
                tdpcs = angular.copy(tdpc).reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.TaxRate === c.TaxRate && a.TaxCategoryId === c.TaxCategoryId);

                                if (existing) {
                                    if (a.TaxRate === c.TaxRate && a.TaxCategoryId === c.TaxCategoryId) {
                                        a.TaxAmount += c.TaxAmount;
                                        a.TaxAmountCustomerDisplay += c.TaxAmountCustomerDisplay;
                                        a.TabData += a.TaxAmountCustomerDisplay;
                                        a.PriceET += c.PriceET;
                                        a.PriceIT += c.PriceIT;
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                }, []);
            }

            // PosUserStats
            let pu = d.Rows.filter(r => r.PosUserStats).map(r => r.PosUserStats);
            let pus = pu.reduce((acc, cur) => {
                if (acc.length === 0) {
                    acc = angular.copy(cur);
                } else {
                    acc.map(a => {
                        cur.forEach((c) => {
                            let existing = Enumerable.from(acc).firstOrDefault((a) => a.PosUserName === c.PosUserName);

                            if (existing) {
                                if (a.PosUserName === c.PosUserName) {
                                    a.ValidCount += c.ValidCount;
                                    a.TotalIT += c.TotalIT;
                                    a.TotalET += c.TotalET;
                                    a.CanceledCount += c.CanceledCount;
                                    a.CanceledAmount += c.CanceledAmount;
                                    a.DeletedCount += c.DeletedCount;
                                    a.DeletedAmount += c.DeletedAmount;
                                    a.DiscountCount += c.DiscountCount;
                                    a.DiscountTotalIT += c.DiscountTotalIT;
                                    a.OffersCount += c.OffersCount;
                                    a.OffersAmount += c.OffersAmount;
                                    a.TabData += a.TotalIT;
                                    a.LossCount += c.LossCount;
                                    a.LossAmount += c.LossAmount;
                                    a.EmployeeMealsCount += c.EmployeeMealsCount;
                                    a.EmployeeMealsAmount += c.EmployeeMealsAmount;
                                }
                            } else {
                                acc.push(c);
                            }
                        });
                    });
                }
                return acc;
            }, []);

            // CashMovementSums
            let cms = d.Rows.filter(r => r.CashMovementSums).map(r => r.CashMovementSums);
            let cas = [];
            if (cms && cms.length > 0) {
                cas = cms.reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.CashMovementId === c.CashMovementId);
                                if (existing) {
                                    if (a.CashMovementId === c.CashMovementId) {
                                        a.Count++;
                                        a.Amount += c.Amount;
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                }, []);
            }

            printRow(pms, cps, dvs, tdbrs, tdpcs, pus, cas, tr, tc, tct, d, printMode, htmlLines, false);

            return htmlLines.join("");
        }
    };

    //Print the zpos, given the HTML
    this.printZPosAsync = (html) => {
        let printDefer = $q.defer();

        if (html) {
            //print
            const printerApiUrl = $rootScope.APIBaseURL + "/printhtml";
            console.log("PrinterApiUrl : " + printerApiUrl);
            const htmlPrintReq = {
                PrinterIp: $rootScope.PrinterConfiguration.POSPrinter,
                PrintCount: 1,
                Html: html
            };
            $http.post(printerApiUrl, htmlPrintReq, { timeout: 10000 }).then(() => {
                printDefer.resolve(true);
            }, (err) => {
                printDefer.reject("Print error");
            });
        } else {
            printDefer.reject("Nothing to print");
        }
        return printDefer.promise;
    };

    this.saveZArchiveAndPrint = (id, data, html) => {
        //print
        const zArchiveUrl = $rootScope.APIBaseURL + "/zpos/saveZArchiveAndPrint";
        const zArchiveReq = {
            Id: id,
            Obj: data,
            Html: html,
            PrinterIp: $rootScope.PrinterConfiguration.POSPrinter
        };

        $http.post(zArchiveUrl, zArchiveReq, { timeout: 10000 }).then((res) => {
        }, (err) => {
            console.error(err);
        });
    };

    //Send zpos by mail using the rest service
    this.emailStatsAsync = (html, isPeriod) => {
        let emailDefer = $q.defer();
        let printHTML = undefined;

        //email
        const emailApiUrl = $rootScope.APIBaseURL + "/emailhtml";
        console.log("EmailApiUrl : " + emailApiUrl);

        let subject = undefined;

        if (!isPeriod) {
            subject = "Stats Du : " + Date.parseExact(zpos.dateStart, "yyyyMMdd").toString("dd/MM/yyyy") + (zpos.dateEnd !== zpos.dateStart ? " au " + Date.parseExact(zpos.dateEnd, "yyyyMMdd").toString("dd/MM/yyyy") : "");
        } else {
            subject = "Z de caisse";
        }

        const htmlEmailReq = {
            Subject: subject,
            Html: printHTML
        };

        $http.post(emailApiUrl, htmlEmailReq, { timeout: 10000 }).then(() => {
            emailDefer.resolve(true);
        }, () => {
            emailDefer.reject("Email error");
        });
        return emailDefer.promise;
    };

    this.getStatsColumnsTitles = (listItems) => {
        let tabColumns = [["Date"], ["Date"], ["Date"]];
        let hIdEnabled = false;
        let tabTaxes = [], tabConso = [], tabPayment = [];
        let tabCount = [], tabUserStats = [];
        for (let day of listItems) {
            for (let item in day) {
                if (day.hasOwnProperty(item)) {
                    if (Array.isArray(day[item])) {
                        for (let subItem of day[item]) {
                            if (subItem.TabTitle && subItem.PosUserId) {
                                if (item === "TaxDetails" && tabTaxes.indexOf(subItem.TabTitle) === -1) {
                                    tabTaxes.push(subItem.TabTitle);
                                } else if (item === "DeliveryValues" && tabConso.indexOf(subItem.TabTitle) === -1) {
                                    tabConso.push(subItem.TabTitle);
                                } else if (item === "PaymentModes" && tabPayment.indexOf(subItem.TabTitle) === -1) {
                                    tabPayment.push(subItem.TabTitle);
                                } else if (item === "PosUserStats" && tabUserStats.indexOf(subItem.TabTitle + '|' + subItem.PosUserId) === -1) {
                                    tabUserStats.push(subItem.TabTitle + '|' + subItem.PosUserId);
                                }
                            }
                        }
                    } else {
                        if (item.includes("Count") && tabCount.indexOf(item) === -1) {
                            tabCount.push(item);
                            if (item === "LossCount") {
                                tabCount.push("LossAmount");
                            }
                            if (item === "EmployeeMealsCount") {
                                tabCount.push("EmployeeMealsAmount");
                            }
                        }
                        if (item === "HardwareId" && tabColumns[0].indexOf(item) === -1) {
                            tabColumns[0].push("HardwareId");
                            tabColumns[2].push("HardwareId");
                            hIdEnabled = true;
                        }
                    }
                }
            }
        }
        tabColumns[0] = tabColumns[0].concat(tabTaxes).concat(tabConso).concat(tabPayment);
        tabColumns[0].push("TotalET", "TotalIT");
        tabColumns[2] = tabColumns[2].concat(tabConso).concat(tabCount);
        for (let tab of tabColumns) {
            for (let i = 0; i < tab.length; i++) {
                tab[i] = { isUsed: false, value: tab[i] };
            }
        }
        for (let i = 0; i < tabUserStats.length; i++) {
            let NameAndId = tabUserStats[i].split('|');
            tabUserStats[i] = { name: NameAndId[0], data: [], id: NameAndId[1] };
            tabUserStats[i].data.push({ isUsed: true, value: "Date" });
            if (hIdEnabled) {
                tabUserStats[i].data.push({ isUsed: true, value: "HardwareId" });
            }
            tabUserStats[i].data.push(
                { isUsed: true, value: "ValidCount" }, { isUsed: true, value: "TotalIT" },
                { isUsed: true, value: "DeletedCount" }, { isUsed: true, value: "DeletedAmount" },
                { isUsed: true, value: "CanceledCount" }, { isUsed: true, value: "CanceledAmount" },
                { isUsed: true, value: "DiscountCount" }, { isUsed: true, value: "DiscountTotalIT" },
                { isUsed: true, value: "OffersCount" }, { isUsed: true, value: "OffersAmount" });
        }

        tabColumns[1] = tabUserStats;
        tabColumns[2].push({ isUsed: true, value: "Paniers moyen" }, {
            isUsed: true,
            value: "Cutleries"
        }, { isUsed: true, value: "Couverts moyen" }, { isUsed: true, value: "Nb Couverts par ticket" });

        return tabColumns;
    };

    this.getStatsRowsByColumns = (columns, listItems, type) => {
        let tabRows = null;
        if (type === 1) {
            tabRows = { name: columns.name, data: [], id: columns.id };
        } else {
            tabRows = [];
        }
        for (let day of listItems) {
            let row = [];
            if (type === 1) {
                if (day.PosUserStats) {
                    for (let user of day.PosUserStats) {
                        if (user.PosUserName === columns.name && user.PosUserId === Number(columns.id)) {
                            for (let column of columns.data) {
                                let value = "";
                                if (column.value === "Date") {
                                    if (day.Date) {
                                        value = day.Date;
                                    } else if (day.Start) {
                                        value = moment.unix(day.Start / 1000).format("DD/MM HH:mm");
                                        if (day.End && day.End !== maxEndDate) {
                                            value += " - " + moment.unix(day.End / 1000).format("DD/MM HH:mm");
                                        }
                                    }
                                } else {
                                    if (user[column.value]) {
                                        if (typeof user[column.value] === "number") {
                                            value = roundValue(user[column.value]);
                                        } else {
                                            value = user[column.value];
                                        }
                                    } else {
                                        if (column.value === "HardwareId") {
                                            if (day.Alias) {
                                                value = day.Alias;
                                            } else {
                                                value = day.HardwareId;
                                            }
                                        }
                                    }
                                }
                                row.push(value);
                            }
                        }
                    }
                }
                tabRows.data.push(row);
            } else {
                for (let column of columns) {
                    let value = "";
                    if (column.value === "Paniers moyen" && day.ValidCount !== 0) {
                        if (day.TotalIT !== 0) {
                            value = day.TotalIT / day.ValidCount;
                        }
                    } else if (column.value === "Nb Couverts par ticket" && day.ValidCount !== 0) {
                        if (day.Cutleries !== 0) {
                            value = day.Cutleries / day.ValidCount;
                        }
                    } else if (column.value === "Couverts moyen") {
                        if (day.Cutleries !== 0) {
                            value = day.TotalIT / day.Cutleries;
                        }
                    } else if (column.value === "Date") {
                        column.isUsed = true;
                        if (day.Date) {
                            value = day.Date;
                        } else if (day.Start) {
                            value = moment.unix(day.Start / 1000).format("DD/MM HH:mm");
                            if (day.End && day.End !== maxEndDate) {
                                value += " - " + moment.unix(day.End / 1000).format("DD/MM HH:mm");
                            }
                        }
                    } else if (column.value === "HardwareId") {
                        column.isUsed = true;
                        if (day.Alias) {
                            value = day.Alias;
                        } else {
                            value = day.HardwareId;
                        }
                    } else {
                        if (day[column.value]) {
                            column.isUsed = true;
                            value = day[column.value];
                        } else {
                            for (let item in day) {
                                if (day.hasOwnProperty(item) && Array.isArray(day[item])) {
                                    for (let subItem of day[item]) {
                                        if (type === 2) {
                                            if (item === "DeliveryValues" && column.value === subItem.TabTitle) {
                                                column.isUsed = true;
                                                value = "Nombre : " + roundValue(subItem.Count) + " / Total : " + $filter("CurrencyFormat")(roundValue(subItem.TotalIT));
                                            }
                                        } else {
                                            if (subItem.TabTitle && subItem.TabTitle === column.value) {
                                                column.isUsed = true;
                                                value = subItem.TabData;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (typeof value === "number") {
                        row.push({ show: true, value: roundValue(value), sort: value });
                    } else if (column.value === "Date") {
                        if (value.includes(" - ")) {
                            let cDate = value.split(' - ')[0];
                            row.push({ show: true, value: value, sort: moment(cDate, "DD/MM HH:mm").format("x") });
                        } else {
                            row.push({ show: true, value: value, sort: moment(value, "DD/MM HH:mm").format("x") });
                        }
                    } else {
                        row.push({ show: true, value: value, sort: value });
                    }
                }
                tabRows.push(row);
            }
        }

        //Remove empty columns / rows
        if (type === 1) {
            for (let i = 0; i < tabRows.data.length; i++) {
                if (tabRows.data[i].length === 0) {
                    tabRows.data.splice(i, 1);
                    i--;
                }
            }
        } else {
            for (let i = 0; i < columns.length; i++) {
                if (!columns[i].isUsed) {
                    for (let row of tabRows) {
                        row[i].show = false;
                    }
                }
            }
            for (let r = 0; r < tabRows.length; r++) {
                let removeRow = true;
                for (let i = 1; i < tabRows[r].length; i++) {
                    if (tabRows[r][i].value !== "") {
                        removeRow = false;
                        break;
                    }
                }
                if (removeRow) {
                    tabRows.splice(r, 1);
                    r--;
                }
            }
        }

        return tabRows;
    };
});