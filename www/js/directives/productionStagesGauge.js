app.directive('productionStagesGauge', function ($q, $rootScope, $uibModalStack, paymentService, orderService, printService, deliveryService, posService) {
    return {
        templateUrl: 'partials/productionStagesGauge.html',
        restrict: 'E',
        scope: {
            order: '='
        },
        link: function (scope) {
            let secondHandler = $rootScope.$on('secondElapsed', () => {
                if (!scope.order.StageHistory) scope.order.StageHistory = {};

                scope.elapsed = {
                    untouched: moment.utc(Date.now() - scope.order.Timestamp, 'x').format('HH:mm:ss'),
                    in_kitchen: moment.utc(Date.now() - scope.order.StageHistory.InKitchenAt, 'x').format('HH:mm:ss'),
                    ready: moment.utc(Date.now() - scope.order.StageHistory.ReadyAt, 'x').format('HH:mm:ss')
                };
            });

            scope.$on('$destroy', () => {
                if (secondHandler)
                    secondHandler();
            });

            scope.setProductionStage = (stageName, e) => {
                e.stopPropagation();
                e.preventDefault();
                if (scope.order) {
                    if (!scope.order.StageHistory) scope.order.StageHistory = {};
                    if (!scope.order.CurrentStep) scope.order.CurrentStep = 0;
                    switch (stageName) {
                        case ProductionStages.KITCHEN:
                            if (!scope.order.ProductionStage) {
                                // On imprime le ticket en prod
                                printService.printStepProdShoppingCartAsync(scope.order, true).then(() => {
                                }, (err) => {
                                    console.error(err);
                                });
                            }

                            break;
                        case ProductionStages.READY:
                            if (scope.order.ProductionStage === ProductionStages.KITCHEN) {
                                // Pas d'action
                                $rootScope.UpdateDeliverooPrepStage(scope.order, ProductionStages.READY, true);
                            }
                            break;
                        case ProductionStages.COLLECTED:
                            if (scope.order.ProductionStage === ProductionStages.READY) {

                                let ticketId = scope.order.OrderId || scope.order.Timestamp;
                                // On valide la commande si elle est payé, sinon on la met dans le panier
                                if (scope.order.isPayed || scope.order.PaymentModes && scope.order.PaymentModes.length > 0 && scope.order.Residue === 0) {
                                    orderService.getFreezeAndOrderShoppingCartByIdAsync(ticketId).then((shoppingCart) => {
                                        posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezedSc) => {
                                            unfreezedSc.Discounts = unfreezedSc.Discounts ? unfreezedSc.Discounts : [];
                                            unfreezedSc.Items = unfreezedSc.Items ? unfreezedSc.Items : [];
                                            deliveryService.upgradeCurrentShoppingCartAndDeliveryType(unfreezedSc);

                                            setTimeout(() => {
                                                paymentService.validShoppingCart(false);
                                            }, 200);
                                            
                                        }, (errUnfreeze) => {
                                            console.error(errUnfreeze);
                                        });
                                    }, (errGet) => {
                                        console.error(errGet);
                                    });
                                } else {
                                    
                                    orderService.getFreezeAndOrderShoppingCartByIdAsync(ticketId).then((shoppingCart) => {
                                        posService.unfreezeShoppingCartAsync(shoppingCart).then((unfreezedSc) => {
                                            unfreezedSc.Discounts = unfreezedSc.Discounts ? unfreezedSc.Discounts : [];
                                            unfreezedSc.Items = unfreezedSc.Items ? unfreezedSc.Items : [];
                                            deliveryService.upgradeCurrentShoppingCartAndDeliveryType(unfreezedSc);
                                        }, (errUnfreeze) => {
                                            console.error(errUnfreeze);
                                        });
                                    }, (errGet) => {
                                        console.error(errGet);
                                    });
                                }

                                $uibModalStack.dismissAll();
                            }
                            break;
                    }
                }
            };
        }
    };
});