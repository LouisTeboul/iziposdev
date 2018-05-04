/**
 * Main module to manage the POS
 */
app.service('shoppingCartService', ["$http", "$rootScope", "$q", "$filter", "zposService", "settingService", "$translate", "posPeriodService", "posService",
    function ($http, $rootScope, $q, $filter, zposService, settingService, $translate, posPeriodService, posService) {
        var current = this;


        /**
         * Get all the ticket from the shared database
         */
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
        };

        /**
         * Get freezed tickets by table number
         * @param tableNumber the table number
         */
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
        };


        /**
         * Get freezed tickets by table number
         * @param id shoppingCartid
         */
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
        };


        this.getFreezedShoppingCartByBarcodeAsync = function (barcode) {
            var resultDefer = $q.defer();

            $rootScope.showLoading();

            if (barcode == undefined) {
                $rootScope.hideLoading();
                resultDefer.reject();
            } else {
                $http.post("http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/freeze/_find",
                    {
                        "selector": {
                            "data.Barcode": barcode,
                        }
                    }).then(function (resShoppingCarts) {
                    var result = Enumerable.from(resShoppingCarts.data.docs).firstOrDefault();
                    if (result) {
                        result.data.id = result.data.Timestamp;
                        result.data.rev = result._rev;
                        console.log(result);
                        $rootScope.hideLoading();
                        resultDefer.resolve(result.data);
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
        };


        /**
         * Count the number of matching RK products in shopping cart
         * @param shoppingCart : The shopping cart
         * @returns {number} : the number of matching product
         */
        var RKComptage = function (shoppingCart) {
            var compteur = 0;
            Enumerable.from(shoppingCart.Items).forEach(function (item) {
                if (item.Product.Sku == "rkcompteur") {
                    compteur += item.Quantity;
                }
            });
            return compteur;
        };

        /**
         * Increment counter in database
         * @param shoppingCart : The shopping cart
         */
        var RKIncrement = function (shoppingCart) {
            var incr = RKComptage(shoppingCart);
            posService.getUpdRkCounterValueAsync(shoppingCart.HardwareId, incr);
        };


        /**
         * Decrement counter in database
         * @param shoppingCart : The shopping cart
         */
        var RKDecrement = function (shoppingCart, retry = 0) {
            var decr = RKComptage(shoppingCart);
            posService.getUpdRkCounterValueAsync(shoppingCart.HardwareId, -1 * decr);
        };


        /**
         * Send the ticket in a database shared between POS terminal
         * @param shoppingCart The shopping cart
         */
        this.freezeShoppingCartAsync = function (shoppingCart) {
            var freezeDefer = $q.defer();

            // RK : Appeller la fonction d'incrément d'enfant dans le parc
            RKIncrement(shoppingCart);

            shoppingCart.rev = undefined;
            shoppingCart.id = shoppingCart.Timestamp;

            $rootScope.dbFreeze.rel.save('ShoppingCart', shoppingCart).then(function (result) {
                freezeDefer.resolve(true);
            }, function (errSave) {
                freezeDefer.reject(errSave);
            });

            return freezeDefer.promise;
        };

        /** Delete a ticket in the freeze */
        this.unfreezeShoppingCartAsync = function (shoppingCart, tryDel) {
            var unfreezeDefer = $q.defer();

            // RK : Appeller la fonction de décrément d'enfant dans le parc
            RKDecrement(shoppingCart);

            $rootScope.dbFreeze.rel.del('ShoppingCart', {
                id: shoppingCart.id,
                rev: shoppingCart.rev
            }).then(function (result) {
                unfreezeDefer.resolve(true);
            }, function (errDel) {
                unfreezeDefer.reject(errDel);
            });

            return unfreezeDefer.promise;
        };

        /**
         * Update the payment for the shopping cart
         */
        this.updatePaymentShoppingCartAsync = function (shoppingCart) {
            var saveDefer = $q.defer();

            var innerSave = function (saveDefer, shoppingCart) {
                try {
                    if (!shoppingCart.Canceled) {

                        // Update the payment mode in case of modification
                        var updatePayments = clone(shoppingCart.PaymentModes);

                        if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
                            var cashPayment = Enumerable.from(updatePayments).firstOrDefault(function (x) {
                                return x.PaymentType == PaymentType.ESPECE
                            });
                            if (cashPayment) {
                                cashPayment.Total = cashPayment.Total - shoppingCart.Repaid;
                            }
                        }

                        posPeriodService.updatePaymentValuesAsync(shoppingCart.yPeriodId, shoppingCart.zPeriodId, shoppingCart.HardwareId, updatePayments);
                    }
                } catch (errPM) {
                    console.log(errPM);
                }
                saveDefer.resolve(
                    {
                        success: true,
                        api: false
                    });
            };

            innerSave(saveDefer, shoppingCart);

            return saveDefer.promise;
        };


        /**
         * Save the payment modification
         * @deprecated this must be saved in another database
         * @param shoppingCart The shopping cart to modify
         * @param paymentEdit   The payment modification
         * @param oldPaymentValues The previous values
         */
        this.savePaymentEditAsync = function (shoppingCart, paymentEdit, oldPaymentValues) {
            var savePaymentDefer = $q.defer();

            shoppingCart.id = Number(shoppingCart.Timestamp);

            // Enlever le mode de règlement "Cagnotte" il est déjà pris en compte dans BalanceUpdate
            var PaymentModesWithoutLoyalty = []
            Enumerable.from(shoppingCart.PaymentModes).forEach(function (p) {
                if (p.PaymentType !== PaymentType.FIDELITE) {
                    PaymentModesWithoutLoyalty.push(p);
                }
            });

            shoppingCart.PaymentModes = PaymentModesWithoutLoyalty;

            $rootScope.remoteDbZPos.rel.save('ShoppingCart', shoppingCart).then(function () { 				// Save the ticket
                $rootScope.dbReplicate.rel.save('PaymentEditWithHistory', paymentEdit).then(function () { 	// Send the event to the BO
                    paymentEdit.PaymentModes = shoppingCart.PaymentModes;

                    posPeriodService.updatePaymentValuesAsync(shoppingCart.yPeriodId, shoppingCart.zPeriodId, shoppingCart.HardwareId, paymentEdit.PaymentModes, oldPaymentValues).then(function () {		// Modify the payment
                        savePaymentDefer.resolve(paymentEdit);
                    }, function (errUpdP) {
                        savePaymentDefer.reject(errUpdP); //update error
                    });
                }, function (errSave) {
                    savePaymentDefer.reject(errSave);
                });
            }, function (err) {
                savePaymentDefer.reject(err);
            });
            return savePaymentDefer.promise;
        };

        /**
         *  Print The shopping cart - The credit note
         * @param shoppingCart The shopping cart to print
         * @param printerIdx The selected printer
         * @param isPosTicket The ticket is
         * @param printCount Number of print
         * @param ignorePrintTicket
         * @param nbNote
         * @param printDefer : defer of the calling function
         */
        this.printShoppingCartAsync = function (shoppingCart, printerIdx, isPosTicket, printCount, ignorePrintTicket, nbNote, printDefer) {

            if (!printDefer) {
                printDefer = $q.defer();
            }
            shoppingCart.PosUserId = $rootScope.PosUserId;
            shoppingCart.PosUserName = $rootScope.PosUserName;
            shoppingCart.ShowNameOnTicket = $rootScope.PosUser == undefined ? false : $rootScope.PosUser.ShowNameOnTicket; // should be defined?

            var shoppingCartPrinterReq = {
                PrinterIdx: printerIdx,
                ShoppingCart: shoppingCart,
                IsPosTicket: isPosTicket,
                IsNote: nbNote && nbNote > 0,
                PrintCount: printCount,
                IgnorePrintTicket: ignorePrintTicket,
                PrintQRCode: !isPosTicket && $rootScope.IziBoxConfiguration.PrintProdQRCode,
                NbNote: nbNote,
                ReprintType: "Customer" // TODO: Implement the customer/Internal value of the reprint
            };

            // TODO : remove the ignorePrintRequest
            // This value was only useful in the previous versions
            // There is no validation without print or email sending
            if (shoppingCartPrinterReq.IgnorePrintTicket == undefined) {
                shoppingCartPrinterReq.IgnorePrintTicket = false;
            }

            if ($rootScope.IziBoxConfiguration.LocalIpIziBox && printCount > 0) {
                if (!isPosTicket) {
                    // For note impression
                    var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/print";
                }
                else {
                    var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/validateticket";
                }

                this.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer);

            } else {
                setTimeout(function () {
                    printDefer.resolve(shoppingCartPrinterReq);
                }, 100);
            }
            return printDefer.promise;
        };

        /**
         * @param shoppingCart
         */
        this.reprintShoppingCartAsync = function (shoppingCart) {
            var printDefer = $q.defer();

            console.log(shoppingCart);

            // TODO: Pop up de choix internal / customer dans le cas du MEV

            var shoppingCartPrinterReq = {
                PrinterIdx: $rootScope.PrinterConfiguration.POSPrinter,
                ShoppingCart: shoppingCart,
                IsPosTicket: true,
                PrintCount: 1,
                IgnorePrintTicket: false,
                PrintQRCode: $rootScope.IziBoxConfiguration.PrintProdQRCode,
                NbNote: 0,
                IsReprint: true,
                ReprintType: "Internal"
            };

            var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/reprint/";

            $http.post(printerApiUrl, shoppingCartPrinterReq, {timeout: 10000}).success(function () {
                printDefer.resolve(true);
            }).error(function () {
                printDefer.reject("Print error");
            });

            return printDefer.promise;
        };
        /**
         * Print ticket for the preparation of the order
         * @param shoppingCart The shopping cart
         * @param step The production steps
         * @param printDefer : defer of the calling function
         */
        this.printProdAsync = function (shoppingCart, step, printDefer, nbStep) {
            //console.log(shoppingCart);
            //Si le printdefer n'a pas été fournis par l'appellant
            if (!printDefer) {
                printDefer = $q.defer();
            }

            shoppingCart.PosUserId = $rootScope.PosUserId;
            shoppingCart.PosUserName = $rootScope.PosUserName;
            if ($rootScope.PosUser) {
                shoppingCart.ShowNameOnTicket = $rootScope.PosUser.ShowNameOnTicket;
            }

            var shoppingCartPrinterReq = {
                ShoppingCart: shoppingCart,
                Step: step
            };

            if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
                var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printprod";
                console.log("PrinterApiUrl : " + printerApiUrl);
                console.log(shoppingCartPrinterReq);
                this.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, null, nbStep);

            } else {
                setTimeout(function () {
                    printDefer.resolve(shoppingCartPrinterReq);
                }, 100);
            }

            return printDefer.promise;
        };

        /**
         * Sent the print request to the izibox - It's  the real endpoint to the Rest Service
         * If the print request don't succeed we retry it 3 times
         * @param printerApiUrl Rest service URL used for printing
         * @param shoppingCartPrinterReq The Shopping and its parameters for printing
         * @param printDefer
         * @param retry Number of retry
         * @param nbStep Number of steps
         */
        this.printShoppingCartPOST = function (printerApiUrl, shoppingCartPrinterReq, printDefer, retry, nbStep) {
            console.log(printerApiUrl);

            if (shoppingCartPrinterReq.ShoppingCart && shoppingCartPrinterReq.ShoppingCart.DatePickup) {
                // Si DatePickup est de type Date
                if (Object.prototype.toString.call(shoppingCartPrinterReq.ShoppingCart.DatePickup) === "[object Date]") {
                    // On envoi une string à la box au lieu d'une date
                    shoppingCartPrinterReq.ShoppingCart.DatePickup = shoppingCartPrinterReq.ShoppingCart.DatePickup.toTimeString();
                } else {
                    // Si DatePickup est une timestring valide
                    if (new Date(shoppingCartPrinterReq.ShoppingCart.DatePickup)) {
                        shoppingCartPrinterReq.ShoppingCart.DatePickup = new Date(shoppingCartPrinterReq.ShoppingCart.DatePickup).toTimeString();
                    } else {
                        shoppingCartPrinterReq.ShoppingCart.DatePickup = "Error";
                    }
                    // Sinon la date est impossible a lire
                }
            }

            var timeout = nbStep * 3000;

            $http.post(printerApiUrl, shoppingCartPrinterReq, {timeout: timeout}).then(function (obj) {
                console.log("succes post ticket", obj);
                //Set the coucbDb Id and the timestamp that come from the box
                if (shoppingCartPrinterReq.ShoppingCart != undefined) {
                    var data = obj.data;
                    if (data.ticketId != undefined) {
                        //shoppingCartPrinterReq.id = obj.ticketId;

                        shoppingCartPrinterReq.ShoppingCart.id = data.ticketId;
                    }
                    if (data.timestamp != undefined) {
                        /** ATTENTION BUG NF ??? */
                        shoppingCartPrinterReq.ShoppingCart.Timestamp = data.timestamp;
                    }
                }
                printDefer.resolve(shoppingCartPrinterReq);
            }, function (err) {
                console.log("erreur", err);

                if (err && err.error) {
                    printDefer.reject({request: shoppingCartPrinterReq, error: err.error});
                }
                else {
                    if (!retry) retry = 1;
                    if (retry < 2) {
                        console.log("Retry print");
                        current.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, retry + 1);
                    } else {
                        printDefer.reject({request: shoppingCartPrinterReq, error: "Print error"});
                    }
                }
            });
        };

        /**
         * A basic printing test
         * @param idx The id of the printer selected
         */
        this.testPrinterAsync = function (idx) {
            var printDefer = $q.defer();

            var printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/testprinter/" + idx;

            $http.get(printerApiUrl, {timeout: 10000}).success(function () {
                printDefer.resolve(true);
            }).error(function () {
                printDefer.reject("Print error");
            });

            return printDefer.promise;
        }
    }
]);