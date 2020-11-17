app.controller('ModalShoppingCartSplitController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $mdMedia, defaultValue, paymentService, shoppingCartService, orderService, productService, deliveryService) {
    $scope.errorMessage = undefined;
    $scope.value = defaultValue;
    $scope.result = {
        "nb": 0
    };
    $scope.leftMDiscount = 0;
    $scope.rightMDiscount = 0;

    $scope.alreadySplit = false;

    $scope.init = () => {
        $scope.mdMedia = $mdMedia;

        $scope.currentSCRight = cloneShoppingCart(shoppingCartService.getCurrentShoppingCartRight() || shoppingCartService.createShoppingCartRight());
        $scope.currentSCLeft = cloneShoppingCart(shoppingCartService.getCurrentShoppingCartLeft() || shoppingCartService.createShoppingCartLeft());

        // ATTENTION : C'est possible que ca casse de truc de commenter ce bloc

        // // Init all haskeys
        // for (let [index, item] of $scope.currentSCLeft.Items.entries()) {
        //     item.index = index;
        //     item.hashkey = objectHash(item);
        // }

        $scope.alreadySplit = $scope.currentSCRight.Items.length !== 0;

        if (!$scope.currentSCRight.dailyTicketId && !$scope.alreadySplit) {
            orderService.getUpdDailyTicketValueAsync($scope.currentSCRight.HardwareId, 1).then((cashRegisterTicketId) => {
                $scope.currentSCRight.dailyTicketId = cashRegisterTicketId;
            }).then(() => {
                $rootScope.$emit("shoppingCartChanged", $scope.currentSCRight);
            });
        }

        if ($scope.currentSCLeft.TableNumber || $scope.currentSCLeft.TableId) {
            $scope.currentSCRight.TableNumber = clone($scope.currentSCLeft.TableNumber);
            $scope.currentSCRight.TableId = clone($scope.currentSCLeft.TableId);
        }

        if ($scope.currentSCLeft.Discounts.length > 0) {
            for (let discount of $scope.currentSCLeft.Discounts) {
                if (discount.IsPercent) {
                    $scope.currentSCRight.Discounts = clone($scope.currentSCLeft.Discounts);
                }
            }
            for (let discount of $scope.currentSCRight.Discounts) {
                discount.Total = 0;
                if (!discount.IsPercent) {
                    discount.Value = 0;
                }
            }
        }

        $scope.updateDiscountM();

        paymentService.calculateTotalFor($scope.currentSCRight, true, false);
        paymentService.calculateTotalFor($scope.currentSCLeft, true, false);
    };

    const cloneShoppingCart = (shoppingCart) => {
        let ret = clone(shoppingCart);
        let cloneItemsArray = [];

        for (let item of shoppingCart.Items) {
            if (item.Quantity > 0) {
                cloneItemsArray.push(clone(item));
            }
        }

        ret.Items = cloneItemsArray;
        ret.Discounts = [];

        if (shoppingCart.Discounts && shoppingCart.Discounts.length > 0) {
            for (let d of shoppingCart.Discounts) {
                let newDiscount = clone(d);
                newDiscount.Total = 0;
                ret.Discounts.push(newDiscount);
            }
        }

        return ret;
    };

    $scope.sendToIn = (item) => {
        $scope.tryMatch($scope.currentSCLeft, $scope.currentSCRight, item);
    };

    $scope.sendToOut = (item) => {
        $scope.tryMatch($scope.currentSCRight, $scope.currentSCLeft, item);
    };

    $scope.tryMatch = (scFrom, scTo, item) => {
        //On cherche a match une partie de produit split avec son parent
        //Pour cela, on utilise les hashkey
        //Si les hashkey sont identique, on regroupe les deux items
        let matchedItem = Enumerable.from(scTo.Items).firstOrDefault((itemOut) => {
            return itemOut.hashkey === item.hashkey && itemOut.ProductId === item.ProductId && itemOut.Step === item.Step && itemOut.Product.Price === item.Product.Price;
        });

        const calculate = () => {
            if (item.stockQuantity && item.stockQuantity !== 0) {
                matchedItem.stockQuantity = Number.isInteger(item.stockQuantity) ? item.stockQuantity : null;
                matchedItem.isPartSplitItem = false;
            }

            let quantity = truncator(matchedItem.Quantity + item.Quantity, 8);
            if (quantity % 1 !== 0 && quantity % 1 < 0.0001 || quantity % 1 > 0.9999) {
                quantity = truncator(quantity, 2);
            }

            matchedItem.Quantity = quantity;
            matchedItem.DiscountIT = truncator(matchedItem.DiscountIT + item.DiscountIT, 2);
            matchedItem.DiscountET = truncator(matchedItem.DiscountET + item.DiscountET, 2);
            matchedItem.PriceIT = truncator(matchedItem.PriceIT + item.PriceIT, 2);
            matchedItem.PriceET = truncator(matchedItem.PriceET + item.PriceET, 2);

            productService.removeItemFrom({ shoppingCart: scFrom, cartItem: item, truncate: true, calculateDiscount: false, forceRemove: true });
        }

        if (item.isPartSplitItem) {
            if (matchedItem) {
                calculate();
            } else {
                scTo.Items.push(item);
                productService.removeItemFrom({ shoppingCart: scFrom, cartItem: item, truncate: true, calculateDiscount: false, forceRemove: true });
            }
        } else {
            if (matchedItem) {
                if (item.Quantity <= 1) {
                    calculate();
                } else {
                    let discountIT = truncator(item.DiscountIT / item.Quantity, 2);
                    let discountET = truncator(item.DiscountET / item.Quantity, 2);
                    let priceIT = truncator(item.PriceIT / item.Quantity, 2);
                    let priceET = truncator(item.PriceET / item.Quantity, 2);

                    matchedItem.DiscountIT = truncator(matchedItem.DiscountIT + discountIT, 2);
                    matchedItem.DiscountET = truncator(matchedItem.DiscountET + discountET, 2);
                    matchedItem.PriceIT = truncator(matchedItem.PriceIT + priceIT, 2);
                    matchedItem.PriceET = truncator(matchedItem.PriceET + priceET, 2);
                    matchedItem.Quantity = truncator(matchedItem.Quantity + 1, 8);

                    item.DiscountIT = truncator(item.DiscountIT - discountIT, 2);
                    item.DiscountET = truncator(item.DiscountET - discountET, 2);
                    item.PriceIT = truncator(item.PriceIT - priceIT, 2);
                    item.PriceET = truncator(item.PriceET - priceET, 2);
                    item.Quantity = truncator(item.Quantity - 1, 8);
                }
            } else {
                let clonedItem = clone(item);
                if (item.Quantity <= 1) {
                    if (item.stockQuantity && item.stockQuantity !== 0) {
                        clonedItem.isPartSplitItem = false;
                    }
                    productService.removeItemFrom({ shoppingCart: scFrom, cartItem: item, truncate: true, calculateDiscount: false, forceRemove: true });
                    scTo.Items.push(clonedItem);
                    console.log("Push : ", clonedItem);
                } else {
                    clonedItem.DiscountIT = truncator(item.DiscountIT / item.Quantity, 2);
                    clonedItem.DiscountET = truncator(item.DiscountET / item.Quantity, 2);
                    clonedItem.PriceIT = truncator(item.PriceIT / item.Quantity, 2);
                    clonedItem.PriceET = truncator(item.PriceET / item.Quantity, 2);

                    item.DiscountIT = truncator(item.DiscountIT - clonedItem.DiscountIT, 2);
                    item.DiscountET = truncator(item.DiscountET - clonedItem.DiscountET, 2);
                    item.PriceIT = truncator(item.PriceIT - clonedItem.PriceIT, 2);
                    item.PriceET = truncator(item.PriceET - clonedItem.PriceET, 2);
                    item.Quantity = truncator(item.Quantity - 1, 8);

                    clonedItem.isPartSplitItem = true;
                    clonedItem.stockQuantity = 0;
                    clonedItem.Quantity = 1;

                    scTo.Items.push(clonedItem);
                    console.log("Push : ", clonedItem);
                }
            }
        }

        $scope.updateDiscountM();

        paymentService.calculateTotalFor(scTo, true, false);
        paymentService.calculateTotalFor(scFrom, true, false);
    };

    $scope.updateDiscountM = () => {
        let leftD = $scope.currentSCLeft.Items.reduce((acc, cur) => {
            if (!acc) {
                acc = cur.DiscountIT;
            } else {
                acc += cur.DiscountIT;
            }
            return acc;
        }, 0);
        let rightD = $scope.currentSCRight.Items.reduce((acc, cur) => {
            if (!acc) {
                acc = cur.DiscountIT;
            } else {
                acc += cur.DiscountIT;
            }
            return acc;
        }, 0);
        $scope.leftMDiscount = truncator(leftD, 2);
        $scope.rightMDiscount = truncator(rightD, 2);
    };

    $scope.splitToIn = (item) => {
        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalSplitItem.html',
            controller: 'ModalSplitItemController',
            backdrop: 'static',
            resolve: {
                defaultValue: () => {
                    return true;
                },
                item: () => {
                    return item;
                }
            }
        });

        modalInstance.result.then((result) => {
            result.nb = Number(result.nb);
            console.log(result);
            if (result.montant) {
                if (result.nbPart) {
                    productService.splitSCByParts($scope.currentSCLeft, item, result.nbPart);
                } else {
                    productService.splitSCByPrice($scope.currentSCLeft, $scope.currentSCRight, item, result.montant);
                }
                paymentService.calculateTotalFor($scope.currentSCLeft, true, false);
                paymentService.calculateTotalFor($scope.currentSCRight, true, false);
            }
        }, () => {
            console.log('Erreur');
        });
    };

    $scope.ok = () => {
        $scope.currentSCLeft.PaymentModes = [];
        $scope.currentSCRight.PaymentModes = [];

        if ($scope.result) {
            $scope.result.nb = Number($scope.result.nb);
        }

        if ($scope.currentSCRight.Items.length > 0) {
            if ($scope.result) {
                //Si le nb de couvert du ticket split est superieur au nb de couvert du ticket d'origine
                if ($scope.currentSCLeft.TableCutleries && $scope.result.nb === $scope.currentSCLeft.TableCutleries && $scope.currentSCLeft.Items.length > 0) {
                    $scope.errorMessage = "Le ticket d'origine doit être vide pour transferer tout les couverts au ticket secondaire";
                } else {
                    if ($scope.result.nb > $scope.currentSCLeft.TableCutleries) {
                        $scope.errorMessage = "Le nombre de couvert dans le ticket secondaire doit être inferieur ou égal au ticket d'origine";
                    } else {
                        if ($scope.currentSCLeft.TableCutleries) {
                            $scope.currentSCRight.TableCutleries = $scope.result.nb;
                            $scope.currentSCLeft.TableCutleries -= $scope.result.nb;
                        }
                        console.log($scope.currentSCLeft, $scope.currentSCRight);
                        shoppingCartService.setCurrentShoppingCartRight($scope.currentSCRight);
                        shoppingCartService.setCurrentShoppingCartLeft($scope.currentSCLeft);

                        $scope.currentSCRight.Discounts = $scope.currentSCRight.Discounts ? $scope.currentSCRight.Discounts : [];
                        $scope.currentSCRight.Items = $scope.currentSCRight.Items ? $scope.currentSCRight.Items : [];
                        deliveryService.upgradeCurrentShoppingCartAndDeliveryType($scope.currentSCRight);

                        $uibModalInstance.close($scope.value);
                    }
                }
            } else {
                $scope.errorMessage = "Le nombre de couverts est incorrect.";
            }
        } else {
            shoppingCartService.setCurrentShoppingCartRight(null);
            shoppingCartService.setCurrentShoppingCartLeft(null);

            $scope.currentSCLeft.Discounts = $scope.currentSCLeft.Discounts ? $scope.currentSCLeft.Discounts : [];
            $scope.currentSCLeft.Items = $scope.currentSCLeft.Items ? $scope.currentSCLeft.Items : [];
            deliveryService.upgradeCurrentShoppingCartAndDeliveryType($scope.currentSCLeft);

            $uibModalInstance.close($scope.value);
        }
    };

    $scope.cancel = () => {
        if (!$scope.alreadySplit) {
            const hdid = $scope.currentSCLeft.HardwareId;

            orderService.getUpdDailyTicketValueAsync(hdid, -1);

            $scope.currentSCRight = undefined;
            shoppingCartService.setCurrentShoppingCartRight(undefined);
            $scope.currentSCLeft = undefined;
            shoppingCartService.setCurrentShoppingCartLeft(undefined);
        }
        $uibModalInstance.dismiss();
    };
});