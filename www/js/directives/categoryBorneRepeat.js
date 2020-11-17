app.directive('categoryBorneRepeat', function ($rootScope, $compile, $filter, pictureService, stockService) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: (scope, element) => {
            const nopicture = $rootScope.IziBoxConfiguration.NoPictures;

            let categoryListener = scope.$watch('model.category', (newValue, oldValue) => {
                let jnew = JSON.stringify(newValue);
                let jold = JSON.stringify(oldValue);
                if (jnew !== jold) {
                    if (scope.model.category) {
                        loadCategory();
                    }
                }
            }, true);

            scope.$on("$destroy", () => {
                categoryListener();
            });

            let hasDefaultProduct = false;

            const repeatProducts = (catId, products) => {
                let nbProductCategorie = scope.model.category.NbProductByLine;
                let productboxClasses = 0;
                if (products && products.length > 0) {
                    let result = `<section class="layout-row layout-wrap">`;
                    if(nbProductCategorie == 1){
                         result = `<section class="layout-row layout-wrap" style="justify-content: center;">`;
                    }
                    for (let product of products) {
                        hasDefaultProduct = true;
                        if($rootScope.borneVertical){
                             productboxClasses = nbProductCategorie == 0 ? "productboxIZIPASS" : (nbProductCategorie == 2 ? "productboxIZIPASS productboxBig": (nbProductCategorie == 4 ? "productboxIZIPASS productboxMedium": (nbProductCategorie == 1 ? "productboxIZIPASS productboxUltra": "productboxIZIPASS productboxSmall"))); 
                        }
                        
                        result += `<div class="caseAttribute" id="pb${product.Id}"><div class="${productboxClasses}`;

                        if (nopicture) {
                            result += ` nopicture`;
                        }
                        let productIsDisabled = product.ManageInventoryMethodId === 1 && (product.DisableBuyButton || product.StockQuantity <= 0 || product.StockQuantity - stockService.getBufferStockForProductId(product.Id) <= 0);

                        if (productIsDisabled) {
                            result += ` disabled productIPDisabled`;
                        }

                        result += `" onclick="$('#IZIPASSController').scope().addToSC(${catId},${product.Id})">`;

                        if (!!product.ShortDescription || !!product.FullDescription) {
                            result += `
                                <div class="product-desc-img" style="fill : ${$rootScope.tenantColor}">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25">
                                        <title>info</title>
                                        <g id="Calque_2" data-name="Calque 2">
                                            <g id="Calque_1-2" data-name="Calque 1">
                                                <path d="M21,0H0A25,25,0,0,0,25,25V4A4,4,0,0,0,21,0ZM15.48,4.5a1.39,1.39,0,0,1,1.44,1.42A1.44,1.44,0,1,1,15.48,4.5Zm2.34,12a37.36,37.36,0,0,0-4.49,0V16l.39-.07c.64-.09.68-.12.68-2.19v-1.6c0-2.64,0-2.75-.79-2.86l-.28,0V8.63a13,13,0,0,0,3.33-.29l.15.13c0,.85-.07,2.35-.07,3.16v2.06c0,2,0,2.05.75,2.19l.33.07Z"/>
                                            </g>
                                        </g>
                                    </svg>
                                </div>`;
                            result += `<div class='product-desc-button layout-column layout-align-center-center' onclick="$('#IZIPASSController').scope().openDesc(${product.Id}, ${catId}); event.stopPropagation();"></div>`;
                        }

                        result += `<div class="boxContent">`;

                        if ($rootScope.borne) {
                            if (!nopicture) {
                                let pictureUrl = pictureService.getPictureFileUrl(product.Id, "Product");

                                if (pictureUrl) {
                                    let image = new Image();
                                    image.src = pictureUrl;
                                    image.onload = () => {
                                        let elem = document.querySelector('#pb' + product.Id + ' .boxContent');
                                        if (elem) {
                                            elem.innerHTML = `<div id="img${product.Id}" class="imgProduct bigProduct image progressive borne replace" data-href="${pictureUrl}"></div>` + elem.innerHTML;
                                        }
                                    };
                                }
                            }
                            result += `<div class="titleRow layout-row layout-align-center-center">${product.Name}</div>`;
                        } else {
                            if (!nopicture) {
                                if ($rootScope.borneVertical) {
                                    result +=
                                        `<div class="layout-column layout-align-space-between-center layout-fill">
                                        <div class="imageContainer">                    
                                            <div class="image progressive borne replace ${product.DisableBuyButton ? 'rupture' : ''}"
                                                 data-href="${pictureService.getPictureFileUrl(product.Id, 'Product')}">
                                            </div>

                                        </div>
                                    `;
                                } else {
                                    result +=
                                        `<div class="layout-column layout-align-space-between-center layout-fill">
                                        <div class="imageContainer">                    
                                            <div class="image progressive borneH replace ${product.DisableBuyButton ? 'rupture' : ''}"
                                                 data-href="${pictureService.getPictureFileUrl(product.Id, 'Product')}">
                                            </div>

                                        </div>
                                    `;
                                }
                            }
                            result += `<div class="titleRow layout-row layout-align-center-center">${product.Name}</div>`;

                            // result += '<div class="imgProduct image progressive replace" data-href="' + pictureService.getPictureFileUrl(product.Id, 'Product') +
                            //           '"></div><div class="titleRow">' + product.Name + '</div>';
                        }
                        //if ($rootScope.tenantColor) {
                        result += `<div id="productPrice" class="price layout-column layout-align-space-around-center"
                                            type="${(product.EmployeeTypePrice ? 'employeeType' : 'fixed')}" style="color: ${$rootScope.tenantColor || 'initial'}">`;
                        //} else {
                        //    result += '<div class="price" layout="column" layout-align="center center" id="productPrice" type="' + (product.EmployeeTypePrice ? 'employeeType' : 'fixed') + '">';
                        //}
                        if ($rootScope.borneVertical) {
                            result += `<div id="criticalStock" style="font-size: 15px;`;
                        } else {
                            result += `<div id="criticalStock" style="font-size: 12px;`;
                        }
                        if (product.ManageInventoryMethodId === 1 && !productIsDisabled && product.StockQuantity <= product.CriticalStockQuantity) {
                            result += `">`;
                        } else {
                            result += `display: none">`;
                        }
                        result += `Plus que ${product.StockQuantity} en stock
                                   </div>`;

                        result += `<div id="sq${product.Id}" style="display:none"> ${product.StockQuantity}</div>`;

                        result += `<div id="fixedPrice" class=`;
                        if (!productIsDisabled && product.Price && !product.EmployeeTypePrice) {
                            result += `"">`;
                        } else {
                            result += `"ng-hide">`;
                        }
                        result += `${$filter('CurrencyFormat')(product.Price)}</div>`;

                        result += `<div id="typePrice" translate class=`;
                        if (!productIsDisabled && product.EmployeeTypePrice) {
                            result += `"">`;
                        } else {
                            result += `"ng-hide">`;
                        }
                        result += `Saisir le prix</div>`;

                        result += `<div id="outOfStock" translate class=`;
                        if (productIsDisabled) {
                            result += `"">`;
                        } else {
                            result += `"ng-hide">`;
                        }
                        result += `Rupture</div>`;

                        result += `</div>`;

                        // if (!product.DisableBuyButton && product.Price && !product.EmployeeTypePrice) {
                        //     result += '<span>' + $filter('CurrencyFormat')(product.Price) + '</span>';
                        // }
                        // if (!product.DisableBuyButton && product.EmployeeTypePrice) {
                        //     result += '<span translate>Saisir le prix</span>';
                        // }
                        // if (product.DisableBuyButton) {
                        //     result += '<span translate>Rupture</span>';
                        // }
                        result += `</div></div></div></div></div>`;
                    }
                    result += `</section>`;
                    return result;
                } else {
                    return "";
                }
            };

            const loadCategory = () => {
                let template = "";

                // ATTENTION LES YEUX : Ceci est un bout de code dégoutant.
                // Pas le choix d'injecter du JS dans le template, eventListener ne fonctionne pas pour une raison qui m'échanppe ...
                template += `<script type="text/javascript"> 
                            var lastExecution = 0;
                            function catalogScroll() { 
                                if(Date.now() - lastExecution > 200) {
                                    lastExecution = Date.now();
                                    let scrollTopValue = $("#allCategories").scrollTop();
                                    let storePictureDiv = $("#storePicture");
                                    if(scrollTopValue < 20) { 
                                        storePictureDiv.fadeOut(300); 
                                        storePictureDiv.addClass('hiding');
                                    }
                                }
                            }
                            </script>`;

                let borderColor = "";

                if (scope.model && scope.model.category) {
                    if ($rootScope.tenantColor) {
                        borderColor = 'style="border-color: ' + $rootScope.tenantColor + '"';
                    }
                    if (!$rootScope.EnableMultiStore) {
                        let categoryHeader = '<h1 class="cBRTitle" ' + borderColor + '>' + scope.model.category.Name + '</h1>';
                        template += categoryHeader;
                    }
                    let allCategories = '<section id="allCategories" onscroll="catalogScroll()" class="layout-column flex-85">';
                    /** Main category products*/
                    let mainProducts = "<section id='cMain'>";

                    mainProducts += repeatProducts(scope.model.category.Id, scope.model.category.products);

                    mainProducts += "</section>";
                    allCategories += mainProducts;
                    $rootScope.currentSelectedCat = scope.model.category.Id;
                    if (scope.model.category.SubCategories) {
                        for (let subCat of scope.model.category.SubCategories) {
                            if (!subCat.DisabledOnBorne) {
                                if (subCat.products && subCat.products.length > 0) {
                                    let subCatProducts = "";
                                    for (let cat of scope.model.category.SubCategories) {
                                        if (cat.products && cat.products.length > 0) {
                                            if (cat.Id === subCat.Id) {
                                                let hr = '';
                                                if (hasDefaultProduct) {
                                                    hr = '<hr class="betweenCatsHR">';
                                                    hasDefaultProduct = false;
                                                }

                                                let textColor = '';

                                                if ($rootScope.tenantColor) {
                                                    textColor = 'style="color:' + $rootScope.tenantColor + '"';
                                                }

                                                subCatProducts = hr + '<section id="c' + subCat.Id + '" class="sectionCat"><div class="listCatsNext"></div><div class="listCats">' +
                                                    '<span ng-show="model.category.products && model.category.products.length > 0" class="glyphicon glyphicon-star catRepeat"' +
                                                    'onclick="$(\'#IZIPASSController\').scope().scrollTo(\'Main\')"></span><span class="catRepeat catFocused" ' +
                                                    textColor + '>' + cat.Name + '</span >' + subCatProducts;
                                            } else if (!$rootScope.EnableMultiStore) {

                                                //subCatProducts += '<span class="catRepeat" onclick="$(\'#IZIPASSController\').scope().scrollTo(' + cat.Id + ')">' + cat.Name + '</span>';

                                            }
                                        }
                                    }
                                    subCatProducts += '</div>';
                                    subCatProducts += repeatProducts(subCat.Id, subCat.products);
                                    subCatProducts += "</section>";
                                    allCategories += subCatProducts;
                                }
                            }
                        }
                    }
                    allCategories += "</section>";
                    template += allCategories;

                    if (!$rootScope.isPMREnabled) {
                        if ($rootScope.borne && ($rootScope.borneVertical && scope.mdMedia('min-width: 800px') || !$rootScope.borneVertical && scope.mdMedia('min-height: 800px'))) {
                            //template += '<div class="pubProductsCut" id="pubProductsCutB" style="bottom:250px"></div><div class="pubProductsCut reverse"></div>';
                            template += '<div class="pubProductsCut" id="pubProductsCutB" style="bottom:0"></div><div class="pubProductsCut reverse ' + $rootScope.EnableMultiStore ? "multistore" : "" + '"></div>';
                        } else {
                            template += '<div class="pubProductsCut" id="pubProductsCutB" style="bottom:0"></div><div class="pubProductsCut reverse ' + $rootScope.EnableMultiStore ? "multistore" : "" + '"></div>';
                        }
                    } else {
                        template += '<div class="pubProductsCut" id="pubProductsCutB" style="bottom:0"></div><div class="pubProductsCut reverse ' + $rootScope.EnableMultiStore ? "multistore" : "" + '"></div>';
                    }
                }
                element.empty();
                element.append($compile(template)(scope));
            };
        }
    };
});