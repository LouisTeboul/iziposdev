/**
 * @function zposService
 * @description This is a service to manage the zpos data
 */
app.service('zposService', ['$http', '$rootScope', '$q', '$filter', '$translate', 'settingService',
    function ($http, $rootScope, $q, $filter, $translate, settingService) {

        let hardwareId = undefined;
        const maxEndDate = "9999999999999999";

        this.init = function () {
            hardwareId = $rootScope.modelPos.hardwareId;
        };

        /**
         * Get a Shopping Cart by its id
         * @param ShoppingCartId The Shopping cart ID
         */
        this.getShoppingCartByIdAsync = function (ShoppingCartId) {
            let valueDefer = $q.defer();
            let db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            db.get(ShoppingCartId).then(function (shoppingCart) {
                let item = shoppingCart.data;
                item.id = shoppingCart._id;
                item.rev = shoppingCart._rev;
                valueDefer.resolve(item);
            }, function (err) {
                valueDefer.reject(err);
            });

            return valueDefer.promise;
        };

        this.getLastShoppingCartAsync = function (hardwareId) {
            let queryDefer = $q.defer();
            let db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;
            const dateStartKey = new Date().toString("yyyyMMdd");

            db.query("zpos/byHidAndDate", {
                startkey: [hardwareId, dateStartKey],
                endkey: [hardwareId, ""],
                limit: 1,
                descending: true
            }).then(function (resShoppingCarts) {
                let shoppingCartRow = Enumerable.from(resShoppingCarts.rows).firstOrDefault();
                if (shoppingCartRow) {
                    queryDefer.resolve(shoppingCartRow.value.data);
                } else {
                    queryDefer.reject();
                }

            }, function () {
                queryDefer.reject();
            });

            return queryDefer.promise;
        };

        this.getShoppingCartsByPeriodAsync = function (zpid, hid, ypid) {
            let ShoppingCartsByPeriodDefer = $q.defer();

            const apiURL = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/zpos/getShoppingCartsByPeriod";

            const req = {
                ZPeriodId: zpid,
                YPeriodId: ypid,
                HardwareId: hid
            };

            $http.post(apiURL, req).then((ret) => {
                ret.data.map(s => {
                    if (!s.AliasCaisse) {

                    }
                });
                ShoppingCartsByPeriodDefer.resolve(ret.data);
            }, (err) => {
                console.error(err);
                ShoppingCartsByPeriodDefer.reject(err);
            });

            return ShoppingCartsByPeriodDefer.promise;
        };

        /**
         * Get shoppingCarts by filters
         */
        this.getShoppingCartsByFilterDateAsync = function (dateStart, dateEnd, alias, paiementMode, amount) {
            let listShoppingCartsDefer = $q.defer();

            if (!dateEnd) {
                dateEnd = new Date(dateStart.toString());
            }
            const apiURL = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/zpos/shoppingCartsByFilterDate";
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

        /**
         *
         * @param data : Data object to compose html from
         * @param printMode : StatsPrintMode enum
         * @param countByHid
         * @param details : print the details or no
         * @returns {string}
         */
        this.composeStatsHTML = function (data, printMode, countByHid, details = false) {

            if (data.Rows && data.Rows.length > 0) {

                let d = angular.copy(data);
                let htmlLines = [];
                let parts = $rootScope.IziBoxConfiguration.ShopName.split("\\r\\n");
                let companyInformation = settingService.getCompanyInfo();

                if (details && printMode !== StatsPrintMode.Y) {
                    // Si on demande les details, on crée un ticket pour chaque row
                    d.Rows.forEach((r) => {
                        printRow(r.PaymentModes, r.DeliveryValues, r.TaxDetails, r.PosUserStats, r.Repaid, r.Credit, r.Cutleries, r, printMode, htmlLines, true);
                    });
                }

                // Ticket TOTAL, somme de toute la periode demandé
                // On calcul les totaux
                // PaymentModes
                let pms = d.Rows.map(r => r.PaymentModes).reduce((acc, cur) => {
                    if (acc.length === 0) {
                        acc = angular.copy(cur);
                    } else {
                        // On check si acc a deja le mode de paiement
                        acc.map(a => {
                            cur.forEach((c) => {
                                let existing = Enumerable.from(acc).firstOrDefault((a) => a.PaymentType === c.PaymentType);
                                if (existing) {
                                    if (a.PaymentType === c.PaymentType) {
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
                });

                // TotalRepaid
                let tr = d.Rows.map(r => r.Repaid).reduce((acc, cur) => acc += cur);

                // TotalCredit
                let tc = d.Rows.map(r => r.Credit).reduce((acc, cur) => acc += cur);

                // TotalCutleries
                let tct = d.Rows.map(r => r.Cutleries).reduce((acc, cur) => acc += cur);

                // DeliveryValues
                let dvs = d.Rows.map(r => r.DeliveryValues).reduce((acc, cur) => {
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
                });

                // TaxDetails
                let tds = d.Rows.map(r => r.TaxDetails).reduce((acc, cur) => {
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
                });

                // PosUserStats
                let pus = d.Rows.map(r => r.PosUserStats).reduce((acc, cur) => {
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
                                    }
                                } else {
                                    acc.push(c);
                                }
                            });
                        });
                    }
                    return acc;
                });

                printRow(pms, dvs, tds, pus, tr, tc, tct, d, printMode, htmlLines, false);

                function printRow(paymentModes, deliveryValues, taxDetails, posUserStats, totalRepaid, totalCredit, totalCutleries, data, mode, lines, isDetails = false) {
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

                                header += "<center><strong>Z du </strong></center>";
                                header += "<center><strong>" + moment.unix(data.DateStart / 1000).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                                if (data.DateEnd && data.DateEnd !== maxEndDate) {
                                    if (data.DateStart !== data.DateEnd) {
                                        header += "<center><strong>au " + moment.unix(Math.floor(data.DateEnd / 1000)).format("DD/MM/YYYY HH:mm:ss") + "</strong></center>";
                                    }
                                }
                            }
                            break;
                    }

                    lines.push(header);

                    lines.push("<br />");
                    if (companyInformation) {
                        lines.push("<center><strong>" + companyInformation.Company + "</strong></center>");
                        lines.push("<center>" + companyInformation.Address + "</center>");
                        lines.push("<center>" + companyInformation.ZipCode + ' ' + companyInformation.City + "</center>");
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
                    lines.push("<p>Total HT  : <strong>" + $filter('CurrencyFormat')(roundValue(data.TotalET)) + "</strong></p>");

                    lines.push("<p><table>");
                    if (taxDetails.length > 0) {
                        lines.push("<tr>");
                        lines.push("<th style='width:15%;' scope='col'>&nbsp;</th>");
                        lines.push("<th style='width:27%;text-align:right;' scope='col'>TVA</th>");
                        lines.push("<th style='width:29%;text-align:right;' scope='col'>HT</th>");
                        lines.push("<th style='width:29%;text-align:right;' scope='col'>TTC</th>");
                        lines.push("</tr>");
                    }
                    taxDetails.forEach((td) => {
                        lines.push("<tr>");
                        lines.push("<td style='width:15%;'>" + td.TabTitleShort + "</td>");
                        lines.push("<td style='width:27%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(td.TaxAmountCustomerDisplay)) + "</td>");
                        lines.push("<td style='width:29%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(td.PriceET)) + "</td>");
                        lines.push("<td style='width:29%;text-align:right;'>" + $filter('CurrencyFormat')(roundValue(td.PriceIT)) + "</td>");
                        lines.push("</tr>");
                    });
                    lines.push("</table></p>");

                    lines.push("<p>Total TTC : <strong>" + $filter('CurrencyFormat')(roundValue(data.TotalIT)) + "</strong></p>");

                    lines.push("<hr />");

                    lines.push("<p><table>");

                    paymentModes.forEach((pm => {
                        lines.push("<tr>");
                        lines.push("<td style='width:55%'>" + pm.Text + " : </td>");
                        lines.push("<td style='width:10%;text-align:center'>" + pm.Count + "</td>");
                        lines.push("<td style='width:35%;text-align:right'>" + $filter('CurrencyFormat')(roundValue(pm.Total)) + "</td>");
                        lines.push("</tr>");

                    }));
                    lines.push("</table></p>");


                    lines.push("<p>Avoir émis : " + $filter('CurrencyFormat')(roundValue(totalCredit)) + "</p>");
                    lines.push("<br />");
                    lines.push("<p>Rendu (pour info.) : " + $filter('CurrencyFormat')(roundValue(totalRepaid)) + "</p>");

                    lines.push("<hr />");
                    lines.push("<br />");

                    lines.push("<p><strong>Tickets : </strong></p>");
                    lines.push("<p>   Validés : " + $filter('CurrencyFormat')(roundValue(data.TotalIT)) + " (" + data.ValidCount + ") </p>");
                    lines.push("<p>   Annulés : " + $filter('CurrencyFormat')(roundValue(data.CanceledAmount)) + " (" + data.CanceledCount + ") </p>");
                    lines.push("<p>   Supprimés : " + $filter('CurrencyFormat')(roundValue(data.DeletedAmount)) + " (" + data.DeletedCount + ") </p>");
                    lines.push("<p>   Remise : " + $filter('CurrencyFormat')(roundValue(data.DiscountTotalIT ? data.DiscountTotalIT : 0)) + " (" + (data.DiscountCount ? data.DiscountCount : 0) + ") </p>");
                    lines.push("<p>   Offerts : " + $filter('CurrencyFormat')(roundValue(data.OffersAmount ? data.OffersAmount : 0)) + " (" + data.OffersCount + ") </p>");

                    lines.push("<br />");
                    lines.push("<p><strong>Par employés (TTC) :</strong></p>");
                    posUserStats.forEach((employee) => {

                        lines.push("<p>  " + employee.PosUserName + " : </p>");
                        lines.push("<p>    CA validé : " + $filter('CurrencyFormat')(roundValue(employee.TotalIT)) + " (" + employee.ValidCount + ") </p>");
                        lines.push("<p>    Annulés : " + $filter('CurrencyFormat')(roundValue(employee.CanceledAmount)) + " (" + employee.CanceledCount + ") </p>");
                        lines.push("<p>    Supprimés : " + $filter('CurrencyFormat')(roundValue(employee.DeletedAmount)) + " (" + employee.DeletedCount + ") </p>");
                        lines.push("<p>    Remise : " + $filter('CurrencyFormat')(roundValue(employee.DiscountTotalIT ? employee.DiscountTotalIT : 0)) + " (" + (employee.DiscountCount ? employee.DiscountCount : 0) + ") </p>");
                        lines.push("<p>    Offerts : " + $filter('CurrencyFormat')(roundValue(employee.OffersAmount ? employee.OffersAmount : 0)) + " (" + employee.OffersCount + ") </p>");
                    });

                    lines.push("<br />");

                    lines.push("<p>Nb. couverts : " + totalCutleries + "</p>");

                    if (deliveryValues && deliveryValues.length > 0) {
                        lines.push("<p>Recette par mode de conso. (TTC) :</p>");
                        lines.push("<table>");

                        deliveryValues.forEach((dv => {
                            lines.push("<tr>");
                            lines.push("<td style='width:65%'>" + $translate.instant(dv.TabTitle) + "</td>");
                            lines.push("<td style='width:10%;text-align:center'>" + dv.Count + "</td>");
                            lines.push("<td style='width:25%;text-align:right'>" + $filter('CurrencyFormat')(roundValue(dv.TotalIT)) + "</td>");
                            lines.push("</tr>");
                        }));
                        lines.push("</table>");

                        lines.push("<br />");
                    }

                    lines.push("<br />");

                    lines.push("<br />");

                    if (countByHid && (printMode === StatsPrintMode.Z || printMode === StatsPrintMode.Y) && !isDetails) {
                        function printPosCount(groupedCount) {
                            lines.push("<br />");
                            lines.push('<p><strong>Comptage</strong></p>');
                            groupedCount.sort((a, b) => b.PaymentMode.PaymentType - a.PaymentMode.PaymentType).forEach(l => {
                                var totalknown = l.TotalKnown ? l.TotalKnown : 0;
                                var totalCount = l.PaymentMode && l.PaymentMode.Total ? l.PaymentMode.Total : 0;
                                var totalEcart = totalknown - totalCount;
                                if (totalknown !== 0 || totalCount !== 0 || totalEcart !== 0) {
                                    lines.push("<p>  " + l.PaymentMode.Text + "</p>");
                                    lines.push("<p>    Attendu : " + $filter('CurrencyFormat')(roundValue(totalknown)) + "</p>");
                                    lines.push("<p>    Compté : " + $filter('CurrencyFormat')(roundValue(totalCount)) + "</p>");
                                    lines.push("<p>    Ecart : " + $filter('CurrencyFormat')(roundValue(totalEcart)) + "</p>");
                                }

                            });
                        }

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
                                        let existing = Enumerable.from(acc).firstOrDefault((a) => a.PaymentMode.PaymentType === c.PaymentMode.PaymentType);
                                        if (existing) {
                                            if (a.PaymentMode.PaymentType === c.PaymentMode.PaymentType) {
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
                        });

                        printPosCount(GroupedCashMovementLines);
                    }


                    lines.push("<br />");
                    lines.push("<hr style='border-top: 2px dashed black' />");
                    lines.push("<cut>");
                    lines.push("</cut>");
                }

                return htmlLines.join("");
            }
        };

        /**
         *
         * Print the zpos, given the HTML
         */
        this.printZPosAsync = function (html) {
            let printDefer = $q.defer();

            if (html) {
                //print
                const printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printhtml";
                console.log("PrinterApiUrl : " + printerApiUrl);
                const htmlPrintReq = {
                    PrinterIdx: $rootScope.PrinterConfiguration.POSPrinter,
                    Html: html
                };

                $http.post(printerApiUrl, htmlPrintReq, { timeout: 10000 }).success(function () {
                    printDefer.resolve(true);
                }).error(function () {
                    printDefer.reject("Print error");
                });
            }
            else {
                printDefer.reject("Nothing to print");
            }
            return printDefer.promise;
        };

        this.saveZArchive = function (id, data, html) {

            //print
            const zArchiveUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/zpos/saveZArchive";
            const zArchiveReq = {
                Id: id,
                Obj : data,
                Html: html
            };

            $http.post(zArchiveUrl, zArchiveReq, {timeout: 10000}).then( (res) => {

            }, (err) => {
                console.error(err);
            })
        };

        /**
         * Send zpos by mail using the rest servicen
         */
        this.emailStatsAsync = function (html, isPeriod) {
            let emailDefer = $q.defer();
            let printHTML = undefined;

            //email
            const emailApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/emailhtml";
            console.log("EmailApiUrl : " + emailApiUrl);
            //Erreur
            let subject = undefined;

            if (!isPeriod) {
                subject = "Stats Du : " + Date.parseExact(zpos.dateStart, "yyyyMMdd").toString("dd/MM/yyyy") + (zpos.dateEnd !== zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyyMMdd").toString("dd/MM/yyyy")) : "");
            } else {
                subject = "Z de caisse";
            }

            const htmlEmailReq = {
                Subject: subject,
                Html: printHTML
            };

            $http.post(emailApiUrl, htmlEmailReq, {timeout: 10000}).success(function () {
                emailDefer.resolve(true);
            }).error(function () {
                emailDefer.reject("Email error");
            });
            return emailDefer.promise;
        };

        this.getStatsColumnsTitles = function (listItems) {
            let tabColumns = [["Date"], ["Date"], ["Date"]];
            let hIdEnabled = false;
            let tabTaxes = [], tabConso = [], tabPayment = [];
            let tabCount = [], tabUserStats = [];
            for (let day of listItems) {
                for (let item in day) {
                    if (day.hasOwnProperty(item)) {
                        if (Array.isArray(day[item])) {
                            for (let subItem of day[item]) {
                                if (subItem.TabTitle) {
                                    if (item === "TaxDetails" && tabTaxes.indexOf(subItem.TabTitle) === -1) {
                                        tabTaxes.push(subItem.TabTitle);
                                    } else if (item === "DeliveryValues" && tabConso.indexOf(subItem.TabTitle) === -1) {
                                        tabConso.push(subItem.TabTitle);
                                    } else if (item === "PaymentModes" && tabPayment.indexOf(subItem.TabTitle) === -1) {
                                        tabPayment.push(subItem.TabTitle);
                                    } else if (item === "PosUserStats" && tabUserStats.indexOf(subItem.TabTitle) === -1) {
                                        tabUserStats.push(subItem.TabTitle);
                                    }
                                }
                            }
                        } else {
                            if (item.includes("Count") && tabCount.indexOf(item) === -1) {
                                tabCount.push(item);
                            }
                            if(item === "HardwareId" && tabColumns[0].indexOf(item) === -1) {
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
                    tab[i] = {isUsed: false, value: tab[i]};
                }
            }
            for (let i = 0; i < tabUserStats.length; i++) {
                tabUserStats[i] = {name: tabUserStats[i], data: []};
                tabUserStats[i].data.push({isUsed: true, value: "Date"});
                if(hIdEnabled) {
                    tabUserStats[i].data.push({isUsed: true, value: "HardwareId"});
                }
                tabUserStats[i].data.push({isUsed: true, value: "ValidCount"},
                    { isUsed: true, value: "DeletedCount" }, { isUsed: true, value: "DeletedAmount" },
                    { isUsed: true, value: "CanceledCount" }, { isUsed: true, value: "CanceledAmount" },
                    { isUsed: true, value: "DiscountCount" }, { isUsed: true, value: "DiscountTotalIT" },
                    { isUsed: true, value: "OffersCount" }, { isUsed: true, value: "OffersAmount" });
            }

            tabColumns[1] = tabUserStats;
            tabColumns[2].push({isUsed: true, value: "Paniers moyen"}, {isUsed: true, value: "Couverts moyen"});

            return tabColumns;
        };

        this.getStatsRowsByColumns = function (columns, listItems, type) {
            let tabRows = null;
            if (type === 1) {
                tabRows = {name: columns.name, data: []};
            } else {
                tabRows = [];
            }
            for (let day of listItems) {
                let row = [];
                if (type === 1) {
                    if (day.PosUserStats) {
                        for (let user of day.PosUserStats) {
                            if (user.PosUserName === columns.name) {
                                for (let column of columns.data) {
                                    let value = "";
                                    if (column.value === "Date") {
                                        if (day.Date) {
                                            value = day.Date;
                                        } else if(day.Start) {
                                            value = moment.unix(day.Start / 1000).format("DD/MM HH:mm");
                                            if (day.End && day.End !== maxEndDate) {
                                                value += " - " + moment.unix(day.End / 1000).format("DD/MM HH:mm");
                                            }
                                        }
                                    } else {
                                        if (user[column.value]) {
                                            if(typeof user[column.value] === "number") {
                                                value = roundValue(user[column.value]);
                                            } else {
                                                value = user[column.value];
                                            }
                                        } else {
                                            if(column.value === "HardwareId") {
                                                if(day.Alias) {
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
                        } else if (column.value === "Couverts moyen" && day.ValidCount !== 0) {
                            if (day.Cutleries !== 0) {
                                value = day.Cutleries / day.ValidCount;
                            }
                        } else if (column.value === "Date") {
                            column.isUsed = true;
                            if (day.Date) {
                                value = day.Date;
                            } else if(day.Start) {
                                value = moment.unix(day.Start / 1000).format("DD/MM HH:mm");
                                if (day.End && day.End !== maxEndDate) {
                                    value += " - " + moment.unix(day.End / 1000).format("DD/MM HH:mm");
                                }
                            }
                        } else if (column.value === "HardwareId") {
                            column.isUsed = true;
                            if(day.Alias) {
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
                            row.push({show: true, value: roundValue(value), sort: value});
                        } else if (column.value === "Date") {
                            if (value.includes(" - ")) {
                                row.push({show: true, value: value, sort: value});
                            } else {
                                row.push({show: true, value: value, sort: moment(value, "DD-MM-YYYY").format("x")});
                            }
                        } else {
                            row.push({show: true, value: value, sort: value});
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
    }]);