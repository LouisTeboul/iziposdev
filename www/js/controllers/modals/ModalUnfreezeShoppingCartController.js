app.controller('ModalUnfreezeShoppingCartController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $mdMedia, shoppingCartService, shoppingCartModel, $translate, orderShoppingCartService) {
    var tryGetFreezed = 0;
    var isClosed = false;

    $scope.selectedShoppingCarts = [];

    $scope.init = function () {
        $scope.initFreezed();
        $scope.initOrder();
        $scope.$mdMedia = $mdMedia;
    };

    $scope.initFreezed = function () {
        $scope.shoppingCarts = [];
        shoppingCartService.getFreezedShoppingCartsAsync().then(function (shoppingCarts) {
            $scope.shoppingCarts = Enumerable.from(shoppingCarts).orderBy(function (s) {
                if (s.TableNumber != undefined) {
                    return s.TableNumber;
                } else {
                    return s.Timestamp;
                }
            }).toArray();
        }, function (err) {
            if (tryGetFreezed < 3) {
                tryGetFreezed = tryGetFreezed + 1;
                setTimeout(function () {
                    $scope.initFreezed();
                }, 3000);
            }
        });
        $scope.$evalAsync();
    };

    $scope.initOrder = function () {
        $scope.orders = orderShoppingCartService.orders;
        $scope.ordersInProgress = orderShoppingCartService.ordersInProgress;
    };

    var dbFreezeChangedHandler = $rootScope.$on('dbFreezeReplicate', function (event, args) {
        $scope.initFreezed();
    });

    var orderServiceHandler = $rootScope.$on('orderShoppingCartChanged', function () {
        $scope.initOrder();
    });


    $scope.$on("$destroy", function () {
        dbFreezeChangedHandler();
        orderServiceHandler();
        isClosed = true;
    });

    $scope.getItemsCount = function (shoppingCart) {
        var itemCount = 0;

        Enumerable.from(shoppingCart.Items).forEach(function (i) {
            itemCount = itemCount + i.Quantity;
        });

        return roundValue(itemCount);
    };

    $scope.checkShoppingCart = function (shoppingCart, event) {
        if (event.toElement.checked) {
            $scope.selectedShoppingCarts.push(shoppingCart);
        } else {
            var index = $scope.selectedShoppingCarts.indexOf(shoppingCart);
            if (index > -1) {
                $scope.selectedShoppingCarts.splice(index, 1);
            }
        }
    };

    $scope.removeShoppingCart = function (shoppingCart) {
        swal({
                title: $translate.instant("Supprimer le ticket ?"),
                text: "",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d83448",
                confirmButtonText: $translate.instant("Oui"),
                cancelButtonText: $translate.instant("Non"),
                closeOnConfirm: true
            },
            function () {
                shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function () {
                    $scope.initFreezed();
                }, function () {
                    swal($translate.instant("Erreur !"), $translate.instant("Le ticket n'a pas été supprimé."), "error");
                });
            });
    };

    $scope.select = function (shoppingCart) {
        shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function () {
            $uibModalInstance.close(shoppingCart);
        }, function () {
            swal($translate.instant("Erreur !"), $translate.instant("Le ticket n'a pas été supprimé."), "error");
        });
    };

    $scope.selectOrder = function (order) {
        orderShoppingCartService.loadOrderShoppingCartAsync(order).then(function () {
            $uibModalInstance.close(order);
        });
    };

    $scope.join = function () {
        swal({
            title: $translate.instant("Joindre les tickets sélectionnés ?"),
            text: "",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d83448",
            confirmButtonText: $translate.instant("Oui"),
            cancelButtonText: $translate.instant("Non"),
            closeOnConfirm: true
        }, function () {
            var toJoin = Enumerable.from($scope.selectedShoppingCarts).orderBy("s=>s.Timestamp").toArray();

            Enumerable.from($scope.selectedShoppingCarts).forEach(function (s) {
                //ATTENTION
                //Bricolage, a amélioré
                //Permet que le RK compteur soit décrémenté correctement
                //Sinon on a des pn de missing rev
                setTimeout(function () {
                    shoppingCartService.unfreezeShoppingCartAsync(s);
                }, 100)

            });

            var joinedShoppingCart = toJoin[0];
            var tableNumber = toJoin[0].TableNumber;
            var tableCutleries = toJoin[0].TableCutleries;
            var tableId = toJoin[0].Id;
            var hasTable = toJoin.filter(x => x.TableNumber || x.tableCutleries);

            for (var i = 1; i < toJoin.length; i++) {
                var curShoppingCart = toJoin[i];
                if(toJoin[i].TableCutleries) {
                    tableCutleries += toJoin[i].TableCutleries;
                }
                if(!tableId) {
                    tableId = toJoin[i].TableId;
                }
                if(!tableNumber) {
                    tableNumber = toJoin[i].TableNumber;
                }
                if(!tableCutleries) {
                    tableCutleries = toJoin[i].TableCutleries;
                }
                Enumerable.from(curShoppingCart.Items).forEach(function (item) {
                    shoppingCartModel.addItemTo(joinedShoppingCart, undefined, item, item.Quantity);
                });
            }

            joinedShoppingCart.TableNumber = tableNumber;
            joinedShoppingCart.TableCutleries = tableCutleries;
            joinedShoppingCart.TableId = tableId;
            joinedShoppingCart.isJoinedShoppingCart = hasTable.length >= 2;

            $uibModalInstance.close(joinedShoppingCart);
        });
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
});