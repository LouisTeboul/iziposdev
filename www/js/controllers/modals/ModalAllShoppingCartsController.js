app.controller('ModalAllShoppingCartsController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $uibModalStack, $mdMedia, zposService, shoppingCartService, shoppingCartModel, posPeriodService, taxesService) {
    let currentDateStart = undefined;
    let currentDateEnd = undefined;
    let currentFilterAlias = undefined;
    let currentFilterAmount = undefined;
    let currentFilterPaiement = undefined;
    let dateStartHandler = undefined;
    let dateEndHandler = undefined;
    let filterAliasHandler = undefined;
    let currentYPeriods = {};

    $scope.modelItem = {};

    $scope.init = function () {

        if ($mdMedia('(min-width: 800px)')) {
            $scope.gridColumns = [
                {field: "AliasCaisse", title: "Caisse"},
                {field: "PosUserName", title: "Opérateur"},
                {field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy HH:mm:ss}", width: 120},
                {field: "Timestamp", title: "No Ticket", width: 150},
                {field: "TableNumber", title: "Table", width: 100},
                {field: "Total", title: "Total", width: 80},
                {
                    template: "" +

                        "<div layout-align='center center' layout='column' ng-show='modelItem[dataItem.yPeriodId]'>" +
                        "<div><span ng-show='dataItem.Canceled' class='glyphicon glyphicon-remove' style='color:red; display:inline-block'></span></div>" +
                        "<button class='btn btn-default spaced'  ng-init='isServiceOpen(dataItem)' ng-click='editShopCartItem(dataItem)' style='display:inline-block'>" +
                        "<span class='glyphicon glyphicon-pencil'></span>" +
                        "</button>" +
                        "<button class='btn btn-rose spaced' ng-init='isServiceOpen(dataItem)' ng-show='!dataItem.Deleted && !dataItem.ParentTicket' ng-click='cancelShopCart(dataItem)'>" +
                        "<img style='width:20px;'  alt='Image' src='img/trash.png'/>" +
                        "</button>" +
                        "</div>", title: " ", width: 80
                },
                {
                    template: "" +
                        "<div layout-align='center center' layout='column'>" +
                        "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'><img style='width:20px;' alt='Image' src='img/receipt.png'/></button>" +
                        "<button class='btn btn-warning spaced' ng-click='selectShopCartItem(dataItem)'><img style='width:20px;' alt='Image' src='img/print.png'/></button>" +
                        "</div>"
                    , title: " ", width: 80
                }
            ];
        } else {
            $scope.gridColumns = [
                {field: "AliasCaisse", title: "Caisse"},
                {field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy HH:mm:ss}", width: 120},
                {field: "Total", title: "Total", width: 80},
                {
                    template: "<div layout-align='center center' layout='column'>" +
                        "<div><span ng-show='dataItem.Canceled' class='glyphicon glyphicon-remove' style='color:red; display:inline-block'></span></div>" +
                        "<button class='btn btn-default spaced'  ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId]' ng-click='editShopCartItem(dataItem)' style='display:inline-block'>" +
                        "<span class='glyphicon glyphicon-pencil'></span>" +
                        "</button>" +
                        "<button class='btn btn-rose spaced' ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.ParentTicket' ng-click='cancelShopCart(dataItem)'>" +
                        "<img style='width:20px;'  alt='Image' src='img/trash.png'/>" +
                        "</button>" +
                        "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'><img style='width:20px;' alt='Image' src='img/receipt.png'/></button>" +
                        "<button class='btn btn-warning spaced' ng-click='selectShopCartItem(dataItem)'><img style='width:20px;' alt='Image' src='img/print.png'/></button>" +
                        "</div>", title: " ", width: 80
                }
            ];
        }

        //TODO : Revoir fonctionnement filtres
        $scope.dateStart = new Date();
        $scope.dateEnd = new Date();

        // Par defaut, 0 affiche toute les caisses
        $scope.filterAlias = 0;
        $scope.filterAmount = 0;
        //Par default, undefined affiche toute les caisses
        $scope.filterPaiement = undefined;
        $scope.filterAliasDisabled = false;
        $scope.filterAmountDisabled = false;
        $scope.filterPaiementDisabled = false;

        // Reload values if the dates are changed
        dateStartHandler = $scope.$watch('dateStart', function (newvalue, oldvalue) {
            if (newvalue !== oldvalue) {
                let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
                let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

                if (dateStart !== currentDateStart || dateEnd !== currentDateEnd
                    || $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                    currentDateStart = dateStart;
                    currentDateEnd = dateEnd;
                    currentFilterAlias = $scope.filterAlias;
                    currentFilterAmount = undefined;
                    currentFilterPaiement = undefined;

                    $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
                }
            }
        });

        dateEndHandler = $scope.$watch('dateEnd', function (newvalue, oldvalue) {
            if (newvalue !== oldvalue) {
                $scope.$evalAsync();
                let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
                let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : undefined;

                if (dateStart !== currentDateStart || dateEnd !== currentDateEnd
                    || $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                    currentDateStart = dateStart;
                    currentDateEnd = dateEnd;
                    currentFilterAlias = $scope.filterAlias;
                    currentFilterAmount = undefined;
                    currentFilterPaiement = undefined;

                    $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
                }
            }
        });

        // Reload values if alias filter has changed
        $scope.updateFilterAlias = function (alias) {
            $scope.filterAlias = alias;
            if ($scope.filterAlias !== 0) {
                $scope.filterAmountDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
            let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart !== currentDateStart || dateEnd !== currentDateEnd
                || $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterAlias = alias;
                currentFilterAmount = undefined;
                currentFilterPaiement = undefined;

                $scope.loadValues($scope.dateStart, $scope.dateEnd, alias, $scope.filterPaiement, $scope.filterAmount);
            }
        };

        // Reload values if paiement filtered search
        $scope.updateFilterPaiement = function (paymentMode) {
            $scope.filterPaiement = paymentMode;
            if ($scope.filterPaiement) {
                $scope.filterAmountDisabled = true;
                $scope.filterAliasDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterAliasDisabled = false;
            }
            let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart !== currentDateStart || dateEnd !== currentDateEnd
                || $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterPaiement = paymentMode;
                currentFilterAmount = undefined;
                currentFilterAlias = undefined;

                $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, paymentMode, $scope.filterAmount);
            }
        };

        // Reload values if amount filtered search
        $scope.filterAmountHandler = function () {
            if ($scope.filterAmount !== 0) {
                $scope.filterAliasDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAliasDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
            let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
            let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

            if (dateStart !== currentDateStart || dateEnd !== currentDateEnd
                || $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                currentDateStart = dateStart;
                currentDateEnd = dateEnd;
                currentFilterAlias = $scope.filterAlias;
                currentFilterAmount = $scope.filterAmount;
                currentFilterPaiement = $scope.filterPaiement;

                $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
            }
        };

        // Reload values if alias filter has changed
        $scope.isAliasFilterDisabled = $scope.$watch('filterAmount', function () {
            if ($scope.filterAmount !== 0) {
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
            if ($scope.filterAlias !== 0) {
                $scope.filterAmountDisabled = true;
                $scope.filterPaiementDisabled = true;
            } else {
                $scope.filterAmountDisabled = false;
                $scope.filterPaiementDisabled = false;
            }
        });

        $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
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
                                AliasCaisse: {type: "string"},
                                Date: {
                                    type: "date", parse: (d) => {
                                        return moment(d,"DD/MM/YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm:ss");
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
                                AliasCaisse: {type: "string"},
                                Date: {
                                    type: "date", parse: function (d) {
                                        return moment(d,"DD/MM/YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm:ss");
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
        $scope.$evalAsync();
    };


    /**
     * Modify the ticket
     * @param selectedShoppingCart The ticket to modify
     */
    $scope.editShopCartItem = function (selectedShoppingCart) {
        console.log(selectedShoppingCart);
        let modalInstance = $uibModal.open({
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
     * @param filterAlias Alias to find
     * @param filterAmount Amount to find
     * @param filterPaiement PaimentMode to find
     */
    $scope.loadValues = function (dateStart, dateEnd, filterAlias, filterPaiement, filterAmount) {
        $scope.loading = true;

        zposService.getShoppingCartsByFilterDateAsync(dateStart, dateEnd, filterAlias, filterPaiement, filterAmount).then(function (dataLists) {
            $scope.listAliases = dataLists.Devices;
            $scope.listPaiements = dataLists.PaymentModes;

            const loadPage = () => {
                $scope.displayShoppingCarts(dataLists.ShoppingCarts);
                $scope.loading = false;
                $scope.$evalAsync();
            };
            let countDone = 0;
            if(dataLists.Devices.length > 0) {
                for (let hardwareId of dataLists.Devices) {
                    posPeriodService.getYPeriodAsync(hardwareId, null, false, false).then(function (yp) {
                        currentYPeriods[hardwareId] = yp;
                        countDone++;
                        if (countDone === dataLists.Devices.length) {
                            loadPage();
                        }
                    }, () => {
                        countDone++;
                        if (countDone === dataLists.Devices.length) {
                            loadPage();
                        }
                    });
                }
            } else {
                loadPage();
            }
        });
    };

    $scope.isServiceOpen = function (line) {
        if(currentYPeriods[line.HardwareId]) {
            $scope.modelItem[line.yPeriodId] = currentYPeriods[line.HardwareId].id === line.yPeriodId;
        } else {
            $scope.modelItem[line.yPeriodId] = false;
        }
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
            let csp = shoppingCartModel.getCurrentShoppingCart();
            csp.ParentTicket = parseInt(selectedShoppingCart.Timestamp);

            //Recupere la category de taxe du produit
            taxesService.getTaxCategoriesAsync().then(function (alltaxCategories) {

                if (selectedShoppingCart.Items) {
                    for (let i of Array.from(selectedShoppingCart.Items)) {
                        //Recup les taxDetails de l'item
                        console.log(i.Product);
                        let matchedTaxCategory = Enumerable.from(alltaxCategories).firstOrDefault(function (x) {
                            return x.TaxCategoryId === i.Product.TaxCategoryId;
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
                    }
                }
                if (selectedShoppingCart.PaymentModes) {
                    for (let pm of Array.from(selectedShoppingCart.PaymentModes)) {
                        pm.Total *= -1;
                        shoppingCartModel.addPaymentMode(pm, true);
                    }
                }
                if (selectedShoppingCart.Barcode) {
                    shoppingCartModel.getLoyalty(selectedShoppingCart.Barcode);
                }

                if (selectedShoppingCart.BalanceUpdate && selectedShoppingCart.BalanceUpdate.UpdateValue > 0) {
                    let balanceUpdate = selectedShoppingCart.BalanceUpdate;
                    balanceUpdate.UpdateValue *= -1;
                    shoppingCartModel.addBalanceUpdate(balanceUpdate);
                }

                $uibModalInstance.close();
            });
        }
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
        $uibModal.open({
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