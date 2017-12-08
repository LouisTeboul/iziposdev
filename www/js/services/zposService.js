/**
 * @function zposService
 * @description This is a service to manage the zpos data
 */
app.service('zposService', ['$http', '$rootScope', '$q', 'posLogService', 'posPeriodService', 'posService',
    function ($http, $rootScope, $q, posLogService, posPeriodService, posService) {
        var current = this;
        var hardwareId = undefined;

        this.init = function () {
            hardwareId = $rootScope.modelPos.hardwareId;
        };

        /**
         * Get a Shopping Cart by its id
         * @param ShoppingCartId The Shopping cart ID
         */
        this.getShoppingCartByIdAsync = function (ShoppingCartId) {
            var valueDefer = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            db.get(ShoppingCartId).then(function (shoppingCart) {
                var item = shoppingCart.data;
                item.id = shoppingCart._id;
                item.rev = shoppingCart._rev;
                valueDefer.resolve(item);
            }, function (err) {
                valueDefer.reject(err);
            });

            return valueDefer.promise;
        };

        /**
         * Recupere les ticket par alias et par date
         * @param amount : montant du ticket recherché
         * @param dateStart : date debut
         * @param dateEnd : date fin
         */
        this.getShoppingCartByAmountDateAsync = function (dateStart, dateEnd, amount) {
            var byAmountDate = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            if (!dateEnd) {
                dateEnd = new Date(dateStart.toString());
            }

            var dateStartKey = dateStart.toString("yyyyMMdd");
            var dateEndKey = dateEnd.toString("yyyyMMdd");


            db.query("zpos/byAmountDate", {
                startkey: [amount, dateStartKey],
                endkey: [amount, dateEndKey]
            }).then(function (resShoppingCarts) {
                var allShoppingCarts = Enumerable.from(resShoppingCarts.rows).select(function (x) {

                    var item = x.value.data;
                    item.id = x.value._id;
                    item.rev = x.value._rev;
                    item.alias = x.value.data.AliasCaisse ? x.value.data.AliasCaisse : x.value.data.HardwareId;
                    return item;
                }).toArray();
                byAmountDate.resolve(allShoppingCarts);

            });

            //Retourne un tableau de tout les shopping cart correspondant a un montant,
            // durant la periode renseigné
            return byAmountDate.promise;
        };


        /**
         * Recupere les ticket par alias et par date
         * @param alias
         * @param dateStart : date debut
         * @param dateEnd : date fin
         */
        this.getShoppingCartByAliasDateAsync = function (dateStart, dateEnd, alias) {
            var byAliasDate = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            if (!dateEnd) {
                dateEnd = new Date(dateStart.toString());
            }

            var dateStartKey = dateStart.toString("yyyyMMdd");
            var dateEndKey = dateEnd.toString("yyyyMMdd");

            db.query("zpos/byAliasDate", {
                startkey: [alias, dateStartKey],
                endkey: [alias, dateEndKey]
            }).then(function (resShoppingCarts) {
                var allShoppingCarts = Enumerable.from(resShoppingCarts.rows).select(function (x) {
                    var item = x.value.data;
                    item.id = x.value._id;
                    item.rev = x.value._rev;
                    item.alias = x.value.data.AliasCaisse ? x.value.data.AliasCaisse : x.value.data.HardwareId;

                    return item;
                }).toArray();
                byAliasDate.resolve(allShoppingCarts);

            });

            //Retourne un tableau de tout les shopping cart correspondant a un alias,
            // durant la periode renseigné
            return byAliasDate.promise;
        };


        /**
         * Recupere la liste des alias correspondant aux ticket des dates
         * Pour la LOV du select
         * @param dateStart : date de debut
         * @param dateEnd : date de fin
         */
        this.getAliasesByDateAsync = function (dateStart, dateEnd) {

            var aliasByDateDefer = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            if (!dateEnd) {
                dateEnd = new Date(dateStart.toString());
            }
            var dateStartKey = dateStart.toString("yyyyMMdd");
            var dateEndKey = dateEnd.toString("yyyyMMdd");


            db.query("zpos/aliasByDate", {
                startkey: dateStartKey,
                endkey: dateEndKey
            }).then(function (resShoppingCarts) {
                var allAliases = Enumerable.from(resShoppingCarts.rows).select(function (x) {
                    var item = {};
                    //Fallback sur l'hid si pas d'alias
                    item.alias = x.value[0] ? x.value[0] : x.value[1];
                    item.hid = x.value[1];

                    return item;

                }).toArray();
                aliasByDateDefer.resolve(allAliases);

                //Retourne un tableau contenant tout les alias des tickets de la periode renseigné

            }, function (errGet) {
                console.log("erreur");
                aliasByDateDefer.reject(errGet);
            });
            return aliasByDateDefer.promise;

        };


        /**
         *
         * @param dateStart : date de debut
         * @param dateEnd : date de fin
         * @param filterAlias : l'alias qu'on souhaite filtrer
         */
        this.getAllShoppingCartsAsync = function (dateStart, dateEnd, filterAlias) {
            var allShoppingCartsDefer = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            if (!dateEnd) {
                dateEnd = new Date(dateStart.toString());
            }
            var dateStartKey = dateStart.toString("yyyyMMdd");
            var dateEndKey = dateEnd.toString("yyyyMMdd");

            db.query("zpos/byDate", {
                startkey: dateStartKey,
                endkey: dateEndKey
            }).then(function (resShoppingCarts) {
                var allShoppingCarts = Enumerable.from(resShoppingCarts.rows).select(function (x) {
                    var item = x.value.data;
                    item.id = x.value._id;
                    item.rev = x.value._rev;
                    item.alias = x.value.data.AliasCaisse ? x.value.data.AliasCaisse : x.value.data.HardwareId;

                    return item;

                }).toArray();

                // If an alias is selected for filtering
                if (filterAlias != 0) {
                    //ATTENTION bricolage, set timeout a changer
                    setTimeout(function () {
                        for (var i = 0; i < allShoppingCarts.length; i++) {
                            // Iterate through all shopping carts
                            // delete those which doesnt match filtered alias
                            if (String(allShoppingCarts[i].alias) != String(filterAlias)) {
                                allShoppingCarts.splice(i, 1);
                            }
                        }
                    }, 100);
                }

                // ATTENTION
                // Bricolage extreme, il faut trouver une meilleur solution pour assurer la syncronisation
                setTimeout(function () {
                    allShoppingCartsDefer.resolve(allShoppingCarts);
                }, 100);

            }, function (errGet) {
                console.log("erreur");
                allShoppingCartsDefer.reject(errGet);
            });

            return allShoppingCartsDefer.promise;
        };


        this.getShoppingCartsByPeriodAsync = function (zpid, hid, ypid) {
            var ShoppingCartsByPeriodDefer = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;
            var startKey = undefined;

            if (!jQuery.isEmptyObject(ypid)) {
                startKey = [zpid, hid, ypid]
            } else {
                startKey = [zpid, hid]
            }
            db.query("zpos/byPeriod", {
                startkey: startKey,
                endkey: [zpid, hid, ypid]
            }).then(function (resShoppingCarts) {
                var allShoppingCarts = Enumerable.from(resShoppingCarts.rows).select(function (x) {
                    var item = x.value.data;
                    item.id = x.value._id;
                    item.rev = x.value._rev;
                    item.alias = x.value.data.AliasCaisse ? x.value.data.AliasCaisse : x.value.data.HardwareId;


                    return item;

                }).toArray();


                // ATTENTION
                // Bricolage extreme, il faut trouver une meilleur solution pour assurer la syncronisation
                setTimeout(function () {
                    ShoppingCartsByPeriodDefer.resolve(allShoppingCarts);
                }, 100);

            }, function (errGet) {
                console.log("erreur");
                ShoppingCartsByPeriodDefer.reject(errGet);
            });

            return ShoppingCartsByPeriodDefer.promise;
        };


        /**
         * Recupere les ticket par periode et montant
         * @param amount : montant du ticket recherché
         * @param dateStart : date debut
         * @param dateEnd : date fin
         */
        this.getShoppingCartByAmountDateAsync = function (dateStart, dateEnd, amount) {
            var byAmountDate = $q.defer();
            var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

            if (!dateEnd) {
                dateEnd = new Date(dateStart.toString());
            }
            var dateStartKey = dateStart.toString("yyyyMMdd");
            var dateEndKey = dateEnd.toString("yyyyMMdd");


            db.query("zpos/byAmountDate", {
                startkey: [amount, dateStartKey],
                endkey: [amount, dateEndKey]
            }).then(function (resShoppingCarts) {
                var allShoppingCarts = Enumerable.from(resShoppingCarts.rows).select(function (x) {

                    var item = x.value.data;
                    item.id = x.value._id;
                    item.rev = x.value._rev;
                    item.alias = x.value.data.AliasCaisse ? x.value.data.AliasCaisse : x.value.data.HardwareId;

                    return item;

                }).toArray();
                byAmountDate.resolve(allShoppingCarts);

            });

            //Retourne un tableau de tout les shopping cart correspondant a un montant,
            // durant la periode renseigné
            return byAmountDate.promise;
        };


        /** Purge Zpos
         * Delete tickets and reset the cash fund
         */
        this.purgeZPosAsync = function (all) {
            var purgeZPosDefer = $q.defer();

            if (!$rootScope.IziBoxConfiguration.UseCashMovement || all) {
                if (all) {
                    var purgeAllFuncAsync = function (db) {
                        var purgeAllFuncDefer = $q.defer();

                        $rootScope.dbZPos.rel.find('ShoppingCart').then(function (resShoppingCarts) {
                            var shoppingCartsToPurge = resShoppingCarts.ShoppingCarts;

                            var delDoc = function (idx) {
                                if (idx < shoppingCartsToPurge.length) {
                                    var shoppingCart = shoppingCartsToPurge[idx];

                                    $rootScope.dbZPos.remove(shoppingCart._id, shoppingCart._rev).then(function (result) {
                                        delDoc(idx + 1);
                                    }).catch(function (err) {
                                        delDoc(idx + 1);
                                    });
                                } else {
                                    //TODO Suppression des paymentValues sur la fermeture caisse
                                    //current.getPaymentValuesAsync().then(function (paymentValues) {
                                    //    if (paymentValues) {
                                    //        $rootScope.dbZPos.rel.del('PaymentValues', { id: paymentValues.id, rev: paymentValues.rev });
                                    //        $rootScope.CashOpen = false;
                                    //    }
                                    //});
                                    purgeAllFuncDefer.resolve();
                                }
                            };

                            delDoc(0);

                        }, function (err) {
                            purgeAllFuncDefer.resolve();
                        });

                        return purgeAllFuncDefer.promise;
                    };

                    purgeAllFuncAsync($rootScope.dbZPos).then(function () {
                        purgeAllFuncAsync($rootScope.remoteDbZPos).then(function () {
                            purgeZPosDefer.resolve();
                        });
                    });

                } else {

                    var purgeDateFuncAsync = function (db) {
                        var purgeDateFuncDefer = $q.defer();

                        var dateToPurge = new Date();
                        dateToPurge.setDate(dateToPurge.getDate() - 7);

                        var dateEndKey = dateToPurge.toString("yyyyMMdd");

                        db.allDocs({
                            include_docs: true,
                            startkey: 'ShoppingCart_',
                            endkey: 'ShoppingCart_\uffff'
                        })
                            .then(function (result) {
                                var allShoppingCarts = Enumerable.from(result.rows).where(function (x) {
                                    var prefix = x.doc.data.Date.match(/^[^\s]+\s/);
                                    var splitPref = prefix[0].trim().split("/");
                                    var dateTk = parseInt(splitPref[2] + splitPref[1] + splitPref[0]);
                                    return dateTk <= parseInt(dateEndKey);
                                }).select("x => x.doc.data").toArray();

                                var delDoc = function (idx) {

                                    var info = {};
                                    info.value = idx;
                                    info.max = allShoppingCarts.length;
                                    $rootScope.$emit("dbZposPurge", info);

                                    if (idx < allShoppingCarts.length) {
                                        var shoppingCart = allShoppingCarts[idx];

                                        db.remove(shoppingCart._id, shoppingCart._rev).then(function (result) {
                                            delDoc(idx + 1);
                                        }).catch(function (err) {
                                            delDoc(idx + 1);
                                        });
                                    } else {
                                        //TODO suppression des paymentvalues sur fermeture caisse
                                        //current.getPaymentValuesAsync().then(function (paymentValues) {
                                        //    if (paymentValues) {
                                        //        db.rel.del('PaymentValues', { id: paymentValues.id, rev: paymentValues.rev });
                                        //        $rootScope.CashOpen = false;
                                        //    }
                                        //});

                                        purgeDateFuncDefer.resolve();
                                    }
                                };
                                delDoc(0);
                            }, function (errGet) {
                                purgeDateFuncDefer.resolve();
                            });
                    };
                    purgeDateFuncAsync($rootScope.dbZPos).then(function () {
                        purgeDateFuncAsync($rootScope.remoteDbZPos).then(function () {
                            purgeZPosDefer.resolve();
                        });
                    });
                }

            } else {
                purgeZPosDefer.resolve();
            }
            return purgeZPosDefer.promise;
        };

        /**
         * Zpos view creation
         * We're using data rendered from a couchDb View
         * @param zposDefer
         * @param dateStart Beginning of the period
         * @param dateEnd End of the period
         * @param taxByDate taxByDate view
         * @param paymentModesByDate paymentModesByDate view
         * @param repaidByDate repaidByDate view
         * @param countByDate countByDate view
         * @param cutleriesByDate cutleriesByDate view
         * @param creditByDate creditByDate view
         * @param deliveryTypeByDate deliveryTypeByDate view
         * @param userByDate userByDate view
         */
        var createZPos = function (zposDefer, dateStart, dateEnd, taxByDate, paymentModesByDate, balanceByDate, repaidByDate, countByDate, cutleriesByDate, creditByDate, deliveryTypeByDate, userByDate, hidByDate) {
            var zpos = {
                dateStart: dateStart,
                dateEnd: dateEnd,
                editionDate: new Date().toString('dd/MM/yyyy H:mm:ss'),
                totalIT: 0,
                totalET: 0,
                count: 0,
                totalsByDate: [],//{date,totalIT,totalET,count}
                paymentModes: [], //{type,total/date[],total}
                balance: {
                    total: 0,
                    byDate: []
                },
                deliveryValues: [], //{type,total/date[],total}
                employees: [], //{nom,total/date[],total}
                taxDetails: [], //{taxcode,total/date[],total}
                cutleries: {
                    count: 0,
                    byDate: []
                },
                credit: {
                    total: 0,
                    byDate: []
                },
                repaid: {
                    total: 0,
                    byDate: []
                },
                hid: {
                    byDate: []
                }

            };

            // Total by date
            Enumerable.from(countByDate).forEach(function (row) {
                var newLine = {
                    date: row.key,
                    totalIT: roundValue(row.value.TotalIT),
                    totalET: roundValue(row.value.TotalET),
                    count: row.value.Count
                };
                zpos.totalsByDate.push(newLine);
                zpos.totalIT = roundValue(zpos.totalIT + newLine.totalIT);
                zpos.totalET = roundValue(zpos.totalET + newLine.totalET);
                zpos.count += newLine.count;
            });

            // Total by payment modes and by date
            Enumerable.from(paymentModesByDate).forEach(function (row) {
                var type = row.key[1];
                var type_id = row.key[2];

                var newPM = Enumerable.from(zpos.paymentModes).firstOrDefault(function (pm) {
                    return pm.type == type;
                });
                if (newPM) {
                    newPM.total = roundValue(newPM.total + row.value.Total);
                    newPM.count += row.value.Count;
                    newPM.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value.Total),
                        count: row.value.Count
                    });

                } else {
                    newPM = {
                        type: type,
                        type_id: type_id,
                        byDate: [],
                        total: roundValue(row.value.Total),
                        count: row.value.Count
                    };
                    newPM.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value.Total),
                        count: row.value.Count
                    });

                    newPM.total = roundValue(newPM.total);
                    zpos.paymentModes.push(newPM);
                }

            });

            // Balance by date
            Enumerable.from(balanceByDate).forEach(function (row) {
                zpos.balance.total = roundValue(zpos.balance.total + row.value);
                zpos.balance.byDate.push({
                    date: row.key,
                    total: roundValue(row.value)
                });

            });


            // Total by delivery type and by date
            Enumerable.from(deliveryTypeByDate).forEach(function (row) {
                var type = row.key[1];

                var newDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (del) {
                    return del.type == type;
                });
                if (newDelivery) {
                    newDelivery.total = roundValue(newDelivery.total + row.value);
                    newDelivery.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value)
                    });

                } else {
                    newDelivery = {
                        type: type,
                        byDate: [],
                        total: roundValue(row.value)
                    };
                    newDelivery.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value)
                    });
                    zpos.deliveryValues.push(newDelivery);
                }

            });

            // Total by Pos User
            Enumerable.from(userByDate).forEach(function (row) {
                var name = row.key[1];

                var newUser = Enumerable.from(zpos.employees).firstOrDefault(function (user) {
                    return user.name == name;
                });
                if (newUser) {
                    newUser.total = roundValue(newUser.total + row.value);
                    newUser.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value)
                    });
                } else {
                    newUser = {
                        name: name,
                        byDate: [],
                        total: roundValue(row.value)
                    };
                    newUser.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value)
                    });
                    zpos.employees.push(newUser);
                }
            });

            // Total by Tax and by date
            Enumerable.from(taxByDate).forEach(function (row) {

                var taxCode = row.key[1];

                var newTax = Enumerable.from(zpos.taxDetails).firstOrDefault(function (tax) {
                    return tax.taxCode == taxCode;
                });
                if (newTax) {
                    newTax.total = roundValue(newTax.total + row.value);
                    newTax.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value)
                    });

                } else {
                    newTax = {
                        taxCode: taxCode,
                        byDate: [],
                        total: roundValue(row.value)
                    };
                    newTax.byDate.push({
                        date: row.key[0],
                        total: roundValue(row.value)
                    });
                    zpos.taxDetails.push(newTax);
                }

            });

            // Total by number of diner and by date
            Enumerable.from(cutleriesByDate).forEach(function (row) {
                zpos.cutleries.count += row.value;
                zpos.cutleries.byDate.push({
                    date: row.key,
                    count: row.value
                });
            });

            // Total of credit note by date
            Enumerable.from(creditByDate).forEach(function (row) {
                zpos.credit.total = roundValue(zpos.credit.total + row.value);
                zpos.credit.byDate.push({
                    date: row.key,
                    total: roundValue(row.value)
                });
            });

            // Total of repaid cash by date
            Enumerable.from(repaidByDate).forEach(function (row) {
                zpos.repaid.total = roundValue(zpos.repaid.total + row.value);
                zpos.repaid.byDate.push({
                    date: row.key,
                    total: roundValue(row.value)
                });
            });


            // List of all alias, by date
            Enumerable.from(hidByDate).forEach(function (row) {
                zpos.hid.byDate.push({
                    date: row.key,
                });
            });

            zpos.totalET = roundValue(zpos.totalET);
            zpos.totalIT = roundValue(zpos.totalIT);

            zpos.totalsByDate = roundValue(zpos.totalsByDate);
            zposDefer.resolve(zpos);
        };
        //#endregion

        var createZPos_v2 = function (zposDefer, startDate, endDate, taxByPeriod, paymentModesByPeriod, balanceByPeriod, repaidByPeriod, countByPeriod, cutleriesByPeriod, creditByPeriod, deliveryTypeByPeriod, userByPeriod) {
            console.log('Balance : ', balanceByPeriod);
            console.log('PM : ', paymentModesByPeriod);
            console.log('Tax : ', taxByPeriod);
            var zpos = {
                dateDebPeriode: startDate,
                dateFinPeriode: endDate,
                editionDate: new Date().toString('dd/MM/yyyy H:mm:ss'),
                totalIT: 0,
                totalET: 0,
                count: 0,
                totalsByPeriod: [],//{date,totalIT,totalET,count}
                paymentModes: [], //{type,total/date[],total}
                deliveryValues: [], //{type,total/date[],total}
                employees: [], //{nom,total/date[],total}
                taxDetails: [], //{taxcode,total/date[],total}
                balance: {
                    total: 0,
                    byPeriod: []
                },
                cutleries: {
                    count: 0,
                    byPeriod: []
                },
                credit: {
                    total: 0,
                    byPeriod: []

                },
                repaid: {
                    total: 0,
                    byPeriod: []
                }
            };

            // Total by period
            countByPeriod.sort(function (a, b) {
                return new Date(a.period.start) - new Date(b.period.start);
            });
            Enumerable.from(countByPeriod).forEach(function (row) {
                var newLine = {
                    id: row.key[2],
                    hid: row.key[1],
                    start: row.period.start,
                    end: row.period.end,
                    totalIT: roundValue(row.value.TotalIT),
                    totalET: roundValue(row.value.TotalET),
                    count: row.value.Count
                };
                zpos.totalsByPeriod.push(newLine);
                zpos.totalIT = roundValue(zpos.totalIT + newLine.totalIT);
                zpos.totalET = roundValue(zpos.totalET + newLine.totalET);
                zpos.count += newLine.count;


            });

            // Total by payment modes and by period
            Enumerable.from(paymentModesByPeriod).forEach(function (row) {
                var type = row.key[3];
                var type_id = row.key[4];

                var newPM = Enumerable.from(zpos.paymentModes).firstOrDefault(function (pm) {
                    return pm.type == type;
                });
                if (newPM) {
                    newPM.total = roundValue(newPM.total + row.value.Total);
                    newPM.count += row.value.Count;
                    newPM.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value.Total),
                        count: row.value.Count
                    });

                } else {
                    newPM = {
                        type: type,
                        type_id: type_id,
                        byPeriod: [],
                        total: roundValue(row.value.Total),
                        count: row.value.Count
                    };
                    newPM.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value.Total),
                        count: row.value.Count
                    });

                    newPM.total = roundValue(newPM.total);
                    zpos.paymentModes.push(newPM);
                }

            });


            Enumerable.from(balanceByPeriod).forEach(function (row) {
                zpos.balance.total += row.value;
                zpos.balance.byPeriod.push({
                    start: row.period.start,
                    end: row.period.end,
                    total: row.value
                });
            });

            // Total by delivery type and by date
            Enumerable.from(deliveryTypeByPeriod).forEach(function (row) {
                var type = row.key[3];

                var newDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (del) {
                    return del.type == type;
                });
                if (newDelivery) {
                    newDelivery.total = roundValue(newDelivery.total + row.value);
                    newDelivery.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value)
                    });

                } else {
                    newDelivery = {
                        type: type,
                        byPeriod: [],
                        total: roundValue(row.value)
                    };
                    newDelivery.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value)
                    });
                    zpos.deliveryValues.push(newDelivery);
                }

            });

            // Total by Pos User
            Enumerable.from(userByPeriod).forEach(function (row) {
                var name = row.key[3];

                var newUser = Enumerable.from(zpos.employees).firstOrDefault(function (user) {
                    return user.name == name;
                });
                if (newUser) {
                    newUser.total = roundValue(newUser.total + row.value);
                    newUser.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value)
                    });
                } else {
                    newUser = {
                        name: name,
                        byPeriod: [],
                        total: roundValue(row.value)
                    };
                    newUser.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value)
                    });
                    zpos.employees.push(newUser);
                }
            });

            // Total by Tax and by date
            Enumerable.from(taxByPeriod).forEach(function (row) {

                var taxCode = row.key[3];

                var newTax = Enumerable.from(zpos.taxDetails).firstOrDefault(function (tax) {
                    return tax.taxCode == taxCode;
                });
                if (newTax) {
                    newTax.total = roundValue(newTax.total + row.value);
                    newTax.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value)
                    });

                } else {
                    newTax = {
                        taxCode: taxCode,
                        byPeriod: [],
                        total: roundValue(row.value)
                    };
                    newTax.byPeriod.push({
                        start: row.period.start,
                        end: row.period.end,
                        total: roundValue(row.value)
                    });
                    zpos.taxDetails.push(newTax);
                }

            });

            // Total by number of diner and by date
            Enumerable.from(cutleriesByPeriod).forEach(function (row) {
                zpos.cutleries.count += row.value;
                zpos.cutleries.byPeriod.push({
                    start: row.period.start,
                    end: row.period.end,
                    count: row.value

                });
            });

            // Total of credit note by date
            Enumerable.from(creditByPeriod).forEach(function (row) {
                zpos.credit.total = roundValue(zpos.credit.total + row.value);
                zpos.credit.byPeriod.push({
                    start: row.period.start,
                    end: row.period.end,
                    total: roundValue(row.value)
                });
            });

            // Total of repaid cash by date
            Enumerable.from(repaidByPeriod).forEach(function (row) {
                zpos.repaid.total = roundValue(zpos.repaid.total + row.value);
                zpos.repaid.byPeriod.push({
                    start: row.period.start,
                    end: row.period.end,
                    total: roundValue(row.value)
                });
            });


            zpos.totalET = roundValue(zpos.totalET);
            zpos.totalIT = roundValue(zpos.totalIT);

            //zpos.totalsByPeriod = roundValue(zpos.totalsByPeriod);
            zposDefer.resolve(zpos);
        };


        this.getZPosValuesAsync_v2 = function (ZPeriodId, YPeriodId, HardwareId) {
            var zposDefer = $q.defer();

            if ($rootScope.remoteDbZPos) {

                // Il faut retourner :
                // Les dates du Zperiod si il est renseigné
                // Les date du Yperiod si il est renseigné

                var zpid = ZPeriodId != undefined ? ZPeriodId : {};
                var ypid = YPeriodId != undefined ? YPeriodId : {};
                var hid = HardwareId != undefined ? HardwareId : {};


                //var zpid = {};
                //var ypid = {};
                //var hid = {};

                var dbStartKey = [];
                var dbEndKey = [];

                var bsk = [];
                var bek = [];

                //Genere les startkey et endkey en fonction des parametre existant
                if (!jQuery.isEmptyObject(zpid)) {
                    dbStartKey.push(zpid);
                    dbEndKey.push(zpid);

                    bsk.push(zpid);
                    bek.push(zpid);

                    if (!jQuery.isEmptyObject(hid)) {
                        dbStartKey.push(hid);
                        dbEndKey.push(hid);

                        if (!jQuery.isEmptyObject(ypid)) {
                            dbStartKey.push(ypid);
                            dbEndKey.push(ypid);

                            bsk.push(ypid);
                            bek.push(ypid);

                        } else {
                            dbEndKey.push({}); // ypid

                            bek.push({});

                        }
                    } else {

                        dbEndKey.push({}); // hid
                        dbEndKey.push({}); // ypid

                        bek.push({});
                    }
                }

                console.log(dbStartKey);
                console.log(dbEndKey);
                // Obtains all VAT
                $rootScope.remoteDbZPos.query("zpos/TaxByPeriod", {
                    startkey: dbStartKey,
                    endkey: dbEndKey.concat([{}]),
                    reduce: true,
                    group: true
                }).then(function (resTaxByPeriod) {
                    var taxByPeriod = resTaxByPeriod.rows;
                    Enumerable.from(taxByPeriod).forEach(function (tp) {
                        posPeriodService.getDateYPeriodAsync(tp.key[0], tp.key[2]).then(function (dates) {
                            tp.period = dates;
                        });
                    });

                    // Obtains all paymentModes
                    $rootScope.remoteDbZPos.query("zpos/paymentModesByPeriod", {
                        startkey: dbStartKey,
                        endkey: dbEndKey.concat([{}, {}]),
                        reduce: true,
                        group: true
                    }).then(function (resPM) {

                        var paymentModesByPeriod = resPM.rows;
                        Enumerable.from(paymentModesByPeriod).forEach(function (pp) {
                            posPeriodService.getDateYPeriodAsync(pp.key[0], pp.key[2]).then(function (dates) {
                                pp.period = dates;
                            });
                        });

                        // Obtains  thetotal repaid per date and substract from "especes"
                        $rootScope.remoteDbZPos.query("zpos/repaidByPeriod", {
                            startkey: dbStartKey,
                            endkey: dbEndKey,
                            reduce: true,
                            group: true
                        }).then(function (resRepaid) {
                            var repaidByPeriod = resRepaid.rows;

                            Enumerable.from(repaidByPeriod).forEach(function (rp) {
                                posPeriodService.getDateYPeriodAsync(rp.key[0], rp.key[2]).then(function (dates) {
                                    rp.period = dates;
                                });
                            });


                            // Obtains number of shoppingcart and totals
                            $rootScope.remoteDbZPos.query("zpos/countByPeriod", {
                                startkey: dbStartKey,
                                endkey: dbEndKey,
                                reduce: true,
                                group: true
                            }).then(function (resCount) {
                                var countByPeriod = resCount.rows;
                                Enumerable.from(countByPeriod).forEach(function (cp) {
                                    posPeriodService.getDateYPeriodAsync(cp.key[0], cp.key[2]).then(function (dates) {
                                        cp.period = dates;
                                    });
                                });

                                // Obtains number of cutleries
                                $rootScope.remoteDbZPos.query("zpos/cutleriesByPeriod", {
                                    startkey: dbStartKey,
                                    endkey: dbEndKey,
                                    reduce: true,
                                    group: true
                                }).then(function (resCutleries) {
                                    var cutleriesByPeriod = resCutleries.rows;
                                    Enumerable.from(cutleriesByPeriod).forEach(function (cp) {
                                        posPeriodService.getDateYPeriodAsync(cp.key[0], cp.key[2]).then(function (dates) {
                                            cp.period = dates;
                                        });
                                    });

                                    $rootScope.remoteDbZPos.query("zpos/creditByPeriod", {
                                        startkey: dbStartKey,
                                        endkey: dbEndKey,
                                        reduce: true,
                                        group: true
                                    }).then(function (resCredit) {
                                        var creditByPeriod = resCredit.rows;
                                        Enumerable.from(creditByPeriod).forEach(function (cp) {
                                            posPeriodService.getDateYPeriodAsync(cp.key[0], cp.key[2]).then(function (dates) {
                                                cp.period = dates;
                                            });
                                        });

                                        // Obtains deliveries
                                        $rootScope.remoteDbZPos.query("zpos/DeliveryTypeByPeriod", {
                                            startkey: dbStartKey,
                                            endkey: dbEndKey.concat([{}]),
                                            reduce: true,
                                            group: true
                                        }).then(function (resDeliveryType) {
                                            var deliveryTypeByPeriod = resDeliveryType.rows;
                                            Enumerable.from(deliveryTypeByPeriod).forEach(function (dp) {
                                                posPeriodService.getDateYPeriodAsync(dp.key[0], dp.key[2]).then(function (dates) {
                                                    dp.period = dates;
                                                });
                                            });

                                            // Obtains totalByEmployees
                                            $rootScope.remoteDbZPos.query("zpos/userByPeriod", {
                                                startkey: dbStartKey,
                                                endkey: dbEndKey.concat([{}]),
                                                reduce: true,
                                                group: true
                                            }).then(function (resUser) {
                                                var userByPeriod = resUser.rows;
                                                Enumerable.from(userByPeriod).forEach(function (up) {
                                                    posPeriodService.getDateYPeriodAsync(up.key[0], up.key[2]).then(function (dates) {
                                                        up.period = dates;
                                                    });
                                                });
                                                // Obtains totalByEmployees
                                                $rootScope.remoteDbZPos.query("zpos/balanceByPeriod", {
                                                    startkey: bsk,
                                                    endkey: bek,
                                                    reduce: true,
                                                    group: true
                                                }).then(function (resBalance) {
                                                    var balanceByPeriod = resBalance.rows;
                                                    Enumerable.from(balanceByPeriod).forEach(function (bp) {
                                                        posPeriodService.getDateYPeriodAsync(bp.key[0], bp.key[1]).then(function (dates) {
                                                            bp.period = dates;
                                                        });
                                                    });


                                                    var startDate = [];
                                                    var endDate = [];

                                                    posPeriodService.getYperiodFromZperiodAsync(zpid).then(function (yp) {
                                                        if (yp) {
                                                            Enumerable.from(yp).forEach(function (yPeriod) {
                                                                startDate.push(yPeriod.startDate);
                                                                endDate.push(yPeriod.endDate);
                                                            })
                                                        }

                                                        posPeriodService.getAllYPeriodAsync(hid).then(function (yp) {
                                                            if (yp) {
                                                                startDate = [];
                                                                endDate = [];
                                                                Enumerable.from(yp).forEach(function (yPeriod) {
                                                                    startDate.push(yPeriod.startDate);
                                                                    endDate.push(yPeriod.endDate);
                                                                })
                                                            }
                                                            createZPos_v2(zposDefer, startDate, endDate, taxByPeriod, paymentModesByPeriod, balanceByPeriod, repaidByPeriod, countByPeriod, cutleriesByPeriod, creditByPeriod, deliveryTypeByPeriod, userByPeriod);


                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } else {
                zposDefer.resolve();
            }

            return zposDefer.promise;
        };


        /**
         * Get Zpos values from couchDb
         * @param dateStartObj
         * @param dateEndObj
         */
        this.getZPosValuesAsync = function (dateStartObj, dateEndObj) {
            var zposDefer = $q.defer();

            if ($rootScope.remoteDbZPos) {

                var dateStart = dateStartObj != undefined ? dateStartObj.toString("yyyyMMdd") : undefined;
                var dateEnd = dateEndObj != undefined ? dateEndObj.toString("yyyyMMdd") : dateStart;

                // Obtains all VAT
                $rootScope.remoteDbZPos.query("zpos/TaxByDate", {
                    startkey: [dateStart],
                    endkey: [dateEnd, {}],
                    reduce: true,
                    group: true
                }).then(function (resTaxByDate) {
                    var taxByDate = resTaxByDate.rows;

                    // Obtains all paymentModes
                    $rootScope.remoteDbZPos.query("zpos/paymentModesByDate", {
                        startkey: [dateStart],
                        endkey: [dateEnd, {}],
                        reduce: true,
                        group: true
                    }).then(function (resPM) {
                        var paymentModesByDate = resPM.rows;

                        // Obtains  thetotal repaid per date and substract from "especes"
                        $rootScope.remoteDbZPos.query("zpos/repaidByDate", {
                            startkey: dateStart,
                            endkey: dateEnd,
                            reduce: true,
                            group: true
                        }).then(function (resRepaid) {
                            var repaidByDate = resRepaid.rows;

                            // Obtains number of shoppingcart and totals
                            $rootScope.remoteDbZPos.query("zpos/countByDate", {
                                startkey: dateStart,
                                endkey: dateEnd,
                                reduce: true,
                                group: true
                            }).then(function (resCount) {
                                var countByDate = resCount.rows;

                                // Obtains number of cutleries
                                $rootScope.remoteDbZPos.query("zpos/cutleriesByDate", {
                                    startkey: dateStart,
                                    endkey: dateEnd,
                                    reduce: true,
                                    group: true
                                }).then(function (resCutleries) {
                                    var cutleriesByDate = resCutleries.rows;

                                    $rootScope.remoteDbZPos.query("zpos/creditByDate", {
                                        startkey: dateStart,
                                        endkey: dateEnd,
                                        reduce: true,
                                        group: true
                                    }).then(function (resCredit) {
                                        var creditByDate = resCredit.rows;

                                        // Obtains deliveries
                                        $rootScope.remoteDbZPos.query("zpos/DeliveryTypeByDate", {
                                            startkey: [dateStart],
                                            endkey: [dateEnd, {}],
                                            reduce: true,
                                            group: true
                                        }).then(function (resDeliveryType) {
                                            var deliveryTypeByDate = resDeliveryType.rows;

                                            // Obtains totalByEmployees
                                            $rootScope.remoteDbZPos.query("zpos/userByDate", {
                                                startkey: [dateStart],
                                                endkey: [dateEnd, {}],
                                                reduce: true,
                                                group: true
                                            }).then(function (resUser) {
                                                var userByDate = resUser.rows;
                                                // Obtains balance update
                                                $rootScope.remoteDbZPos.query("zpos/balanceByDate", {
                                                    startkey: dateStart,
                                                    endkey: dateEnd,
                                                    reduce: true,
                                                    group: true
                                                }).then(function (resBalance) {
                                                    var balanceByDate = resBalance.rows;
                                                    createZPos(zposDefer, dateStart, dateEnd, taxByDate, paymentModesByDate, balanceByDate, repaidByDate, countByDate, cutleriesByDate, creditByDate, deliveryTypeByDate, userByDate);

                                                });

                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } else {
                zposDefer.resolve();
            }

            return zposDefer.promise;
        };
        this.createZPosHtml = function (zpos) {
            console.log(zpos);

            //#region Generate HTML printable
            var htmlLines = [];
            htmlLines.push("<center><strong>Statistiques</strong></center>");
            htmlLines.push("<br />")
            Enumerable.from($rootScope.IziBoxConfiguration.ShopName.split("\\r\\n")).forEach(function (part) {
                htmlLines.push("<center>" + part + "</center>");
            });
            //Alias de caisse ou HID
            if ($rootScope.modelPos.aliasCaisse) {
                htmlLines.push("<center>" + $rootScope.modelPos.aliasCaisse + "</center>");

            } else {
                htmlLines.push("<center>" + hardwareId + "</center>");
            }

            htmlLines.push("<br />");
            htmlLines.push("<center><strong>Du : " + Date.parseExact(zpos.dateStart, "yyyyMMdd").toString("dd/MM/yyyy") + (zpos.dateEnd != zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyyMMdd").toString("dd/MM/yyyy")) : "") + "</strong></center>");
            htmlLines.push("<br />");
            htmlLines.push("<center>Edité le : " + zpos.editionDate + "</center>");
            htmlLines.push("<br />");
            htmlLines.push("<hr />");

            htmlLines.push("<p><center><strong>Détail de la caisse :</strong></center></p>");
            htmlLines.push("<p><table>");

            //payment
            for (var idxPM = 0; idxPM < zpos.paymentModes.length; idxPM++) {
                htmlLines.push("<tr>");

                htmlLines.push("<td style='width:65%'>" + zpos.paymentModes[idxPM].type + " : </td>");

                htmlLines.push("<td style='width:10%;text-align:center'>" + zpos.paymentModes[idxPM].count + "</td>");

                if (zpos.paymentModes[idxPM].type.toUpperCase().indexOf("ESP") == 0) {
                    htmlLines.push("<td style='width:25%;text-align:right'>" + roundValue(String(zpos.paymentModes[idxPM].total - zpos.repaid.total).substring(0, 4)) + "</td>");
                }
                else {
                    htmlLines.push("<td style='width:25%;text-align:right'>" + zpos.paymentModes[idxPM].total + "</td>");
                }

                htmlLines.push("</tr>");
            }

            htmlLines.push("</table></p>");
            htmlLines.push("<br />");
            htmlLines.push("<p>Cagnotte : " + roundValue(zpos.balance.total) + "</p>");
            htmlLines.push("<br />");
            htmlLines.push("<p>Rendu : -" + zpos.repaid.total + "</p>");
            htmlLines.push("<br />");
            htmlLines.push("<p>Avoir émis : -" + zpos.credit.total + "</p>");
            htmlLines.push("<br />");
            //Total payment
            htmlLines.push("<p>Recette :</p>");
            htmlLines.push("<p>    TTC : " + zpos.totalIT + "</p>");
            htmlLines.push("<p>    HT  : " + zpos.totalET + "</p>");

            htmlLines.push("<br />");

            htmlLines.push("<p>Nb couverts : " + zpos.cutleries.count + "</p>");

            htmlLines.push("<br />");

            var lineForHere = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.FORHERE;
            });
            var lineTakeOut = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.TAKEOUT;
            });
            var lineDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.DELIVERY;
            });
            var valueForHere = lineForHere ? lineForHere.total : 0;
            var valueTakeOut = lineTakeOut ? lineTakeOut.total : 0;
            var valueDelivery = lineDelivery ? lineDelivery.total : 0;

            htmlLines.push("<p>Dont (TTC) :</p>");
            htmlLines.push("<p>    Sur place  : " + valueForHere.toString() + "</p>");
            htmlLines.push("<p>    Emporté    : " + valueTakeOut.toString() + "</p>");
            htmlLines.push("<p>    Livré      : " + valueDelivery.toString() + "</p>");

            htmlLines.push("<br />");

            Enumerable.from(zpos.taxDetails).forEach(function (tax) {
                htmlLines.push("<p>" + tax.taxCode + " : " + roundValue(String(tax.total).substring(0, 4)) + "</p>");
            });

            if (zpos.employees && zpos.employees.length > 0) {
                htmlLines.push("<br />");
                htmlLines.push("<p>Par employés (TTC) :</p>");
                Enumerable.from(zpos.employees).forEach(function (employee) {
                    htmlLines.push("<p>  " + employee.name + " : " + employee.total + "</p>");
                });
            }

            htmlLines.push("<br />");
            htmlLines.push("<br />");
            htmlLines.push("<cut>");
            htmlLines.push("</cut>");
            //#endregion

            var html = htmlLines.join("");

            return html;
        };


        /**
         * Format a zpos for emailing / printing
         * @param zpos Raw zpos
         * @param printY : bool that indicate if we print the Y or not
         * @returns {string} The HTML formatted zpos
         */
        this.createZPosHtml_v2 = function (zpos, printY) {
            console.log(zpos);
            //#region Generate HTML printable
            var htmlLines = [];
            // If printY, on boucle dans la fonction autant de fois qu'il y a de Y
            // avant d'imprimer le Z
            if (printY) {
                Enumerable.from(zpos.totalsByPeriod).forEach(function (y) {
                    htmlLines.push("<center><strong>Service</strong></center>");
                    htmlLines.push("<br />");
                    Enumerable.from($rootScope.IziBoxConfiguration.ShopName.split("\\r\\n")).forEach(function (part) {
                        htmlLines.push("<center>" + part + "</center>");
                    });

                    //Alias de caisse ou HID
                    if (y.alias) {
                        htmlLines.push("<center>" + y.alias + "</center>");

                    } else {
                        htmlLines.push("<center>" + y.hid + "</center>");
                    }

                    htmlLines.push("<br />");
                    htmlLines.push("<center><strong> Pour la periode :</strong></center>");

                    var dateStartDisp = dateFormat(y.start);
                    if (y.end) {
                        var dateEndDisp = dateFormat(y.end);
                    }


                    htmlLines.push("<center><strong>Du : " + dateStartDisp + (y.end ? (" au " + dateEndDisp) : "") + "</strong></center>");

                    // Imprimer une ligne pour chaque periode, renseignant sa date
                    //htmlLines.push("<center><strong>Du : " + Date.parseExact(zpos.dateStart, "yyyyMMdd").toString("dd/MM/yyyy") + (zpos.dateEnd != zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyyMMdd").toString("dd/MM/yyyy")) : "") + "</strong></center>");
                    htmlLines.push("<br />");
                    htmlLines.push("<center>Edité le : " + zpos.editionDate + "</center>");
                    htmlLines.push("<br />");
                    htmlLines.push("<hr />");

                    htmlLines.push("<p><center><strong>Détail de la caisse :</strong></center></p>");
                    htmlLines.push("<p><table>");

                    //payment
                    for (var idxPM = 0; idxPM < zpos.paymentModes.length; idxPM++) {
                        var matchRP = Enumerable.from(zpos.repaid.byPeriod).firstOrDefault(function (a) {
                            return a.start == y.start;
                        });

                        var matchPM = Enumerable.from(zpos.paymentModes[idxPM].byPeriod).firstOrDefault(function (a) {
                            return a.start == y.start;
                        });
                        if (matchPM) {
                            htmlLines.push("<tr>");

                            htmlLines.push("<td style='width:65%'>" + zpos.paymentModes[idxPM].type + " : </td>");
                            htmlLines.push("<td style='width:10%;text-align:center'>" + matchPM.count + "</td>");

                            if (zpos.paymentModes[idxPM].type_id == 1) {
                                htmlLines.push("<td style='width:25%;text-align:right'>" + roundValue(String(matchPM.total - matchRP.total).substring(0, 4)) + "</td>");
                            }
                            else {
                                htmlLines.push("<td style='width:25%;text-align:right'>" + matchPM.total + "</td>");
                            }

                            htmlLines.push("</tr>");
                        }
                    }

                    htmlLines.push("</table></p>");

                    var matchBL = Enumerable.from(zpos.balance.byPeriod).firstOrDefault(function (a) {
                        return a.start == y.start;
                    });
                    if (matchBL) {
                        htmlLines.push("<br />");
                        htmlLines.push("<p>Cagnotte : " + roundValue(matchBL.total) + "</p>");
                    }
                    htmlLines.push("<br />");
                    htmlLines.push("<p>Rendu : -" + matchRP.total + "</p>");
                    htmlLines.push("<br />");

                    //Utilise enumerable first or default pour match
                    // la periode actuelle avec la periode de credit a afficher
                    var matchCR = Enumerable.from(zpos.credit.byPeriod).firstOrDefault(function (a) {
                        return a.start == y.start;
                    });

                    if (matchCR) {
                        htmlLines.push("<p>Avoir émis : -" + matchCR.total + "</p>");
                    }

                    htmlLines.push("<br />");
                    //Total payment
                    htmlLines.push("<p>Recette :</p>");
                    htmlLines.push("<p>    TTC : " + y.totalIT + "</p>");
                    htmlLines.push("<p>    HT  : " + y.totalET + "</p>");

                    htmlLines.push("<br />");

                    var matchCTL = Enumerable.from(zpos.cutleries.byPeriod).firstOrDefault(function (a) {
                        return a.start == y.start;
                    });
                    if (matchCTL) {

                        htmlLines.push("<p>Nb couverts : " + matchCTL.count + "</p>");
                    }


                    htmlLines.push("<br />");
                    htmlLines.push("<p>Dont (TTC) :</p>");

                    var lineForHere = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                        return value.type == DeliveryTypes.FORHERE;
                    });
                    var lineTakeOut = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                        return value.type == DeliveryTypes.TAKEOUT;
                    });
                    var lineDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                        return value.type == DeliveryTypes.DELIVERY;
                    });

                    if (lineForHere) {
                        var matchForHere = Enumerable.from(lineForHere.byPeriod).firstOrDefault(function (a) {
                            return a.start == y.start;
                        });

                        var valueForHere = matchForHere ? matchForHere.total : 0;
                        htmlLines.push("<p>    Sur place  : " + valueForHere.toString() + "</p>");
                    }


                    if (lineTakeOut) {
                        var matchTakeOut = Enumerable.from(lineTakeOut.byPeriod).firstOrDefault(function (a) {
                            return a.start == y.start;
                        });

                        var valueTakeOut = matchTakeOut ? matchTakeOut.total : 0;
                        htmlLines.push("<p>    Emporté    : " + valueTakeOut.toString() + "</p>");
                    }


                    if (lineDelivery) {
                        var matchDelivery = Enumerable.from(lineDelivery.byPeriod).firstOrDefault(function (a) {
                            return a.start == y.start;
                        });
                        var valueDelivery = matchDelivery ? matchDelivery.total : 0;
                        htmlLines.push("<p>    Livré      : " + valueDelivery.toString() + "</p>");
                    }


                    htmlLines.push("<br />");
                    Enumerable.from(zpos.taxDetails).forEach(function (tax) {
                        var matchTax = Enumerable.from(tax.byPeriod).firstOrDefault(function (a) {
                            return a.start == y.start;
                        });
                        if (matchTax) {
                            htmlLines.push("<p>" + tax.taxCode + " : " + roundValue(String(matchTax.total).substring(0, 4)) + "</p>");
                        }
                    });

                    if (zpos.employees && zpos.employees.length > 0) {
                        htmlLines.push("<br />");
                        htmlLines.push("<p>Par employés (TTC) :</p>");
                        Enumerable.from(zpos.employees).forEach(function (employee) {
                            var matchEmployee = Enumerable.from(employee.byPeriod).firstOrDefault(function (a) {
                                return a.start == y.start;
                            });
                            if (matchEmployee) {
                                htmlLines.push("<p>" + employee.name + " : " + matchEmployee.total + "</p>");
                            }

                        });
                    }

                    htmlLines.push("<br />");
                    htmlLines.push("<br />");
                    htmlLines.push("<cut>");
                    htmlLines.push("</cut>");

                });
            }


            htmlLines.push("<center><strong>Z de caisse</strong></center>");
            htmlLines.push("<br />");
            Enumerable.from($rootScope.IziBoxConfiguration.ShopName.split("\\r\\n")).forEach(function (part) {
                htmlLines.push("<center>" + part + "</center>");
            });

            htmlLines.push("<br />");
            htmlLines.push("<center><strong> Pour les periodes :</strong></center>");
            Enumerable.from(zpos.totalsByPeriod).forEach(function (date) {
                var dateStartDisp = dateFormat(date.start);
                if (date.end) {
                    var dateEndDisp = dateFormat(date.end);
                }
                htmlLines.push("<center><strong>Du : " + dateStartDisp + (date.end ? (" au " + dateEndDisp) : "") + "</strong></center>");
            });
            // Imprimer une ligne pour chaque periode, renseignant sa date
            //htmlLines.push("<center><strong>Du : " + Date.parseExact(zpos.dateStart, "yyyyMMdd").toString("dd/MM/yyyy") + (zpos.dateEnd != zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyyMMdd").toString("dd/MM/yyyy")) : "") + "</strong></center>");
            htmlLines.push("<br />");
            htmlLines.push("<center>Edité le : " + zpos.editionDate + "</center>");
            htmlLines.push("<br />");
            htmlLines.push("<hr />");

            htmlLines.push("<p><center><strong>Détail de la caisse :</strong></center></p>");
            htmlLines.push("<p><table>");

            //payment
            for (var idxPM = 0; idxPM < zpos.paymentModes.length; idxPM++) {
                htmlLines.push("<tr>");

                htmlLines.push("<td style='width:65%'>" + zpos.paymentModes[idxPM].type + " : </td>");

                htmlLines.push("<td style='width:10%;text-align:center'>" + zpos.paymentModes[idxPM].count + "</td>");

                if (zpos.paymentModes[idxPM].type_id == 1) {
                    htmlLines.push("<td style='width:25%;text-align:right'>" + roundValue(String(zpos.paymentModes[idxPM].total - zpos.repaid.total).substring(0, 4)) + "</td>");
                }
                else {
                    htmlLines.push("<td style='width:25%;text-align:right'>" + zpos.paymentModes[idxPM].total + "</td>");
                }

                htmlLines.push("</tr>");
            }

            htmlLines.push("</table></p>");
            htmlLines.push("<br />");
            htmlLines.push("<p>Cagnotte : " + roundValue(zpos.balance.total) + "</p>");
            htmlLines.push("<br />");
            htmlLines.push("<p>Rendu : -" + zpos.repaid.total + "</p>");
            htmlLines.push("<br />");
            htmlLines.push("<p>Avoir émis : -" + zpos.credit.total + "</p>");
            htmlLines.push("<br />");
            //Total payment
            htmlLines.push("<p>Recette :</p>");
            htmlLines.push("<p>    TTC : " + zpos.totalIT + "</p>");
            htmlLines.push("<p>    HT  : " + zpos.totalET + "</p>");

            htmlLines.push("<br />");

            htmlLines.push("<p>Nb couverts : " + zpos.cutleries.count + "</p>");

            htmlLines.push("<br />");

            var lineForHere = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.FORHERE;
            });
            var lineTakeOut = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.TAKEOUT;
            });
            var lineDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) {
                return value.type == DeliveryTypes.DELIVERY;
            });
            var valueForHere = lineForHere ? lineForHere.total : 0;
            var valueTakeOut = lineTakeOut ? lineTakeOut.total : 0;
            var valueDelivery = lineDelivery ? lineDelivery.total : 0;

            htmlLines.push("<p>Dont (TTC) :</p>");
            htmlLines.push("<p>    Sur place  : " + valueForHere.toString() + "</p>");
            htmlLines.push("<p>    Emporté    : " + valueTakeOut.toString() + "</p>");
            htmlLines.push("<p>    Livré      : " + valueDelivery.toString() + "</p>");

            htmlLines.push("<br />");

            Enumerable.from(zpos.taxDetails).forEach(function (tax) {
                htmlLines.push("<p>" + tax.taxCode + " : " + roundValue(String(tax.total).substring(0, 4)) + "</p>");
            });

            if (zpos.employees && zpos.employees.length > 0) {
                htmlLines.push("<br />");
                htmlLines.push("<p>Par employés (TTC) :</p>");
                Enumerable.from(zpos.employees).forEach(function (employee) {
                    htmlLines.push("<p>  " + employee.name + " : " + employee.total + "</p>");
                });
            }

            htmlLines.push("<br />");
            htmlLines.push("<br />");
            htmlLines.push("<cut>");
            htmlLines.push("</cut>");
            //#endregion

            var html = htmlLines.join("");
            return html;
        };

        /**
         *
         * Print the zpos
         * @param zpos
         * @param type : 0 = date to date, 1 = Yperiod
         * @param printY
         */

        this.printZPosAsync = function (zpos, type, printY = false) {
            // type : 0 = zpos date a date
            //        1 = zpos period

            var printDefer = $q.defer();

            if (type == 0) {

                var html = this.createZPosHtml(zpos);
            }

            if (type == 1) {

                var html = this.createZPosHtml_v2(zpos, printY);
            }


            //print
            var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printhtml";
            console.log("PrinterApiUrl : " + printerApiUrl);

            var htmlPrintReq = {
                PrinterIdx: $rootScope.PrinterConfiguration.POSPrinter,
                Html: html
            };

            // Simple POST request example (passing data) :

            $http.post(printerApiUrl, htmlPrintReq, {timeout: 10000}).success(function () {
                printDefer.resolve(true);
            }).error(function () {
                printDefer.reject("Print error");
            });

            return printDefer.promise;


        };

        /**
         * Send zpos by mail using the rest servicen
         * @param zpos
         */
        this.emailZPosAsync = function (zpos, isPeriod = false, printY = false) {
            console.log(zpos);
            var emailDefer = $q.defer();
            if(!isPeriod){
                var html = this.createZPosHtml(zpos);
            } else {
                var html = this.createZPosHtml_v2(zpos, printY);
            }


            //email
            var emailApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/emailhtml";
            console.log("EmailApiUrl : " + emailApiUrl);

            //Erreur
            if(!isPeriod){
                var subject = "Z Du : " + Date.parseExact(zpos.dateStart, "yyyyMMdd").toString("dd/MM/yyyy") + (zpos.dateEnd != zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyyMMdd").toString("dd/MM/yyyy")) : "");

            } else {
                var subject = "Z de periodes";
            }


            //prettyZpos(html);

            var htmlEmailReq = {
                Subject: subject,
                Html: html
            };


            $http.post(emailApiUrl, htmlEmailReq, {timeout: 10000}).success(function () {
                emailDefer.resolve(true);
            }).error(function () {
                emailDefer.reject("Email error");
            });


            return emailDefer.promise;
        };
    }]);