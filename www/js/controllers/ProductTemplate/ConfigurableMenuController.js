app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.ProductTemplate.ConfigurableMenu', {
            url: '/configurablemenu/{id}',
            params: {
                id: null,
                offer: null
            },
            templateUrl: 'viewsBorne/ProductTemplate/configurableMenu.html'
        })
        .state('catalogPOS.ProductTemplate.ConfigurableMenu', {
            url: '/configurablemenu/{id}',
            params: {
                id: null,
                offer: null
            },
            templateUrl: 'views/ProductTemplate/configurableMenu.html'
        });
});

app.controller('ConfigurableMenuController', function ($scope, $rootScope, $stateParams, $mdMedia, settingService, productService, pictureService) {
    $scope.pictureService = pictureService;

    $scope.init = () => {
        $scope.mdMedia = $mdMedia;
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            settingService.getStepNamesAsync().then((stepNames) => {
                $scope.stepNames = stepNames;
            });
        }
        productService.ReloadSelected = false;
    };

    const currentProductHandler = $rootScope.$watch('currentConfigurableProduct', () => {
        if ($rootScope.currentConfigurableProduct) {
            productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.CategoryId]).then(function (products) {
                let matchingProduct = Enumerable.from(products).firstOrDefault(function (p) {
                    return p.Id === $rootScope.currentConfigurableProduct.Id;
                });

                let productIds = [];
                matchingProduct.ProductAttributes.forEach((attr) => {
                    productIds.push(...attr.ProductAttributeValues.filter(pav => pav.LinkedProduct).map(pav => pav.LinkedProduct.Id));
                });

                if (!matchingProduct.StoreId) {
                    matchingProduct.StoreId = $rootScope.currentConfigurableProduct.StoreId;
                }

                if (productIds && productIds.length > 0) {
                    $rootScope.getProductByIdsAsync(productIds).then((products) => {
                        for (let attr of matchingProduct.ProductAttributes) {
                            let previouslySelectedValue = $rootScope.currentConfigurableProduct.ProductAttributes.find(a => a.Id === attr.Id).ProductAttributeValues.find(av => av.Selected);
                            for (let pav of attr.ProductAttributeValues) {
                                if (pav.LinkedProduct && pav.LinkedProduct.Id) {
                                    matching = Enumerable.from(products).firstOrDefault(p => p.Id === pav.LinkedProduct.Id);
                                    if (matching) {
                                        matchingProduct.TaxCategoryId = matchingProduct.TaxCategory.TaxCategoryId;
                                        pav.LinkedProduct = matching;
                                    }
                                }
                                if (previouslySelectedValue) {
                                    pav.Selected = previouslySelectedValue.Id === pav.Id;
                                }
                                let previousAV = $rootScope.currentConfigurableProduct.ProductAttributes.find(a => a.Id === attr.Id).ProductAttributeValues.find(av => av.Id === pav.Id);
                                if (previousAV) {
                                    pav.IsPreSelected = previousAV.IsPreSelected;
                                }
                            }
                        };

                        $scope.initialProduct = matchingProduct;

                        loadProduct(clone(matchingProduct));

                        $rootScope.currentConfigurableProduct = undefined;
                    });
                } else {
                    // Si on ne trouve aucun des produit lié de la formule
                    if ($rootScope.currentConfigurableProduct) {
                        productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.CategoryId]).then(function (products) {
                            let matchingProduct = Enumerable.from(products).firstOrDefault(function (p) {
                                return p.Id === $rootScope.currentConfigurableProduct.Id;
                            });
                            let productIds = [];
                            matchingProduct.ProductAttributes.forEach((attr) => {
                                productIds.push(...attr.ProductAttributeValues.filter(pav => pav.LinkedProduct).map(pav => pav.LinkedProduct.Id));
                            });
                            $scope.initialProduct = clone(matchingProduct);
                            if (productIds && productIds.length > 0) {
                                $rootScope.getProductByIdsAsync(productIds).then((products) => {
                                    matchingProduct.ProductAttributes.forEach((attr) => {
                                        attr.ProductAttributeValues.forEach((pav) => {
                                            if (pav.LinkedProduct && pav.LinkedProduct.Id) {
                                                pav.LinkedProduct = Enumerable.from(products).firstOrDefault(p => p.Id === pav.LinkedProduct.Id);
                                            }
                                        });
                                    });

                                    $rootScope.currentConfigurableProduct = matchingProduct;

                                    if ($rootScope.currentConfigurableProduct) {
                                        loadProduct(clone($rootScope.currentConfigurableProduct));
                                    }

                                    $rootScope.currentConfigurableProduct = undefined;
                                });
                            } else {
                                if ($rootScope.currentConfigurableProduct) {
                                    loadProduct(clone($rootScope.currentConfigurableProduct));
                                }
                                if (!$scope.initialProduct.StoreId) {
                                    $scope.initialProduct.StoreId = $rootScope.currentConfigurableProduct.StoreId;
                                }

                                $rootScope.currentConfigurableProduct = undefined;
                            }
                        });
                    } else {
                        $scope.initialProduct = $rootScope.currentConfigurableProduct;
                        loadProduct(clone($rootScope.currentConfigurableProduct));
                        $rootScope.currentConfigurableProduct = undefined;
                    }
                }
            });
        }
    });

    $scope.$on("$destroy", () => {
        if (currentProductHandler) {
            currentProductHandler();
        }
    });

    const loadProduct = (selectedProduct, isOfferConsumed = false, ignoreSelected = false) => {
        // Init Step
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            $scope.currentStep = 0;
            if (!$rootScope.currentShoppingCart) {
                $rootScope.createShoppingCart();
            }
            if ($rootScope.currentShoppingCart.CurrentStep) {
                $scope.currentStep = $rootScope.currentShoppingCart.CurrentStep;
            }
        }

        //Clone instance
        $scope.product = angular.copy(selectedProduct);

        // Sort by display order
        $scope.product.ProductAttributes = Enumerable.from($scope.product.ProductAttributes).orderBy(p => p.DisplayOrder).thenBy(p => p.Name).toArray();

        if (($rootScope.isConfigurableProductOffer || ($stateParams.offer && $stateParams.offer.OfferParam)) && !isOfferConsumed) {
            $scope.TotalPrice = $stateParams.offer.OfferParam.Price || 0;
            $scope.product.Price = $stateParams.offer.OfferParam.Price || 0;

        } else {
            console.log($scope.initialProduct);
            switch ($rootScope.currentDeliveryType) {
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

        $scope.productIsValid();

        if (productService.ReloadSelected && ignoreSelected) {
            for (let pAttr of $scope.product.ProductAttributes) {
                for (let pAttrValue of pAttr.ProductAttributeValues) {
                    pAttrValue.Selected = false;
                }
            }
        }

        //Load selected value
        for (let pAttr of $scope.product.ProductAttributes) {
            pAttr.ProductAttributeValues = Enumerable.from(pAttr.ProductAttributeValues).orderBy(pav => pav.DisplayOrder).thenBy(pav => pav.Name).toArray();

            let countSelected = pAttr.ProductAttributeValues.filter(a => a.Selected).length;

            for (let pAttrValue of pAttr.ProductAttributeValues) {
                //Load pictures for attributes values
                if (!pAttrValue.DefaultPictureUrl || pAttrValue.DefaultPictureUrl === 'img/photo-non-disponible.png') {
                    if (pAttrValue.LinkedProduct) {
                        pictureService.loadPictureForProductAsync(pAttrValue.LinkedProduct.Id).then((picture) => {
                            if (picture) {
                                pAttrValue.DefaultPictureUrl = picture.PictureUrl;
                            }
                        });
                    }
                }

                //Select attributes values
                if ((pAttrValue.IsPreSelected && (!countSelected)) || (pAttrValue.Selected && !productService.ReloadSelected && !ignoreSelected)) {
                    pAttrValue.Selected = false;
                    $scope.selectAttributeValue(pAttr.Id, pAttrValue.Id, true);
                }
            }
        }
    };

    //#region Actions
    $scope.addToSC = (product) => {
        productService.ReloadSelected = true;
        console.log($stateParams);
        $rootScope.addToCart(product, true, $stateParams.offer);
        if (!$rootScope.borne) {
            $stateParams.offer = null;
        }
        loadProduct($scope.initialProduct, true, true);
    };

    //#endregion
    $scope.moveStep = (i) => {
        if ($scope.currentStep + i >= 0) $scope.currentStep += i;
    };

    const adjustTotalPrice = () => {

        let attrPriceAdjustment = 0;
        $scope.product.ProductAttributes.forEach((attr) => {
            let selectedAttr = attr.ProductAttributeValues.filter(pav => pav.Selected);
            let nbSelected = selectedAttr.length;
            let selectedAttrPrices = selectedAttr.map(pav => pav.PriceAdjustment);

            if (attr.NbFree && attr.NbFree > 0) {

                let paidAttr = nbSelected - attr.NbFree;

                if (paidAttr > 0) {
                    let sorted = selectedAttrPrices.sort((a, b) => b - a);
                    let sliced = sorted.slice(0, paidAttr);
                    attrPriceAdjustment += sliced.reduce((a, b) => a + b, 0);
                }
            } else {
                attrPriceAdjustment += selectedAttrPrices.reduce((a, b) => a + b, 0);
            }
        });

        $scope.TotalPrice = $scope.initialProduct.Price + attrPriceAdjustment;
    };

    // Select (unselect) Attribute value
    $scope.selectAttributeValue = (productAttributeId, id, reload) => {
        let Attribute = Enumerable.from($scope.product.ProductAttributes).firstOrDefault(x => x.Id === productAttributeId);

        if (!reload) {
            if ($rootScope.currentShoppingCart) {
                Attribute.Step = $scope.currentStep;
            } else {
                Attribute.Step = 0;
            }
        }
        let AttributeValue = Enumerable.from(Attribute.ProductAttributeValues).firstOrDefault(x => x.Id === id);

        if (AttributeValue.Selected) {
            if (testSelectCheckbox(Attribute, AttributeValue, false)) {
                adjustTotalPrice();
            }
        } else {
            if (testSelectCheckbox(Attribute, AttributeValue, true)) {
                if (!reload) {
                    Attribute.Step = $scope.currentStep;

                    if (AttributeValue.LinkedProduct && AttributeValue.LinkedProduct.ProductComments && AttributeValue.LinkedProduct.ProductComments.length > 0) {
                        productService.editComment(AttributeValue);
                    }
                } else {
                    if (!Attribute.Step) {
                        Attribute.Step = $scope.currentStep;
                    }
                }

                adjustTotalPrice();

                $scope.$evalAsync();
            }
        }

        if (Attribute.Type == 2) // Radiolist
        {
            for (let i = 0; i < Attribute.ProductAttributeValues.length; i++) {
                let pav = Attribute.ProductAttributeValues[i];
                if (pav.Selected && pav.Id != id) {
                    pav.Selected = false;
                    adjustTotalPrice();
                }
            }
        }
        $scope.product.Price = $scope.TotalPrice;
        $scope.productIsValid();
        $scope.$evalAsync();
    };

    const testSelectCheckbox = (Attribute, AttributeValue, state) => {
        if (Attribute) {
            if (Attribute.Type != 2) { // Checkbox
                //A faire descendre du BO, mais pour l'instant c'est en dur
                const max = Attribute.Max ? Attribute.Max : 99;
                const min = Attribute.Min ? Attribute.Min : 0;
                // Pas besoin d'un min ?

                let nbSelect = Attribute.ProductAttributeValues.filter(a => a.Selected).length;

                // Si on veut selectionné et qu'on est en dessous du max, on autorise
                if (nbSelect < max && state) {
                    if (AttributeValue) {
                        AttributeValue.Selected = state;
                    }
                    return true;
                }
                // Si on veut déselectionné et qu'on est au dessus du min, on autorise
                if (nbSelect > min && !state) {
                    if (Attribute.IsRequired && nbSelect === 0) {
                        return false;
                    } else {
                        if (AttributeValue) {
                            AttributeValue.Selected = state;
                        }
                        return true;
                    }
                }

                return false;
            } else {
                // Dans le cas radio, on autorise
                if (AttributeValue) {
                    AttributeValue.Selected = state;
                }
                return true;
            }
        }

    }

    /**
     * Test if all required attributes are selected
     */
    $scope.productIsValid = () => {
        $scope.canAddToCart = true;
        let retval = true;
        let attributes = Enumerable.from($scope.product.ProductAttributes).where("x => x.IsRequired").toArray();
        for (let i = 0; i < attributes.length; i++) {
            let attribute = attributes[i];
            retval = retval && Enumerable.from(attribute.ProductAttributeValues).any("x => x.Selected");
        }
        $scope.canAddToCart = retval;
    };

    $scope.scrollTo = (elementId) => {
        const elem = document.querySelector('#a' + elementId);
        if (elem) {
            const top = elem.offsetTop;
            $('#attributes').animate({
                scrollTop: top - 40
            }, 200);
        }
    };
});