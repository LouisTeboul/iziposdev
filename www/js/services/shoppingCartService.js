app.service('shoppingCartService', ["$http", "$rootScope", "$q", "zposService", "settingService","$translate",
    function ($http, $rootScope, $q, zposService, settingService,$translate) {
    	var current = this;

    	this.getLoyaltyObjectAsync = function (barcode) {
    		var loyaltyDefer = $q.defer();

    		//TODO
    		var getLoyaltyUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/GetLoyaltyObject?barcode=" + barcode;

    		//TODO for test
    		//var getLoyaltyUrl = "http://127.0.0.1/izipos/www/datas/loyaltytest.json";

    		var callLoyalty = function (retry) {
    			$http({
    				url: getLoyaltyUrl,
    				method: "GET",
    				timeout: 20000
    			}).
				then(function (response) {
					if (response && response.data && response.data.CustomerId != 0) {
						Enumerable.from(response.data.Offers).forEach(function (o) { o.OfferParam = JSON.parse(o.OfferParam); });
						loyaltyDefer.resolve(response.data);
					} else {
						loyaltyDefer.resolve();
					}
				}, function (err) {
					if (retry < 2) {
						callLoyalty(retry + 1);
					} else {
						loyaltyDefer.reject(err);
					}
				});
    		}

    		callLoyalty(0);

    		return loyaltyDefer.promise;
    	}

    	this.searchForCustomerAsync = function (query) {
    	    var searchDefer = $q.defer();

    	    //TODO
    	    var getSearchUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi + "/RESTLoyalty/RESTLoyalty/GetSearchCustomer?searchString=" + query;

    	    $http({
    	        url: getSearchUrl,
    	        method: "GET",
    	        timeout: 20000
    	    }).
            then(function (response) {
                searchDefer.resolve(response.data);
            }, function (err) {
                searchDefer.reject(err);
            });

    	    return searchDefer.promise;
    	}

    	this.getFreezedShoppingCartsAsync = function () {
    		var shoppingCartsDefer = $q.defer();

    		$rootScope.dbFreeze.rel.find('ShoppingCart').then(function (resShoppingCarts) {
    			var shoppingCarts = resShoppingCarts.ShoppingCarts;

    			//Hack for remove duplicate
    			var shoppingCartsToRemove = [];
    			var shoppingCartsToReturn = [];

    			Enumerable.from(shoppingCarts).forEach(function (s) {
    				if (shoppingCartsToRemove.indexOf(s) == -1) {
    					var duplicateShoppingCarts = Enumerable.from(shoppingCarts).where(function (d) {
    						return d.Timestamp == s.Timestamp;
    					}).toArray();

    					if (duplicateShoppingCarts.length > 1) {
    						shoppingCartsToRemove.push.apply(shoppingCartsToRemove, duplicateShoppingCarts.slice(1));
    					}

    					shoppingCartsToReturn.push(duplicateShoppingCarts[0]);
    				}
    			});

    			Enumerable.from(shoppingCartsToRemove).forEach(function (r) {
    				current.unfreezeShoppingCartAsync(r);
    			});

    			shoppingCartsDefer.resolve(shoppingCartsToReturn);

    		}, function (err) {
    			shoppingCartsDefer.reject(err);
    		});

    		return shoppingCartsDefer.promise;
    	}

    	this.getFreezedShoppingCartByTableNumberAsync = function (tableNumber) {
    		var resultDefer = $q.defer();

    		$rootScope.showLoading();

    		if (tableNumber == undefined) {
    			$rootScope.hideLoading();
    			resultDefer.reject();
    		} else {
    			this.getFreezedShoppingCartsAsync().then(function (shoppingCarts) {
    				var result = Enumerable.from(shoppingCarts).firstOrDefault(function (sc) {
    					return sc.TableNumber == tableNumber;
    				});
    				if (result) {
    					$rootScope.hideLoading();
    					resultDefer.resolve(result);
    				} else {
    					$rootScope.hideLoading();
    					resultDefer.reject();
    				}
    			}, function (err) {
    				$rootScope.hideLoading();
    				resultDefer.reject();
    			});
    		}


    		return resultDefer.promise;
    	}

    	this.getFreezedShoppingCartByIdAsync = function (id) {
    		var resultDefer = $q.defer();

    		$rootScope.showLoading();

    		if (id == undefined) {
    			$rootScope.hideLoading();
    			resultDefer.reject();
    		} else {
    			$rootScope.dbFreeze.rel.find('ShoppingCart', id).then(function (resShoppingCarts) {
    				var result = Enumerable.from(resShoppingCarts.ShoppingCarts).firstOrDefault();
    				if (result) {
    					$rootScope.hideLoading();
    					resultDefer.resolve(result);
    				} else {
    					$rootScope.hideLoading();
    					resultDefer.reject();
    				}
    			}, function (err) {
    				$rootScope.hideLoading();
    				resultDefer.reject();
    			});
    		}


    		return resultDefer.promise;
    	}

    	this.freezeShoppingCartAsync = function (shoppingCart) {
    		var freezeDefer = $q.defer();

    		shoppingCart.rev = undefined;
    		shoppingCart.id = shoppingCart.Timestamp;

    		$rootScope.dbFreeze.rel.save('ShoppingCart', shoppingCart).then(function (result) {
    			freezeDefer.resolve(true);
    		}, function (errSave) {
    			freezeDefer.reject(errSave);
    		});

    		return freezeDefer.promise;
    	}

    	this.unfreezeShoppingCartAsync = function (shoppingCart,tryDel) {
    		var unfreezeDefer = $q.defer();

    		$rootScope.dbFreeze.rel.del('ShoppingCart', { id: shoppingCart.id, rev: shoppingCart.rev }).then(function (result) {
    			unfreezeDefer.resolve(true);
    		}, function (errDel) {
    			unfreezeDefer.reject(errDel);
    		});

    		return unfreezeDefer.promise;
    	}

    	this.saveShoppingCartAsync = function (shoppingCart) {
    		var saveDefer = $q.defer();

    		shoppingCart.rev = undefined;
    		shoppingCart.id = shoppingCart.Timestamp;

    		var innerSave = function (saveDefer, shoppingCart, retry) {
    			$rootScope.dbReplicate.rel.save('ShoppingCart', shoppingCart).then(function (result) {
    				try {
    					if (!shoppingCart.Canceled) {

    						$rootScope.dbZPos.rel.save('ShoppingCart', shoppingCart).then(function () { }, function () { });

    						var updatePayments = clone(shoppingCart.PaymentModes);

    						if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
    							var cashPayment = Enumerable.from(updatePayments).firstOrDefault(function (x) { return x.PaymentType == PaymentType.ESPECE });
    							if (cashPayment) {
    								cashPayment.Total = cashPayment.Total - shoppingCart.Repaid;
    							}
    						}

    						zposService.updatePaymentValuesAsync(updatePayments);
    					}
    				} catch (errPM) {

    				}

    				saveDefer.resolve(
                    {
                    	success: true,
                    	api: false
                    });
    			}, function (errSave) {
    				if (!retry) {
    					try {
    						$rootScope.dbReplicate.rel.find('ShoppingCart', shoppingCart.id).then(function (resShoppingCart) {
    							var existingSC = Enumerable.from(resShoppingCart.ShoppingCarts).firstOrDefault();
    							if (existingSC) {
    								shoppingCart.rev = existingSC.rev;
    								innerSave(saveDefer, shoppingCart, true);
    							} else {
    								saveDefer.reject();
    							}
    						}, function () {
    							saveDefer.reject();
    						});
    					} catch (errDel) {
    						saveDefer.reject(errDel);
    					}

    				} else {
    					saveDefer.reject(errSave);
    				}
    			});
    		}

    		innerSave(saveDefer, shoppingCart);

    		return saveDefer.promise;
    	}

    	this.savePaymentEditAsync = function (shoppingCart, paymentEdit, oldPaymentValues) {
    		var savePaymentDefer = $q.defer();

    		shoppingCart.id = shoppingCart.Timestamp;

    		$rootScope.dbZPos.rel.save('ShoppingCart', shoppingCart).then(function () {
    			$rootScope.dbReplicate.rel.save('PaymentEdit', paymentEdit).then(function () {
    				zposService.updatePaymentValuesAsync(paymentEdit.PaymentModes, oldPaymentValues).then(function () {
    					savePaymentDefer.resolve(paymentEdit);
    				}, function (errUpdP) {
    					savePaymentDefer.reject(errUpdP);
    				});
    			}, function (errSave) {
    				savePaymentDefer.reject(errSave);
    			});    			

    		}, function (err) {
    			savePaymentDefer.reject(err);
    		});



    		return savePaymentDefer.promise;
    	}


        // Version de test pour impression html de ticket 
    	this.printShoppingCartAsync2 = function (shoppingCart, printerIdx, isPosTicket, printCount, ignorePrintTicket, nbNote) {   	 

    	  var printDefer = $q.defer();

    		var html = this.exportShoppingCartHtmlAsync(shoppingCart,0);

    		//print
    		var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printhtml";
    		console.log("PrinterApiUrl : " + printerApiUrl);

    		var htmlPrintReq = {
    			PrinterIdx: printerIdx,
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

    	this.printShoppingCartAsync = function (shoppingCart, printerIdx, isPosTicket, printCount, ignorePrintTicket, nbNote) {
    		var printDefer = $q.defer();

    		if ($rootScope.IziBoxConfiguration.LoginRequired) {
    			shoppingCart.PosUserId = $rootScope.PosUserId;
    			shoppingCart.PosUserName = $rootScope.PosUserName;
    			shoppingCart.ShowNameOnTicket = $rootScope.PosUser.ShowNameOnTicket;
    		}


    		var shoppingCartPrinterReq = {
    			PrinterIdx: printerIdx,
    			ShoppingCart: shoppingCart,
    			IsPosTicket: isPosTicket,
    			PrintCount: printCount,
    			IgnorePrintTicket: ignorePrintTicket,
    			PrintQRCode: !isPosTicket && $rootScope.IziBoxConfiguration.PrintProdQRCode,
    			NbNote: nbNote
    		}

    		if ($rootScope.IziBoxConfiguration.LocalIpIziBox && printCount > 0) {
    			var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/print";
    			console.log("PrinterApiUrl : " + printerApiUrl);
    			this.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer);

    		} else {
    			setTimeout(function () {
    				printDefer.resolve(shoppingCartPrinterReq);
    			}, 100);
    		}

    		return printDefer.promise;
    	}


        //Envoi de mail
    	this.emailShoppingCartAsync = function (shoppingCart,mail,firstName,lastName) {
    	    var emailDefer = $q.defer();

    	    var html = this.exportShoppingCartHtmlAsync(zpos); // todo

    	    //email
    	    var emailApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/emailhtml";
    	    console.log("EmailApiUrl : " + emailApiUrl);

            // todo : modifier
    	    var subject = "Ticket Du : " + Date.parseExact(Date.now, "yyyymmdd");

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
       
        //Exports HTML des ticket 
    	this.exportShoppingCartHtmlAsync = function (shoppingCart,NbNote) {

    	    var htmlLines= [];    	    
            //logo
    	    htmlLines.push("<img src='" + $rootScope.IziBoxConfiguration.Logo + "' />");

            // Nom et infos société
    	    Enumerable.from($rootScope.IziBoxConfiguration.ShopName.split("\\r\\n")).forEach(function (part) {
    	        htmlLines.push("<center>" + part + "</center>");
    	    });    	    

    	    htmlLines.push("<br />");
    	    htmlLines.push("<br />");


            //Numéro de ticket -- les 4 derniers chiffres sont en gras 
    	    var firstPartTkNo = shoppingCart.Timestamp.toString();
    	    var lastPartTkNo = undefined;
    	    var TsLength = firstPartTkNo.length
    	    var TktNo;

    	    if (firstPartTkNo.length > 4)
    	    {
    	        firstPartTkNo = shoppingCart.Timestamp.toString().substring(0, TsLength - 4);
    	        lastPartTkNo = shoppingCart.Timestamp.toString().substring(TsLength - 4);
    	    }
    	   
    	   if (lastPartTkNo){
    	       TktNo = firstPartTkNo + "<b>_" + lastPartTkNo + "</b>";
    	   }   	   

    	    htmlLines.push("<center> <strong>"+$translate.instant("TICKET")+"</strong> "+ TktNo+"</center>");
    	    htmlLines.push("<br />");
    	    htmlLines.push("<br />");
    	    htmlLines.push("<p>"+shoppingCart.Date+"</p>") 
    	    htmlLines.push("<br />");

    	    if (NbNote == 0) {

    	        //Numéro de table
    	        var tableLine = "";

    	        if (shoppingCart.TableNumber)
    	            tableLine = $translate.instant("TABLE ") + shoppingCart.TableNumber.Value;


    	        //Nb de couvert
    	        if (shoppingCart.TableCutleries) {
    	            if (shoppingCart.TableNumber) {
    	                tableLine += " / ";
    	            }

    	            tableLine += $translate.instant("COUVERT(S) ") + shoppingCart.TableCutleries.Value;
    	        }

    	        if (tableLine) {
    	            htmlLines.push(tableLine);
    	            htmlLines.push("<br />");
    	        }

    	       

    	        //TODO: Shipping
    	        if (shoppingCart.ShippingMethod)
    	            htmlLines.push(shoppingCart.ShippingMethod + " " + shoppingCart.ShippingOption);

    	        if (shoppingCart.DeliveryTypes)
    	            htmlLines.push(shoppingCart.DeliveryTypes);


    	        //Infos clients
    	        if (shoppingCart.Customer) {
    	            htmlLines.push("<b> " + shoppingCart.Customer.FirstName + " " + shoppingCart.Customer.LastName + " </b>");
    	            htmlLines.push(shoppingCart.Customer.Email);
    	            htmlLines.push("Tel " + shoppingCart.Customer.PhoneNumber);
    	            if (shoppingCart.Customer.Address1)
    	                htmlLines.push(shoppingCart.Customer.Address1);
    	            if (shoppingCart.Customer.Address2)
    	                htmlLines.push(shoppingCart.Customer.Address2);
    	            htmlLines.push(shoppingCart.Customer.ZipPostalCode + " " + shoppingCart.Customer.City);
    	            if (shoppingCart.Customer.Complement) {
    	                if (shoppingCart.Customer.Complement.Floor) htmlLines.push("Etage : " + shoppingCart.Customer.Complement.Floor);
    	                if (shoppingCart.Customer.Complement.Door) htmlLines.push("Porte : " + shoppingCart.Customer.Complement.Door);
    	                if (shoppingCart.Customer.Complement.DigiCode) htmlLines.push("Digicode : " + shoppingCart.Customer.Complement.DigiCode);
    	                if (shoppingCart.Customer.Complement.InterCom) htmlLines.push("Interphone : " + shoppingCart.Customer.Complement.InterCom);
    	                if (shoppingCart.Customer.Complement.Infos) htmlLines.push("Infos : " + shoppingCart.Customer.Complement.Infos);
    	            }
    	        }


    	        //Liste articles
    	        htmlLines.push("<hr />");

    	        //Header tableau
    	        htmlLines.push("<table>");
    	        htmlLines.push("<tr>");
    	        htmlLines.push("<th style='width:65%'>" + $translate.instant("Qté") + "</th>");
    	        htmlLines.push("<th style='width:10%; text-align:center'>" + $translate.instant("Description") + "</th>");
    	        htmlLines.push("<th style='width:25%; text-align:right'>" + $translate.instant("Montant") + "</th>");
    	        htmlLines.push("</tr>");

    	        // Articles
    	        var quantity = 0;
    	        Enumerable.from(shoppingCart.Items).forEach(function (line) {
    	            quantity += line.Quantity;
    	            var totalLine = "";
    	            if (shoppingCart.ExcludedTax) {
    	                totalLine = roundValue(line.PriceET);
    	            }
    	            else {
    	                totalLine = roundValue(line.PriceIT);
    	            }

    	            htmlLines.push("<tr>");
    	            htmlLines.push("<td style='width:65%'>" + line.Quantity + " : </td>");
    	            htmlLines.push("<td style='width:10%; text-align:center'>" + line.Product.Name + "</td>");
    	            htmlLines.push("<td style='width:25%; text-align:right'>" + totalLine + "</td>");
    	            htmlLines.push("</tr>");

    	            //Attributs
    	            if (line.Attributes && line.Attributes.Count > 0) {
    	                Enumerable.from(line.Attributes).forEach(function (attr) {
    	                    htmlLines.push(attr.Name + (attr.PriceAdjustment > 0 ? "+ " + attr.PriceAdjustment : " "));//todo    	               
    	                });
    	            }
    	        });
    	        htmlLines.push("</table>");
    	        //-- fin de tableau

    	        htmlLines.push("<br />");


    	        //Nb Articles 
    	        htmlLines.push("<p>"+$translate.instant("Nombre d'articles") + " : " + quantity+"</p>")

    	        //Remise
    	        if (shoppingCart.Discounts && shoppingCart.Discounts > 0) {
    	            htmlLines.push("<br />");

    	            Enumerable.from(shoppingCart.Discounts).forEach(function (discount) {
    	                var typeDiscount = discount.IsPercent ? "%" : "Euros";
    	                htmlLines.push("<p>"+$translate.instant("Remise ") + discount.value + " " + typeDiscount + "( " + roundValue(discount.total) + " )"+"</p>");
    	            });
    	            htmlLines.push("<br />");
    	        }
    	    }
            

    	    if (NbNote > 0) {    	        
    	        htmlLines.push("<hr />");
    	        htmlLines.push("Nombre de repas : " + 
                    NbNote);
    	        htmlLines.push();
    	    }

    	    htmlLines.push("<hr />");

            //Totaux
    	    htmlLines.push("<p>" + $translate.instant("TOTAL")+" " + roundValue(shoppingCart.Total) + "</p>");

    	    //Taxes                 
    	    if(shoppingCart.TaxDetails){            
    	        var taxList = [];
    	        Enumerable.from(shoppingCart.TaxDetails).forEach(function (taxDetail) {
    	            var existingTax = Enumerable.from(taxList).firstOrDefault(function (tax) {
    	                return tax.TaxCode == taxDetail.TaxCode && tax.TaxRate == taxDetail.TaxRate;
    	            });

    	            if (existingTax) {
    	                existingTax.TaxAmount += taxDetail.TaxAmount;
    	            } else {
    	                var newTax = {
    	                    TaxRate: taxDetail.TaxRate,
    	                    TaxCode: taxDetail.TaxCode,
    	                    TaxAmount: taxDetail.TaxAmount
    	                }
    	                taxList.push(newTax);
    	            }

    	        });

    	        if (shoppingCart.ExcludedTax)
    	        {
    	            htmlLines.push("<p>" + $translate.instant("TOTAL") + " " + shoppingCart.TotalET + "</p>");

    	            Enumerable.from(taxList).forEach(function (tax) {
    	                if(tax.TaxAmount!=0)
    	                    htmlLines.push("<p>"+(tax.TaxCode + " " + tax.TaxRate + "%") + " " + roundValue(tax.TaxAmount)+"</p>");

    	            });      	          
    	            htmlLines.push("<br />");
    	            htmlLines.push("<p>" + $translate.instant("TOTAL A PAYER ") + " " + roundValue(shoppingCart.Total) + "</p>");
    	        }
    	        else
    	        {
    	            htmlLines.push("<p>"+$translate.instant("TOTAL A PAYER ")+ " " + roundValue(shoppingCart.Total) +"</p>");

    	            htmlLines.push("<br>");    	           
    	            htmlLines.push("<p>" + $translate.instant("Dont ") + "</p>");
    	            htmlLines.push("<p>" + $translate.instant("TOTAL HT ") + " " + roundValue(shoppingCart.TotalET) + "</p>");


    	            Enumerable.from(TaxList).forEach(function (tax) {    	               
    	                if(tax.taxAmount!=0)
    	                    htmlLines.push("<p>" + (tva.TaxCode + " " + tva.TaxRate + "%") + " " + roundValue(tva.TaxAmount) + "</p>");

    	            });     	         
    	        }
    	    }
    	    else
    	    {
    	        // Gestion TVA uniquement
    	        htmlLines.push("<p>" + $translate.instant("TOTAL A PAYER") + " " + roundValue(shoppingCart.Total) + "</p>");
    	        htmlLines.push("<br />");       	        
    	        htmlLines.push("<p>Dont</p>");
    	        htmlLines.push("<p>"+$translate.instant("TOTAL HT")+ " " + roundValue(shoppingCart.TotalET)+"</p>");


    	        Enumerable.from(shoppingCart.TotalVAT).forEach(function (tva) {    	               
    	            if(tax.taxAmount!=0){
    	                var tvaValue = tva.TotalIT - (tva.TotalET.HasValue ? tva.TotalET.Value : 0);
    	                htmlLines.push("<p>" + ("TVA " + tva.VAT + "%") + " " + roundValue(tvaValue) + "</p>");
    	            }
    	        });    	        
    	    }

    	    if (NbNote == 0) {
    	        //Moyens de paiement
    	        if (shoppingCart.PaymentModes) {
    	            htmlLines.push("<br />");
    	            htmlLines.push($translate.instant("Mode paiement"));

    	            Enumerable.from(shoppingCart.PaymentModes).forEach(function (paymentMode) {
    	                htmlLines.push(paymentMode.Text + " " + roundValue(paymentMode.Total)); //format
    	            });

    	        }

    	        //Fidélité
    	        if (shoppingCart.BalanceUpdate)
    	            htmlLines.push($translate.instant("Cagnotte utilisée") + " " + roundValue(shoppingCart.BalanceUpdate.UpdateValue));

    	        htmlLines.push("<br />");

    	        //Rendu
    	        if (shoppingCart.Repaid > 0)
    	            htmlLines.push($translate.instant("RENDU") + " " + roundValue(shoppingCart.Repaid));

    	        htmlLines.push("<br />");


    	        // thank you !!
    	        if (shoppingCart.ShowNameOnTicket && shoppingCart.PosUserName) {
    	            htmlLines.push("<center>" + shoppingCart.PosUserName + $translate.instant("Merci de votre visite") + "</center>");
    	        }
    	        else {
    	            htmlLines.push("<center>" + $translate.instant("Merci de votre visite") + "</center>");
    	        }
    	    }

    	    htmlLines.push("<br />");
    	    htmlLines.push("<br />");
    	    htmlLines.push("<cut>");
    	    htmlLines.push("</cut>");

    	    var html = htmlLines.join("");

    	    return html;
    	}
       
        
    	this.exportProdTicketHtmlAsync = function (shoppingCart) {
    	    if (shoppingCart != undefined && shoppingCart.Items.length > 0) {

    	        currentShoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

    	        //Suppression des lignes à qté 0
    	        var toPrint = clone(currentShoppingCart);
    	        toPrint.Items = Enumerable.from(currentShoppingCart.Items).where("item => item.Quantity > 0").toArray();

    	        exportShoppingCartHtmlAsync(shoppingCart).then(function (msg) {
    	        }, function (err) {
    	            sweetAlert($translate.instant("Erreur d'export mail production !"));
    	        });
    	    }
    	}

    	this.exportNoteHtmlAsync = function (shoppingCart) {
    	    if (!shoppingCart) {
    	        shoppingCart = lastShoppingCart;
    	    }

    	    if (shoppingCart) {
    	        var modalInstance = $uibModal.open({
    	            templateUrl: 'modals/modalShoppingCartNote.html',
    	            controller: 'ModalShoppingCartNoteController',
    	            backdrop: 'static'
    	        });

    	        modalInstance.result.then(function (nbNote) {
    	            shoppingCartService.printShoppingCartAsync(shoppingCart, nbNote).then(function () { }, function () { sweetAlert("Erreur export html de la note !"); });
    	        }, function () {});
    	    }
    	}

    	this.printProdAsync = function (shoppingCart, step) {
    	    var printDefer = $q.defer();

    	    if ($rootScope.IziBoxConfiguration.LoginRequired) {
    	        shoppingCart.PosUserId = $rootScope.PosUserId;
    	        shoppingCart.PosUserName = $rootScope.PosUserName;
    	        shoppingCart.ShowNameOnTicket = $rootScope.PosUser.ShowNameOnTicket;
    	    }


    	    var shoppingCartPrinterReq = {
    	    	ShoppingCart: shoppingCart,
				Step: step
    	    }

    	    if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
    	        var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printprod";
    	        console.log("PrinterApiUrl : " + printerApiUrl);
    	        this.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer);

    	    } else {
    	        setTimeout(function () {
    	        	printDefer.resolve(shoppingCartPrinterReq);
    	        }, 100);
    	    }

    	    return printDefer.promise;
    	}

    	this.printShoppingCartPOST = function (printerApiUrl, shoppingCartPrinterReq, printDefer, retry) {
    		$http.post(printerApiUrl, shoppingCartPrinterReq, { timeout: 10000 }).
            success(function (data, status, headers, config) {
            	printDefer.resolve(shoppingCartPrinterReq);
            }).
            error(function (data, status, headers, config) {
            	if (!retry) retry = 1;
            	if (retry < 3) {
            		console.log("Retry print");
            		current.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, retry + 1);
            	} else {
            		printDefer.reject("Print error");
            	}
            });
    	}

    	this.testPrinterAsync = function (idx) {
    		var printDefer = $q.defer();

    		var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/testprinter/" + idx;
    		console.log("PrinterApiUrl : " + printerApiUrl);

    		$http.get(printerApiUrl, { timeout: 10000 }).
            success(function (data, status, headers, config) {
            	printDefer.resolve(true);
            }).
            error(function (data, status, headers, config) {
            	printDefer.reject("Print error");
            });

    		return printDefer.promise;
    	}
    }
])