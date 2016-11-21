app.config(function ($stateProvider) {
    $stateProvider
        .state('catalog.ProductTemplate.ConfigurableMenu', {
            url: '/configurablemenu/{id}',
            templateUrl: 'views/ProductTemplate/configurableMenu.html'
        })
})


app.controller('ConfigurableMenuController', function ($scope, $rootScope, $stateParams, $location, categoryService, settingService, productService, pictureService, shoppingCartModel) {
    $scope.init = function () {

       
        if ($rootScope.IziBoxConfiguration.StepEnabled) {
            settingService.getStepNamesAsync().then(function (stepNames) {
                $scope.stepNames = stepNames;
            });
        }
         
    };

    var currentProductHandler = $rootScope.$watch('currentConfigurableProduct', function () {

        if ($rootScope.currentConfigurableProduct) {
            productService.getProductForCategoryAsync([$rootScope.currentConfigurableProduct.ProductCategory.CategoryId]).then(function (products) {

                $scope.initialProduct = Enumerable.from(products).firstOrDefault(function (p) { return p.Id == $rootScope.currentConfigurableProduct.Id; });

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

    var loadProduct = function (selectedProduct) {        

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

        $scope.TotalPrice = $scope.initialProduct.Price;
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
                    $scope.selectAttributeValue(pAttrId, pAttrValue.Id,true);
                }
            });
        });
    }

    //#region Actions
    $scope.addToCart = function (product) {
        shoppingCartModel.addToCart(product, true);
        loadProduct($scope.initialProduct);
    }
    //#endregion
    $scope.moveStep = function (i) {
        if($scope.currentStep+i>=0) $scope.currentStep += i;
    };

    // Select (unselect) Attribute value
    $scope.selectAttributeValue = function (productAttributeId, id,reload) {
                
        var Attribute = Enumerable.from($scope.product.ProductAttributes).firstOrDefault("x => x.Id ==" + productAttributeId);
        if (!reload)
        {
            if (shoppingCartModel.getCurrentShoppingCart()) {
                Attribute.Step = $scope.currentStep;
            }
            else
            {
                Attribute.Step = 0;
            }

        }

        var AttributeValue = Enumerable.from(Attribute.ProductAttributeValues).firstOrDefault("x => x.Id ==" + id);
        if(AttributeValue.Selected)
        {
            if (Attribute.IsRequired == false) {
                AttributeValue.Selected = false;                
                if (AttributeValue.PriceAdjustment) $scope.TotalPrice = $scope.TotalPrice - AttributeValue.PriceAdjustment;
            }
        }
        else
        {
            AttributeValue.Selected = true;
            if (!reload) {
                Attribute.Step = $scope.currentStep;

                if (AttributeValue.LinkedProduct && AttributeValue.LinkedProduct.ProductComments && AttributeValue.LinkedProduct.ProductComments.length > 0)
                {
                    shoppingCartModel.editComment(AttributeValue);
                }

            }
            else {
                if (!Attribute.Step) Attribute.Step = $scope.currentStep;
            }
            if (AttributeValue.PriceAdjustment) $scope.TotalPrice = $scope.TotalPrice + AttributeValue.PriceAdjustment;
            $scope.$evalAsync();
        }

        if (Attribute.Type == 2) // Radiolist
        {

            for (var i = 0; i < Attribute.ProductAttributeValues.length; i++) {
                var item = Attribute.ProductAttributeValues[i];
                if (item.Selected && item.Id != id) {
                    item.Selected = false;
                    $scope.TotalPrice = $scope.TotalPrice - item.PriceAdjustment;
                }
            }
        }

        $scope.product.Price = $scope.TotalPrice;
        $scope.productIsValid();

        $scope.$evalAsync();
    };

    // Test if all required attributes are selected
    $scope.productIsValid = function () {

        $scope.canAddToCart = true;
        var retval = true;
        var attributes = Enumerable.from($scope.product.ProductAttributes).where("x => x.IsRequired").toArray();
        for(var i=0;i<attributes.length;i++)
        {
            var attribute=attributes[i];
            retval = retval && Enumerable.from(attribute.ProductAttributeValues).any("x => x.Selected");
        }
        $scope.canAddToCart = retval;
    };

    $scope.scrollTo = function (elementId) {
        var updatedItemElem = document.getElementById(elementId);
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

