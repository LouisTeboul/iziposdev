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

app.controller('ConfigurableMenuListController', function ($scope, $rootScope, $stateParams, $location, categoryService, settingService, productService, pictureService, shoppingCartModel) {

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
                    return p.Id == $rootScope.currentConfigurableProduct.Id;
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
                        if (id !== -1) {
                            pictureService.getPictureUrlAsync(id).then(function (url) {
                                if (!url) {
                                    url = 'img/photo-non-disponible.png';
                                }
                                pAttrValue.DefaultPictureUrl = url;
                            });
                        }
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
    };

    //#endregion
    $scope.moveStep = function (i) {
        if ($scope.currentStep + i >= 0) $scope.currentStep += i;
    };

    $scope.attributeNext = function (displayOrder) {
        $scope.productListOpen = true;
        if ($scope.product.ProductAttributes.length > 1) {
            for (let attribute of $scope.product.ProductAttributes) {
                if ($scope.product.ProductAttributes.indexOf(attribute) === displayOrder) {
                    attribute.classDisplay = "flex";
                } else {
                    attribute.classDisplay = "none";
                }
            }
        }
        $scope.allowShowCat = true;
    };

    $scope.attributeNextButton = function (attribute) {
        // Go to next Attribute
        let attrFound = false;
        let nextAttributeDisplayOrder = null;
        const BreakException = {};
        if ($scope.product && $scope.product.ProductAttributes) {
            let items = $scope.product.ProductAttributes;
            try {
                for (let pAttr of items) {
                    if (attrFound) {
                        nextAttributeDisplayOrder = items.indexOf(pAttr);
                        throw BreakException;
                    }
                    if (items.indexOf(pAttr) === items.indexOf(attribute)) {
                        attrFound = true;
                    }
                }
            } catch (e) {
                if (e !== BreakException) throw e;
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
            }
            else {
                Attribute.Step = 0;
            }
        }

        let AttributeValue = Enumerable.from(Attribute.ProductAttributeValues).firstOrDefault("x => x.Id ==" + id);
        if (AttributeValue.Selected) {
            if (Attribute.IsRequired == false) {
                AttributeValue.Selected = false;
                if (AttributeValue.PriceAdjustment) $scope.TotalPrice = $scope.TotalPrice - AttributeValue.PriceAdjustment;
            }
        }
        else {
            AttributeValue.Selected = true;
            if (!reload) {
                Attribute.Step = $scope.currentStep;

                if (AttributeValue.LinkedProduct && AttributeValue.LinkedProduct.ProductComments && AttributeValue.LinkedProduct.ProductComments.length > 0) {
                    shoppingCartModel.editComment(AttributeValue);
                }
            }
            else {
                if (!Attribute.Step) Attribute.Step = $scope.currentStep;
            }
            if (AttributeValue.PriceAdjustment) {
                $scope.TotalPrice = $scope.TotalPrice + AttributeValue.PriceAdjustment;
            }
            $scope.$evalAsync();
        }

        if (Attribute.Type == 2) // Radiolist
        {
            for (let i = 0; i < Attribute.ProductAttributeValues.length; i++) {
                let item = Attribute.ProductAttributeValues[i];
                if (item.Selected && item.Id != id) {
                    item.Selected = false;
                    $scope.TotalPrice = $scope.TotalPrice - item.PriceAdjustment;
                }
            }

            // Go to next AttributeselectAttributeValue
            $scope.attributeNextButton(Attribute);
        }

        setTimeout(function () {
            let element = document.querySelector(".summaryList");
            element.scrollTop = element.scrollHeight;
        }, 100);
        $scope.allowShowCat = false;
        $scope.product.Price = $scope.TotalPrice;
        $scope.productIsValid();
        $scope.$evalAsync();
    };

    // Test if all required attributes are selected
    $scope.productIsValid = function () {

        $scope.productListOpen = false;
        $scope.canAddToCart = true;
        let retval = true;
        const attributes = Enumerable.from($scope.product.ProductAttributes).where("x => x.IsRequired").toArray();
        for (let i = 0; i < attributes.length; i++) {
            const attribute = attributes[i];
            retval = retval && Enumerable.from(attribute.ProductAttributeValues).any("x => x.Selected");
        }
        $scope.canAddToCart = retval;
        setTimeout(function () {
            let element = document.querySelector(".summaryList");
            if (element) {
                if (retval) {
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
            //updatedItemElem.scrollIntoView(false);

            $("#attributes").scrollTo(updatedItemElem);
            //var divAttr = document.getElementById("attributes")
            //if (divAttr) {
            //    divAttr.scrollTo(updatedItemElem);
            //}
        }
    }
});

