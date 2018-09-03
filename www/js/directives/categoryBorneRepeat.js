app.directive('categoryBorneRepeat', function ($rootScope, $compile, $filter) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: function (scope, element) {

            /*scope.$watch('deliveryType', function (deliveryType) {
                element.empty();*/

            let hasDefaultProduct = false;

            function repeatProducts(products) {
                if (products) {
                    let result = "<section class='layout-row layout-wrap'>";
                    for (let product of products) {
                        hasDefaultProduct = true;
                        result += `<div class='caseAttribute'><div class="productboxIZIPASS`;
                        if ($rootScope.UserPreset) {
                            if ($rootScope.UserPreset.ItemSize === 1 || $rootScope.UserPreset.ItemSize && scope.$mdMedia('max-width: 799px')) {
                                result += ' small';
                            } else if ($rootScope.UserPreset.ItemSize === 2 && scope.$mdMedia('min-width: 800px')) {
                                result += ' medium';
                            } else if ($rootScope.UserPreset.ItemSize === 3 && scope.$mdMedia('min-width: 800px')) {
                                result += ' big';
                            }
                        } else if (scope.$mdMedia('max-width: 799px')) {
                            result += ' small';
                        }
                        if (product.DisableBuyButton) {
                            result += ' disabled productIPDisabled';
                        }
                        result += `" onclick="$('#IZIPASSController').scope().addToCart(${product.Id})" >`;
                        result += `<div class="imgProduct">
                                       <img alt="" src='${product.DefaultPictureUrl}' class="image"/>
                                   </div>
                                   <div class="titleRow">  
                                    ${product.Name}
                                   </div>`;
                        if ($rootScope.tenantColor) {
                            result += `<div class="price" style="color: ${$rootScope.tenantColor}">`;
                        } else {
                            result += `<div class="price">`;
                        }

                        if (!product.DisableBuyButton && product.Price && !product.EmployeeTypePrice) {
                            result += `<span> ${$filter('CurrencyFormat')(product.Price)} </span>`;
                        }
                        if (!product.DisableBuyButton && product.EmployeeTypePrice) {
                            result += `<span translate>Saisir le prix</span>`;
                        }
                        if (product.DisableBuyButton) {
                            result += `<span translate>Rupture</span>`;
                        }
                        result += `</div></div></div>`;
                    }
                    result += "</section>";
                    return result;
                }
            }

            let template = "";
            let borderColor = "";
            if ($rootScope.tenantColor) {
                borderColor = `style="border-color: ${$rootScope.tenantColor}"`
            }
            let allCategories = `<h1 class="cBRTitle" ${borderColor} >${scope.model.category.Name}</h1><section id="allCategories" class='layout-column flex-85'>`;

            /** Main category products*/
            let mainProducts = "<section id='cMain'>";

            mainProducts += repeatProducts(scope.model.category.products);

            mainProducts += "</section>";
            allCategories += mainProducts;

            if (scope.model.subCategories) {
                for (let subCat of scope.model.subCategories) {
                    if (subCat.products && subCat.products.length > 0) {
                        let subCatProducts = "";
                        for (let cat of scope.model.subCategories) {
                            if (cat.products && cat.products.length > 0) {
                                if (cat.Id === subCat.Id) {
                                    let hr = '';
                                    if (hasDefaultProduct) {
                                        hr = '<hr class="betweenCatsHR">';
                                        hasDefaultProduct = false;
                                    }

                                    let textColor = '';

                                    if ($rootScope.tenantColor) {
                                        textColor = `style="color: ${$rootScope.tenantColor}"`;
                                    }

                                    subCatProducts = hr + `<section id='c${subCat.Id}' class="sectionCat">
                                                    <div class="listCatsNext"></div>
                                                    <div class="listCats">
                                                    <span class="glyphicon glyphicon-star catRepeat"
                                                    onclick="$('#IZIPASSController').scope().scrollTo('Main')"></span>
                                                    <span class="catRepeat catFocused" ${textColor} >${cat.Name}</span>` + subCatProducts;

                                } else {
                                    subCatProducts += `<span class="catRepeat"
                                                    onclick="$('#IZIPASSController').scope().scrollTo(${cat.Id})">${cat.Name}</span>`;
                                }
                            }
                        }
                        subCatProducts += `</div>`;
                        subCatProducts += repeatProducts(subCat.products);
                        subCatProducts += "</section>";
                        allCategories += subCatProducts;
                    }
                }
            }


            allCategories += "</section>";

            template += allCategories;

            if (!$rootScope.isPMREnabled) {
                template += `<div class="pubProductsCut" id="pubProductsCutB" style="bottom:250px"></div><div class="pubProductsCut reverse"></div>`;
                if($rootScope.bornePubImages) {
                    template += `<div class="pubProductsList" id="pubProductsList" style="display:block;background-image: url(` + $rootScope.bornePubImages + `);"></div>`;
                } else {
                    template += `<div class="pubProductsList" id="pubProductsList" style="display:block;background-image: url('/img/ad.png');"></div>`;
                }
            } else {
                template += `<div class="pubProductsCut" id="pubProductsCutB" style="bottom:0"></div><div class="pubProductsCut reverse"></div>`;
                if($rootScope.bornePubImages) {
                    template += `<div class="pubProductsList" id="pubProductsList" style="display:none;background-image: url(` + $rootScope.bornePubImages + `);"></div>`;
                } else {
                    template += `<div class="pubProductsList" id="pubProductsList" style="display:none;background-image: url('/img/ad.png');"></div>`;
                }
            }

            element.append(template);
        }
    }
});