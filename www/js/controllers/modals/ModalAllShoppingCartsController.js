app.controller('ModalAllShoppingCartsController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $uibModalStack, $mdMedia, zposService, shoppingCartService, shoppingCartModel, posPeriodService, taxesService) {
    var currentDateStart = undefined;
    var currentDateEnd = undefined;
    var currentFilterAlias = undefined;
    var currentFilterAmount = undefined;
    var currentFilterPaiement = undefined;
    var dateStartHandler = undefined;
    var dateEndHandler = undefined;
    var filterAliasHandler = undefined;

    $scope.modelItem = {};

    $scope.init = function () {

        if ($mdMedia('(min-width: 800px)')) {
            $scope.gridColumns = [
                {field: "alias", title: "Caisse"},
                {field: "PosUserName", title: "Opérateur"},
                {field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy HH:mm:ss}", width: 120},
                {field: "Timestamp", title: "No Ticket", width: 150},
                {field: "TableNumber", title: "Table", width: 100},
                {field: "Total", title: "Total", width: 80},
                {
                    template: "" +

                    "<div layout-align='center center' layout='column'>" +
                    "<div><span ng-show='dataItem.Canceled' class='glyphicon glyphicon-remove' style='color:red; display:inline-block'></span></div>" +
                    "<button class='btn btn-default spaced'  ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId]' ng-click='editShopCartItem(dataItem)' style='display:inline-block'>" +
                    "<span class='glyphicon glyphicon-pencil'></span>" +
                    "</button>" +
                    "<button class='btn btn-rose spaced' ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.ParentTicket' ng-click='cancelShopCart(dataItem)'>" +
                    "<img style='width:20px;'  alt='Image' src='img/trash.png'>" +
                    "</button>" +
                    "</div>", title: " ", width: 80
                },
                {
                    template: "" +
                    "<div layout-align='center center' layout='column'>" +
                    "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'><img style='width:20px;' alt='Image' src='img/receipt.png'></button>" +
                    "<button class='btn btn-warning spaced' ng-click='selectShopCartItem(dataItem)'><img style='width:20px;' alt='Image' src='img/print.png'></button>" +
                    "</div>"
                    , title: " ", width: 80
                }
            ];
        } else {
            $scope.gridColumns = [
                {field: "alias", title: "Caisse"},
                {field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy HH:mm:ss}", width: 120},
                {field: "Total", title: "Total", width: 80},
                {
                    template: "<div layout-align='center center' layout='column'>" +
                    "<div><span ng-show='dataItem.Canceled' class='glyphicon glyphicon-remove' style='color:red; display:inline-block'></span></div>" +
                    "<button class='btn btn-default spaced'  ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId]' ng-click='editShopCartItem(dataItem)' style='display:inline-block'>" +
                    "<span class='glyphicon glyphicon-pencil'></span>" +
                    "</button>" +
                    "<button class='btn btn-rose spaced' ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.ParentTicket' ng-click='cancelShopCart(dataItem)'>" +
                    "<img style='width:20px;'  alt='Image' src='img/trash.png'>" +
                    "</button>" +
                    "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'><img style='width:20px;' alt='Image' src='img/receipt.png'></button>" +
                    "<button class='btn btn-warning spaced' ng-click='selectShopCartItem(dataItem)'><img style='width:20px;' alt='Image' src='img/print.png'></button>" +
                    "</div>", title: " ", width: 80
                }
            ];
        }

        $scope.dateStart = new Date();
        $scope.dateEnd = new Date();

        // Par defaut, 0 affiche toute les caisses
        $scope.filterAlias = 0;
        $scope.filterAmount = 0;
        //Par default, undefined affiche toute les caisses
        $scope.filterPaiement = undefined;
        $scope.filterPaiementId = undefined;

        $scope.filterAliasDisabled = false;
        $scope.filterAmountDisabled = false;
        $scope.filterPaiementDisabled = false;

        // Reload values if the dates are changed
        dateStartHandler = $scope.$watch('dateStart', function () {
            var dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            var dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart != currentDateStart || dateEnd != currentDateEnd || $scope.filterAlias != currentFilterAlias || $scope.filterAmount != currentFilterAmount || $scope.filterPaiement != currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterAlias = $scope.filterAlias;
                currentFilterAmount = undefined;
                currentFilterPaiement = undefined;

                $scope.loadValues(dateStart, dateEnd, $scope.filterAlias, $scope.filterAmount, $scope.filterPaiementId);
            }
        });

        dateEndHandler = $scope.$watch('dateEnd', function () {
            $scope.$evalAsync();
            var dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            var dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : undefined;

            if (dateStart != currentDateStart || dateEnd != currentDateEnd || $scope.filterAlias != currentFilterAlias || $scope.filterAmount != currentFilterAmount || $scope.filterPaiement != currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterAlias = $scope.filterAlias;
                currentFilterAmount = undefined;
                currentFilterPaiement = undefined;

                $scope.loadValues(dateStart, dateEnd, $scope.filterAlias, $scope.filterAmount, $scope.filterPaiementId);
            }
        });

        // Reload values if alias filter has changed
        $scope.updateFilterAlias = function (alias) {
            $scope.filterAlias = alias;
            if ($scope.filterAlias != 0) {
                $scope.filterAmountDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
            var dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            var dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart != currentDateStart || dateEnd != currentDateEnd || $scope.filterAlias != currentFilterAlias || $scope.filterAmount != currentFilterAmount || $scope.filterPaiement != currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterAlias = alias;
                currentFilterAmount = undefined;
                currentFilterPaiement = undefined;

                $scope.loadValues(dateStart, dateEnd, alias, $scope.filterAmount, $scope.filterPaiementId);
            }
        };

        $scope.updateFilterPaiement = function (paiementI, paiementN) {
            $scope.filterPaiement = paiementN;
            $scope.filterPaiementId = paiementI;
            if ($scope.filterPaiement) {
                $scope.filterAmountDisabled = true;
                $scope.filterAliasDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterAliasDisabled = false;
            }
            var dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            var dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart != currentDateStart || dateEnd != currentDateEnd || $scope.filterAlias != currentFilterAlias || $scope.filterAmount != currentFilterAmount || $scope.filterPaiement != currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterPaiement = paiementI;
                currentFilterAmount = undefined;
                currentFilterAlias = undefined;

                $scope.loadValues(dateStart, dateEnd, $scope.filterAlias, $scope.filterAmount, paiementI);
            }
        };

        // Reload values if alias filter has changed
        $scope.isAliasFilterDisabled = $scope.$watch('filterAmount', function () {
            if ($scope.filterAmount != 0) {
                $scope.filterAliasDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAliasDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
        });
        $scope.isPaiementFilterDisabled = $scope.$watch('filterPaiement', function () {
            if ($scope.filterPaiement) {
                $scope.filterAmountDisabled = true;
                $scope.filterAliasDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterAliasDisabled = false;
            }
        });
        $scope.isPaiementFilterDisabled = $scope.$watch('filterAlias', function () {
            if ($scope.filterAlias != 0) {
                $scope.filterAmountDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
        });

        // Reload values if amount filtered search
        // On click of a button
        $scope.filterAmountHandler = function () {
            if ($scope.filterAmount != 0) {
                $scope.filterAliasDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAliasDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
            var dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            var dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart != currentDateStart || dateEnd != currentDateEnd || $scope.filterAlias != currentFilterAlias || $scope.filterAmount != currentFilterAmount || $scope.filterPaiement != currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterAlias = $scope.filterAlias;
                currentFilterAmount = $scope.filterAmount;
                currentFilterPaiement = $scope.filterPaiement;

                $scope.loadValues(dateStart, dateEnd, $scope.filterAlias, $scope.filterAmount, $scope.filterPaiementId);
            }
        };
    };

    /**
     * Clear the modals and the dates events
     */
    $scope.$on("$destroy", function () {
        if (dateStartHandler) dateStartHandler();
        if (dateEndHandler) dateEndHandler();
        if (filterAliasHandler) filterAliasHandler();
    });

    $scope.displayShoppingCarts = function (shoppingCarts) {

        if ($mdMedia('(min-width: 800px)')) {
            $scope.gridDatas =
                new kendo.data.DataSource({
                    schema: {
                        model: {
                            fields: {
                                PosUserName: {type: "string"},
                                alias: {type: "string"},
                                Date: {
                                    type: "date", parse: function (e) {
                                        // HACK -> However, JavaScript does work with mm/dd/yyyy format by default.

                                        var res = e.split("/");
                                        var tmp = res[0];
                                        res[0] = res[1];
                                        res[1] = tmp;
                                        var ldate = res.join("/");
                                        return ldate
                                    }
                                },
                                Timestamp: {type: "string"},
                                TableNumber: {type: "number"},
                                Total: {type: "number"}
                            }
                        }
                    },
                    data: shoppingCarts,
                    pageSize: 4,
                    sort: {
                        field: "Date",
                        dir: "desc"
                    }
                });
        } else {
            $scope.gridDatas =
                new kendo.data.DataSource({
                    schema: {
                        model: {
                            fields: {
                                alias: {type: "string"},
                                Date: {
                                    type: "date", parse: function (e) {
                                        // HACK -> However, JavaScript does work with mm/dd/yyyy format by default.

                                        var res = e.split("/");
                                        var tmp = res[0];
                                        res[0] = res[1];
                                        res[1] = tmp;
                                        var ldate = res.join("/");
                                        return ldate
                                    }
                                },
                                Total: {type: "number"}
                            }
                        }
                    },
                    data: shoppingCarts,
                    pageSize: 4,
                    sort: {
                        field: "Date",
                        dir: "desc"
                    }
                });
        }

        $scope.gridDatas.sort();
        $scope.loading = false;

    };


    /**
     * Modify the ticket
     * @param selectedShoppingCart The ticket to modify
     */
    $scope.editShopCartItem = function (selectedShoppingCart) {
        console.log(selectedShoppingCart);
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalEditShoppingCart.html',
            controller: 'ModalEditShoppingCartController',
            resolve: {
                shoppingCart: function () {
                    return selectedShoppingCart;
                }
            },
            backdrop: 'static'
        });
        modalInstance.result.then(function () {
        }, function () {
        });
    };


    /**
     * Load ticket on time frame
     * @param dateStart The beginning date
     * @param dateEnd The end date
     */
    $scope.loadValues = function (dateStart, dateEnd, filterAlias, filterAmount, filterPaiement) {
        $scope.loading = true;
        if (dateStart && typeof dateStart == "string") {
            dateStart = Date.parseExact(dateStart, "dd/MM/yyyy")
        }
        if (dateEnd && typeof dateEnd == "string") {
            dateEnd = Date.parseExact(dateEnd, "dd/MM/yyyy")
        }

        zposService.getAliasesByDateAsync(dateStart, dateEnd).then(function (a) {

            $scope.aliases = a;
            $scope.listAliases = [];
            $scope.listPaiements = [];

            Enumerable.from(a).forEach(function (b) {
                $scope.listAliases.push(b.alias);
            });
            $scope.listAliases = uniq($scope.listAliases);

            zposService.getPaiementByDateAsync(dateStart, dateEnd).then(function (ans) {
                Enumerable.from(ans).forEach(function (val) {
                    $scope.listPaiements.push(val);
                });

                var tabIds = [], tabPayments = [];
                $scope.listPaiements.forEach((val) => {
                    if (tabIds.indexOf(val.id) == -1) {
                        tabIds.push(val.id);
                        tabPayments.push(val);
                    }
                });
                $scope.listPaiements = tabPayments;
            });

            //Si aucun filtre par alias n'est selectionné
            if (filterAlias == 0) {
                // Si on filtre par Montant
                if (filterAmount != 0) {
                    zposService.getShoppingCartByAmountDateAsync(dateStart, dateEnd, filterAmount).then(function (shoppingCarts) {

                        $scope.displayShoppingCarts(shoppingCarts);

                    }, function () {
                        $scope.loading = false;
                    });
                } else {
                    if (filterPaiement) {
                        zposService.getShoppingCartByPaiementDateAsync(dateStart, dateEnd, filterPaiement).then(function (shoppingCarts) {

                            var tabFilterPaiement = [];
                            shoppingCarts.forEach(function (ticket) {
                                ticket.PaymentModes.forEach(function (payment) {
                                    if (payment.PaymentType == filterPaiement) {
                                        tabFilterPaiement.push(ticket);
                                    }
                                });
                            });

                            $scope.displayShoppingCarts(tabFilterPaiement);

                        }, function () {
                            $scope.loading = false;
                        });
                    } else {
                        $scope.filterAmount = 0;
                        $scope.filterPaiement = undefined;
                        $scope.filterPaiementId = undefined;
                        zposService.getAllShoppingCartsAsync(dateStart, dateEnd, filterAlias).then(function (shoppingCarts) {
                            $scope.displayShoppingCarts(shoppingCarts);

                        }, function () {
                            $scope.loading = false;
                        });
                    }
                }
            } else {
                // Si les tickets sont filtrés par alias
                $scope.filterAmount = 0;
                zposService.getShoppingCartByAliasDateAsync(dateStart, dateEnd, filterAlias).then(function (shoppingCarts) {
                    $scope.displayShoppingCarts(shoppingCarts);
                }, function () {
                    $scope.loading = false;
                });
            }
        });
    };

    /**
     * Reprint a ticket
     * @param selectedShoppingCart The select ticket from the zpos
     */
    $scope.selectShopCartItem = function (selectedShoppingCart) {
        selectedShoppingCart.Date = selectedShoppingCart.Date.toString('dd/MM/yyyy H/mm:ss');
        shoppingCartService.reprintShoppingCartAsync(selectedShoppingCart);
    };

    $scope.cancelShopCart = function (selectedShoppingCart) {

        console.log(selectedShoppingCart);

        // On s'assure qu'il n'existe pas de shopping cart
        if (!shoppingCartModel.getCurrentShoppingCart()) {
            shoppingCartModel.createShoppingCart();
            var csp = shoppingCartModel.getCurrentShoppingCart();
            csp.ParentTicket = parseInt(selectedShoppingCart.Timestamp);

            //Recupere la category de taxe du produit
            taxesService.getTaxCategoriesAsync().then(function (alltaxCategories) {

                Enumerable.from(selectedShoppingCart.Items).forEach(function (i) {
                    //Recup les taxDetails de l'item
                    console.log(i.Product);
                    var matchedTaxCategory = Enumerable.from(alltaxCategories).firstOrDefault(function (x) {
                        return x.TaxCategoryId == i.Product.TaxCategoryId;
                    });

                    if (matchedTaxCategory) {
                        i.Product.TaxCategory = matchedTaxCategory;
                        //Met la quantité en negatif
                        i.Quantity *= -1;
                        if (i.DiscountIT) {
                            i.DiscountIT *= -1;
                        }
                        if (i.DiscountET) {
                            i.DiscountET *= -1;
                        }
                        i.MinQuantity = clone(i.Quantity);
                        shoppingCartModel.addCartItem(i);
                    }
                });

                Enumerable.from(selectedShoppingCart.PaymentModes).forEach(function (pm) {
                    pm.Total *= -1;
                    shoppingCartModel.addPaymentMode(pm, true);
                });

                if (selectedShoppingCart.Barcode) {
                    shoppingCartModel.getLoyalty(selectedShoppingCart.Barcode);
                }

                if (selectedShoppingCart.BalanceUpdate && selectedShoppingCart.BalanceUpdate.UpdateValue > 0) {
                    var balanceUpdate = selectedShoppingCart.BalanceUpdate;
                    balanceUpdate.UpdateValue *= -1;
                    shoppingCartModel.addBalanceUpdate(balanceUpdate);
                }

                $uibModalInstance.close();
            });
        }
    };


    $scope.isServiceOpen = function (line) {
        $scope.modelItem[line.yPeriodId] = false;
        posPeriodService.getYPeriodAsync(line.HardwareId, null, false, false).then(function (yp) {
            $scope.modelItem[line.yPeriodId] = yp.id == line.yPeriodId;

        });
    };


    /**
     * Print a note - the note doesn't contains the details of the product
     * @param selectedShoppingCart The ticket that is used for a note
     */
    $scope.printNote = function (selectedShoppingCart) {
        shoppingCartModel.printShoppingCartNote(selectedShoppingCart);
    };


    $scope.select = function (shoppingCart) {
        $uibModalInstance.close(shoppingCart);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.openDateStart = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.dateStartOpened = true;
    };

    $scope.openDateEnd = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.dateEndOpened = true;
    };

    /**
     * Open the zpos management view
     */
    $scope.showZPos = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalZPos.html',
            controller: 'ModalZPosController',
            size: 'max',
            resolve: {
                dateStart: function () {
                    return $scope.dateStart;
                },
                dateEnd: function () {
                    return $scope.dateEnd;
                }
            }
        });
    };
});