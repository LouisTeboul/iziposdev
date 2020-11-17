app.config(function ($stateProvider) {
    $stateProvider
        .state('catalogBorne.ProductTemplate.ConfigurableMenuList', {
            url: '/configurablemenulist/{id}',
            params: {
                id: null,
                offer: null
            },
            templateUrl: 'viewsBorne/ProductTemplate/configurableMenuList.html'
        })
        .state('catalogPOS.ProductTemplate.ConfigurableMenuList', {
            url: '/configurablemenulist/{id}',
            params: {
                id: null,
                offer: null
            },
            templateUrl: 'views/ProductTemplate/configurableMenuList.html'
        });
});

app.controller('ConfigurableMenuListController', function ($scope, $rootScope, $stateParams, $state, $mdMedia, settingService, productService, pictureService) {
    $scope.allowShowCat = false;
    $scope.productListOpen = false;
    $scope.mdMedia = $mdMedia;
    $scope.pictureService = pictureService;

    $scope.init = () => {
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            settingService.getStepNamesAsync().then((stepNames) => {
                $scope.stepNames = stepNames;
            });
        }
        let storePictureDiv = $("#storePicture");
        if (storePictureDiv) {
            storePictureDiv.fadeOut(300);
            storePictureDiv.addClass('hiding');
        }
    };

    const currentProductHandler = $rootScope.$watch('currentConfigurableProduct', () => {
        if ($rootScope.currentConfigurableProduct) {
            productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.CategoryId]).then((products) => {
                let matchingProduct = products.find(p => p.Id === $rootScope.currentConfigurableProduct.Id);
                let productIds = [];

                matchingProduct.ProductAttributes.forEach((attr) => {
                    productIds.push(...attr.ProductAttributeValues.filter(pav => pav.LinkedProduct).map(pav => pav.LinkedProduct.Id));
                });
                if (productIds && productIds.length > 0) {
                    $rootScope.getProductByIdsAsync(productIds).then((products) => {
                        matchingProduct.ProductAttributes.forEach((attr) => {
                            let previouslySelectedValue = $rootScope.currentConfigurableProduct.ProductAttributes.find(a => a.Id === attr.Id).ProductAttributeValues.find(av => av.Selected);
                            attr.ProductAttributeValues.forEach((pav) => {
                                if (pav.LinkedProduct && pav.LinkedProduct.Id) {
                                    matching = Enumerable.from(products).firstOrDefault(p => p.Id === pav.LinkedProduct.Id);
                                    if (matching) {
                                        pav.LinkedProduct = matching;
                                    }
                                    pav.LinkedProduct = Enumerable.from(products).firstOrDefault(p => p.Id === pav.LinkedProduct.Id);
                                }
                                if (previouslySelectedValue) {
                                    pav.Selected = previouslySelectedValue.Id === pav.Id;
                                }
                            });
                        });

                        $scope.initialProduct = matchingProduct;

                        matchingProduct.StoreId = $rootScope.currentConfigurableProduct.StoreId;

                        loadProduct(clone(matchingProduct));

                        $rootScope.currentConfigurableProduct = undefined;
                    });
                } else {
                    if ($rootScope.currentConfigurableProduct) {
                        productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.CategoryId]).then(function (products) {
                            let matchingProduct = Enumerable.from(products).firstOrDefault(function (p) {
                                return p.Id === $rootScope.currentConfigurableProduct.Id;
                            });
                            let productIds = [];
                            matchingProduct.ProductAttributes.forEach((attr) => {
                                productIds.push(...attr.ProductAttributeValues.filter(pav => pav.LinkedProduct).map(pav => pav.LinkedProduct.Id));
                            });
                            if (productIds && productIds.length > 0) {
                                $rootScope.getProductByIdsAsync(productIds).then((products) => {
                                    matchingProduct.ProductAttributes.forEach((attr) => {
                                        attr.ProductAttributeValues.forEach((pav) => {
                                            if (pav.LinkedProduct && pav.LinkedProduct.Id) {
                                                pav.LinkedProduct = Enumerable.from(products).firstOrDefault(p => p.Id === pav.LinkedProduct.Id);
                                            }
                                        });
                                    });

                                    $scope.initialProduct = matchingProduct;
                                    $rootScope.currentConfigurableProduct = matchingProduct;

                                    if ($rootScope.currentConfigurableProduct) {
                                        loadProduct(clone($rootScope.currentConfigurableProduct));
                                    }

                                    $scope.initialProduct.StoreId = $rootScope.currentConfigurableProduct.StoreId;

                                    $rootScope.currentConfigurableProduct = undefined;
                                });
                            } else {
                                $scope.initialProduct = matchingProduct;

                                if ($rootScope.currentConfigurableProduct) {
                                    loadProduct(clone($rootScope.currentConfigurableProduct));
                                }

                                $scope.initialProduct.StoreId = $rootScope.currentConfigurableProduct.StoreId;

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
        currentProductHandler();
    });

    const loadProduct = (selectedProduct, isOfferConsumed) => {
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
        $scope.product.ProductAttributes = Enumerable.from($scope.product.ProductAttributes).orderBy(p => p.DisplayOrder).thenBy(x => x.Name).toArray();

        if ($scope.product.ProductAttributes.length > 1) {
            $scope.product.ProductAttributes.sort((a, b) => {
                return a.DisplayOrder - b.DisplayOrder;
            });

            $scope.attributeNext(0);
        }

        $scope.initPrice = $scope.product.Price;

        if (($rootScope.isConfigurableProductOffer || $stateParams.offer && $stateParams.offer.OfferParam) && !isOfferConsumed) {
            $scope.TotalPrice = $stateParams.offer.OfferParam.Price || 0;
            $scope.product.Price = $stateParams.offer.OfferParam.Price || 0;
        } else {
            $scope.TotalPrice = $scope.initialProduct.Price;
        }

        $scope.productIsValid();

        //Load pictures
        $scope.product.DefaultPictureUrl = "img/photo-non-disponible.png";

        pictureService.loadPictureForProductAsync($scope.product.Id).then((picture) => {
            if (picture) {
                $scope.product.DefaultPictureUrl = picture.PictureUrl;
            }
        });

        for (let pAttr of $scope.product.ProductAttributes) {
            let pAttrId = pAttr.Id;
            pAttr.ProductAttributeValues = Enumerable.from(pAttr.ProductAttributeValues).orderBy(pav => pav.DisplayOrder).thenBy(x => x.Name).toArray();
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
                if (pAttrValue.IsPreSelected || pAttrValue.Selected) {
                    pAttrValue.Selected = false;
                    $scope.selectAttributeValue(pAttrId, pAttrValue.Id, true, false);
                }
            }
            if ($scope.product.ProductAttributes.indexOf(pAttr) === $scope.product.ProductAttributes.length - 1) {
                pAttr.IsLast = true;
            }
        }
    };

    //#region Actions
    $scope.addToSC = (product) => {
        $rootScope.addToCart(product, true, $stateParams.offer);
        loadProduct($scope.initialProduct, true);
        if ($rootScope.borne) {
            $state.go("catalogBorne.CategoryTemplate.IZIPASS", {
                id: product.CategoryId
            });
        } else {
            $state.go("catalogPOS.CategoryTemplate.IZIPASS", {
                id: product.CategoryId
            });
        }
    };

    $scope.returnToCat = (product) => {
        if ($rootScope.EnableMultiStore && $rootScope.selectedStore.SmallMenuEnabled) {
            if ($rootScope.borne) {
                $state.go('catalogBorne.StoreCategories', {
                    storeId: $rootScope.selectedStore.Id
                });
            } else {
                $state.go('catalogPOS.StoreCategories', {
                    storeId: $rootScope.selectedStore.Id
                });
            }
        } else {
            if ($rootScope.borne) {
                $state.go("catalogBorne.CategoryTemplate.IZIPASS", {
                    id: $rootScope.currentSelectedCat
                });
            } else {
                $state.go("catalogPOS.CategoryTemplate.IZIPASS", {
                    id: product.CategoryId
                });
            }
        }
    };

    //#endregion
    $scope.moveStep = (i) => {
        if ($scope.currentStep + i >= 0) {
            $scope.currentStep += i;
        }
    };

    $scope.attributeNext = (nextProductIndex) => {
        $scope.productListOpen = true;
        $scope.allowShowCat = true;
        let itemSelected = $scope.product.ProductAttributes.find(pa => pa.IsRequired || pa.ProductAttributeValues.find(pav => pav.Selected));
        if ($scope.product.ProductAttributes.length > 1) {
            for (let attribute of $scope.product.ProductAttributes) {
                attribute.classDisplay = "none";
            }

            if (nextProductIndex < $scope.product.ProductAttributes.length) {
                if ($scope.product.ProductAttributes[nextProductIndex]) {
                    $scope.product.ProductAttributes[nextProductIndex].classDisplay = "flex";
                }
            }
            if (nextProductIndex === $scope.product.ProductAttributes.length && !itemSelected) {
                $scope.product.ProductAttributes[0].classDisplay = "flex";
            }
        }
    };

    $scope.goToIndex = (index) => {
        // TODO : Check si on a selectionné au moins un item dans l'attribut qu'on essaye de quitter

        let currentAttribute = $scope.product.ProductAttributes.find(pa => pa.classDisplay === "flex");

        if (currentAttribute) {
            let hasSelectedValues = currentAttribute.ProductAttributeValues.some(av => av.Selected);
            if (currentAttribute.IsRequired && !hasSelectedValues) {
                return;
            }
            currentAttribute.skipped = !hasSelectedValues;
        }

        if ($scope.product && $scope.product.ProductAttributes) {
            if (index || index === 0) {
                $scope.attributeNext(index);
            } else {
                $scope.attributeNext($scope.product.ProductAttributes.indexOf(currentAttribute) + 1);
            }
        }
    };

    $scope.goNextFromAttribute = (attribute) => {
        if (!attribute) {
            attribute = $scope.product.ProductAttributes.find(pa => pa.classDisplay === "flex");
        }

        if (attribute) {
            let hasSelectedValues = attribute.ProductAttributeValues.some(av => av.Selected);
            attribute.skipped = !hasSelectedValues;
        }

        if ($scope.product && $scope.product.ProductAttributes) {
            $scope.attributeNext($scope.product.ProductAttributes.indexOf(attribute) + 1);
        }
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

    // Select (unselect) attribut value
    $scope.selectAttributeValue = (productAttributeId, id, reload, goNext = true) => {
        let Attribute = $scope.product.ProductAttributes.find(p => p.Id === productAttributeId);

        if (!reload) {
            if ($rootScope.currentShoppingCart) {
                Attribute.Step = $scope.currentStep;
            } else {
                Attribute.Step = 0;
            }
        }
        let AttributeValue = Attribute.ProductAttributeValues.find(p => p.Id === id);
        let doNextCat = true;

        if (AttributeValue.Selected) {
            if (testSelectCheckbox(Attribute, AttributeValue, false)) {
                AttributeValue.Selected = false;
                if ($rootScope.borne) {
                    doNextCat = false;
                }

                adjustTotalPrice();

            } else if (!Attribute.IsRequired) {
                AttributeValue.Selected = false;
                if (AttributeValue.PriceAdjustment) {
                    adjustTotalPrice(Attribute, AttributeValue);
                }
                if ($rootScope.borne) {
                    doNextCat = false;
                }
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

        if (Attribute.Type === 2) // Radiolist
        {
            for (let i = 0; i < Attribute.ProductAttributeValues.length; i++) {
                let pav = Attribute.ProductAttributeValues[i];
                if (pav.Selected && pav.Id !== id) {
                    pav.Selected = false;
                    adjustTotalPrice();
                }
            }
            // Go to next AttributeselectAttributeValue
            if (doNextCat && goNext) {
                $scope.goNextFromAttribute(Attribute);
            }
        }
        $scope.allowShowCat = false;
        $scope.product.Price = $scope.TotalPrice;
        $scope.productIsValid();
        $scope.$evalAsync();
    };

    const testSelectCheckbox = (attribut, AttributeValue, state) => {
        if (attribut.Type !== 2) { // Checkbox

            const max = attribut.Max ? attribut.Max : 99;
            const min = attribut.Min ? attribut.Min : 0;
            // Pas besoin d'un min ?

            // On recupere le container de l'element cliqué
            let container;
            if ($rootScope.borne) {
                container = document.querySelector("#att" + attribut.Id + " .attributeList");
            } else {
                container = document.querySelector("#att" + attribut.Id + " .groupProductsCat");
            }

            let nbSelect = 0;
            if (container) {
                // On regarde le nombre d'element selectionné dans le container
                nbSelect = container.querySelectorAll(".active").length;
            }

            // Si on veut selectionné et qu'on est en dessous du max, on autorise
            if (nbSelect < max && state) {
                if (AttributeValue) {
                    AttributeValue.Selected = state;
                }
                return true;
            }

            // Si on veut déselectionné et qu'on est au dessus du min, on autorise
            if (nbSelect > min && !state) {
                if (attribut.IsRequired && nbSelect === 0) {
                    return false;
                } else {
                    if (AttributeValue) {
                        AttributeValue.Selected = state;
                    }
                    return true;
                }
            }

            return false;
        } else { //Radio
            if (state) {
                if (AttributeValue) {
                    AttributeValue.Selected = state;
                }
                return true;
            } else {
                return !attribut.IsRequired;
            }
        }
    };

    // Test if all required attributes are selected
    $scope.productIsValid = () => {
        $scope.productListOpen = false;
        $scope.canAddToCart = true;
        const attributes = Enumerable.from($scope.product.ProductAttributes).where("x => x.IsRequired").toArray();
        for (let i = 0; i < attributes.length; i++) {
            $scope.canAddToCart = Enumerable.from(attributes[i].ProductAttributeValues).any(x => x.Selected);
            if (!$scope.canAddToCart) break;
        }

        if ($rootScope.borne) {
            $scope.allowShowCat = true;
        }
    };

    $scope.scrollTo = (elementId) => {
        const updatedItemElem = document.getElementById(elementId);
        if (updatedItemElem) {
            $("#attributes").scrollTo(updatedItemElem);
        }
    };
});