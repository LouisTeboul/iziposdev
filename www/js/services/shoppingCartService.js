/**
 * Main module to manage the POS
 */
app.service('shoppingCartService', ["$http", "$rootScope", "$q", "$filter", "zposService", "settingService", "$translate", "posPeriodService", "posService",
    function ($http, $rootScope, $q, $filter, zposService, settingService, $translate, posPeriodService, posService) {
        const current = this;

        /**
         * Get all the ticket from the shared database
         */
        this.getFreezedShoppingCartsAsync = function () {
            let shoppingCartsDefer = $q.defer();

            $rootScope.dbFreeze.rel.find('ShoppingCart').then(function (resShoppingCarts) {
                const shoppingCarts = resShoppingCarts.ShoppingCarts;
                //Hack for remove duplicate
                let shoppingCartsToRemove = [];
                let shoppingCartsToReturn = [];

                for(let s of shoppingCarts) {
                    if (shoppingCartsToRemove.indexOf(s) === -1) {
                        let duplicateShoppingCarts = Enumerable.from(shoppingCarts).where(function (d) {
                            return d.Timestamp === s.Timestamp;
                        }).toArray();

                        if (duplicateShoppingCarts.length > 1) {
                            shoppingCartsToRemove.push.apply(shoppingCartsToRemove, duplicateShoppingCarts.slice(1));
                        }
                        shoppingCartsToReturn.push(duplicateShoppingCarts[0]);
                    }
                }
                for(let r of shoppingCartsToRemove) {
                    current.unfreezeShoppingCartAsync(r);
                }
                shoppingCartsDefer.resolve(shoppingCartsToReturn);
            }, function (err) {
                shoppingCartsDefer.reject(err);
            });

            return shoppingCartsDefer.promise;
        };

        /**
         * Get freezed tickets by table number
         * @param TableId the table number
         */
        this.getFreezedShoppingCartByTableNumberAsync = function (TableId, TableNumber) {
            let resultDefer = $q.defer();
            $rootScope.showLoading();

            if (!TableId && !TableNumber) {
                $rootScope.hideLoading();
                resultDefer.reject();
            } else {
                this.getFreezedShoppingCartsAsync().then(function (shoppingCarts) {
                    let result = Enumerable.from(shoppingCarts).firstOrDefault(function (sc) {
                        return TableId ? sc.TableId === TableId : sc.TableNumber === TableNumber;
                    });
                    if (result) {
                        $rootScope.hideLoading();
                        resultDefer.resolve(result);
                    } else {
                        $rootScope.hideLoading();
                        resultDefer.reject();
                    }
                }, function () {
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
            let resultDefer = $q.defer();
            $rootScope.showLoading();

            if (id == undefined) {
                $rootScope.hideLoading();
                resultDefer.reject();
            } else {
                $rootScope.dbFreeze.rel.find('ShoppingCart', id).then(function (resShoppingCarts) {
                    const result = Enumerable.from(resShoppingCarts.ShoppingCarts).firstOrDefault();
                    if (result) {
                        $rootScope.hideLoading();
                        resultDefer.resolve(result);
                    } else {
                        $rootScope.hideLoading();
                        resultDefer.reject();
                    }
                }, function () {
                    $rootScope.hideLoading();
                    resultDefer.reject();
                });
            }
            return resultDefer.promise;
        };


        this.getFreezedShoppingCartByBarcodeAsync = function (barcode) {
            let resultDefer = $q.defer();
            $rootScope.showLoading();

            if (barcode == undefined) {
                $rootScope.hideLoading();
                resultDefer.reject();
            } else {
                $http.post("http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":5984/freeze/_find", {
                    "selector": {
                        "data.Barcode": barcode,
                    }
                }).then(function (resShoppingCarts) {
                    let result = Enumerable.from(resShoppingCarts.data.docs).firstOrDefault();
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
                }, function () {
                    $rootScope.hideLoading();
                    resultDefer.reject();
                });
            }
            return resultDefer.promise;
        };

        /**
         * Count the number of matching RK products in shopping cart
         * @param shoppingCart The shopping cart
         * @returns {number} : the number of matching product
         */
        const RKComptage = function (shoppingCart) {
            let compteur = 0;
            for(let item of shoppingCart.Items) {
                if (item.Product.Sku == "rkcompteur") {
                    compteur += item.Quantity;
                }
            }
            return compteur;
        };

        /**
         * Increment counter in database
         * @param shoppingCart The shopping cart
         */
        const RKIncrement = function (shoppingCart) {
            const incr = RKComptage(shoppingCart);
            posService.getUpdRkCounterValueAsync(shoppingCart.HardwareId, incr);
        };

        /**
         * Decrement counter in database
         * @param shoppingCart The shopping cart
         * @param retry number of retry
         */
        const RKDecrement = function (shoppingCart, retry = 0) {
            const decr = RKComptage(shoppingCart);
            posService.getUpdRkCounterValueAsync(shoppingCart.HardwareId, -1 * decr);
        };

        /**
         * Send the ticket in a database shared between POS terminal
         * @param shoppingCart The shopping cart
         */
        this.freezeShoppingCartAsync = function (shoppingCart) {
            let freezeDefer = $q.defer();

            // RK : Appeller la fonction d'incrément d'enfant dans le parc
            RKIncrement(shoppingCart);
            shoppingCart.rev = undefined;
            shoppingCart.id = shoppingCart.Timestamp;

            $rootScope.dbFreeze.rel.save('ShoppingCart', shoppingCart).then(function () {
                freezeDefer.resolve(true);
            }, function (errSave) {
                console.log("freezeShoppingCartAsync Error");
                console.log(errSave);
                freezeDefer.reject(errSave);
            });
            return freezeDefer.promise;
        };

        /** Delete a ticket in the freeze */
        this.unfreezeShoppingCartAsync = function (shoppingCart) {
            let unfreezeDefer = $q.defer();

            // RK : Appeller la fonction de décrément d'enfant dans le parc
            RKDecrement(shoppingCart);

            $rootScope.dbFreeze.rel.del('ShoppingCart', {
                id: shoppingCart.id,
                rev: shoppingCart.rev
            }).then(function () {
                unfreezeDefer.resolve(true);
            }, function (errDel) {
                console.log("unfreezeShoppingCartAsync Error");
                console.log(errDel);
                unfreezeDefer.reject(errDel);
            });
            return unfreezeDefer.promise;
        };

        /**
         * Update the payment for the shopping cart
         */
        this.updatePaymentShoppingCartAsync = function (shoppingCart) {
            let saveDefer = $q.defer();
            const innerSave = function (saveDefer, shoppingCart) {
                try {
                    if (!shoppingCart.Canceled) {
                        // Update the payment mode in case of modification
                        const updatePayments = clone(shoppingCart.PaymentModes);

                        if (shoppingCart.Repaid && shoppingCart.Repaid > 0) {
                            let cashPayment = Enumerable.from(updatePayments).firstOrDefault(function (x) {
                                return x.PaymentType == PaymentType.ESPECE;
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
                saveDefer.resolve({
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
            let savePaymentDefer = $q.defer();
            shoppingCart.id = Number(shoppingCart.Timestamp);
            // Enlever le mode de règlement "Cagnotte" il est déjà pris en compte dans BalanceUpdate
            let PaymentModesWithoutLoyalty = [];

            for(let p of shoppingCart.PaymentModes) {
                if (p.PaymentType !== PaymentType.FIDELITE) {
                    PaymentModesWithoutLoyalty.push(p);
                }
            }
            shoppingCart.PaymentModes = PaymentModesWithoutLoyalty;
            $rootScope.remoteDbZPos.rel.save('ShoppingCart', shoppingCart).then(function () { // Save the ticket
                $rootScope.dbReplicate.rel.save('PaymentEditWithHistory', paymentEdit).then(function () { // Send the event to the BO
                    paymentEdit.PaymentModes = shoppingCart.PaymentModes;
                    posPeriodService.updatePaymentValuesAsync(shoppingCart.yPeriodId, shoppingCart.zPeriodId, shoppingCart.HardwareId, paymentEdit.PaymentModes, oldPaymentValues).then(function () { // Modify the payment
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
         * @param waitingPrint : set if in the validateticket, we send if sync or async
         */
        this.printShoppingCartAsync = function (shoppingCart, printerIdx, isPosTicket, printCount, ignorePrintTicket, nbNote, printDefer, waitingPrint) {
            if(!printDefer){
                printDefer = $q.defer();
            }
            if (!waitingPrint) {
                waitingPrint = $rootScope.borne;
            }
            shoppingCart.PosUserId = $rootScope.PosUserId;
            shoppingCart.PosUserName = $rootScope.PosUserName;
            shoppingCart.ShowNameOnTicket = $rootScope.PosUser === undefined ? false : $rootScope.PosUser.ShowNameOnTicket; // should be defined?
            let shoppingCartPrinterReq = {
                PrinterIp: $rootScope.borne && shoppingCart.ForBorne ? $rootScope.modelPos.localIp : null, // On precise l'IP seulement si on est sur la borne, et qu'on imprime un ticket borne
                PrinterIdx: printerIdx,
                ShoppingCart: shoppingCart,
                IsPosTicket: isPosTicket,
                IsNote: nbNote && nbNote > 0,
                PrintCount: printCount,
                IgnorePrintTicket: ignorePrintTicket,
                PrintQRCode: !isPosTicket && $rootScope.IziBoxConfiguration.PrintProdQRCode,
                NbNote: nbNote,
                ReprintType: "Customer", // TODO: Implement the customer/Internal value of the reprint
                WaitingPrint: waitingPrint
            };

            // TODO : remove the ignorePrintRequest
            // This value was only useful in the previous versions
            // There is no validation without print or email sending
            if (shoppingCartPrinterReq.IgnorePrintTicket === undefined) {
                shoppingCartPrinterReq.IgnorePrintTicket = false;
            }
            if ($rootScope.IziBoxConfiguration.LocalIpIziBox && printCount > 0) {
                let printerApiUrl = "";

                if (isPosTicket) {
                    printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/validateticket";
                } else {
                    // For note impression
                    printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/print";
                }
                this.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer); //FIXME:Décommenter pour imprimer
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
            let printDefer = $q.defer();
            console.log(shoppingCart);
            // TODO: Pop up de choix internal / customer dans le cas du MEV
            const shoppingCartPrinterReq = {
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
            const printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/reprint/";

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
         * @param nbStep number of steps
         */
        this.printProdAsync = function (shoppingCart, step, printDefer, nbStep) {
            //console.log(shoppingCart);
            //Si le printdefer n'a pas été fournis par l'appellant
            if(!printDefer){
                printDefer = $q.defer();
            }
            shoppingCart.PosUserId = $rootScope.PosUserId;
            shoppingCart.PosUserName = $rootScope.PosUserName;

            if ($rootScope.PosUser) {
                shoppingCart.ShowNameOnTicket = $rootScope.PosUser.ShowNameOnTicket;
            }
            const shoppingCartPrinterReq = {
                ShoppingCart: shoppingCart,
                Step: step
            };

            if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
                const printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/printprod";
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
         * @param nbStep number of steps
         */
        this.printShoppingCartPOST = function (printerApiUrl, shoppingCartPrinterReq, printDefer, retry, nbStep) {
            console.log(printerApiUrl);
            console.log(shoppingCartPrinterReq.ShoppingCart.Items);
            let printers = [];

            shoppingCartPrinterReq.ShoppingCart.Items.forEach( (item) => {
                if (item.Product.StoreInfosObject && item.Product.StoreInfosObject.Printer_Id){
                    if(!printers.includes(item.Product.StoreInfosObject.Printer_Id)) {
                        printers.push(item.Product.StoreInfosObject.Printer_Id);
                    }
                }
            });
            
            // Pas de Timeout si  borne ou
            //      * si Print the Prod Ticket(toque) dans la foulé de la validation de ticket
            //      * ou si Print the Prod Ticket(bouton bleu) dans la foulé de la validation de ticket
            //  En effet, il ne faut pas déclancher 2 validations pour le même ticket 
            //  car lorsque WaitingPrint, côté box l'appel est synchone, sinon il est asynchone
            // Sinon
            // 3s par step, plus 1s par imprimantes différente, + 1s prévu pour une potentielle imprimante print all

            nbStep = nbStep ? nbStep : 1;
            //const waitingPrint = shoppingCartPrinterReq.WaitingPrint  ? 3000 : 0;
            const timeout = shoppingCartPrinterReq.WaitingPrint ? null : (nbStep * 3000) + (printers.length * 1000) + 1000;

            $http.post(printerApiUrl, shoppingCartPrinterReq, {timeout: timeout}).then(function (obj) {
                console.log("success post ticket", obj);
                //Set the coucbDb Id and the timestamp that come from the box
                if (shoppingCartPrinterReq.ShoppingCart !== undefined) {
                    let data = obj.data;
                    if (data.ticketId !== undefined) {
                        //shoppingCartPrinterReq.id = obj.ticketId;

                        shoppingCartPrinterReq.ShoppingCart.id = data.ticketId;
                    }
                    if (data.timestamp !== undefined) {
                        shoppingCartPrinterReq.ShoppingCart.Timestamp = data.timestamp;
                    }
                }
                // Lock la validation
                $rootScope.validateLock = true;
                printDefer.resolve(shoppingCartPrinterReq);
            }, function (err) {

                console.log("erreur", err);
                if (err && err.error) {
                    printDefer.reject({request: shoppingCartPrinterReq, error: err.error});
                } else {
                    if (!retry) retry = 1;
                    if (retry < 2) {
                        console.log("Retry print");
                        if($rootScope.borne) {
                            setTimeout(function () {
                                current.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, retry + 1);
                            }, 5000);
                        } else {
                            current.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, retry + 1);
                        }
                    } else {
                        printDefer.reject({request: shoppingCartPrinterReq, error: "Print error"});
                    }
                }
            });
        };

        /**0
         * A basic printing test
         * @param idx The id of the printer selected
         * @param ip The ip of the printer. If specified, we disregard the idx later on
         */
        this.testPrinterAsync = function (idx, ip) {
            let printDefer = $q.defer();
            const printerApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/testprinter";

            $http.post(printerApiUrl, { idx, ip}, {timeout: 10000}).success(function () {
                printDefer.resolve(true);
            }).error(function () {
                printDefer.reject("Print error");
            });
            return printDefer.promise;
        }
    }
]);