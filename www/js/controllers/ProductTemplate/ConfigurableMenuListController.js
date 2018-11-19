app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.ProductTemplate.ConfigurableMenuList', {
            url: '/configurablemenulist/{id}',
            templateUrl: 'viewsBorne/ProductTemplate/configurableMenuList.html'
        })
        .state('catalogPOS.ProductTemplate.ConfigurableMenuList', {
            url: '/configurablemenulist/{id}',
            templateUrl: 'views/ProductTemplate/configurableMenuList.html'
        })
});

app.controller('ConfigurableMenuListController', function ($scope, $rootScope, $stateParams, $location, $state, categoryService, settingService, productService, pictureService, shoppingCartModel) {

    $scope.allowShowCat = false;
    $scope.productListOpen = false;

    $scope.init = function () {
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            settingService.getStepNamesAsync().then(function (stepNames) {
                $scope.stepNames = stepNames;
            });
        }
    };

    const currentProductHandler = $rootScope.$watch('currentConfigurableProduct', function () {

        if ($rootScope.currentConfigurableProduct) {
            productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.ProductCategory.CategoryId]).then(function (products) {

                $scope.initialProduct = Enumerable.from(products).firstOrDefault(function (p) {
                    return p.Id === $rootScope.currentConfigurableProduct.Id;
                });

                if ($rootScope.currentConfigurableProduct) {
                    loadProduct(clone($rootScope.currentConfigurableProduct));
                }

                $rootScope.currentConfigurableProduct = undefined;
            });
        }
    });

    $scope.$on("$destroy", function () {
        currentProductHandler();
    });

    const loadProduct = function (selectedProduct) {
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

        if ($scope.product.ProductAttributes.length > 1) {
            $scope.attributeNext(0);
        }

        $scope.TotalPrice = $scope.initialProduct.Price;
        $scope.productIsValid();

        //Load selected value
        for (let pAttr of $scope.product.ProductAttributes) {
            let pAttrId = pAttr.Id;
            for (let pAttrValue of pAttr.ProductAttributeValues) {
                //Load pictures for attributes values
                if (!pAttrValue.DefaultPictureUrl) {
                    pictureService.getPictureIdsForProductAsync(pAttrValue.LinkedProductId).then(function (ids) {
                        const id = pictureService.getCorrectPictureId(ids);
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
            }
        }
    };

    //#region Actions
    $scope.addToCart = function (product) {
        shoppingCartModel.addToCart(product, true);
        loadProduct($scope.initialProduct);
        if ($rootScope.borne) {
            $state.go("catalogBorne.CategoryTemplate.IZIPASS", {id: product.ProductCategory.CategoryId});
        } else {
            $state.go("catalogPOS.CategoryTemplate.IZIPASS", {id: product.ProductCategory.CategoryId});
        }
    };

    $scope.returnToCat = function (product) {
        if ($rootScope.borne) {
            $state.go("catalogBorne.CategoryTemplate.IZIPASS", {id: product.ProductCategory.CategoryId});
        } else {
            $state.go("catalogPOS.CategoryTemplate.IZIPASS", {id: product.ProductCategory.CategoryId});
        }
    };

    //#endregion
    $scope.moveStep = function (i) {
        if ($scope.currentStep + i >= 0) {
            $scope.currentStep += i;
        }
    };

    $scope.attributeNext = function (displayOrder) {
        $scope.productListOpen = true;
        if ($scope.product.ProductAttributes.length > 1) {
            for (let attribute of $scope.product.ProductAttributes) {
                if (attribute.DisplayOrder === displayOrder) {
                    attribute.classDisplay = "flex";
                } else {
                    attribute.classDisplay = "none";
                }
            }
        }
        $scope.allowShowCat = true;
    };

    $scope.attributeNextButton = function (selectedAttribute) {
        let currentAttribute = false;
        let nextAttributeDisplayOrder = null;
        if ($scope.product && $scope.product.ProductAttributes) {
            let items = $scope.product.ProductAttributes;
            for (let attributes of items) {
                if (currentAttribute) {
                    nextAttributeDisplayOrder = attributes.DisplayOrder;
                    break;
                }
                if (attributes.DisplayOrder === selectedAttribute.DisplayOrder) {
                    currentAttribute = true;
                }
            }
            if (nextAttributeDisplayOrder != null) {
                $scope.attributeNext(nextAttributeDisplayOrder);
            }
        }
    };

    // Select (unselect) Attribute value
    $scope.selectAttributeValue = function (productAttributeId, id, reload) {
        let Attribute = Enumerable.from($scope.product.ProductAttributes).firstOrDefault("x => x.Id ==" + productAttributeId);

        if (!reload) {
            if (shoppingCartModel.getCurrentShoppingCart()) {
                Attribute.Step = $scope.currentStep;
            } else {
                Attribute.Step = 0;
            }
        }
        let AttributeValue = Enumerable.from(Attribute.ProductAttributeValues).firstOrDefault("x => x.Id ==" + id);

        if (AttributeValue.Selected) {
            if (testSelectCheckbox(Attribute, AttributeValue, false)) {
                AttributeValue.Selected = false;
                if (AttributeValue.PriceAdjustment) {
                    $scope.TotalPrice = $scope.TotalPrice - AttributeValue.PriceAdjustment;
                }
            } else if (Attribute.IsRequired === false) {
                if (AttributeValue.PriceAdjustment) {
                    $scope.TotalPrice -= AttributeValue.PriceAdjustment;
                }
            }
        } else {
            if (testSelectCheckbox(Attribute, AttributeValue, true)) {
                if (!reload) {
                    Attribute.Step = $scope.currentStep;

                    if (AttributeValue.LinkedProduct && AttributeValue.LinkedProduct.ProductComments && AttributeValue.LinkedProduct.ProductComments.length > 0) {
                        shoppingCartModel.editComment(AttributeValue);
                    }
                } else {
                    if (!Attribute.Step) {
                        Attribute.Step = $scope.currentStep;
                    }
                }
                if (AttributeValue.PriceAdjustment) {
                    $scope.TotalPrice += AttributeValue.PriceAdjustment;
                }
                $scope.$evalAsync();
            }
        }

        if (Attribute.Type === 2) // Radiolist
        {
            for (let i = 0; i < Attribute.ProductAttributeValues.length; i++) {
                let item = Attribute.ProductAttributeValues[i];
                if (item.Selected && item.Id !== id) {
                    item.Selected = false;
                    $scope.TotalPrice = $scope.TotalPrice - item.PriceAdjustment;
                }
            }
            // Go to next AttributeselectAttributeValue
            $scope.attributeNextButton(Attribute);
        }
        setTimeout(function () {
            let element = document.querySelector(".summaryList");
            if (element) {
                element.scrollTop = element.scrollHeight;
            }
        }, 100);
        $scope.allowShowCat = false;
        $scope.product.Price = $scope.TotalPrice;
        $scope.productIsValid();
        $scope.$evalAsync();
    };

    function testSelectCheckbox(Attribute, AttributeValue, state) {
        if (Attribute.Type !== 2) { // Checkbox

            //A faire descendre du BO, mais pour l'instant c'est en dur
            const max = Attribute.Max ? Attribute.Max : 99;
            const min = Attribute.Min ? Attribute.Min : 0;
            // Pas besoin d'un min ?

            // On recupere le container de l'element cliqué
            let container = document.querySelector("#" + Attribute.Name.split(' ').join('') + " .groupProductsCat");

            // On regarde le nombre d'element selectionné dans le container
            const nbSelect = container.querySelectorAll(".active").length;

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

    // Test if all required attributes are selected
    $scope.productIsValid = function () {

        $scope.productListOpen = false;
        $scope.canAddToCart = true;
        const attributes = Enumerable.from($scope.product.ProductAttributes).where("x => x.IsRequired").toArray();
        for (let i = 0; i < attributes.length; i++) {
            const attribute = attributes[i];
            $scope.canAddToCart = Enumerable.from(attribute.ProductAttributeValues).any(x => x.Selected);
        }
        if ($rootScope.borne) {
            $scope.allowShowCat = true;
        }
        setTimeout(function () {
            let element = document.querySelector(".summaryList");
            if (element) {
                if ($scope.canAddToCart && !$scope.allowShowCat) {
                    element.scrollTop = 0;
                } else {
                    element.scrollTop = element.scrollHeight;
                }
            }
        }, 100);
    };

    $scope.scrollTo = function (elementId) {
        const updatedItemElem = document.getElementById(elementId);
        if (updatedItemElem) {
            $("#attributes").scrollTo(updatedItemElem);
        }
    }
});