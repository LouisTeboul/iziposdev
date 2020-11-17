app.controller('ModalUnfreezeShoppingCartController', function ($scope, $rootScope, $uibModalInstance, $mdMedia, $interval, $translate, orderService, posPeriodService, productService, posService) {

    $scope.selectedShoppingCarts = [];
    $scope.loading = false;

    let pollingInterval = null;

    $scope.init = () => {
        $scope.ordersLoading = true;
        $scope.ordersLoadingError = null;
        $scope.initOrder(true);

        pollingInterval = $interval(() => {
            $scope.initOrder();
        }, 15000);
        $scope.mdMedia = $mdMedia;
        $scope.webTabActive = $rootScope.UserPreset && $rootScope.UserPreset.DisplayWebOrders && $rootScope.UserPreset.DefaultFreezeActiveTab && $rootScope.UserPreset.DefaultFreezeActiveTab == 1 || $rootScope.IziBoxConfiguration.EnableKDS;
        $scope.localTabActive = !$scope.webTabActive;
    };

    $scope.initOrder = (forceUpdate = false) => {
        orderService.refecthOrdersAsync(forceUpdate).then((orders) => {
            $scope.orders = orders;
            $scope.ordersLoading = false;
        }, (err) => {
            $scope.ordersLoading = false;
            $scope.ordersLoadingError = err;
        });
        //$scope.ordersInProgress = orderService.ordersInProgress;
    };

    $scope.getItemsCount = (shoppingCart) => {
        let itemCount = 0;
        for (let i of shoppingCart.Items) {
            itemCount = itemCount + i.Quantity;
        }
        return roundValue(itemCount);
    };

    const dbFreezeChangedHandler = $rootScope.$on("dbFreezeReplicate", () => {
        //$scope.initFreezed();
        $scope.initOrder();
    });

    // const orderServiceHandler = $rootScope.$on('orderShoppingCartChanged', function () {
    //     $scope.initOrder();
    // });

    $scope.$on("$destroy", () => {
        dbFreezeChangedHandler();
        //orderServiceHandler();
        $interval.cancel(pollingInterval);
    });

    $scope.checkShoppingCart = (order, event) => {      
        let canCheck = !order.isPayed && ($rootScope.IziBoxConfiguration && (!$rootScope.IziBoxConfiguration.EnableKDS || ($rootScope.IziBoxConfiguration.EnableKDS && order.ProductionStage != 'in_kitchen')))

        if(canCheck) {
            let orderChechkbox = document.querySelector("#cbuf" + order.Timestamp);

            if (orderChechkbox.checked) {
                let matchingOrder = $scope.selectedShoppingCarts.find(sc => sc.Timestamp === order.Timestamp);
                const index = $scope.selectedShoppingCarts.indexOf(matchingOrder);
                if (index > -1) {
                    $scope.selectedShoppingCarts.splice(index, 1);
                }
                orderChechkbox.checked = false;
            } else {
                $scope.selectedShoppingCarts.push(order);
                orderChechkbox.checked = true;
            }
        }


        event.stopPropagation();
        event.preventDefault();
    };

    $scope.select = (shoppingCart) => {
        if (!$scope.loading && !$rootScope.currentShoppingCart) {
            $scope.loading = true;

            //association period / shoppingCart
            posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {
                posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezedSc) => {
                    unfreezedSc.IsJoinedShoppingCart = false;
                    $scope.loading = false;
                    $uibModalInstance.close(unfreezedSc);
                }, () => {
                    $scope.loading = false;
                    swal({
                        title: $translate.instant("Erreur !"),
                        text: $translate.instant("Le ticket n'a pas été supprimé."),
                        icon: "error"
                    });
                });
            }, (err) => {
                $scope.loading = false;
                $uibModalInstance.dismiss(err);
            });
        } else if ($rootScope.currentShoppingCart) {
            swal({
                text: $translate.instant("Vous avez déjà un panier en cours."),
                icon: "error"
            });
        }
    };

    $scope.selectOrder = (order) => {
        // ATTENTION
        // On supprime le champ NormalItems si il existe
        if (order.NormalItems) {
            delete order.NormalItems;
        }
        //association period / shoppingCart
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {
            orderService.loadOrderShoppingCartAsync(order).then((loadedOrder) => {
                loadedOrder.IsJoinedShoppingCart = false;
                $uibModalInstance.close(loadedOrder);
            }, () => {
                swal({
                    title: $translate.instant("Erreur !"),
                    text: $translate.instant("Le ticket n'a pas été supprimé."),
                    icon: "error"
                });
            });
        }, (err) => {
            $uibModalInstance.dismiss(err);
        });
    };

    $scope.join = () => {
        $scope.loading = true;
        swal({
            title: $translate.instant("Joindre les tickets sélectionnés ?"),
            buttons: [$translate.instant("Non"), $translate.instant("Oui")],
            dangerMode: true,
            icon: "warning"
        }).then((confirm) => {
            if (confirm) {
                let toJoin = Enumerable.from($scope.selectedShoppingCarts).orderBy(s => s.Timestamp).toArray();

                orderService.joinShoppingCartsAsync(toJoin).then((joined) => {
                    orderService.getUpdDailyTicketValueAsync($rootScope.modelPos.hardwareId, 1).then((dtid) => {
                        joined.dailyTicketId = dtid;
                        $scope.loading = false;
                        $rootScope.$evalAsync();
                        $uibModalInstance.close(joined);
                    });
                });

                // posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId, true, false).then((periodPair) => {

                //     let joinedShoppingCart = toJoin[0];
                //     let tableNumber = toJoin[0].TableNumber;
                //     let tableCutleries = toJoin[0].TableCutleries;
                //     let tableId = toJoin[0].TableId;
                //     let hasTable = toJoin.filter(x => x.TableNumber || x.TableCutleries);

                //     for (let i = 1; i < toJoin.length; i++) {
                //         let curShoppingCart = toJoin[i];
                //         if (toJoin[i].TableCutleries) {
                //             tableCutleries += toJoin[i].TableCutleries;
                //         }
                //         if (!tableId) {
                //             tableId = toJoin[i].TableId;
                //         }
                //         if (!tableNumber) {
                //             tableNumber = toJoin[i].TableNumber;
                //         }
                //         if (!tableCutleries) {
                //             tableCutleries = toJoin[i].TableCutleries;
                //         }
                //         for (let item of curShoppingCart.Items) {
                //             shoppingCartModel.addItemTo(joinedShoppingCart, undefined, item, item.Quantity);
                //         }
                //     }

                //     joinedShoppingCart.TableNumber = tableNumber;
                //     joinedShoppingCart.TableCutleries = tableCutleries;
                //     joinedShoppingCart.TableId = tableId;
                //     joinedShoppingCart.IsJoinedShoppingCart = hasTable.length >= 2;

                //     posService.getUpdDailyTicketValueAsync($rootScope.modelPos.hardwareId, 1).then((dtid) => {
                //         joinedShoppingCart.dailyTicketId = dtid;
                //         orderShoppingCartService.joinShoppingCartsAsync(toJoin, joinedShoppingCart).then((joined) => {
                //             $uibModalInstance.close(joined);
                //         }, (err) => {
                //             console.error("Erreur de join");
                //         });
                //     });

                // }, (err) => {
                //     $uibModalInstance.dismiss(err);
                // });
            } else {
                $scope.loading = false;
                $rootScope.$evalAsync();
            }
        });
    };

    $scope.cancel = () => {
        orderService.cancelRefetch();
        $uibModalInstance.dismiss('cancel');
    };
});