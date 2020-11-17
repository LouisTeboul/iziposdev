//Main module to manage the POS
app.service('shoppingCartService', function ($http, $rootScope, $q, $uibModal, $mdMedia, $translate, posPeriodService, deliveryService, posService, paymentService, loyaltyService, productService, printService, orderService, stockService) {
    const self = this;

    $rootScope.currentShoppingCartRight = null;
    $rootScope.currentShoppingCartLeft = null;

    $rootScope.lastShoppingCart = null;
    $rootScope.currentShoppingCart = null;
    $rootScope.currentBarcode = {
        barcodeValue: ''
    };

    //Save the payment modification
    //@deprecated this must be saved in another database
    this.savePaymentEditAsync = (shoppingCart, oldPaymentValues) => {
        let savePaymentDefer = $q.defer();
        shoppingCart.id = Number(shoppingCart.Timestamp);

        posPeriodService.editShoppingCartPaymentModesAsync(shoppingCart, oldPaymentValues).then(() => { // Modify the payment
            savePaymentDefer.resolve(shoppingCart.PaymentModes);
        }, (errUpdP) => {
            savePaymentDefer.reject(errUpdP); //update error
        });
        return savePaymentDefer.promise;
    };

    this.checkCreditUsedAsync = (credit) => {
        let creditDefer = $q.defer();

        const creditApiUrl = $rootScope.APIBaseURL + "/checkCredit?barcode=" + credit;

        $http.get(creditApiUrl, {
            timeout: 10000
        }).then((res) => {
            creditDefer.resolve(res);
        }, (err) => {
            creditDefer.reject(err);
        });

        return creditDefer.promise;
    };

    this.checkTicketRestoUsedAsync = (ticketResto) => {
        let ticketRestoDefer = $q.defer();

        const creditApiUrl = $rootScope.APIBaseURL + "/checkTicketResto?barcode=" + ticketResto;

        $http.get(creditApiUrl, {
            timeout: 10000
        }).then((res) => {
            ticketRestoDefer.resolve(res);
        }, (err) => {
            ticketRestoDefer.reject(err);
        });

        return ticketRestoDefer.promise;
    };

    //#region Actions on item
    this.getNbItems = () => {
        let count = 0;
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items.length > 0) {
            for (let i of $rootScope.currentShoppingCart.Items) {
                count += i.Quantity;
            }
        }
        return count;
    };

    // Creates an empty ticket for the splitting features
    this.createShoppingCartRight = () => {
        const timestamp = new Date().getTime();
        $rootScope.currentShoppingCartRight = new ShoppingCart();
        $rootScope.currentShoppingCartRight.TableNumber = undefined;
        $rootScope.currentShoppingCartRight.TableId = undefined;
        $rootScope.currentShoppingCartRight.Items = [];
        $rootScope.currentShoppingCartRight.Timestamp = timestamp;
        $rootScope.currentShoppingCartRight.id = timestamp;
        $rootScope.currentShoppingCartRight.AliasCaisse = $rootScope.modelPos.aliasCaisse;
        $rootScope.currentShoppingCartRight.HardwareId = $rootScope.modelPos.hardwareId;
        $rootScope.currentShoppingCartRight.PosUserId = $rootScope.PosUserId;
        $rootScope.currentShoppingCartRight.PosUserName = $rootScope.PosUserName;
        $rootScope.currentShoppingCartRight.Discounts = clone($rootScope.currentShoppingCart.Discounts);
        $rootScope.currentShoppingCartRight.DeliveryType = $rootScope.currentDeliveryType;
        $rootScope.currentShoppingCartRight.CurrentStep = 0;
        $rootScope.currentShoppingCartRight.StoreId = $rootScope.IziBoxConfiguration.StoreId;
        $rootScope.currentShoppingCartRight.CompanyInformation = $rootScope.cacheCompanyInfo;
        $rootScope.currentShoppingCartRight.addCreditToBalance = false;
        $rootScope.currentShoppingCartRight.PosVersion = $rootScope.Version;
        $rootScope.currentShoppingCartRight.ExtraInfos = "";
        $rootScope.currentShoppingCartRight.shoppingCartQueue = [];
        $rootScope.currentShoppingCartRight.StageHistory = {};

        for (let item of $rootScope.currentShoppingCartRight.Discounts) {
            item.Total = 0;
        }
        //const hdid = $rootScope.modelPos.hardwareId;

        //association period / shoppingCart
        // Pb asyncronisme pour les deux promesses
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {
            //Asociate periods on validate
        }, () => {
            if ($rootScope.modelPos.iziboxConnected) {
                //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                $rootScope.clearShoppingCart();
            }
        });

        return $rootScope.currentShoppingCartRight;
    };

    // Set the receiving ticket for the split
    this.setCurrentShoppingCartRight = (shoppingCart) => {
        $rootScope.currentShoppingCartRight = shoppingCart;
    };

    //Créer le ticket emetteur du split (à partir du ticket courant)
    this.createShoppingCartLeft = () => {
        if (!$rootScope.currentShoppingCart) {
            const timestamp = new Date().getTime();
            $rootScope.currentShoppingCartLeft = new ShoppingCart();
            $rootScope.currentShoppingCartLeft.dailyTicketId = null;
            $rootScope.currentShoppingCartLeft.TableNumber = null;
            $rootScope.currentShoppingCartLeft.TableId = null;
            $rootScope.currentShoppingCartLeft.Items = [];
            $rootScope.currentShoppingCartLeft.Discounts = [];
            $rootScope.currentShoppingCartLeft.Timestamp = timestamp;
            $rootScope.currentShoppingCartLeft.id = timestamp;
            $rootScope.currentShoppingCartLeft.AliasCaisse = $rootScope.modelPos.aliasCaisse;
            $rootScope.currentShoppingCartLeft.HardwareId = $rootScope.modelPos.hardwareId;
            $rootScope.currentShoppingCartLeft.PosUserId = $rootScope.PosUserId;
            $rootScope.currentShoppingCartLeft.PosUserName = $rootScope.PosUserName;
            $rootScope.currentShoppingCartLeft.DeliveryType = $rootScope.currentDeliveryType;
            $rootScope.currentShoppingCartLeft.CurrentStep = 0;
            $rootScope.currentShoppingCartLeft.StoreId = $rootScope.IziBoxConfiguration.StoreId;
            $rootScope.currentShoppingCartLeft.CompanyInformation = $rootScope.cacheCompanyInfo;
            $rootScope.currentShoppingCartLeft.addCreditToBalance = false;
            $rootScope.currentShoppingCartLeft.PosVersion = $rootScope.Version;
            $rootScope.currentShoppingCartLeft.ExtraInfos = "";
            $rootScope.currentShoppingCartLeft.shoppingCartQueue = [];
            $rootScope.currentShoppingCartLeft.StageHistory = {};
            const hdid = $rootScope.modelPos.hardwareId;

            //association period / shoppingCart
            posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {
                //Associate periods on validate
            }, () => {
                if ($rootScope.modelPos.iziboxConnected) {
                    //Si l'izibox est connectée, alors on refuse la création d'un ticket sans Y/ZPeriod
                    $rootScope.clearShoppingCart();
                }
            });
            orderService.getUpdDailyTicketValueAsync(hdid, 1).then((value) => {
                $rootScope.currentShoppingCartLeft.dailyTicketId = value;
            }).then(() => {
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCartLeft);
            });
        } else {
            $rootScope.currentShoppingCartLeft = clone($rootScope.currentShoppingCart);
            const hdid = $rootScope.currentShoppingCartLeft.HardwareId;

            orderService.getUpdDailyTicketValueAsync(hdid, 1).then((value) => {
                $rootScope.currentShoppingCartLeft.dailyTicketId = value;
            }).then(() => {
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCartLeft);
            });
            let cloneItemsArray = [];

            for (let item of $rootScope.currentShoppingCart.Items) {
                if (item.Quantity > 0) {
                    cloneItemsArray.push(clone(item));
                }
            }
            $rootScope.currentShoppingCartLeft.Items = cloneItemsArray;
        }
        return $rootScope.currentShoppingCartLeft;
    };

    this.setCurrentShoppingCartLeft = (shoppingCart) => {
        $rootScope.currentShoppingCartLeft = shoppingCart;
    };

    this.getCurrentShoppingCartRight = () => {
        return $rootScope.currentShoppingCartRight;
    };

    this.getCurrentShoppingCartLeft = () => {
        return $rootScope.currentShoppingCartLeft;
    };

    this.nextStep = () => {
        if ($rootScope.currentShoppingCart) {
            //Récupération de la derniere étape du ticket
            let lastStep = Enumerable.from($rootScope.currentShoppingCart.Items).select(x => x.Step).orderByDescending().firstOrDefault();

            //Si il n'y a pas d'items ou si l'étape est < à l'étape courante, on utilise l'étape courante du ticket
            if (!lastStep || lastStep < $rootScope.currentShoppingCart.CurrentStep) {
                lastStep = $rootScope.currentShoppingCart.CurrentStep;
            }
            const itemsInCurrentStep = true;

            //Si la dernière étape contient des items alors on peut passer à la suivante
            if (itemsInCurrentStep) {
                $rootScope.currentShoppingCart.CurrentStep = lastStep + 1;
                $rootScope.$emit("shoppingCartStepChanged", $rootScope.currentShoppingCart);
            }
        } else {
            $rootScope.createShoppingCart();
        }
    };

    this.setStep = (step) => {
        $rootScope.currentShoppingCart.CurrentStep = step;
        $rootScope.$emit("shoppingCartStepChanged", $rootScope.currentShoppingCart);
    };

    this.removeItemsFromStore = (store) => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items) {
            let itemsFromStore = $rootScope.currentShoppingCart.Items.filter(i => i.StoreId == store.Id);
            if (itemsFromStore && itemsFromStore.length > 0) {
                for (let i of itemsFromStore) {
                    productService.removeItem(i, true);
                }

                swal({
                    title: "Oups!",
                    text: "La commande du magasin " + store.Name + " a été fermée, veuillez nous en excuser. Choisissez une autre enseigne pour poursuivre votre commande",
                    buttons: [false, false],
                    timer: 10000
                });
            }
        }
    };

    this.removeItemsByProduct = (product) => {
        // On supprime tous les items associé au ProductId
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items && $rootScope.currentShoppingCart.ParentTicket) {

            let matchingItems = $rootScope.currentShoppingCart.Items.filter(i => product.Id == i.Product.Id && i.Quantity > 0);
            if (matchingItems && matchingItems.length > 0) {
                for (let i of matchingItems) {
                    productService.removeItem(i, true);
                }

                swal({
                    title: "Oups!",
                    text: "Il semble que le produit " + product.Name + " est en rupture de stock, veuillez nous en excuser.",
                    buttons: [false, false],
                    timer: 10000
                });
            }
        }
    };

    $rootScope.$on("removeItem", (event, product) => {
        self.removeItemsByProduct(product);
    });

    //Cancel the shopping cart - The event should be logged
    this.cancelShoppingCartAndSend = () => {
        productService.currentItems = [];
        //$rootScope.PhoneOrderMode = false; // Retabli le mode de fonctionnement normal
        $rootScope.currentDeliveryType = 0; //Reset le mode de consommation à sur place
        if ($rootScope.currentShoppingCart) {
            //console.log($rootScope.currentShoppingCart);
            const hdid = $rootScope.currentShoppingCart.HardwareId;
            //posService.getUpdDailyTicketAsync(hdid, -1);
            $rootScope.showLoading();
            let currentDate = new Date();
            $rootScope.currentShoppingCart.Date = currentDate.toString('dd/MM/yyyy H:mm:ss');
            $rootScope.currentShoppingCart.Canceled = true;

            let toPrint = angular.copy($rootScope.currentShoppingCart);

            //Si la sauvegarde du ticket validé est ok, on supprime éventuellement les tickets splittés.
            $rootScope.currentShoppingCartRight = null;

            if ($rootScope.currentShoppingCartLeft) {
                $rootScope.currentShoppingCart = clone($rootScope.currentShoppingCartLeft);
                $rootScope.currentDeliveryType = $rootScope.currentShoppingCart.DeliveryType;
                $rootScope.currentShoppingCartLeft = null;
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
            } else {
                $rootScope.clearShoppingCart();
            }

            printService.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.POSPrinter, true, 1, true).then(() => {
                $rootScope.hideLoading();
                //cancelContinue();
            }, (err) => {
                //Sauvegarde de la requete dans PouchDb pour stockage ultérieur
                $rootScope.hideLoading();
                if (err.request) {
                    err.request._id = err.request.ShoppingCart.Timestamp.toString();
                    $rootScope.dbValidatePool.put(err.request);
                }
                //cancelContinue();
            });
        }
    };

    $rootScope.clearOrNextShoppingCart = () => {
        // Once the ticket saved we delete the splitting ticket
        $rootScope.currentShoppingCartRight = null;

        if ($rootScope.currentShoppingCartLeft || $rootScope.currentShoppingCart && $rootScope.currentShoppingCart.shoppingCartQueue && $rootScope.currentShoppingCart.shoppingCartQueue.length > 0) {
            if ($rootScope.currentShoppingCartLeft && $rootScope.currentShoppingCartLeft.Items && $rootScope.currentShoppingCartLeft.Items.length > 0) {
                $rootScope.currentShoppingCart = clone($rootScope.currentShoppingCartLeft);
                $rootScope.currentDeliveryType = $rootScope.currentShoppingCart.DeliveryType;
                $rootScope.currentShoppingCartLeft = undefined;
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
            } else if ($rootScope.currentShoppingCart.shoppingCartQueue.length > 0) {
                if (!$rootScope.currentShoppingCart.splitAmountPaid) {
                    $rootScope.currentShoppingCart.splitAmountPaid = 0;
                }
                const q = $rootScope.currentShoppingCart.shoppingCartQueue; //Stock la queue du ticket précédent
                const osp = $rootScope.currentShoppingCart.origShoppingCart; // Stock le ticket original
                let sumSplitItems = $rootScope.currentShoppingCart.Items.reduce((acc, cur) => {
                    if (cur.isPartSplitItem) {
                        acc += cur.PriceIT;
                    }
                    return acc;
                }, 0);
                const sap = $rootScope.currentShoppingCart.splitAmountPaid + sumSplitItems;
                $rootScope.currentShoppingCart = clone($rootScope.currentShoppingCart.shoppingCartQueue[0]); //Affecte le shopping cart suivant de la queue
                $rootScope.currentShoppingCart.shoppingCartQueue = q; //Raffecte la queue au nouveau current shoppingcart
                $rootScope.currentShoppingCart.shoppingCartQueue.splice(0, 1);

                $rootScope.currentShoppingCart.origShoppingCart = osp;
                $rootScope.currentShoppingCart.splitAmountPaid = sap;

                $rootScope.currentDeliveryType = $rootScope.currentShoppingCart.DeliveryType;
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);

                //Affecte le numéro dailyticket
                if (!$rootScope.currentShoppingCart.dailyTicketId) {
                    orderService.getUpdDailyTicketValueAsync($rootScope.currentShoppingCart.hardwareId, 1).then((cashRegisterTicketId) => {
                        $rootScope.currentShoppingCart.dailyTicketId = cashRegisterTicketId;
                    }).then(() => {
                        $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                        if ($rootScope.currentShoppingCart.shoppingCartQueue.length === 0) {
                            $rootScope.currentShoppingCart.shoppingCartQueue = [];
                        }
                    }, (err) => {
                        console.log('error getting daily ticket ', err);
                    });
                }
            } else {
                $rootScope.clearShoppingCart();
            }
        } else {
            // Dans le cas de la validation d'un ticket, on ne clear pas le buffer comme ca
            $rootScope.clearShoppingCart(false);
        }
    };

    this.unfreezeShoppingCartById = (id) => {
        const unfreezeDefer = $q.defer();
        if (!$rootScope.currentShoppingCart) {
            orderService.getFreezeAndOrderShoppingCartByIdAsync(id).then((shoppingCart) => {
                posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezeSp) => {
                    unfreezeSp.DontAutoLoad = false;

                    unfreezeSp.Discounts = unfreezeSp.Discounts ? unfreezeSp.Discounts : [];
                    unfreezeSp.Items = unfreezeSp.Items ? unfreezeSp.Items : [];
                    deliveryService.upgradeCurrentShoppingCartAndDeliveryType(unfreezeSp);

                    paymentService.calculateTotal();
                    loyaltyService.calculateLoyalty();

                    $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                    unfreezeDefer.resolve();
                });
            }, () => {
                unfreezeDefer.reject();
                swal({
                    title: $translate.instant("Ticket introuvable") + "..."
                });
            });
        } else {
            unfreezeDefer.reject();
            swal({
                title: $translate.instant("Vous avez déjà un ticket en cours") + "..."
            });
        }
        return unfreezeDefer.promise;
    };

    this.unfreezeShoppingCartByBarcodeAsync = (barcode) => {
        const unfreezeDefer = $q.defer();
        if (!$rootScope.currentShoppingCart) {
            orderService.getFreezedShoppingCartByBarcodeAsync(barcode).then((shoppingCart) => {
                posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezedSc) => {
                    unfreezedSc.Discounts = unfreezedSc.Discounts ? unfreezedSc.Discounts : [];
                    unfreezedSc.Items = unfreezedSc.Items ? unfreezedSc.Items : [];
                    deliveryService.upgradeCurrentShoppingCartAndDeliveryType(unfreezedSc);
                    paymentService.calculateTotal();
                    loyaltyService.calculateLoyalty();

                    console.log("on a recup le ticket suivant : ");
                    console.log($rootScope.currentShoppingCart);

                    $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);
                    unfreezeDefer.resolve();
                }, (err) => {
                    console.error(err);
                    unfreezeDefer.reject();
                });
            }, () => {
                console.log("pas de ticket dans le freeze pour le barcode ", barcode);
                unfreezeDefer.reject();
            });
        } else {
            swal({
                title: $translate.instant("Vous avez déjà un ticket en cours") + "..."
            });
            unfreezeDefer.reject();
        }
        return unfreezeDefer.promise;
    };

    this.unfreezeShoppingCart = () => {
        if (!$rootScope.currentShoppingCart || !$rootScope.currentShoppingCart.Items || $rootScope.currentShoppingCart.Items.length === 0) {
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalUnfreezeShoppingCart.html',
                controller: 'ModalUnfreezeShoppingCartController',
                size: $mdMedia('min-width: 1300px') ? 'xlg' : 'max',
                backdrop: 'static'
            });

            modalInstance.result.then((shoppingCart) => {
                $rootScope.clearShoppingCart(false);
                shoppingCart.Discounts = shoppingCart.Discounts ? shoppingCart.Discounts : [];
                shoppingCart.Items = shoppingCart.Items ? shoppingCart.Items : [];
                deliveryService.upgradeCurrentShoppingCartAndDeliveryType(shoppingCart);

                paymentService.calculateTotal();
                loyaltyService.calculateLoyalty();
                $rootScope.$emit("shoppingCartChanged", $rootScope.currentShoppingCart);

                if (shoppingCart.IsJoinedShoppingCart) {
                    deliveryService.selectTableNumberAsync();
                }
            }, (err) => {
                //console.log("shoppingCartService UnfreezeShoppingCart");
                //console.error(err);
            });
        } else {
            swal({
                title: $translate.instant("Vous avez déjà un ticket en cours") + "..."
            });
        }
    };

    this.clearShoppingCartItem = () => {
        if ($rootScope.currentShoppingCart) {
            productService.currentPossibleMenus = [];
            stockService.clearStockBuffer();

            // clear les items
            if ($rootScope.currentShoppingCart.Items) {
                $rootScope.currentShoppingCart.Items.length = 0;
            }
            if ($rootScope.currentShoppingCart.PaymentModes) {
                $rootScope.currentShoppingCart.PaymentModes.length = 0;
            }
            if ($rootScope.currentShoppingCart.TaxDetails) {
                $rootScope.currentShoppingCart.TaxDetails.length = 0;
            }

            $rootScope.currentShoppingCartRight = undefined;
            $rootScope.currentShoppingCartLeft = undefined;

            paymentService.calculateTotal();
            paymentService.updatePaymentModes();
        }
    };
});