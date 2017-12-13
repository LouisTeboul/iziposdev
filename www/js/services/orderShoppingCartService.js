app.service('orderShoppingCartService', ["$http", "$rootScope", "$q", "settingService", "taxesService", "shoppingCartService",
    function ($http, $rootScope, $q, settingService, taxesService, shoppingCartService) {
        var current = this;
        this.orders;
        this.ordersInProgress;

        var dbOrderChangedHandler = $rootScope.$on('dbOrderReplicate', function () {
            initOrders();
        });

        var dbFreezeChangedHandler = $rootScope.$on('dbFreezeReplicate', function () {
            initOrders();
        });

        /** Get order */
        var initOrders = function () {
            this.orders = [];
            current.getOrderShoppingCartsAsync().then(function (shoppingCarts) {
                current.orders = Enumerable.from(shoppingCarts).orderByDescending("s=>s.ShippingOption").toArray();
                refreshOrdersInProgress();
            }, function (err) {
                if (tryGetFreezed < 3) {
                    tryGetFreezed = tryGetFreezed + 1;
                    setTimeout(function () {
                        initOrders();
                    }, 3000);
                }
            });
        };

        // What's the difference with this.init ??
        var orderInProgressDaemon = function () {
            setTimeout(function () {
                initOrders();
                orderInProgressDaemon();
            }, 5000);
        };

        var refreshOrdersInProgress = function () {
            current.ordersInProgress = [];

            if (current.orders.length > 0) {
                var currentDate = new Date();

                for (var i = current.orders.length - 1; i >= 0; i--) {
                    var order = current.orders[i];
                    var orderDate = Date.parseExact(order.Date, "dd/MM/yyyy H:mm:ss");
                    if(order.ShippingOption){
                        var orderOptions = Date.parseExact(order.ShippingOption, "H:mm:ss");
                    }

                    if(order.DatePickup){
                        var orderOptions = Date.parseExact(order.DatePickup, "H:mm:ss");
                    }


                    if (!orderDate) orderDate = new Date();
                    if (!orderOptions) orderOptions = orderDate;

                    orderDate.setHours(orderOptions.getHours());
                    orderDate.setMinutes(orderOptions.getMinutes());
                    orderDate.setSeconds(orderOptions.getSeconds());

                    var diffDate = orderDate - currentDate;

                    var ordersPrepareMinutes = $rootScope.IziBoxConfiguration.OrdersPrepareMinutes;
                    if (!ordersPrepareMinutes) {
                        ordersPrepareMinutes = 15;
                    }

                    if (diffDate <= (1000 * 60 * ordersPrepareMinutes))/*15minutes*/ {
                        current.ordersInProgress.push(order);
                        current.orders.splice(i, 1);
                    }
                }
            }
            console.log("COmmande : ", current.orders);
            console.log("A traiter : ", current.ordersInProgress);
            $rootScope.$emit("orderShoppingCartChanged");
        };

        //Initialisation du service
        this.init = function () {
            initOrders();
            orderInProgressDaemon();
        };

        this.getOrderShoppingCartsAsync = function () {
            var shoppingCartsDefer = $q.defer();

            // Look for order in the couchDb
            $rootScope.dbOrder.rel.find('ShoppingCart').then(function (resShoppingCarts) {
                // Recupere les shopping cart du freeze
                $rootScope.dbFreeze.rel.find('ShoppingCart').then(function (resShoppingCartsTel) {
                    var shoppingCartsTel = resShoppingCartsTel.ShoppingCarts;
                    // Filtre pour ne garder que ceux qui ont une date de retrait
                    var sh2 = Enumerable.from(shoppingCartsTel).where('x => x.DatePickup').toArray();

                    var shoppingCarts = resShoppingCarts.ShoppingCarts.concat(sh2);

                    console.log(shoppingCarts);

                    //Hack for remove duplicate
                    var shoppingCartsToRemove = [];
                    var shoppingCartsToReturn = [];

                    Enumerable.from(shoppingCarts).forEach(function (s) {
                        if (shoppingCartsToRemove.indexOf(s) == -1) {
                            if(s.DatePickup){
                                var duplicateShoppingCarts = Enumerable.from(shoppingCarts).where(function (d) {
                                    return d.DatePickup == s.DatePickup;
                                }).toArray();
                            } else {
                                var duplicateShoppingCarts = Enumerable.from(shoppingCarts).where(function (d) {
                                    return d.OrderId == s.OrderId;
                                }).toArray();
                            }


                            if (duplicateShoppingCarts.length > 1) {
                                shoppingCartsToRemove.push.apply(shoppingCartsToRemove, duplicateShoppingCarts.slice(1));
                            }

                            shoppingCartsToReturn.push(duplicateShoppingCarts[0]);
                        }
                    });



                    taxesService.getTaxCategoriesAsync().then(function (taxCategories) {
                        Enumerable.from(shoppingCartsToReturn).forEach(function (r) {
                            r.Timestamp = r.OrderId;
                            r.id = r.OrderId;

                            Enumerable.from(r.Items).forEach(function (cartItem) {
                                var taxCategory = Enumerable.from(taxCategories).firstOrDefault(function (t) {
                                    return t.TaxCategoryId == cartItem.Product.TaxCategoryId;
                                });

                                cartItem.Product.TaxCategory = taxCategory ? taxCategory : undefined;
                                cartItem.TaxCategory = taxCategory;
                                cartItem.TaxCategoryId = cartItem.Product.TaxCategoryId;
                            });
                        });

                        console.log(shoppingCartsToReturn);

                        shoppingCartsDefer.resolve(shoppingCartsToReturn);
                    });
                }, function (err) {
                    shoppingCartsDefer.reject(err);
                });

            }, function (err) {
                shoppingCartsDefer.reject(err);
            });
            return shoppingCartsDefer.promise;
        };

        this.loadOrderShoppingCartAsync = function (shoppingCart) {
            var unfreezeDefer = $q.defer();

            //Commande telephonique
            if(shoppingCart.DatePickup){
                shoppingCartService.unfreezeShoppingCartAsync(shoppingCart).then(function(){
                    console.log('cool');
                    unfreezeDefer.resolve(true);
                }, function(errDel){
                    unfreezeDefer.reject(errDel);
                });
            }
            else {
                shoppingCart.Timestamp = new Date().getTime();
                shoppingCart.CurrentStep = 0;

                // TODO check ex trotekala
                if (shoppingCart.isPayed) {
                    // Search payments Methods
                    settingService.getPaymentModesAsync().then(function (paymentSetting) {
                        var paymentModesAvailable = paymentSetting;

                        Enumerable.from(shoppingCart.PaymentModes).forEach(function (item) {
                            console.log(item);
                            var p = Enumerable.from(paymentModesAvailable).where('x => x.Text == item.Text').firstOrDefault();
                            if (p) item.PaymentType = p.PaymentType;
                        });
                    });
                }
                else {
                    shoppingCart.PaymentModes = undefined;
                    shoppingCart.PaymentModes = [];
                }

                // Orders that come from the web, we have to set with the current pos HardwareId
                if (!shoppingCart.HardwareId) {
                    shoppingCart.HardwareId = $rootScope.PosLog.HardwareId;
                    if ($rootScope.modelPos && $rootScope.modelPos.aliasCaisse) {
                        shoppingCart.AliasCaisse = $rootScope.modelPos.aliasCaisse;
                    }
                }
                // Delete the order from database
                $rootScope.dbOrder.rel.del('ShoppingCart', {
                    id: shoppingCart.id,
                    rev: shoppingCart.rev
                }).then(function (result) {
                    unfreezeDefer.resolve(true);
                }, function (errDel) {
                    unfreezeDefer.reject(errDel);
                });
            }


            return unfreezeDefer.promise;
        }

    }
]);