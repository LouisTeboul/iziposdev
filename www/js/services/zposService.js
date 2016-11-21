app.service('zposService', ['$http', '$rootScope', '$q', 'posLogService',
    function ($http, $rootScope, $q, posLogService) {
    	var current = this;
    	var hardwareId = undefined;

    	this.init = function () {
    		posLogService.getHardwareIdAsync().then(function (hId) {
    			hardwareId = hId;
    		});
    	}

    	this.getAllShoppingCartsAsync = function (dateStart, dateEnd) {
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
    				return item;
    			}).toArray();
    			allShoppingCartsDefer.resolve(allShoppingCarts);
    		}, function (errGet) {
    			allShoppingCartsDefer.reject(errGet);
    		});


    		return allShoppingCartsDefer.promise;
    	}

    	this.getPaymentValuesAsync = function () {
    		var paymentValuesDefer = $q.defer();

    		var db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;

    		db.rel.find('PaymentValues', hardwareId).then(function (resPaymentValues) {
    			var paymentValues = Enumerable.from(resPaymentValues.AllPaymentValues).firstOrDefault();

    			if (paymentValues) {
    				$rootScope.CashOpen = true;
    			}

    			paymentValuesDefer.resolve(paymentValues);
    		}, function (errPV) {
    			paymentValuesDefer.reject(errPV);
    		});


    		return paymentValuesDefer.promise;
    	}

    	this.updatePaymentValuesAsync = function (newPaymentValues, oldPaymentValues) {
    		var updateDefer = $q.defer();

    		this.getPaymentValuesAsync().then(function (paymentValues) {

    			if (!paymentValues) {
    				paymentValues = {
    					HardwareId: hardwareId,
    					id: hardwareId
    				};
    			}

    			paymentValues.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

    			if (!paymentValues.PaymentLines) {
    				paymentValues.PaymentLines = [];
    			}

    			if (oldPaymentValues) {
    				Enumerable.from(oldPaymentValues).forEach(function (p) {
    					var line = Enumerable.from(paymentValues.PaymentLines).firstOrDefault(function (l) {
    						return l.PaymentMode.Value == p.Value && l.PaymentMode.PaymentType == p.PaymentType;
    					});

    					if (line) {
    						line.Count = line.Count - 1;
    						line.PaymentMode.Total = roundValue(line.PaymentMode.Total - p.Total);
    						if (line.Count == 0) {
    							var idxLine = paymentValues.PaymentLines.indexOf(line);
    							if (idxLine != -1) {
    								paymentValues.PaymentLines.splice(idxLine, 1);
    							}
    						}
    					}
    				});
    			}

    			if (newPaymentValues) {
    				Enumerable.from(newPaymentValues).forEach(function (p) {
    					var line = Enumerable.from(paymentValues.PaymentLines).firstOrDefault(function (l) {
    						return l.PaymentMode.Value == p.Value && l.PaymentMode.PaymentType == p.PaymentType;
    					});

    					if (line) {
    						line.Count = line.Count + 1;
    						line.PaymentMode.Total = roundValue(line.PaymentMode.Total + p.Total);
    					} else {
    						line = {
    							Count: 1,
    							PaymentMode: clone(p)
    						}

    						paymentValues.PaymentLines.push(line);
    					}
    				});
    			}

    			$rootScope.dbZPos.rel.save('PaymentValues', paymentValues).then(function () {
    				updateDefer.resolve(paymentValues);
    			}, function (errSave) {
    				updateDefer.reject(errSave);
    			});

    		}, function (errPV) {
    			updateDefer.reject(errPV);
    		});

    		return updateDefer.promise;
    	}

        //Suppression du ZPOS
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
    								current.getPaymentValuesAsync().then(function (paymentValues) {
    									if (paymentValues) {
    										$rootScope.dbZPos.rel.del('PaymentValues', { id: paymentValues.id, rev: paymentValues.rev });
    										$rootScope.CashOpen = false;
    									}
    								});

    								purgeAllFuncDefer.resolve();
    							}
    						}

    						delDoc(0);

    					}, function (err) {
    						purgeAllFuncDefer.resolve();
    					});

    					return purgeAllFuncDefer.promise;
    				}

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
                            			current.getPaymentValuesAsync().then(function (paymentValues) {
                            				if (paymentValues) {
                            					db.rel.del('PaymentValues', { id: paymentValues.id, rev: paymentValues.rev });
                            					$rootScope.CashOpen = false;
                            				}
                            			});

                            			purgeDateFuncDefer.resolve();
                            		}
                            	}

                            	delDoc(0);

                            }, function (errGet) {
                            	purgeDateFuncDefer.resolve();
                            });
    				}

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

    	}

        //#Création zpos
    	var createZPos = function (zposDefer,dateStart,dateEnd, taxByDate, paymentModesByDate, repaidByDate, countByDate, cutleriesByDate,creditByDate, deliveryTypeByDate, userByDate) {

    	    var zpos = {
    	        dateStart: dateStart,
    	        dateEnd: dateEnd,
    	        editionDate: new Date().toString('dd/MM/yyyy H:mm:ss'),
    	        totalIT: 0,
    	        totalET: 0,
    	        count: 0,
    	        totalsByDate:[],//{date,totalIT,totalET,count}
    	        paymentModes:[], //{type,total/date[],total}
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
                    byDate:[]
    	        } 

    	    };

    	    Enumerable.from(countByDate).forEach(function (row) {
    	        var newLine = {
    	            date: row.key,
    	            totalIT: row.value.TotalIT,
    	            totalET: row.value.TotalET,
                    count: row.value.Count
    	        }
    	        zpos.totalsByDate.push(newLine);
    	        zpos.totalIT += newLine.totalIT;
    	        zpos.totalET += newLine.totalET;
    	        zpos.count += newLine.count;
    	    });

    	    Enumerable.from(paymentModesByDate).forEach(function(row){
    	        var type = row.key[1];

    	        var newPM = Enumerable.from(zpos.paymentModes).firstOrDefault(function (pm) { return pm.type == type; });
    	        if (newPM) {
    	            newPM.total += row.value.Total;
    	            newPM.count += row.value.Count;
    	            newPM.byDate.push({
    	                date: row.key[0],
    	                total: row.value.Total,
    	                count: row.value.Count
    	            });

    	        } else {
    	            newPM = {
    	                type: type,
    	                byDate: [],
    	                total: row.value.Total,
                        count: row.value.Count
    	            }
    	            newPM.byDate.push({
    	                date: row.key[0],
    	                total: row.value.Total,
                        count: row.value.Count
    	            });
    	            zpos.paymentModes.push(newPM);
    	        }

    	    });

    	    Enumerable.from(deliveryTypeByDate).forEach(function (row) {
    	        var type = row.key[1];

    	        var newDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (del) { return del.type == type; });
    	        if (newDelivery) {
    	            newDelivery.total += row.value;
    	            newDelivery.byDate.push({
    	                date: row.key[0],
    	                total: row.value
    	            });

    	        } else {
    	            newDelivery = {
    	                type: type,
    	                byDate: [],
    	                total: row.value
    	            }
    	            newDelivery.byDate.push({
    	                date: row.key[0],
    	                total: row.value
    	            });
    	            zpos.deliveryValues.push(newDelivery);
    	        }

    	    });

    	    Enumerable.from(userByDate).forEach(function (row) {
    	        var name = row.key[1];

    	        var newUser = Enumerable.from(zpos.employees).firstOrDefault(function (user) { return user.name == name; });
    	        if (newUser) {
    	            newUser.total += row.value;
    	            newUser.byDate.push({
    	                date: row.key[0],
    	                total: row.value
    	            });

    	        } else {
    	            newUser = {
    	                name: name,
    	                byDate: [],
    	                total: row.value
    	            }
    	            newUser.byDate.push({
    	                date: row.key[0],
    	                total: row.value
    	            });
    	            zpos.employees.push(newUser);
    	        }

    	    });

    	    Enumerable.from(taxByDate).forEach(function (row) {
    	        var taxCode = row.key[1];

    	        var newTax = Enumerable.from(zpos.taxDetails).firstOrDefault(function (tax) { return tax.taxCode == taxCode; });
    	        if (newTax) {
    	            newTax.total += row.value;
    	            newTax.byDate.push({
    	                date: row.key[0],
    	                total: row.value
    	            });

    	        } else {
    	            newTax = {
    	                taxCode: taxCode,
    	                byDate: [],
    	                total: row.value
    	            }
    	            newTax.byDate.push({
    	                date: row.key[0],
    	                total: row.value
    	            });
    	            zpos.taxDetails.push(newTax);
    	        }

    	    });

    	    Enumerable.from(cutleriesByDate).forEach(function (row) {
    	        zpos.cutleries.count += row.value;
    	        zpos.cutleries.byDate.push({
    	            date: row.key,
                    count: row.value
    	        });
    	    });

    	    Enumerable.from(creditByDate).forEach(function (row) {
    	        zpos.credit.total += row.value;
    	        zpos.credit.byDate.push({
    	            date: row.key,
    	            total: row.value
    	        });
    	    });

    	    Enumerable.from(repaidByDate).forEach(function (row) {
    	        zpos.repaid.total += row.value;
    	        zpos.repaid.byDate.push({
    	            date: row.key,
    	            total: row.value
    	        });
    	    });

    	    zposDefer.resolve(zpos);
    	}
        //#endregion
    	this.getZPosValuesAsync = function (dateStartObj, dateEndObj) {
    		var zposDefer = $q.defer();

    		if ($rootScope.remoteDbZPos) {

    			var dateStart = dateStartObj != undefined ? dateStartObj.toString("yyyyMMdd") : undefined;
    			var dateEnd = dateEndObj != undefined ? dateEndObj.toString("yyyyMMdd") : dateStart;

    			//obtains all VAT
    		    $rootScope.remoteDbZPos.query("zpos/TaxByDate", {
    		        startkey: [dateStart],
    		        endkey: [dateEnd, {}],
    				reduce: true,
    				group: true
    			}).then(function (resTaxByDate) {
    			    var taxByDate = resTaxByDate.rows;

    				//obtains all paymentModes
    				$rootScope.remoteDbZPos.query("zpos/paymentModesByDate", {
    					startkey: [dateStart],
    					endkey: [dateEnd, {}],
    					reduce: true,
    					group: true
    				}).then(function (resPM) {

    				    var paymentModesByDate = resPM.rows;

    				    //obtains  thetotal repaid per date and substract from "especes"
    				    $rootScope.remoteDbZPos.query("zpos/repaidByDate", {
    				        startkey: dateStart,
    				        endkey: dateEnd,
    				        reduce: true,
    				        group: true
    				    }).then(function (resRepaid) {
    				        var repaidByDate = resRepaid.rows;

    				        //obtains number of shoppingcart and totals
    				        $rootScope.remoteDbZPos.query("zpos/countByDate", {
    				            startkey: dateStart,
    				            endkey: dateEnd,
    				            reduce: true,
    				            group: true
    				        }).then(function (resCount) {
    				            var countByDate = resCount.rows;

    				            //obtains number of cluteries
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

    				                    //obtains deliveries
    				                    $rootScope.remoteDbZPos.query("zpos/DeliveryTypeByDate", {
    				                        startkey: [dateStart],
    				                        endkey: [dateEnd, {}],
    				                        reduce: true,
    				                        group: true
    				                    }).then(function (resDeliveryType) {
    				                        var deliveryTypeByDate = resDeliveryType.rows;

    				                        //obtains totalByEmployees
    				                        $rootScope.remoteDbZPos.query("zpos/userByDate", {
    				                            startkey: [dateStart],
    				                            endkey: [dateEnd, {}],
    				                            reduce: true,
    				                            group: true
    				                        }).then(function (resUser) {
    				                            var userByDate = resUser.rows;
    				                            createZPos(zposDefer,dateStart,dateEnd, taxByDate, paymentModesByDate, repaidByDate, countByDate, cutleriesByDate,creditByDate, deliveryTypeByDate, userByDate);
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
    	}

        //Création du Zpos pour le ticket
    	this.createZPosHtml = function (zpos) {

    		//#region Generate HTML printable
    		var htmlLines = [];
    		htmlLines.push("<center><strong>Z de caisse</strong></center>");
    		htmlLines.push("<br />")
    		Enumerable.from($rootScope.IziBoxConfiguration.ShopName.split("\\r\\n")).forEach(function (part) {
    			htmlLines.push("<center>" + part + "</center>");
    		});

    		htmlLines.push("<br />");
    		htmlLines.push("<center><strong>Du : " + Date.parseExact(zpos.dateStart, "yyyymmdd").toString("dd/mm/yyyy") + (zpos.dateEnd != zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyymmdd").toString("dd/mm/yyyy")) : "") + "</strong></center>");
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
    			htmlLines.push("<td style='width:25%;text-align:right'>" + zpos.paymentModes[idxPM].total + "</td>");
    			htmlLines.push("</tr>");
    		}

    		htmlLines.push("</table></p>");

    		htmlLines.push("<br />");

    		htmlLines.push("<p>Avoir émis : " + zpos.credit.total + "</p>");

    		htmlLines.push("<br />");

    		//Total payment
    		htmlLines.push("<p>Recette :</p>");
    		htmlLines.push("<p>    TTC : " + zpos.totalIT + "</p>");
    		htmlLines.push("<p>    HT  : " + zpos.totalET + "</p>");

    		htmlLines.push("<br />");

    		htmlLines.push("<p>Nb couverts : " + zpos.cutleries.count + "</p>");

    		htmlLines.push("<br />");

    		var lineForHere = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.FORHERE; });
    		var lineTakeOut = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.TAKEOUT; });
    		var lineDelivery = Enumerable.from(zpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.DELIVERY; });
    		var valueForHere = lineForHere ? lineForHere.total : 0;
    		var valueTakeOut = lineTakeOut ? lineTakeOut.total : 0;
    		var valueDelivery = lineDelivery ? lineDelivery.total : 0;

    		htmlLines.push("<p>Dont (TTC) :</p>");
    		htmlLines.push("<p>    Sur place  : " + valueForHere.toString() + "</p>");
    		htmlLines.push("<p>    Emporté    : " + valueTakeOut.toString() + "</p>");
    		htmlLines.push("<p>    Livré      : " + valueDelivery.toString() + "</p>");

    		htmlLines.push("<br />");

    		Enumerable.from(zpos.taxDetails).forEach(function (tax) {
    			htmlLines.push("<p>" + tax.taxCode +" : "+roundValue(tax.total)+"</p>");
    		});

    		if (zpos.employees && zpos.employees.length > 0) {
    			htmlLines.push("<br />");
    			htmlLines.push("<p>Par employés (TTC) :</p>");
    			Enumerable.from(zpos.employees).forEach(function (employee) {
    				htmlLines.push("<p>  "+ employee.name +" : " + employee.total + "</p>");
    			});
    		}

    		htmlLines.push("<br />");
    		htmlLines.push("<br />");
    		htmlLines.push("<cut>");
    		htmlLines.push("</cut>");
    		//#endregion

    		var html = htmlLines.join("");

    		return html;
    	}

    	this.printZPosAsync = function (zpos) {
    		var printDefer = $q.defer();

    		var html = this.createZPosHtml(zpos);

    		//print
    		var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printhtml";
    		console.log("PrinterApiUrl : " + printerApiUrl);

    		var htmlPrintReq = {
    			PrinterIdx: $rootScope.PrinterConfiguration.ProdPrinter,
    			Html: html
    		}

    		// Simple POST request example (passing data) :
    		$http.post(printerApiUrl, htmlPrintReq, { timeout: 10000 }).
            success(function (data, status, headers, config) {
            	printDefer.resolve(true);
            }).
            error(function (data, status, headers, config) {
            	printDefer.reject("Print error");
            });

    		return printDefer.promise;

    	}

    	this.emailZPosAsync = function (zpos) {
    		var emailDefer = $q.defer();

    		var html = this.createZPosHtml(zpos);

    		//email
    		var emailApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/emailhtml";
    		console.log("EmailApiUrl : " + emailApiUrl);

    		var subject = "Z Du : " + Date.parseExact(zpos.dateStart, "yyyymmdd").toString("dd/mm/yyyy") + (zpos.dateEnd != zpos.dateStart ? (" au " + Date.parseExact(zpos.dateEnd, "yyyymmdd").toString("dd/mm/yyyy")) : "");

    		var htmlEmailReq = {
    			Subject: subject,
    			Html: html
    		}

    		// Simple POST request example (passing data) :
    		$http.post(emailApiUrl, htmlEmailReq, { timeout: 10000 }).
            success(function (data, status, headers, config) {
            	emailDefer.resolve(true);
            }).
            error(function (data, status, headers, config) {
            	emailDefer.reject("Email error");
            });

    		return emailDefer.promise;

    	}
    }])