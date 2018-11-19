app.controller('ModalCashRegisterShoppingCartsController', function ($scope, $rootScope, $uibModalInstance, $uibModal, zposService, shoppingCartService, shoppingCartModel, hid, zpid, ypid) {
    let currentFilterAmount = undefined;

    $scope.init = function () {
        $scope.gridColumns = [
            {field: "AliasCaisse", title: "Caisse"},
            {field: "PosUserName", title: "Opérateur"},
            {field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy HH:mm:ss}"},
            {field: "Timestamp", title: "No Ticket", width: 150},
            {field: "TableNumber", title: "Table", width: 80},
            {field: "Total", title: "Total", width: 80},
            {
                template: "<button class='btn btn-default' ng-click='editShopCartItem(dataItem)'><span class='glyphicon glyphicon-pencil'></span></button>",
                title: " ",
                width: 80
            },
            {
                template: "<button class='btn btn-info spaced' ng-click='printNote(dataItem)'>" +
                    "<img style='width:20px;' alt='Image' src='img/receipt.png'/></button>" +
                    "<button class='btn btn-rose spaced' ng-click='selectShopCartItem(dataItem)'>" +
                    "<img style='width:20px;' alt='Image' src='img/print.png'></button>",
                title: " ",
                width: 133
            }
        ];

        //Par default, undefined affiche toute les caisses
        $scope.filterAmount = undefined;

        $scope.loadValues(zpid, hid, ypid, currentFilterAmount);

        // Reload values if amount filtered search
        // On click of a button
        $scope.filterAmountHandler = function () {
            currentFilterAmount = $scope.filterAmount;
            $scope.loadValues(zpid, hid, ypid, currentFilterAmount);
        };
    };

    $scope.displayShoppingCarts = function (shoppingCarts) {

        $scope.gridDatas = new kendo.data.DataSource({
            schema: {
                model: {
                    fields: {
                        PosUserName: {type: "string"},
                        AliasCaisse: {type: "string"},
                        Date: {
                            type: "date", parse: (d) => {
                                return moment(d, 'dd/MM/yyyy HH:mm:ss').toDate();
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
        $scope.gridDatas.sort();
        $scope.loading = false;

    };

    /**
     *
     * @param zpid
     * @param hid
     * @param ypid
     * @param filterAmount
     */
    $scope.loadValues = function (zpid, hid, ypid, filterAmount) {
        $scope.loading = true;

        // Get shopping cart by Hid ZPid
        zposService.getShoppingCartsByPeriodAsync(zpid, hid, ypid).then(function (shoppingCarts) {
            if (isNaN(filterAmount) || filterAmount === 0) {
                $scope.displayShoppingCarts(shoppingCarts);
            } else {
                let filteredShoppingCarts = shoppingCarts.filter(s => s.Total === filterAmount);
                $scope.displayShoppingCarts(filteredShoppingCarts);
            }

        }, function () {
            $scope.loading = false;
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

    /**
     * Print a note - the note doesn't contains the details of the product
     * @param selectedShoppingCart The ticket that is used for a note
     */
    $scope.printNote = function (selectedShoppingCart) {
        shoppingCartModel.printShoppingCartNote(selectedShoppingCart);
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

    $scope.select = function (shoppingCart) {
        $uibModalInstance.close(shoppingCart);
    };

    $scope.ok = function () {
        $uibModalInstance.close();
    };

});