app.controller('ModalCashRegisterShoppingCartsController', function ($scope, $rootScope, $uibModalInstance, $uibModal, zposService, shoppingCartService, printService, hid, zpid, ypid) {
    $scope.filterAmount = 0;
    $scope.filterPayment = "";

    $scope.init = function () {
        $scope.gridColumns = [
            { field: "AliasCaisse", title: "Caisse" },
            { field: "PosUserName", title: "Opérateur" },
            { field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy HH:mm:ss}" },
            { field: "Timestamp", title: "No Ticket", width: 150 },
            { field: "TableNumber", title: "Table", width: 80 },
            { field: "Total", title: "Total", width: 80 },
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

        $scope.loadValues(zpid, hid, ypid);

        // Reload values if amount filtered search
        // On click of a button
        $scope.filterAmountHandler = () => {
            $scope.loadValues(zpid, hid, ypid);
        };

        $scope.updateFilterPayment = (payment) => {
            $scope.filterPayment = payment;
            $scope.loadValues(zpid, hid, ypid);
        };
    };


    $scope.displayShoppingCarts = (shoppingCarts) => {
        $scope.gridDatas = new kendo.data.DataSource({
            schema: {
                model: {
                    fields: {
                        PosUserName: { type: "string" },
                        AliasCaisse: { type: "string" },
                        Date: {
                            type: "date", parse: (d) => {
                                return moment(d, 'DD/MM/yyyy HH:mm:ss').toDate();
                            }
                        },
                        Timestamp: { type: "string" },
                        TableNumber: { type: "number" },
                        Total: { type: "number" }
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

    $scope.loadValues = function (zpid, hid, ypid) {
        $scope.loading = true;

        // Get shopping cart by Hid ZPid
        zposService.getShoppingCartsByPeriodAsync(zpid, hid, ypid).then((shoppingCarts) => {
            $scope.listPaiements = [];
            for (let sc of shoppingCarts) {
                if (sc.PaymentModes) {
                    for (let pm of sc.PaymentModes) {
                        if (!$scope.listPaiements.includes(pm.Value)) {
                            $scope.listPaiements.push(pm.Value);
                        }
                    }
                }
            }

            // Retire de la liste les Shoppingcarts deleted et canceled
            shoppingCarts = shoppingCarts.filter(sc => !sc.Deleted && !sc.Canceled && !sc.ParentTicket);

            if ($scope.filterAmount && parseInt($scope.filterAmount) !== 0) {
                shoppingCarts = shoppingCarts.filter(s => s.Total === parseInt($scope.filterAmount));
            }
            if ($scope.filterPayment) {
                shoppingCarts = shoppingCarts.filter(s => s.PaymentModes.some(p => p.Value === $scope.filterPayment));
            }

            $scope.displayShoppingCarts(shoppingCarts);
        }, function () {
            $scope.loading = false;
        });
    };

    //Reprint a ticket
    $scope.selectShopCartItem = (selectedShoppingCart) => {
        selectedShoppingCart.Date = selectedShoppingCart.Date.toString('dd/MM/yyyy H/mm:ss');
        printService.reprintShoppingCartAsync(selectedShoppingCart);
    };

    //Print a note - the note doesn't contains the details of the product
    $scope.printNote = (selectedShoppingCart) => {
        printService.printShoppingCartNote(selectedShoppingCart);
    };

    //Modify the ticket
    $scope.editShopCartItem = (selectedShoppingCart) => {
        console.log(selectedShoppingCart);
        $uibModal.open({
            templateUrl: 'modals/modalEditShoppingCart.html',
            controller: 'ModalEditShoppingCartController',
            resolve: {
                shoppingCart: () => {
                    return selectedShoppingCart;
                }
            },
            backdrop: 'static'
        });
    };

    $scope.select = (shoppingCart) => {
        $uibModalInstance.close(shoppingCart);
    };

    $scope.ok = () => {
        $uibModalInstance.close();
    };
});