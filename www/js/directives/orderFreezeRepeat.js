app.directive('orderFreezeRepeat', function ($rootScope, $interval) {
    return {
        templateUrl: 'partials/orderFreezeRepeat.html',
        restrict: 'E',
        scope: {
            checkShoppingCart : '=ngCheck',
            allOrders: '=',
            selectOrder: '=',
            showLocked: '=',
        }, link: function (scope) {

            let timeInterval = $interval(() => {
                $rootScope.$emit('secondElapsed');
            }, 1000);

            scope.$on('$destroy', () => {
                if (timeInterval) {
                    $interval.cancel(timeInterval);
                }
            });

            scope.orderByDate = function (item) {
                let date = null;
                if (item.DatePickup) {
                    date = moment(item.DatePickup, "DD/MM/YYYY HH:mm");
                }

                if (item.ShippingOption) {
                    date = moment(item.ShippingOption, "DD/MM/YYYY HH:mm:ss");
                }
                const ret = date ? date.format('x') : 0;
                return ret;
            };

            scope.getItemsCount = (shoppingCart) => {
                let itemCount = 0;
                for (let i of shoppingCart.Items) {
                    itemCount = itemCount + i.Quantity;
                }
                return roundValue(itemCount);
            };

            const groupItems = function (order) {
                if (order && !order.AttrItems && !order.NormalItems) {
                    let countGroups = 0;
                    for (const item of order.Items) {
                        if (item.Attributes) {
                            if (!order.AttrItems) {
                                order.AttrItems = [];
                            }
                            order.AttrItems.push(item);
                        } else {
                            if (!order.NormalItems) {
                                order.NormalItems = [];
                            }
                            if (!order.NormalItems[countGroups]) {
                                order.NormalItems[countGroups] = [];
                            }
                            if (order.NormalItems[countGroups].length < 3) {
                                order.NormalItems[countGroups].push(item);
                            } else {
                                countGroups++;
                                order.NormalItems[countGroups] = [];
                                order.NormalItems[countGroups].push(item);
                            }
                        }
                    }
                }
            };

            scope.toggleOrderDetails = (order) => {
                order.detailsToggled = !order.detailsToggled;
                if (order.detailsToggled) {
                    groupItems(order);
                }
            };
        }
    };
});
