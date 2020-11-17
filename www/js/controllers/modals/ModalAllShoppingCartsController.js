app.controller('ModalAllShoppingCartsController', function ($scope, $q, $rootScope, $uibModalInstance, $uibModal, $mdMedia, $translate, $interval, zposService, productService, posUserService, posPeriodService, taxesService, lossTypeService, printService, loyaltyService, paymentService) {
    let currentDateStart = null;
    let currentDateEnd = null;
    let currentFilterAlias = null;
    let currentFilterAmount = null;
    let currentFilterPaiement = null;
    let dateStartHandler = null;
    let dateEndHandler = null;

    let filterAliasHandler = null;
    let filterPaiementHandler = null;
    let filterAmountHandler = null;
    let currentYPeriods = {};

    $scope.modelItem = {};
    $scope.$mdMedia = $mdMedia;

    let pageSize = 4;

    let loadingInterval = null;
    $scope.acLoadingTimer = 0;

    const handleResize = () => {
        let grid = $("#kendogrid").data("kendoGrid");
        let newPageSize = Math.max(4, 4 + Math.floor((window.innerHeight - 625) / 85));
        if (newPageSize !== pageSize) {
            pageSize = newPageSize;
            grid.dataSource.pageSize(newPageSize);
            grid.refresh();
        }
    }

    $scope.init = () => {
        pageSize = Math.max(4, 4 + Math.floor((window.innerHeight - 625) / 85));

        if ($mdMedia('min-width: 800px')) {
            $scope.gridColumns = [{
                    template: `
                         <img ng-show="dataItem.ParentTicket && !dataItem.Canceled && !dataItem.IsLoss && !dataItem.IsEmployeeMeal && !dataItem.Deleted" src="img/cancel-black.png" width="24" height="24"/>

                         <img ng-if="dataItem.LossTypeUrl" src="{{dataItem.LossTypeUrl}}" width="50" height="50"/>

                         <img ng-show="dataItem.IsEmployeeMeal && !dataItem.Canceled && !dataItem.ParentTicket && !dataItem.IsLoss && !dataItem.Deleted" src="img/employee.png" width="32" height="32"/>
                         <img ng-show="dataItem.Deleted && !dataItem.Canceled && !dataItem.ParentTicket && !dataItem.IsLoss && !dataItem.IsEmployeeMeal" src="img/cashback.png" width="32" height="32"/>
                         <img ng-show="!dataItem.Canceled && !dataItem.ParentTicket && !dataItem.IsLoss && !dataItem.IsEmployeeMeal && !dataItem.Deleted" src="img/valid-black.png" width="32" height="32"/>`,
                    title: "",
                    width: 60
                },
                {
                    template: `<div class="cashMachineName"> {{dataItem.AliasCaisse}}</div>`,
                    title: "Caisse",
                    width: 150
                },
                {
                    field: "PosUserName",
                    title: "Opérateur",
                    width: 100
                },
                {
                    field: "Date",
                    title: "Date",
                    type: "date",
                    format: "{0:dd/MM/yyyy HH:mm:ss}",
                    width: 100
                },
                {
                    field: "Timestamp",
                    title: "No Ticket",
                    width: 120
                },
                {
                    field: "TableNumber",
                    title: "Table",
                    width: 80
                },
                {
                    field: "Total",
                    title: "Total",
                    width: 80
                },
                {
                    template: "" +
                        "<div layout-align='center center' layout='column' ng-show='modelItem[dataItem.yPeriodId]'>" +
                        "<button class='btn btn-default spaced'  ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.IsLoss && !dataItem.IsEmployeeMeal && !dataItem.ParentTicket' ng-click='editShopCartItem(dataItem)' style='display:inline-block'>" +
                        "<span class='glyphicon glyphicon-pencil'></span>" +
                        "</button>" +
                        "<button class='btn btn-rose spaced' ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.OrderId && !dataItem.IsLoss && !dataItem.IsEmployeeMeal && !dataItem.ParentTicket' ng-click='cancelShopCart(dataItem)'>" +
                        "<img style='width:20px;'  alt='Image' src='img/trash.png'/>" +
                        "</button>" +
                        "</div>",
                    title: " ",
                    width: 80
                },
                {
                    template: "" +
                        "<div layout-align='center center' layout='column'>" +
                        "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'><img style='width:20px;' alt='Image' src='img/receipt.png'/></button>" +
                        "<button class='btn btn-warning spaced' ng-click='selectShopCartItem(dataItem)'><img style='width:20px;' alt='Image' src='img/print.png'/></button>" +
                        "</div>",
                    title: " ",
                    width: 80
                }
            ];
        } else {
            $scope.gridColumns = [{
                    field: "AliasCaisse",
                    title: "Caisse"
                },
                {
                    field: "Date",
                    title: "Date",
                    type: "date",
                    format: "{0:dd/MM/yyyy HH:mm:ss}",
                    width: 120
                },
                {
                    field: "Total",
                    title: "Total",
                    width: 80
                },
                {
                    template: "<div layout-align='center center' layout='column'>" +
                        "<div><span ng-show='dataItem.Canceled' class='glyphicon glyphicon-remove' style='color:red; display:inline-block'></span></div>" +
                        "<button class='btn btn-default spaced'  ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.ParentTicket' ng-click='editShopCartItem(dataItem)' style='display:inline-block'>" +
                        "<span class='glyphicon glyphicon-pencil'></span>" +
                        "</button>" +
                        "<button class='btn btn-rose spaced' ng-init='isServiceOpen(dataItem)' ng-show='modelItem[dataItem.yPeriodId] && !dataItem.Deleted && !dataItem.ParentTicket' ng-click='cancelShopCart(dataItem)'>" +
                        "<img style='width:20px;' alt='Image' src='img/trash.png'/>" +
                        "</button>" +
                        "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'><img style='width:20px;' alt='Image' src='img/receipt.png'/></button>" +
                        "<button class='btn btn-warning spaced' ng-click='selectShopCartItem(dataItem)'><img style='width:20px;' alt='Image' src='img/print.png'/></button>" +
                        "</div>",
                    title: " ",
                    width: 80
                }
            ];
        }

        window.addEventListener('resize', handleResize);

        //TODO : Revoir fonctionnement filtres
        $scope.dateStart = new Date();
        $scope.dateEnd = new Date();

        // Par defaut, 0 affiche toute les caisses
        $scope.filterAlias = 0;
        $scope.filterAmount = null;
        //Par default, null affiche toute les caisses
        $scope.filterPaiement = null;

        // Reload values if the dates are changed
        dateStartHandler = $scope.$watch('dateStart', (newvalue, oldvalue) => {
            if (newvalue !== oldvalue) {
                delete $scope.filterPaiement;
                let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
                let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

                if (dateStart !== currentDateStart || dateEnd !== currentDateEnd ||
                    $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                    currentDateStart = dateStart;
                    currentDateEnd = dateEnd;
                    currentFilterAlias = $scope.filterAlias;
                    currentFilterAmount = null;
                    currentFilterPaiement = null;

                    //$scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
                }
            }
        });

        dateEndHandler = $scope.$watch('dateEnd', (newvalue, oldvalue) => {
            if (newvalue !== oldvalue) {
                delete $scope.filterPaiement;
                let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
                let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : null;

                if (dateStart !== currentDateStart || dateEnd !== currentDateEnd ||
                    $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
                    currentDateStart = dateStart;
                    currentDateEnd = dateEnd;
                    currentFilterAlias = $scope.filterAlias;
                    currentFilterAmount = null;
                    currentFilterPaiement = null;

                    $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
                }
            }
        });

        $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
    };

    /**
     * Clear the modals and the dates events
     */
    $scope.$on("$destroy", () => {
        if (dateStartHandler) dateStartHandler();
        if (dateEndHandler) dateEndHandler();
        if (filterAmountHandler) filterAmountHandler();
        if (filterPaiementHandler) filterPaiementHandler();
        if (filterAliasHandler) filterAliasHandler();
        window.removeEventListener('resize', handleResize);
    });

    // Reload values if alias filter has changed
    $scope.updateFilterAlias = (alias) => {
        $scope.filterAlias = alias;
        let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
        let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

        if (dateStart !== currentDateStart || dateEnd !== currentDateEnd ||
            $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
            currentDateStart = dateStart;
            currentDateEnd = dateEnd;
            currentFilterAlias = alias;
            currentFilterAmount = null;
            currentFilterPaiement = null;

            $scope.loadValues($scope.dateStart, $scope.dateEnd, alias, $scope.filterPaiement, $scope.filterAmount);
        }
    };

    // Reload values if paiement filtered search
    $scope.updateFilterPaiement = (paymentMode) => {
        $scope.filterPaiement = paymentMode;
        let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
        let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

        if (dateStart !== currentDateStart || dateEnd !== currentDateEnd ||
            $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
            currentDateStart = dateStart;
            currentDateEnd = dateEnd;
            currentFilterPaiement = paymentMode;
            currentFilterAmount = null;
            currentFilterAlias = null;

            $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, paymentMode, $scope.filterAmount);
        }
    };

    // Reload values if amount filtered search
    $scope.filterAmountHandler = () => {
        let dateStart = $scope.dateStart ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
        let dateEnd = $scope.dateEnd ? $scope.dateEnd.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");

        if (dateStart !== currentDateStart || dateEnd !== currentDateEnd ||
            $scope.filterAlias !== currentFilterAlias || $scope.filterAmount !== currentFilterAmount || $scope.filterPaiement !== currentFilterPaiement) {
            currentDateStart = dateStart;
            currentDateEnd = dateEnd;
            currentFilterAlias = $scope.filterAlias;
            currentFilterAmount = $scope.filterAmount;
            currentFilterPaiement = $scope.filterPaiement;

            $scope.loadValues($scope.dateStart, $scope.dateEnd, $scope.filterAlias, $scope.filterPaiement, $scope.filterAmount);
        }
    };

    $scope.displayShoppingCarts = (shoppingCarts) => {
        //console.log(shoppingCarts);

        let loadKendo = () => {
            if ($mdMedia('min-width: 800px')) {
                $scope.gridDatas =
                    new kendo.data.DataSource({
                        schema: {
                            model: {
                                fields: {
                                    PosUserName: {
                                        type: "string"
                                    },
                                    AliasCaisse: {
                                        type: "string"
                                    },
                                    Date: {
                                        type: "date",
                                        parse: (d) => {
                                            return moment(d, "DD/MM/YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm:ss");
                                        }
                                    },
                                    Timestamp: {
                                        type: "string"
                                    },
                                    TableNumber: {
                                        type: "number"
                                    },
                                    Total: {
                                        type: "number"
                                    }
                                }
                            }
                        },
                        data: shoppingCarts,
                        pageSize,
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
                                    AliasCaisse: {
                                        type: "string"
                                    },
                                    Date: {
                                        type: "date",
                                        parse: function (d) {
                                            return moment(d, "DD/MM/YYYY HH:mm:ss").format("DD/MM/YYYY HH:mm:ss");
                                        }
                                    },
                                    Total: {
                                        type: "number"
                                    }
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

        let nbLossTypeToLoad = shoppingCarts.length;
        if (shoppingCarts.length > 0) {
            Enumerable.from(shoppingCarts).forEach(function (sc) {
                if (sc.IsLoss && sc.LossTypeId && !sc.Canceled && !sc.ParentTicket && !sc.IsEmployeeMeal && !sc.Deleted) {
                    $scope.getLossTypeUrlByIdAsync(sc.LossTypeId).then(function (lossTypeUrl) {
                        sc.LossTypeUrl = lossTypeUrl;
                        nbLossTypeToLoad--;
                        if (nbLossTypeToLoad === 0) {
                            loadKendo();
                        }
                    });
                } else {
                    nbLossTypeToLoad--;
                    if (nbLossTypeToLoad === 0) {
                        loadKendo();
                    }
                }
            });
        } else {
            loadKendo();
        }
    };

    //Modify the ticket
    $scope.editShopCartItem = (selectedShoppingCart) => {
        // TODO : Ajouter un nouveau droit

        if (posUserService.isEnable("DELNF")) {
            console.log(selectedShoppingCart);
            let modalInstance = $uibModal.open({
                templateUrl: 'modals/modalEditShoppingCart.html',
                controller: 'ModalEditShoppingCartController',
                resolve: {
                    shoppingCart: () => {
                        return selectedShoppingCart;
                    }
                },
                backdrop: 'static'
            });
            modalInstance.result.then(() => {}, () => {});
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    const showLoading = () => {
        if (loadingInterval) {
            $interval.cancel(loadingInterval);
            $scope.acLoadingTimer = 0;
        }
        $scope.loading = true;
        loadingInterval = $interval(() => {
            $scope.acLoadingTimer++;
        }, 1000);
    }

    $scope.hideLoading = () => {
        hideLoading();
    }

    const hideLoading = () => {
        if (loadingInterval) {
            $interval.cancel(loadingInterval);
            $scope.acLoadingTimer = 0;
        }
        $scope.loading = false;
    }

    //Load ticket on time frame
    $scope.loadValues = (dateStart, dateEnd, filterAlias, filterPaiement, filterAmount) => {
        showLoading();

        zposService.getShoppingCartsByFilterDateAsync(dateStart, dateEnd, filterAlias, filterPaiement, filterAmount).then((dataLists) => {
            $scope.listAliases = dataLists.Devices.map(d => d.Alias ? d.Alias : d.HardwareId);
            $scope.listPaiements = dataLists.PaymentModes;

            const loadPage = () => {
                $scope.displayShoppingCarts(dataLists.ShoppingCarts);

                hideLoading();
                $scope.$evalAsync();
            };

            let countDone = 0;
            if (dataLists.Devices.length > 0) {
                for (let device of dataLists.Devices) {
                    posPeriodService.getYPeriodAsync(device.HardwareId, null, false, false).then((periodPair) => {
                        currentYPeriods[device.HardwareId] = periodPair.YPeriod;
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

    $scope.isServiceOpen = (line) => {
        if (currentYPeriods[line.HardwareId]) {
            $scope.modelItem[line.yPeriodId] = currentYPeriods[line.HardwareId].id === line.yPeriodId;
        } else {
            $scope.modelItem[line.yPeriodId] = false;
        }
    };

    $scope.getLossTypeUrlByIdAsync = (lossTypeId) => {
        let defer = $q.defer();
        if (lossTypeId && lossTypeId !== 0) {
            lossTypeService.getLossTypeUrlByIdAsync(lossTypeId).then((lossTypePictureUrl) => {
                defer.resolve(lossTypePictureUrl);
            }, () => {
                defer.resolve("");
            });
        } else {
            defer.resolve("");
        }
        return defer.promise;
    };

    //Reprint a ticket
    $scope.selectShopCartItem = (selectedShoppingCart) => {
        selectedShoppingCart.Date = selectedShoppingCart.Date.toString('dd/MM/yyyy H/mm:ss');
        printService.reprintShoppingCartAsync(selectedShoppingCart);
    };

    $scope.cancelShopCart = (selectedShoppingCart) => {
        if (posUserService.isEnable("DELNF")) {
            // On s'assure qu'il n'existe pas de shopping cart
            if (!$rootScope.currentShoppingCart) {
                $rootScope.createShoppingCart(false, false, parseInt(selectedShoppingCart.Timestamp));

                //Recupere la category de taxe du produit
                taxesService.getTaxCategoriesAsync().then((alltaxCategories) => {
                    if (selectedShoppingCart.Items) {
                        for (let i of Array.from(selectedShoppingCart.Items)) {
                            //Recup les taxDetails de l'item
                            let matchedTaxCategory = Enumerable.from(alltaxCategories).firstOrDefault(x => x.TaxCategoryId === i.TaxCategoryId);

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
                                productService.addCartItem(i);
                            }
                        }
                    }

                    if (selectedShoppingCart.Barcode) {
                        loyaltyService.getLoyaltyAsync(selectedShoppingCart.Barcode);
                    }

                    // Annulation de la cagnotte lors de l'intégration de ticket
                    if (selectedShoppingCart.BalanceUpdate && selectedShoppingCart.BalanceUpdate.UpdateValue > 0) {
                        let balanceUpdate = selectedShoppingCart.BalanceUpdate;
                        balanceUpdate.UpdateValue *= -1;
                        loyaltyService.addBalanceUpdate(balanceUpdate);
                    }

                    // On passe les ticket resto du tk original
                    if (selectedShoppingCart.TicketsResto && selectedShoppingCart.TicketsResto.length > 0) {

                        $rootScope.currentShoppingCart.TicketsResto = selectedShoppingCart.TicketsResto;
                    }

                    if (selectedShoppingCart.PaymentModes) {
                        paymentService.addPaymentModesFromAntiTicket(selectedShoppingCart.PaymentModes);
                    }

                    $uibModalInstance.close();
                });
            } else {
                swal({
                    title: $translate.instant("Vous avez déjà un ticket en cours") + "..."
                });
            }
        } else {
            swal({
                title: $translate.instant("Vous n'avez pas les droits nécessaires.")
            });
        }
    };

    //Print a note - the note doesn't contains the details of the product
    $scope.printNote = (selectedShoppingCart) => {
        printService.printShoppingCartNote(selectedShoppingCart);
    };

    $scope.select = (shoppingCart) => {
        $uibModalInstance.close(shoppingCart);
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.openDateStart = ($event) => {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.dateStartOpened = true;
    };

    $scope.openDateEnd = ($event) => {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.dateEndOpened = true;
    };

    //Open the zpos management view
    $scope.showZPos = () => {
        $uibModal.open({
            templateUrl: 'modals/modalZPos.html',
            controller: 'ModalZPosController',
            size: 'max',
            resolve: {
                dateStart: () => {
                    return $scope.dateStart;
                },
                dateEnd: () => {
                    return $scope.dateEnd;
                }
            }
        });
    };
});