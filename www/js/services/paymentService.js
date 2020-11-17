app.service('paymentService', function ($rootScope, $uibModal, $translate, ngToast, Idle, settingService, loyaltyService, taxesService, posPeriodService, printService, stockService, orderService) {
    const self = this;
    $rootScope.paymentModesAvailable = null;

    this.selectPaymentMode = (selectedPaymentMode, customValue, isDirectPayment) => {
        Idle.unwatch();

        if ($rootScope.currentShoppingCart) {
            if (!$rootScope.currentShoppingCart.PaymentModes) {
                $rootScope.currentShoppingCart.PaymentModes = [];
            }

            let exclusivePaymentModes = [PaymentType.ENCOMPTE, PaymentType.DELIVEROO, PaymentType.UBEREATS, PaymentType.JUSTEAT];

            if (!exclusivePaymentModes.includes(selectedPaymentMode.PaymentType)) {
                // Si on renseigne un mode de paiement différent de en compte, on s'assure qu'un paiement en compte n'a pas deja été ajouté
                // Si c'est le cas, on supprime le paiement en compte
                $rootScope.currentShoppingCart.PaymentModes = $rootScope.currentShoppingCart.PaymentModes.filter(pm => !exclusivePaymentModes.includes(pm.PaymentType));
            }
            let currentPaymentMode = undefined;
            //TODO ? let currentPaymentMode = Enumerable.from($rootScope.currentShoppingCart.PaymentModes).firstOrDefault("x => x.Value == '" + selectedPaymentMode.Value + "'");
            let maxValue = null;

            let currentValue = customValue && customValue < $rootScope.currentShoppingCart.Residue ? customValue : $rootScope.currentShoppingCart.Residue;

            // Prevents "cashback" : Le montant de la carte de bleue ne peut dépasser le montant du ticket
            if (selectedPaymentMode.PaymentType === PaymentType.CB || selectedPaymentMode.PaymentType === PaymentType.LYFPAY) {
                maxValue = $rootScope.currentShoppingCart.Residue + (currentPaymentMode ? currentPaymentMode.Total : 0);
            }

            if (selectedPaymentMode.PaymentType === PaymentType.FIDELITE) {
                // Check if we already have a Loyalty payment mode
                let paymentLoyalty = $rootScope.currentShoppingCart.PaymentModes.find(pma => pma.IsBalance && pma.PaymentType === PaymentType.FIDELITE);

                let maxLoyalty = selectedPaymentMode.Balance.Value;

                if (paymentLoyalty) {
                    maxLoyalty = roundValue(maxLoyalty - paymentLoyalty.Total);
                }

                currentValue = Math.min(maxLoyalty, currentValue);
                maxValue = currentValue;
            }

            if (selectedPaymentMode.PaymentType === PaymentType.CBTICKETRESTAURANT) {
                let maxTR = $rootScope.currentShoppingCart.TotalTR;
                if (maxTR !== 0) {
                    currentValue = Math.min(maxTR, currentValue);
                }
                maxValue = currentValue;
            }

            if (!currentPaymentMode) {
                currentPaymentMode = {
                    PaymentType: selectedPaymentMode.PaymentType,
                    Value: selectedPaymentMode.Value,
                    Text: selectedPaymentMode.Text,
                    Options: selectedPaymentMode.Options,
                    Total: currentValue,
                    IsBalance: selectedPaymentMode.IsBalance
                };

                if (selectedPaymentMode.IsBalance) {
                    currentPaymentMode.Balance = selectedPaymentMode.Balance;
                }
            }

            if (!isDirectPayment && ($rootScope.borne || selectedPaymentMode.PaymentType !== PaymentType.ENCOMPTE &&
                    selectedPaymentMode.PaymentType !== PaymentType.DELIVEROO &&
                    selectedPaymentMode.PaymentType !== PaymentType.UBEREATS &&
                    selectedPaymentMode.PaymentType !== PaymentType.JUSTEAT)) {
                let modal = "modals/modalPayment.html";

                if ($rootScope.borne) {
                    modal = "modals/modalPaymentBorne.html";
                }
                // COMMENTER POUR TEST QUAND LE TPA MARCHE PAS
                let modalInstance = $uibModal.open({
                    templateUrl: modal,
                    controller: 'ModalPaymentModeController',
                    resolve: {
                        paymentMode: () => {
                            return currentPaymentMode;
                        },
                        maxValue: () => {
                            return maxValue;
                        }
                    },
                    windowClass: 'mainModals',
                    backdrop: 'static',
                    keyboard: false
                });
                modalInstance.result.then((ret) => {
                    const paymentMode = ret.paymentMode;
                    self.setPaymentMode(paymentMode);
                    // Si c'est Easytransac
                    if (paymentMode.PaymentType === PaymentType.EASYTRANSAC) {
                        // Si le ticket a été totalement payé
                        if ($rootScope.currentShoppingCart.Residue === 0) {
                            // On valide le ticket
                            if ($rootScope.borne) {
                                self.validBorneOrder();
                            } else {
                                self.validShoppingCart();
                            }
                        }
                    } else if (paymentMode.PaymentType === PaymentType.CB || paymentMode.PaymentType === PaymentType.CBTICKETRESTAURANT) {
                        // Si le ticket a été totalement payé
                        if ($rootScope.currentShoppingCart.Residue === 0) {
                            // On valide le ticket
                            if ($rootScope.borne) {
                                self.validBorneOrder();
                            }
                        }
                    } else if ($rootScope.borne) { // On valide si full payé
                        if ($rootScope.currentShoppingCart.Residue === 0) {
                            // On valide le ticket
                            self.validBorneOrder();
                        }
                    }
                }, (err) => {
                    if (selectedPaymentMode && (selectedPaymentMode.PaymentType === PaymentType.CB || selectedPaymentMode.PaymentType === PaymentType.CBTICKETRESTAURANT)) {

                        if ($rootScope.borne && window.tpaPayment) { //MonoPlugin
                            //Quand on cancel un paiement CB Valina, on met un cooldown sur la prochaine validation
                            $rootScope.borneValidationLocked = true;
                            setTimeout(() => {
                                $rootScope.borneValidationLocked = false;
                            }, 3000);
                        }
                    }
                });
            } else {
                $rootScope.currentBarcode.barcodeValue = $rootScope.currentBarcode.barcodeValue.replace(',', '.');
                const b = parseFloat($rootScope.currentBarcode.barcodeValue);

                if (b) {
                    if (b > 0 && (maxValue && b < maxValue) || !maxValue && b < 9999) {
                        currentPaymentMode.Total = b;
                        $rootScope.currentBarcode.barcodeValue = "";
                    }
                }

                if (exclusivePaymentModes.includes(selectedPaymentMode.PaymentType)) {
                    self.removeAllPayments(false);
                    currentPaymentMode.Total = $rootScope.currentShoppingCart.Total;
                }

                if (selectedPaymentMode.PaymentType === PaymentType.ENCOMPTE) {
                    // Check si le client est autoriser a faire ce paiement en compte
                    if ($rootScope.currentShoppingCart.customerAccountConsignor.Balance - $rootScope.currentShoppingCart.Total < -1 * $rootScope.currentShoppingCart.customerAccountConsignor.MaxCredit) {
                        // Si Le paiement de cette commande + l'etat de la balance du client excede le credit maximal autorisé, on refuse d'ajouter le paiement'
                        swal({
                            title: "Ce compte est autorisé à un credit maximum de " + $filter('CurrencyFormat')($rootScope.currentShoppingCart.customerAccountConsignor.MaxCredit)
                        });
                        return;
                    }
                }
                self.setPaymentMode(currentPaymentMode);
            }
        }
    };

    this.addPaymentTypes = (paymentTypeIds) => {
        $rootScope.paymentModesAvailable = [];

        for (let paymentTypeId of paymentTypeIds) {
            const paymentModeExists = $rootScope.paymentModesAvailable.some(p => p.PaymentType === paymentTypeId);
            if (!paymentModeExists) {
                let newPaymentMode = {};
                switch (paymentTypeId) {
                    case PaymentType.DELIVEROO:
                        newPaymentMode = {
                            PaymentType: PaymentType.DELIVEROO,
                            Text: "Deliveroo",
                            Value: "DELIVEROO",
                            IsBalance: false
                        };
                        break;
                    case PaymentType.UBEREATS:
                        newPaymentMode = {
                            PaymentType: PaymentType.UBEREATS,
                            Text: "Uber Eats",
                            Value: "UBEREATS",
                            IsBalance: false
                        };
                        break;
                    case PaymentType.JUSTEAT:
                        newPaymentMode = {
                            PaymentType: PaymentType.JUSTEAT,
                            Text: "Just Eat",
                            Value: "JUSTEAT",
                            IsBalance: false
                        };
                        break;
                }
                $rootScope.paymentModesAvailable.push(newPaymentMode);
            }
        }
        $rootScope.$evalAsync();
        $rootScope.resizeMiniBasket();
    };

    this.removeTicketRestaurantFromCart = (barcode) => {
        let exist = $rootScope.currentShoppingCart.TicketsResto ? $rootScope.currentShoppingCart.TicketsResto.find((TR) => {
            return TR.Barcode === barcode;
        }) : null;
        if (exist) {
            let index = $rootScope.currentShoppingCart.TicketsResto.indexOf(exist);
            $rootScope.currentShoppingCart.TicketsResto.splice(index, 1);
        }
    };

    this.removeCreditFromCart = (barcode) => {
        let exist = $rootScope.currentShoppingCart.Credits ? $rootScope.currentShoppingCart.Credits.find((Credit) => {
            return Credit.Barcode === barcode;
        }) : null;
        if (exist) {
            let index = $rootScope.currentShoppingCart.Credits.indexOf(exist);
            $rootScope.currentShoppingCart.Credits.splice(index, 1);
        }
    };

    this.checkTicketRestaurant = (barcode) => {

        let currentTime = moment();
        //let currentTime = moment("2020-03-02");

        let currentYear = Number(currentTime.year().toString().substr(-1));
        let TRYear = Number(barcode.substr(23, 1));

        let tkResto = {
            Number: barcode.substr(0, 9),
            Key: barcode.substr(9, 2),
            Value: roundValue(parseFloat(barcode.substr(11, 5)) / 100),
            Supplier: barcode.substr(16, 1),
            ControlKey: barcode.substr(17, 2),
            Family: barcode.substr(19, 3),
            Product: barcode.substr(22, 1),
            Year: barcode.substr(23, 1),
            Barcode: barcode
        };

        let sum = Number(tkResto.Number) + Number(tkResto.Key) + Number(barcode.substr(11, 5)) + Number(tkResto.Supplier) + Number(tkResto.Family) + Number(tkResto.Product) + Number(tkResto.Year);
        if (sum % 97 === Number(tkResto.ControlKey)) {
            if (currentYear === 0) {
                // Cas particulier pour les années en 0
                currentYear = 10;
                if (TRYear === 0 || TRYear === 1) {
                    TRYear += 10;
                }
            }
            // pour les années finissant en 1 à 9
            //Si le ticket n'est pas de cette année
            if (TRYear < currentYear) {
                // Traite le cas particulier du changement de decenie
                if (currentYear === 9 && TRYear === 0) {
                    // Le ticket est de la decenie suivante
                }
                // Si neanmoins, il est de l'année derniere
                // Et qu'on est avant le 31 janvier, alors il est valide
                else if (TRYear === currentYear - 1 && (currentTime.month() < 2 || currentTime.month() === 2 && currentTime.date() <= 1)) {
                    console.log("Le ticket est de l'année derniere, mais est valable jusqu'au 1 mars de cette année.");
                } else {
                    swal({
                        title: $translate.instant("Ticket périmé !")
                    });
                    return false;
                }
            }

            return true;
        } else {
            swal({
                title: $translate.instant("Le ticket-restaurant est invalide")
            });

            return false;
        }
    }

    this.addTicketRestaurant = (barcode, forcedShoppingCart = null) => {


        let workingShoppingCart = forcedShoppingCart ? forcedShoppingCart : $rootScope.currentShoppingCart;
        const trValid = self.checkTicketRestaurant(barcode)
        if (trValid) {
            // If the ticket has already been added
            if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.TicketsResto && $rootScope.currentShoppingCart.TicketsResto.length > 0) {
                for (let i = 0; i < $rootScope.currentShoppingCart.TicketsResto.length; i++) {
                    if ($rootScope.currentShoppingCart.TicketsResto[i].Number == barcode.substr(0, 9)) {
                        swal({
                            title: $translate.instant("Le ticket-restaurant a déjà été ajouté!")
                        });
                        return false;
                    }
                }
            }

            // Attention, si il y a plusieurs mode de paiement de type ticket resto, ca peut retourné nimporte lequel
            let tkRestoPaymentMode = $rootScope.paymentModesAvailable.find(pm => pm.PaymentType === PaymentType.TICKETRESTAURANT);

            if (tkRestoPaymentMode) {

                const tkResto = {
                    Number: barcode.substr(0, 9),
                    Key: barcode.substr(9, 2),
                    Value: roundValue(parseFloat(barcode.substr(11, 5)) / 100),
                    Supplier: barcode.substr(16, 1),
                    ControlKey: barcode.substr(17, 2),
                    Family: barcode.substr(19, 3),
                    Product: barcode.substr(22, 1),
                    Year: barcode.substr(23, 1),
                    Barcode: barcode
                };

                const tkRestoPayment = {
                    PaymentType: tkRestoPaymentMode.PaymentType,
                    Value: tkRestoPaymentMode.Value,
                    Text: tkRestoPaymentMode.Text,
                    Total: tkResto.Value,
                    IsBalance: tkRestoPaymentMode.IsBalance,
                    Barcode: barcode
                };
                result = self.addPaymentMode(tkRestoPayment, false, workingShoppingCart);

                if (!result) {
                    swal({
                        title: $translate.instant("Le ticket-restaurant n'a pu être ajouté !")
                    });
                } else {
                    // Add ticketresto to shoppingCart
                    if (!workingShoppingCart.TicketsResto) {
                        workingShoppingCart.TicketsResto = [];
                    }
                    workingShoppingCart.TicketsResto.push(tkResto);


                }
            }
        }

        return trValid;

    };

    this.addCredit = (barcode) => {
        const creditValues = atob(barcode.replace("AV", "")).split("|");

        let credit = {
            id: creditValues[0],
            Barcode: barcode,
            amount: parseFloat(creditValues[1]) / 100,
            storeId: parseInt(creditValues[2]),
            validity: Number(creditValues[3])
        };

        if (!$rootScope.currentShoppingCart.Credits) {
            $rootScope.currentShoppingCart.Credits = [];
        }

        $rootScope.currentShoppingCart.Credits.push(credit);
    };

    this.removeTicketRestaurant = (tkResto) => {
        let idx = $rootScope.currentShoppingCart.TicketsResto.indexOf(tkResto);
        if (idx > -1) {
            $rootScope.currentShoppingCart.TicketsResto.splice(idx, 1);
            let tkRestoPaymentMode = $rootScope.currentShoppingCart.PaymentModes.find(pm => pm.PaymentType === PaymentType.TICKETRESTAURANT);

            if (tkRestoPaymentMode) {
                tkRestoPaymentMode.Total = roundValue(tkRestoPaymentMode.Total - tkResto.Value);
            }
        }
    };

    this.addPaymentModesFromAntiTicket = (selectedPaymentModes) => {
        let result = false;

        if ($rootScope.currentShoppingCart && selectedPaymentModes) {
            let paymentModesAntiTicket = [];
            for (let pm of Array.from(selectedPaymentModes)) {
                pm.Total *= -1;
                paymentModesAntiTicket.push(pm);
            }

            $rootScope.currentShoppingCart.PaymentModes = paymentModesAntiTicket;
            result = true;
        }
        return result;
    };

    this.addPaymentMode = (selectedPaymentMode, isValidCancel, forcedShoppingCart = null) => {
        let result = false;

        let workingShoppingCart = forcedShoppingCart ? forcedShoppingCart : $rootScope.currentShoppingCart;

        if (workingShoppingCart) {
            result = self.setPaymentMode(selectedPaymentMode, isValidCancel, workingShoppingCart);
        }
        return result;
    };

    this.setPaymentMode = (paymentMode, isValidCancel) => {
        let result = false;

        if ($rootScope.currentShoppingCart) {
            console.log($rootScope.currentShoppingCart);
            if (!$rootScope.currentShoppingCart.PaymentModes) {
                $rootScope.currentShoppingCart.PaymentModes = [];
            }

            if (paymentMode && paymentMode.IsBalance && paymentMode.PaymentType === PaymentType.FIDELITE) {
                // UpdateBalance
                let balanceUpdate;
                if ($rootScope.currentShoppingCart.BalanceUpdate) {
                    balanceUpdate = $rootScope.currentShoppingCart.BalanceUpdate;

                    balanceUpdate.UpdateValue = roundValue(balanceUpdate.UpdateValue + paymentMode.Total);
                } else {
                    balanceUpdate = new LoyaltyObjecBalancetUpdateModel();
                    balanceUpdate.Id = paymentMode.Balance ? paymentMode.Balance.Id : undefined;
                    balanceUpdate.UpdateValue = paymentMode.Total;
                    balanceUpdate.BalanceName = paymentMode.Value;
                }

                if (balanceUpdate.UpdateValue !== 0) {
                    $rootScope.currentShoppingCart.BalanceUpdate = balanceUpdate;

                    let paymentLoyalty = $rootScope.currentShoppingCart.PaymentModes.find(pma => pma.IsBalance && pma.PaymentType === PaymentType.FIDELITE);

                    // Remove PaymentType.FIDELITE
                    $rootScope.currentShoppingCart.PaymentModes = $rootScope.currentShoppingCart.PaymentModes.filter(pma => !pma.IsBalance && pma.PaymentType !== PaymentType.FIDELITE);
                    if (paymentLoyalty) {
                        paymentLoyalty.Total = roundValue(paymentLoyalty.Total + paymentMode.Total);
                        $rootScope.currentShoppingCart.PaymentModes.push(paymentLoyalty);
                    } else {
                        $rootScope.currentShoppingCart.PaymentModes.push(paymentMode);
                    }
                } else {
                    $rootScope.currentShoppingCart.BalanceUpdate = undefined;
                    // Remove PaymentType.FIDELITE
                    $rootScope.currentShoppingCart.PaymentModes = $rootScope.currentShoppingCart.PaymentModes.filter(pma => !pma.IsBalance && pma.PaymentType !== PaymentType.FIDELITE);
                }
            } else {
                const idxElem = $rootScope.currentShoppingCart.PaymentModes.indexOf(paymentMode);

                if (idxElem === -1 && (paymentMode.Total != 0 || isValidCancel)) {
                    $rootScope.currentShoppingCart.PaymentModes.push(paymentMode);
                } else if (idxElem !== -1 && paymentMode.Total === 0) {
                    $rootScope.currentShoppingCart.PaymentModes.splice(idxElem, 1);
                }

                // Si c'est un paiement de mode CB, on envoie au TPE

                if (paymentMode && paymentMode.PaymentType === PaymentType.CB && paymentMode.Total > 0 && window.tpePayment && $rootScope.IziBoxConfiguration.EnableTPEIntegration) { // CEF Plugin
                    // Envoie le montant au TPE, sans attendre le retour
                    const amountCts = Math.round(paymentMode.Total * 100);

                    const tpePromise = new Promise((resolve, reject) => {
                        window.tpePayment.initPaymentAsync(amountCts, resolve, reject);
                    });

                    tpePromise.then(() => {}, (err) => {
                        console.error(err);
                    });
                }
            }
            self.calculateTotalFor($rootScope.currentShoppingCart);
            result = true;
            $rootScope.$emit("paymentModesChanged");
        }
        return result;
    };

    this.removeAllPayments = (showWarning = true) => {
        if ($rootScope.currentShoppingCart.TicketsResto) {
            $rootScope.currentShoppingCart.TicketsResto = [];
        }
        if ($rootScope.currentShoppingCart.PaymentModes) {
            $rootScope.currentShoppingCart.PaymentModes = [];
        }
        if ($rootScope.currentShoppingCart.Credits) {
            $rootScope.currentShoppingCart.Credits = [];
        }

        if ($rootScope.currentShoppingCart.BalanceUpdate) {
            $rootScope.currentShoppingCart.BalanceUpdate = null;
        }

        if (showWarning) {
            swal({
                title: $translate.instant("Les modes de règlement déjà saisis ont été supprimés, veuillez les saisir à nouveau")
            });
        }
    };

    this.updatePaymentModes = () => {
        if (!$rootScope.currentShoppingCart || $rootScope.currentShoppingCart && !$rootScope.currentShoppingCart.DeliveryPartnerId) {
            settingService.getPaymentModesAsync().then((paymentSetting) => {
                // Dans le cas du credit d'un compte, on n'autorise que les moyen de paiement CB, Espece, Cheque
                if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.IsAccountConsignorPayment) {
                    let allowedPm = [PaymentType.ESPECE, PaymentType.CB, PaymentType.CHEQUE];
                    $rootScope.paymentModesAvailable = paymentSetting.filter(pm => allowedPm.includes(pm.PaymentType));
                } else {
                    $rootScope.paymentModesAvailable = paymentSetting;
                    if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.customerAccountConsignor) {
                        loyaltyService.addEnCompte();
                    }
                    loyaltyService.calculateLoyalty();
                }

                // Filtre les moyen de paiement par type en fonction de la config
                if ($rootScope.paymentTypesConfig) {
                    $rootScope.paymentModesAvailable = $rootScope.paymentModesAvailable.filter((pma) => {
                        return !(pma.PaymentType in $rootScope.paymentTypesConfig) || $rootScope.paymentTypesConfig[pma.PaymentType];
                    });
                }

                $rootScope.$evalAsync();
                if ($rootScope.resizeMiniBasket && typeof $rootScope.resizeMiniBasket === "function") {
                    $rootScope.resizeMiniBasket();
                }
            }, (err) => {
                console.error(err);
            });
        }
    };

    this.calculateTotal = (truncate = false, calculateDiscount = true, tryApplyDiscount = true) => {
        self.calculateTotalFor($rootScope.currentShoppingCart, truncate, calculateDiscount, tryApplyDiscount);
        if ($rootScope.currentShoppingCart) {
            $rootScope.$emit("shoppingCartTotalChanged", $rootScope.currentShoppingCart.Total);
        }
    };

    this.calculateTotalFor = (shoppingCart, truncate = false, calculateDiscount = true, tryApplyDiscount = true) => {
        if (shoppingCart) {
            if (shoppingCart.shouldTruncate) {
                truncate = true;
            }

            taxesService.calculateAllTotalFor(shoppingCart, truncate, calculateDiscount);
            if (tryApplyDiscount) {
                $rootScope.tryApplyDiscountsShoppingCart(shoppingCart);
            }

            if ($rootScope.currentShoppingCart && shoppingCart === $rootScope.currentShoppingCart) {
                $rootScope.$emit("shoppingCartTotalChanged", $rootScope.currentShoppingCart.Total);
            }
        }
    };

    $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status === "Change" && args.id.indexOf('Setting_') === 0) {
            self.updatePaymentModes();
        }
    });

    this.removeBalanceUpdate = () => {
        $rootScope.currentShoppingCart.BalanceUpdate = undefined;
        self.calculateTotalFor($rootScope.currentShoppingCart);
    };

    //Ticket validation
    this.validShoppingCart = (ignorePrintTicket) => {
        if ($rootScope.currentShoppingCart && $rootScope.currentShoppingCart.IsAccountConsignorPayment || $rootScope.currentShoppingCart && $rootScope.currentShoppingCart.Items.length > 0) {
            $rootScope.showLoading();

            // Si c'est un ticket perte ou repas employé ou un payement en compte ou une commande web payé, on met le residu a 0
            if ($rootScope.currentShoppingCart.IsLoss || $rootScope.currentShoppingCart.IsEmployeeMeal || $rootScope.currentShoppingCart.IsAccountConsignorPayment || $rootScope.currentShoppingCart.isPayed) {
                $rootScope.currentShoppingCart.Residue = 0;
            }

            //The ticket must be paid
            if ($rootScope.currentShoppingCart.Residue !== 0 && !$rootScope.currentShoppingCart.ParentTicket) {
                $rootScope.hideLoading();
                swal({
                    title: $translate.instant("Le ticket n'est pas soldé")
                });
                return;
            }

            // DEPRECATED : On set le parent ticket a deleted au moment de la validation desormais
            // // Annulation NF
            // if ($rootScope.currentShoppingCart.ParentTicket) {
            //     const apiURL = $rootScope.APIBaseURL + "/setTicketToDeletedById";
            //
            //     $http.post(apiURL, $rootScope.currentShoppingCart.ParentTicket).then((ticket) => {
            //     }, (err) => {
            //         console.error(err);
            //     });
            // }

            //Si le ticket est associé à une table
            if ($rootScope.currentShoppingCart.TableNumber) {
                //On stock l'info du temps d'activité de la table
                $rootScope.currentShoppingCart.TableActiveTime = Date.now() - $rootScope.currentShoppingCart.Timestamp - 3600000;
            }

            // Si le ticket est associé à un client
            if ($rootScope.currentShoppingCart.customerLoyalty) {
                //Si le client possède au moins une balance UseToPay
                const hasBalanceUseToPay = $rootScope.currentShoppingCart.customerLoyalty.Balances.find(balance => balance.UseToPay);

                if ($rootScope.IziBoxConfiguration.EnableCredit && hasBalanceUseToPay && $rootScope.currentShoppingCart.Credit > 0) {
                    $rootScope.currentShoppingCart.utpId = hasBalanceUseToPay.Id;
                    // Propose à l'utilisateur de crediter son compte fidélité
                    swal({
                        title: "Cagnotter l'avoir sur le compte fidélité ?",
                        text: $rootScope.currentShoppingCart.Credit + " " + $rootScope.IziPosConfiguration.Currency.currencySymbol + " d'avoir",
                        buttons: [$translate.instant("Non"), $translate.instant("Oui")],
                        dangerMode: true,
                        icon: "warning"
                    }).then((confirm) => {
                        $rootScope.currentShoppingCart.addCreditToBalance = confirm;
                        periodValidation(ignorePrintTicket);
                    });
                } else {
                    periodValidation(ignorePrintTicket);
                }
            } else {
                periodValidation(ignorePrintTicket);
            }
        }
    };

    const periodValidation = (ignorePrintTicket) => {
        // On recupere les periodes courantes et on les affecte au ticket
        // Si besoin est, on demande a l'utilisateur de renseigner le fonds de caisse
        // Pour la nouvelle periode
        let currentDate = new Date();
        $rootScope.currentShoppingCart.Date = currentDate.toString('dd/MM/yyyy H:mm:ss');

        posPeriodService.getYPeriodAsync($rootScope.currentShoppingCart.HardwareId, $rootScope.currentShoppingCart.PosUserId, true, false).then((periodPair) => {
            $rootScope.hideLoading();
            if ($rootScope.currentShoppingCart) {
                $rootScope.currentShoppingCart.yPeriodId = periodPair ? periodPair.YPeriod.id : null;
                $rootScope.currentShoppingCart.zPeriodId = periodPair ? periodPair.YPeriod.zPeriodId : null;
                // Si c'est un ticket perte ou repas employé, on met le residu a 0
                if ($rootScope.currentShoppingCart.IsLoss || $rootScope.currentShoppingCart.IsEmployeeMeal) {
                    $rootScope.currentShoppingCart.Residue = 0;
                    // Et on supprime les paymentModes
                    $rootScope.currentShoppingCart.PaymentModes = [];
                }
                if (periodPair && periodPair.YPeriod) {
                    let ypDate = new Date(periodPair.YPeriod.startDate).getTime();
                    if ($rootScope.currentShoppingCart.Timestamp <= ypDate) {
                        $rootScope.currentShoppingCart.LockedId = $rootScope.currentShoppingCart.Timestamp;
                        let newDate = new Date().getTime();
                        $rootScope.currentShoppingCart.Timestamp = newDate;
                        $rootScope.currentShoppingCart.Id = $rootScope.currentShoppingCart.OrderId || newDate;
                    }
                }

                if (!$rootScope.currentShoppingCart.DateProd) {
                    $rootScope.currentShoppingCart.DateProd = $rootScope.currentShoppingCart.Date;
                }

                let toSave = clone($rootScope.currentShoppingCart);
                //TODO : Add the pos-user to create a ticket from an online order
                // Suppressing line with zero for quantity
                toSave.Items = $rootScope.currentShoppingCart.Items.filter(item => item.Quantity != 0);
                // Si le ticket est READY, a la validation, on passe à collected
                if (toSave.ProductionStage && toSave.ProductionStage === ProductionStages.READY && !toSave.ParentTicket) {
                    $rootScope.UpdateDeliverooPrepStage(toSave, ProductionStages.COLLECTED, false);
                }

                if (!toSave.IsAccountConsignorPayment) {
                    $rootScope.lastShoppingCart = toSave;
                }

                if (!toSave.ParentTicket) {
                    // Move le ticket depuis une clé HID_ vers une clé REPLIC_
                    stockService.moveStockBuffer("HID_" + toSave.HardwareId, "REPLIC_" + toSave.Timestamp);
                }
                // Print Ticket
                printService.printPOSShoppingCart(toSave, ignorePrintTicket);
            }

            $rootScope.clearOrNextShoppingCart();
            $rootScope.hideLoading();

            $rootScope.closeLock = true; // Lock la fermeture de periode
        }, (err) => {
            // Jusqu'a ce que le PaymentValues de la Y period soit update
            //Création d'un ticket en mode dégradé sans YPeriod
            //Dans le cas ou le fetch / creation yPeriod echoue, on ajoute le ticket dans le validatePool et on le supprime le panier ou on passe au panier suivant
            if ($rootScope.currentShoppingCart) {
                $rootScope.currentShoppingCart.yPeriodId = undefined;
                $rootScope.currentShoppingCart.zPeriodId = undefined;

                if (!$rootScope.currentShoppingCart.DateProd) {
                    $rootScope.currentShoppingCart.DateProd = $rootScope.currentShoppingCart.Date;
                }
                $rootScope.currentShoppingCart.PosUserId = $rootScope.PosUserId;
                $rootScope.currentShoppingCart.PosUserName = $rootScope.PosUserName;
                $rootScope.currentShoppingCart.ShowNameOnTicket = $rootScope.PosUser === undefined ? false : $rootScope.PosUser.ShowNameOnTicket; // should be defined?

                $rootScope.stringifyStoreInfos($rootScope.currentShoppingCart);

                let shoppingCartPrinterReq = {
                    PrinterIp: $rootScope.borne && $rootScope.currentShoppingCart.ForBorne ? $rootScope.modelPos.localIp : $rootScope.PrinterConfiguration.POSPrinter,
                    ShoppingCart: $rootScope.currentShoppingCart,
                    IsPosTicket: true,
                    IsNote: false,
                    PrintCount: 1,
                    IgnorePrintTicket: ignorePrintTicket,
                    NbNote: 0,
                    ReprintType: "Customer",
                    WaitingPrint: false
                };

                shoppingCartPrinterReq._id = $rootScope.currentShoppingCart.Timestamp.toString();
                //Sauvegarde de la requete dans PouchDb pour stockage ultérieur
                $rootScope.dbValidatePool.put(shoppingCartPrinterReq);
            }

            $rootScope.clearOrNextShoppingCart();

            $rootScope.hideLoading();
            console.error(err);

            ngToast.create({
                className: 'danger',
                content: '<span class="bold">Le ticket a été ajouté à la pile, il sera intégré lorsque la izibox sera de nouveau accessible</span>',
                dismissOnTimeout: true,
                timeout: 10000,
                dismissOnClick: true
            });
        });
    };

    this.NewTimeStampForClonedShoppingCart = (shoppingCart, index, isCurrent = false) => {
        if (!isCurrent) {
            shoppingCart.dailyTicketId = null;
            shoppingCart.TableCutleries = null;
            shoppingCart.PaymentModes = [];
            shoppingCart.BalanceUpdate = null;
        }

        const timestamp = new Date().addMilliseconds(index).getTime();
        shoppingCart.Timestamp = timestamp;
        shoppingCart.Id = timestamp;

        return shoppingCart;
    };

    this.validBorneOrder = () => {
        if ($rootScope.borne) {
            if ($rootScope.currentShoppingCart.Items.length > 0) {
                $rootScope.showLoading();

                printService.printStepProdCurrentShoppingCartAsync().then(() => {
                    printService.printBorneShoppingCartAsync().then(() => {
                        if ($rootScope.currentShoppingCart) {
                            if ($rootScope.currentShoppingCart.Residue > 0) {
                                orderService.freezeCurrentShoppingCartAsync().then(() => {
                                    // Le freeze s'est bien pass�
                                }, (err) => {
                                    console.error("Erreur freeze : " + err);
                                    swal({
                                        title: $translate.instant("Une erreur s'est produite ! Veuillez r�essayer ou demander de l'aide.")
                                    });
                                });
                            } else {
                                self.validShoppingCart();
                            }
                        }
                    }, () => {
                        swal({
                            title: $translate.instant("Une erreur s'est produite ! Veuillez r�essayer ou demander de l'aide.")
                        });
                    });
                    $rootScope.hideLoading();

                    $uibModal.open({
                        templateUrl: 'modals/modalPostPayment.html',
                        controller: 'ModalPostPaymentController',
                        size: 'lg',
                        backdrop: 'static',
                        windowClass: 'mainModals'
                    });
                }, () => {
                    $rootScope.hideLoading();
                    swal({
                        title: $translate.instant("Une erreur s'est produite ! Veuillez r�essayer ou demander de l'aide.")
                    });
                });
            }
        }
    };
});