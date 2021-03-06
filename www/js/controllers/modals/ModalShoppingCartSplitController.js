﻿app.controller('ModalShoppingCartSplitController', function ($scope, $rootScope, $uibModalInstance, $uibModal, $mdMedia,defaultValue, shoppingCartModel, posService) {
    $scope.errorMessage = undefined;
    $scope.value = defaultValue;
    $scope.result = {
        "nb": 0
    };

    $scope.init = function () {
        $scope.mdMedia = $mdMedia;

        $scope.currentShoppingCartIn = cloneShoppingCart(shoppingCartModel.getCurrentShoppingCartIn() || shoppingCartModel.createShoppingCartIn());
        $scope.currentShoppingCartOut = cloneShoppingCart(shoppingCartModel.getCurrentShoppingCartOut() || shoppingCartModel.createShoppingCartOut());

        if(!$scope.currentShoppingCartIn.dailyTicketId){
            posService.getUpdDailyTicketValueAsync($scope.currentShoppingCartIn.hardwareId, 1).then(function (cashRegisterTicketId) {
                $scope.currentShoppingCartIn.dailyTicketId = cashRegisterTicketId;
            }).then(function () {
                $rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCartIn);
            });
        }


        if ($scope.currentShoppingCartOut.TableNumber) {
            $scope.currentShoppingCartIn.TableNumber = $scope.currentShoppingCartOut.TableNumber;
        }

        if ($scope.currentShoppingCartOut.Discounts.length > 0) {
            $scope.currentShoppingCartIn.Discounts = [];
        }
    };

    $scope.sendToIn = function (item) {

        if (!$scope.currentShoppingCartIn) {
            $scope.currentShoppingCartIn = shoppingCartModel.createShoppingCartIn();
        }
        if (!$scope.currentShoppingCartOut) {
            $scope.currentShoppingCartOut = shoppingCartModel.createShoppingCartOut();
        }
        this.tryMatch($scope.currentShoppingCartOut, $scope.currentShoppingCartIn, item);

    };

    $scope.splitToIn = function (item) {

        let modalInstance = $uibModal.open({
            templateUrl: 'modals/modalSplitItem.html',
            controller: 'ModalSplitItemController',
            backdrop: 'static',
            resolve: {
                defaultValue: function () {
                    return true;
                },
                item: function () {
                    return item;
                }
            }
        });

        modalInstance.result.then(function (result) {
            console.log(result);
            if (result.montant) {
                if (result.montant <= item.PriceIT - item.DiscountIT && !result.makeParts) {
                    shoppingCartModel.splitItemTo($scope.currentShoppingCartIn, $scope.currentShoppingCartOut, item, result.montant);
                    shoppingCartModel.calculateTotalFor($scope.currentShoppingCartOut);
                    shoppingCartModel.calculateTotalFor($scope.currentShoppingCartIn);

                }
                else {
                    /* TODO : Afficher une erreur */
                }

                if (result.makeParts && result.nbPart) {
                    shoppingCartModel.makeParts($scope.currentShoppingCartOut, item, result.nbPart);
                    shoppingCartModel.calculateTotalFor($scope.currentShoppingCartOut);
                    shoppingCartModel.calculateTotalFor($scope.currentShoppingCartIn);
                }
            }
        }, function () {
            console.log('Erreur');
        });
    };


    $scope.tryMatch = function (from, to, itemIn) {
        //on cherche a match une partie de produit split avec son parent
        //Pour cela, on utilise les hashkey
        //Si les hashkey sont identique, on regroupe les deux items


        let matchedItem = Enumerable.from(to.Items).firstOrDefault(function (itemOut) {
            return itemOut.hashkey == itemIn.hashkey && itemOut.ProductId == itemIn.ProductId && itemOut.Step == itemIn.Step && itemOut.Product.Price == itemIn.Product.Price;
        });

        if (matchedItem) {
            let qty;
            if (Number.isInteger(itemIn.Quantity) || itemIn.Quantity >= 1) {
                qty = 1
            } else {
                qty = itemIn.Quantity;
            }
            matchedItem.Quantity += qty;
            itemIn.Quantity -= qty;

            /*

            var ratio = qty / itemIn.Quantity;
            matchedItem.DiscountIT += ratio * clone(itemIn.DiscountIT);
            matchedItem.DiscountET += ratio * clone(itemIn.DiscountET);

            itemIn.DiscountIT -= ratio * clone(itemIn.DiscountIT);
            itemIn.DiscountET -= ratio * clone(itemIn.DiscountET);

            */

            if(itemIn.Quantity == 0){
                //Transfer le discout en même temps que le dernier item de la ligne.
                //Pose probleme dans le cas ou le discount ligne > prix unitaire de l'article

                matchedItem.DiscountIT += itemIn.DiscountIT;
                matchedItem.DiscountET += itemIn.DiscountET;

                shoppingCartModel.removeItemFrom(from, itemIn);
            }

            console.log(matchedItem);
            if (matchedItem.Quantity % 1 == 0) {
                matchedItem.isPartSplitItem = false;
            }
        } else {
            shoppingCartModel.addItemTo(to, from, itemIn);
        }

        shoppingCartModel.calculateTotalFor(to);
        shoppingCartModel.calculateTotalFor(from);
    };

    $scope.sendToOut = function (item) {
        if (!item.dispFraction) {
            this.tryMatch($scope.currentShoppingCartIn, $scope.currentShoppingCartOut, item);
        }
    };

    $scope.ok = function () {
        if ($scope.currentShoppingCartIn.Items.length > 0) {
            //Si le nb de couvert du ticket split est superieur au nb de couvert du ticket d'origine
            if ($scope.result.nb == $scope.currentShoppingCartOut.TableCutleries && $scope.currentShoppingCartOut.Items.length > 0) {
                $scope.errorMessage = "Le ticket d'origine doit être vide pour transferer tout les couverts au ticket secondaire";
            } else {
                if ($scope.result.nb > $scope.currentShoppingCartOut.TableCutleries) {
                    $scope.errorMessage = "Le nombre de couvert dans le ticket secondaire doit être inferieur ou égal au ticket d'origine";
                } else {
                    if ($scope.currentShoppingCartOut.TableCutleries) {
                        $scope.currentShoppingCartIn.TableCutleries = $scope.result.nb;
                        $scope.currentShoppingCartOut.TableCutleries -= $scope.result.nb;
                    }
                    console.log($scope.currentShoppingCartOut, $scope.currentShoppingCartIn);
                    shoppingCartModel.setCurrentShoppingCartIn($scope.currentShoppingCartIn);
                    shoppingCartModel.setCurrentShoppingCartOut($scope.currentShoppingCartOut);
                    shoppingCartModel.setCurrentShoppingCart($scope.currentShoppingCartIn);
                    $uibModalInstance.close($scope.value);
                }
            }
        } else {
            shoppingCartModel.setCurrentShoppingCartIn(undefined);
            shoppingCartModel.setCurrentShoppingCartOut(undefined);
            shoppingCartModel.setCurrentShoppingCart($scope.currentShoppingCartOut);
            $uibModalInstance.close($scope.value);
        }
    };

    $scope.cancel = function () {
        const hdid = $scope.currentShoppingCartOut.HardwareId;

        posService.getUpdDailyTicketAsync(hdid, -1);

        $scope.currentShoppingCartIn = undefined;
        shoppingCartModel.setCurrentShoppingCartIn(undefined);
        $scope.currentShoppingCartOut = undefined;
        shoppingCartModel.setCurrentShoppingCartOut(undefined);

        $uibModalInstance.dismiss();
    };

    const cloneShoppingCart = function (shoppingCart) {
        let ret = clone(shoppingCart);
        let cloneItemsArray = [];

        for(let item of shoppingCart.Items) {
            if (item.Quantity > 0) {
                cloneItemsArray.push(clone(item));
            }
        }

        ret.Items = cloneItemsArray;
        ret.Discounts = [];

        if (shoppingCart.Discounts && shoppingCart.Discounts.length > 0) {
            for(let d of shoppingCart.Discounts) {
                let newDiscount = clone(d);
                newDiscount.Total = 0;
                ret.Discounts.push(newDiscount);
            }
        }

        return ret;
    }
});