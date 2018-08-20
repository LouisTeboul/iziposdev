app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.ProductTemplate.ConfigurableMenu', {
            url: '/configurablemenu/{id}',
            params: {
                id: null,
                offer: null,
            },
            templateUrl: 'viewsBorne/ProductTemplate/configurableMenu.html'
        })
        .state('catalogPOS.ProductTemplate.ConfigurableMenu', {
            url: '/configurablemenu/{id}',
            params: {
                id: null,
                offer: null,
            },
            templateUrl: 'views/ProductTemplate/configurableMenu.html'
        })
});


app.controller('ConfigurableMenuController', function ($scope, $rootScope, $stateParams, $location, $mdMedia, categoryService, settingService, productService, pictureService, shoppingCartModel) {
    var deliveryType = shoppingCartModel.getDeliveryType();
    $rootScope.$on('deliveryTypeChanged', (e, newValue) => {
        var nextDeliveryType = newValue;
        var nextPrice;

        switch (nextDeliveryType) {
            case 0:
                nextPrice = $scope.initialProduct.Price;
                break;
            case 1:
                nextPrice = $scope.initialProduct.TakeawayPrice || $scope.initialProduct.Price;
                break;
            case 2:
                nextPrice = $scope.initialProduct.DeliveryPrice || $scope.initialProduct.Price;
                break;
            default:
                nextPrice = $scope.initialProduct.Price;
                break;
        }

        $scope.TotalPrice = $scope.TotalPrice - $scope.lastPrice + nextPrice;
        $scope.lastPrice = nextPrice;
        deliveryType = newValue;

    });
    $scope.init = function () {
        $scope.$mdMedia = $mdMedia;
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            settingService.getStepNamesAsync().then(function (stepNames) {
                $scope.stepNames = stepNames;
            });
        }
    };

    var currentProductHandler = $rootScope.$watch('currentConfigurableProduct', function () {

        if ($rootScope.currentConfigurableProduct) {
            if ($rootScope.borne) {
                productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.ProductCategory.CategoryId]).then(function (products) {

                    $scope.initialProduct = Enumerable.from(products).firstOrDefault(function (p) {
                        return p.Id == $rootScope.currentConfigurableProduct.Id;
                    });

                    if ($rootScope.currentConfigurableProduct) {
                        loadProduct(clone($rootScope.currentConfigurableProduct));
                    }

                    $rootScope.currentConfigurableProduct = undefined;
                });
            } else {
                if ($rootScope.currentConfigurableProduct.ProductCategory) {
                    productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.ProductCategory.CategoryId]).then(function (products) {

                        $scope.initialProduct = Enumerable.from(products).firstOrDefault(function (p) {
                            return p.Id == $rootScope.currentConfigurableProduct.Id;
                        });

                        if ($rootScope.currentConfigurableProduct) {
                            loadProduct(clone($rootScope.currentConfigurableProduct));
                        }

                        $rootScope.currentConfigurableProduct = undefined;
                    });
                }
                else {
                    $scope.initialProduct = $rootScope.currentConfigurableProduct;
                    loadProduct(clone($rootScope.currentConfigurableProduct));
                    $rootScope.currentConfigurableProduct = undefined;
                }
            }
        }
    });

    $scope.$on("$destroy", function () {
        currentProductHandler();
    });

    var loadProduct = function (selectedProduct, isOfferConsumed) {
        // Init Step
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            $scope.currentStep = 0;
            if (!shoppingCartModel.getCurrentShoppingCart()) {
                shoppingCartModel.createShoppingCart();
            }
            if (shoppingCartModel.getCurrentShoppingCart().CurrentStep) {
                $scope.currentStep = shoppingCartModel.getCurrentShoppingCart().CurrentStep;
            }
        }

        //Clone instance
        $scope.product = jQuery.extend(true, {}, selectedProduct);
        if ($rootScope.borne) {
            $scope.TotalPrice = $scope.initialProduct.Price;
        } else {
            if (($rootScope.isConfigurableProductOffer || ($stateParams.offer && $stateParams.offer.OfferParam.Price == 0)) && !isOfferConsumed) {
                $scope.TotalPrice = 0;
            } else {
                console.log($scope.initialProduct);
                switch (deliveryType) {
                    case 0:
                        $scope.TotalPrice = $scope.initialProduct.Price;
                        break;
                    case 1:
                        $scope.TotalPrice = $scope.initialProduct.TakeawayPrice || $scope.initialProduct.Price;
                        break;
                    case 2:
                        $scope.TotalPrice = $scope.initialProduct.DeliveryPrice || $scope.initialProduct.Price;
                        break;
                    default:
                        $scope.TotalPrice = $scope.initialProduct.Price;
                        break;
                }
                $scope.lastPrice = $scope.TotalPrice;

            }
        }
        $scope.productIsValid();

        //Load selected value
        Enumerable.from($scope.product.ProductAttributes).forEach(function (pAttr) {
            var pAttrId = pAttr.Id;
            Enumerable.from(pAttr.ProductAttributeValues).forEach(function (pAttrValue) {

                //Load pictures for attributes values
                if (!pAttrValue.DefaultPictureUrl) {
                    pictureService.getPictureIdsForProductAsync(pAttrValue.LinkedProductId).then(function (ids) {
                        var id = Enumerable.from(ids).firstOrDefault();
                        pictureService.getPictureUrlAsync(id).then(function (url) {
                            if (!url) {
                                url = 'img/photo-non-disponible.png';
                            }
                            pAttrValue.DefaultPictureUrl = url;
                        });
                    });
                }

                //Select attributes values
                if (pAttrValue.IsPreSelected || pAttrValue.Selected) {
                    pAttrValue.Selected = false;
                    $scope.selectAttributeValue(pAttrId, pAttrValue.Id, true);
                }
            });
        });
    };

    //#region Actions
    $scope.addToCart = function (product) {
        console.log($stateParams);
        shoppingCartModel.addToCart(product, true);
        if (!$rootScope.borne) {
            $stateParams.offer = null;
        }
        loadProduct($scope.initialProduct);
    };
    //#endregion
    $scope.moveStep = function (i) {
        if ($scope.currentStep + i >= 0) $scope.currentStep += i;
    };

    // Select (unselect) Attribute value
    $scope.selectAttributeValue = function (productAttributeId, id, reload, event) {

        var Attribute = Enumerable.from($scope.product.ProductAttributes).firstOrDefault("x => x.Id ==" + productAttributeId);

        if (!reload) {
            if (shoppingCartModel.getCurrentShoppingCart()) {
                Attribute.Step = $scope.currentStep;
            }
            else {
                Attribute.Step = 0;
            }

        }

        var AttributeValue = Enumerable.from(Attribute.ProductAttributeValues).firstOrDefault("x => x.Id ==" + id);
        if (AttributeValue.Selected) {
            if (testSelectCheckbox(Attribute, AttributeValue, false)) {
                if (AttributeValue.PriceAdjustment) $scope.TotalPrice -= AttributeValue.PriceAdjustment;
            }
        }
        else {
            if ($rootScope.borne) {
                AttributeValue.Selected = true;
                if (!reload) {
                    Attribute.Step = $scope.currentStep;

                    if (AttributeValue.LinkedProduct && AttributeValue.LinkedProduct.ProductComments && AttributeValue.LinkedProduct.ProductComments.length > 0) {
                        shoppingCartModel.editComment(AttributeValue);
                    }

                } else {
                    if (!Attribute.Step) Attribute.Step = $scope.currentStep;
                }
                if (AttributeValue.PriceAdjustment) $scope.TotalPrice += AttributeValue.PriceAdjustment;
                $scope.$evalAsync();
            } else {
                if (testSelectCheckbox(Attribute, AttributeValue, true)) {
                    if (!reload) {
                        Attribute.Step = $scope.currentStep;

                        if (AttributeValue.LinkedProduct && AttributeValue.LinkedProduct.ProductComments && AttributeValue.LinkedProduct.ProductComments.length > 0) {
                            shoppingCartModel.editComment(AttributeValue);
                        }

                    }
                    else {
                        if (!Attribute.Step) Attribute.Step = $scope.currentStep;
                    }
                    if (AttributeValue.PriceAdjustment) $scope.TotalPrice += AttributeValue.PriceAdjustment;
                    $scope.$evalAsync();
                }
            }
        }

        if (Attribute.Type == 2) // Radiolist
        {
            for (var i = 0; i < Attribute.ProductAttributeValues.length; i++) {
                var item = Attribute.ProductAttributeValues[i];
                if (item.Selected && item.Id != id) {
                    item.Selected = false;
                    $scope.TotalPrice -= item.PriceAdjustment;
                }
            }
        }

        $scope.product.Price = $scope.TotalPrice;
        $scope.productIsValid();
        $scope.$evalAsync();
    };

    function testSelectCheckbox(Attribute, AttributeValue, state) {
        if (Attribute.Type != 2) { // Checkbox

            //A faire descendre du BO, mais pour l'instant c'est en dur
            var max = Attribute.Max ? Attribute.Max : 99;
            var min = Attribute.Min ? Attribute.Min : 0;
            // Pas besoin d'un min ?

            // On recupere le container de l'element cliqué
            var container = document.querySelector("#a" + Attribute.Id);

            // On regarde le nombre d'element selectionné dans le container
            var nbSelect = container.querySelectorAll("button.attributeBox.active").length;

            // Si on veut selectionné et qu'on est en dessous du max, on autorise
            if (nbSelect < max && state === true) {
                AttributeValue.Selected = state;
                return true;
            }

            // Si on veut déselectionné et qu'on est au dessus du min, on autorise
            if (nbSelect > min && state === false) {
                if (Attribute.IsRequired && nbSelect === 0) {
                    return false;
                } else {
                    AttributeValue.Selected = state;
                    return true;
                }
            }

            return false;

        } else {
            // Dans le cas radio, on autorise
            AttributeValue.Selected = state;
            return true;
        }
    }

    /**
     * Test if all required attributes are selected
     */
    $scope.productIsValid = function () {
        $scope.canAddToCart = true;
        var retval = true;
        var attributes = Enumerable.from($scope.product.ProductAttributes).where("x => x.IsRequired").toArray();
        for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i];
            retval = retval && Enumerable.from(attribute.ProductAttributeValues).any("x => x.Selected");
        }
        $scope.canAddToCart = retval;
    };

    $scope.scrollTo = function (elementId) {
        const elem = document.querySelector('#a' + elementId);
        if (elem) {
            const top = elem.offsetTop;
            $('#attributes').animate({
                scrollTop: top - 40
            }, 200);
        }
    };
});

