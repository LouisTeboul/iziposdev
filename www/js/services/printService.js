app.service('printService', function ($rootScope, $q, $http, $translate, $uibModal, posService) {
    let self = this;

    //Print the last ticket
    this.printLastShoppingCart = () => {
        if ($rootScope.lastShoppingCart) {
            self.reprintShoppingCartAsync($rootScope.lastShoppingCart).then(() => { }, () => {
                swal({ title: $translate.instant("Erreur d'impression du dernier ticket !") });
            });
        } else {
            self.getLastShoppingCartAsync().then((lastShoppingCart) => {
                self.reprintShoppingCartAsync(lastShoppingCart).then(() => { }, () => {
                    swal({ title: $translate.instant("Erreur d'impression du dernier ticket !") });
                });
            }, () => {
                swal({ title: $translate.instant("Dernier ticket introuvable!") });
            });
        }
    };

    //Print a note for the customer - The note doesn't include the shopping cart details
    this.printShoppingCartNote = (shoppingCart) => {
        const continuePrint = (shoppingCart) => {
            // Print the current shopping cart
            if (shoppingCart) {
                let modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalShoppingCartNote.html',
                    controller: 'ModalShoppingCartNoteController',
                    backdrop: 'static'
                });
                modalInstance.result.then((nbNote) => {
                    self.printShoppingCartAsync(shoppingCart, $rootScope.PrinterConfiguration.POSPrinter, false, 1, false, nbNote).then(() => { },
                        () => {
                            swal({
                                title: $translate.instant("Erreur d'impression de la note !")
                            });
                        });
                });
            }
        };
        // Print the last transaction or not
        if (!shoppingCart) {
            if ($rootScope.lastShoppingCart) {
                continuePrint($rootScope.lastShoppingCart);
            } else {
                self.getLastShoppingCartAsync().then((lastShoppingCart) => {
                    continuePrint(lastShoppingCart);
                }, () => {
                    swal({ title: $translate.instant("Dernier ticket introuvable!") });
                });
            }
        } else {
            continuePrint(shoppingCart);
        }
    };

    this.getLastShoppingCartAsync = () => {
        let queryDefer = $q.defer();
        let db = $rootScope.remoteDbZPos ? $rootScope.remoteDbZPos : $rootScope.dbZPos;
        const dateStartKey = new Date().toString("yyyyMMdd");
        let hardwareId = $rootScope.modelPos.hardwareId;

        db.query("zpos/byHidAndDate", {
            startkey: [hardwareId, dateStartKey],
            endkey: [hardwareId, ""],
            limit: 1,
            descending: true
        }).then((resShoppingCarts) => {
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

    //Print the ticket
    this.printPOSShoppingCart = (shoppingCart, ignorePrintTicket) => {
        //The ticket is sent for printing
        const targetPrinter = $rootScope.PrinterConfiguration.POSPrinter;

        // Si forcePrintProd activé, on attend le retour de la validation de ticket (+ impression si impression);
        const waitingPrint = $rootScope.printerConfig.PrintProdAuto === AutoPrintProdType.STEP || $rootScope.printerConfig.PrintProdAuto === AutoPrintProdType.PROD;

        self.printShoppingCartAsync(shoppingCart, targetPrinter, true, 1, ignorePrintTicket, 0, null, waitingPrint).then((result) => {
            console.log("Suite de l'impression");
            //console.log(result);
            if (waitingPrint) {
                // Pas de print prod auto pour un ticket de perte ou un ticket venant de la borne
                if (!shoppingCart.IsLoss && !shoppingCart.FromBorne) {
                    if ($rootScope.printerConfig.PrintProdAuto === AutoPrintProdType.STEP) {
                        // On imprime en cuisine seulement si on a des items non imprimé :
                        // Si on a les step activé, sur la current step
                        if ($rootScope.IziBoxConfiguration.StepEnabled) {
                            if (Enumerable.from(shoppingCart.Items).where(i => i.Step === shoppingCart.CurrentStep).any(i => !i.Printed)) {
                                self.printStepProdShoppingCartAsync($rootScope.lastShoppingCart).then((ret) => {
                                    //console.log(ret);
                                    
                                }, (err) => {
                                    console.error(err);
                                });
                            }
                        }
                        else // Sinon, sur tout le ticket
                        {
                            if (shoppingCart.Items.some(i => !i.Printed)) {
                                self.printStepProdShoppingCartAsync($rootScope.lastShoppingCart).then((ret) => {
                                    //console.log(ret);
                                }, (err) => {
                                    console.error(err);
                                });
                            }
                        }
                    } else if ($rootScope.printerConfig.PrintProdAuto === AutoPrintProdType.PROD) { //Print the Prod Ticket (bouton bleu)
                        self.printProdShoppingCartAsync($rootScope.lastShoppingCart).then((ret) => {
                            //console.log(ret);
                        }, (err) => {
                            console.error(err);
                        });
                    }
                }
            }
        }, (err) => {
            // Possible value in err.result :
            //  - Le service n'a pas répondu. Veuillez essayer de nouveau
            //  - Le ticket est vide, impossible de le valider
            //  - Aucun article n'a été ajouté au ticket, impossible de le valider
            //  - Les moyens de payment ne sont pas renseignés, impossible de valider le ticket
            if (!ignorePrintTicket) {
                if (err.error === undefined) {
                    err.error = "Erreur d'impression caisse !";
                    
                }
                swal({
                    title: $translate.instant(err.error)
                });
                //swal($translate.instant("Erreur d'impression caisse !"));
            }
            //Sauvegarde de la requete dans PouchDb pour stockage ultérieur
            if (err.request) {
                err.request._id = err.request.ShoppingCart.Timestamp.toString();
                $rootScope.dbValidatePool.put(err.request);
            }
        });
    };

    //Send a ticket for production
    this.printProdShoppingCartAsync = (forceShoppingCart) => {
        let printDefer = $q.defer();

        let toPrint = $rootScope.currentShoppingCart;        

        if (forceShoppingCart && forceShoppingCart.Items.length > 0) {
            toPrint = forceShoppingCart;
        }
        if (toPrint && toPrint.Items.length > 0) {
            toPrint.Date = new Date().toString('dd/MM/yyyy H:mm:ss');
            // No line with quantity 0
            toPrint.Items = toPrint.Items.filter(item => item.Quantity > 0);
            self.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.ProdPrinter,
                false, $rootScope.PrinterConfiguration.ProdPrinterCount,
                false, 0, printDefer).then((msg) => { }, () => {
                    swal({
                        title: $translate.instant("Erreur d'impression production !")
                    });
                });
        }
        return printDefer.promise;
    };

    this.printBorneShoppingCartAsync = () => {
        let printDefer = $q.defer();

        if ($rootScope.currentShoppingCart !== undefined && $rootScope.currentShoppingCart.Items.length > 0) {
            $rootScope.currentShoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');
            $rootScope.currentShoppingCart.FromBorne = true;

            if ($rootScope.currentShoppingCart.Residue === 0) {
                $rootScope.currentShoppingCart.isPayed = true;
            }
            // Si le ticket est payé, on imprime une FACTURE sur l'imprimante borne
            // Dans tout les cas on imprime un ticket de prod en caisse
            let toPrint = clone($rootScope.currentShoppingCart);
            // Suppression des lignes à qté 0
            toPrint.Items = $rootScope.currentShoppingCart.Items.filter(item => item.Quantity > 0);

            // Impression borne
            toPrint.ForBorne = true;
            self.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.ProdPrinter,
                $rootScope.currentShoppingCart.isPayed, $rootScope.PrinterConfiguration.ProdPrinterCount, false, 0).then((msg) => {
                    console.log(msg);
                    toPrint.ForBorne = false;
                    // Impression caisse
                    if ($rootScope.PrinterConfiguration.PrintToPos) {
                        toPrint.ForBorne = false;
                        self.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.ProdPrinter, false, 1, false, 0, printDefer).then((msg) => {
                            console.log(msg);
                            // Si le ticket à été payé et validé, c'est tout , on peut clear
                            if ($rootScope.currentShoppingCart.isPayed) {
                                $rootScope.clearShoppingCart();
                            }

                            $rootScope.borneReadyNext = true;
                        }, (err) => {
                            console.error(err);
                        });
                    } else {
                        if ($rootScope.currentShoppingCart.isPayed) {
                            $rootScope.clearShoppingCart();
                        }
                        printDefer.resolve();
                        $rootScope.borneReadyNext = true;
                    }
                }, (err) => {
                    console.error(err);
                });
        }
        return printDefer.promise;
    };

    this.printStepProdCurrentShoppingCartAsync = (updateFreeze = false) => {
        let printDefer = $q.defer();

        if ($rootScope.currentShoppingCart) {
            self.printStepProdShoppingCartAsync($rootScope.currentShoppingCart, updateFreeze, printDefer);
        } else {
            printDefer.reject("No currentshoppingcart");
        }

        return printDefer.promise;
    };

    this.createNewShoppingCart = () => {
        $rootScope.createShoppingCart();
    };

    //Sent the print request to the izibox - It's  the real endpoint to the Rest Service
    //If the print request don't succeed we retry it 3 times
    this.printShoppingCartPOST = (printerApiUrl, shoppingCartPrinterReq, printDefer, retry) => {

        $rootScope.stringifyStoreInfos(shoppingCartPrinterReq.ShoppingCart);

        const timeout = null;

        $http.post(printerApiUrl, shoppingCartPrinterReq, { timeout: timeout }).then((obj) => {
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
            printDefer.resolve(shoppingCartPrinterReq);
        }, (err) => {
            console.log("erreur", err);
            if (err && err.error) {
                printDefer.reject({ request: shoppingCartPrinterReq, error: err.error });
            } else {
                if (!retry) retry = 1;
                if (retry < 2) {
                    console.log("Retry print");
                    if ($rootScope.borne) {
                        setTimeout(() => {
                            self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, retry + 1);
                        }, 5000);
                    } else {
                        self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, retry + 1);
                    }
                } else {
                    printDefer.reject({ request: shoppingCartPrinterReq, error: "Print error" });
                }
            }
        });
    };

    //Print The shopping cart - The credit note
    this.printShoppingCartAsync = (shoppingCart, printerIP, isPosTicket, printCount, ignorePrintTicket, nbNote, printDefer, waitingPrint) => {
        if (!printDefer) {
            printDefer = $q.defer();
        }
        if (!waitingPrint) {
            waitingPrint = $rootScope.borne;
        }
        shoppingCart.PosUserId = $rootScope.PosUserId;
        shoppingCart.PosUserName = $rootScope.PosUserName;
        shoppingCart.ShowNameOnTicket = $rootScope.PosUser === undefined ? false : $rootScope.PosUser.ShowNameOnTicket; // should be defined?
        let shoppingCartPrinterReq = {
            PrinterIp: $rootScope.borne && shoppingCart.ForBorne ? $rootScope.modelPos.localIp : printerIP,
            ShoppingCart: shoppingCart,
            IsPosTicket: isPosTicket,
            IsNote: nbNote && nbNote > 0,
            PrintCount: printCount,
            IgnorePrintTicket: ignorePrintTicket,
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

            if (shoppingCart.IsAccountConsignorPayment) {
                printerApiUrl = $rootScope.APIBaseURL + "/storeConsignorPayment";
            } else {
                if (isPosTicket) {
                    printerApiUrl = $rootScope.APIBaseURL + "/validateticket";
                } else {
                    // For note impression
                    printerApiUrl = $rootScope.APIBaseURL + "/print";
                }
            }

            self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer);
        } else {
            setTimeout(() => {
                printDefer.resolve(shoppingCartPrinterReq);
            }, 100);
        }

        return printDefer.promise;
    };

    this.reprintShoppingCartAsync = (shoppingCart) => {
        let printDefer = $q.defer();
        console.log(shoppingCart);
        // TODO: Pop up de choix internal / customer dans le cas du MEV
        const shoppingCartPrinterReq = {
            PrinterIp: $rootScope.PrinterConfiguration.POSPrinter,
            ShoppingCart: shoppingCart,
            IsPosTicket: true,
            PrintCount: 1,
            IgnorePrintTicket: false,
            NbNote: 0,
            IsReprint: true,
            ReprintType: "Internal"
        };
        const printerApiUrl = $rootScope.APIBaseURL + "/reprint/";

        $http.post(printerApiUrl, shoppingCartPrinterReq, { timeout: 10000 }).success(() => {
            printDefer.resolve(true);
        }).error(() => {
            printDefer.reject("Print error");
        });
        return printDefer.promise;
    };

    //Print ticket for the preparation of the order
    this.printProdAsync = (shoppingCart, step, printDefer) => {
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
        const shoppingCartPrinterReq = {
            ShoppingCart: shoppingCart,
            Step: step
        };

        if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
            const printerApiUrl = $rootScope.APIBaseURL + "/printprod";
            console.log("PrinterApiUrl : " + printerApiUrl);
            //console.log(shoppingCartPrinterReq);
            if ($rootScope.borne) {
                self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, 1);
                if ($rootScope.IziBoxConfiguration.EnableKDS) {
                    posService.sendToKds(shoppingCartPrinterReq, printDefer);
                }
            } else if ($rootScope.UserPreset && $rootScope.UserPreset.PrintProdMode) {
                switch (Number($rootScope.UserPreset.PrintProdMode)) {
                    case PrintProdMode.PRINT:
                        self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, 1);
                        break;
                    case PrintProdMode.KDS:
                        posService.sendToKds(shoppingCartPrinterReq, printDefer);
                        break;
                    case PrintProdMode.PRINTANDKDS:
                        posService.sendToKds(shoppingCartPrinterReq).then(() => {
                        }).catch((err) => {
                            console.error(err);
                        }).then(() => {
                            self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, 1);
                        });
                        break;
                    default:
                        self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, 1);
                        break;
                }
            } else {
                self.printShoppingCartPOST(printerApiUrl, shoppingCartPrinterReq, printDefer, 1);
            }
        } else {
            setTimeout(() => {
                printDefer.resolve(shoppingCartPrinterReq);
            }, 100);
        }
        return printDefer.promise;
    };

    //Send the ticket to the production printer
    //The printing is managing the 'steps'
    this.printStepProdShoppingCartAsync = (shoppingCart, updateFreeze = false, printDefer = null) => {
        if (!printDefer)
            printDefer = $q.defer();

        if (shoppingCart && shoppingCart.Items.length > 0) {
            shoppingCart.DateProd = new Date().toString('dd/MM/yyyy H:mm:ss');

            $rootScope.UpdateDeliverooPrepStage(shoppingCart, ProductionStages.KITCHEN, updateFreeze);

            const shoppingCartProd = clone(shoppingCart);

            self.printProdAsync(shoppingCartProd, shoppingCart.CurrentStep || 0, printDefer).then((req) => {
                delete shoppingCart.ItemsChanged;
                delete shoppingCart.LoyaltyChanged;
                delete shoppingCart.TableChanged;
                for (let item of shoppingCart.Items) {
                    if (item.Step === req.Step) {
                        item.Printed = true;
                        item.PrintCount = item.StepPrintCount ? item.StepPrintCount + 1 : 1;
                        item.StepPrintCount = item.StepPrintCount ? item.StepPrintCount + 1 : 1;
                        item.PrintedQuantity = item.Quantity;
                    }
                    if (item.Attributes) {
                        for (let attr of Array.from(item.Attributes)) {
                            if (attr.Step === req.Step) {
                                attr.Printed = true;
                                attr.PrintCount = attr.PrintCount ? attr.PrintCount + 1 : 1;
                            }
                        }
                        item.PartialPrinted = false;
                        if (item.Attributes.some(x => x.Printed)) {
                            if (item.Attributes.some(x => !x.Printed)) {
                                item.PartialPrinted = true;
                            }
                        }
                    }
                }
                // On met a jour le status si necessaire
                if (!shoppingCart.ProductionStage) {
                    shoppingCart.ProductionStage = ProductionStages.KITCHEN;
                    shoppingCart.StageHistory.InKitchenAt = Date.now();
                }
            }, () => {
                swal({ title: $translate.instant("Erreur d'impression production !") });
            });
        }
        return printDefer.promise;
    };

    //A basic printing test
    //The ip of the printer. If specified, we disregard the idx later on
    this.testPrinterAsync = (ip) => {
        let printDefer = $q.defer();
        const printerApiUrl = $rootScope.APIBaseURL + "/testprinter";

        $http.post(printerApiUrl, { isBorne: $rootScope.borne, ip }, { timeout: 10000 }).success(() => {
            printDefer.resolve(true);
        }).error(() => {
            printDefer.reject("Print error");
        });
        return printDefer.promise;
    };
});