app.directive('categoryRepeat', function ($rootScope, $filter, pictureService, stockService) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: function (scope, element) {
            element.empty();
            // let productsListener = undefined;
            let categoryListener = undefined;

            categoryListener = scope.$watch('model.category', (newValue, oldValue) => {
                let jnew = JSON.stringify(newValue);
                let jold = JSON.stringify(oldValue);
                if (jnew !== jold) {
                    // if (productsListener) {
                    //     productsListener();
                    //     productsListener = undefined;
                    // }

                    if (scope.model.category) {
                        loadCategory();

                        //productsListener = $scope.$watch('model.category.products', (newValue, oldValue) => {
                        //    console.log(newValue);
                        //    console.log(oldValue);
                        //}, true);
                    }
                }
            }, true);

            scope.$on("$destroy", () => {
                categoryListener();
            });

            const createproduct = (catId, product) => {
                let result = "";

                result += `<div aria-label="product button" class="productboxIZIPASS`;

                let productStockInBuffer = stockService.getBufferStockForProductId(product.Id);
                let productIsDisabled = product.ManageInventoryMethodId === 1 &&
                    (product.DisableBuyButton ||
                        product.StockQuantity <= 0 ||
                        product.StockQuantity - productStockInBuffer <= 0);
                if (productIsDisabled) {
                    result += ` disabled productIPDisabled`;
                }
                if ($rootScope.UserPreset) {
                    if ($rootScope.UserPreset.ItemSize === 1 || $rootScope.UserPreset.ItemSize && !scope.mdMedia('min-width: 800px')) {
                        result += ` small`;
                    } else if ($rootScope.UserPreset.ItemSize === 2 && scope.mdMedia('min-width: 800px')) {
                        result += ` medium`;
                    } else if ($rootScope.UserPreset.ItemSize === 3 && scope.mdMedia('min-width: 800px')) {
                        result += ` big`;
                    }
                } else if (scope.mdMedia('max-width: 800px')) {
                    result += ` small`;
                } else {
                    result += ` medium`;
                }

                //result += `">`;

                result += `" onclick="$('#IZIPASSController').scope().addToSC(${catId},${product.Id})" >`;

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
                    //result += `<img style=" fill : ${$rootScope.tenantColor}" class="product-desc-img" src="img/icons/product-info.svg"></img>`;
                    result += `<div class='product-desc-button layout-column layout-align-center-center' onclick="$('#IZIPASSController').scope().openDesc(${product.Id}, ${catId}); event.stopPropagation();"></div>`;
                }

                result +=
                    `<div class="layout-column layout-align-space-between-center layout-fill">
                        <div class="imageContainer">
                            <div class="image progressive replace" ng-class="productIsDisabled ? 'rupture' : ''" data-href="${pictureService.getPictureFileUrl(product.Id, 'Product')}">
                                <img src="img/photo-non-disponible.png" alt="image" class="preview progressive"/>
                            </div>
                        </div>
                        <div class="titleRow layout-row layout-align-center-center">
                            ${product.Name}
                        </div>
                        <div class="price layout-row layout-align-space-around-center" id="productPrice" type="${(product.EmployeeTypePrice ? "employeeType" : "fixed")}">`;

                result += `<div id="fixedPrice" class=`;
                if (!productIsDisabled && product.Price && !product.EmployeeTypePrice) {
                    result += `"">`;
                } else {
                    result += `"ng-hide">`;
                }
                result += $filter('CurrencyFormat')(product.Price) + `</div>`;

                result += `<div id="typePrice" class=`;

                if (!productIsDisabled && product.EmployeeTypePrice) {
                    result += `"" translate>`;
                } else {
                    result += `"ng-hide" translate>`;
                }

                result += `Saisir le prix</div>`;

                result += `<div id="outOfStock" class=`;

                if (productIsDisabled) {
                    result += `"" translate>`;
                } else {
                    result += `"ng-hide" translate>`;
                }
                result += `Rupture</div>`;

                result += `<div id="sq${product.Id}" class=`;
                if (product.ManageInventoryMethodId === 1 && product.StockQuantity > 0 && !productIsDisabled) {
                    result += `"">`;
                } else {
                    result += `"ng-hide">`;
                }
                result += `${product.StockQuantity}</div>`;

                result += `</div></div>`;
                result += "</div></div></div>";

                return result;
            };

            const repeatProducts = (catId, products) => {
                let result = "";
                if (products && products.length > 0) {
                    result += "<section class='layout-row layout-wrap'>";
                    for (let product of products) {
                        result += `<div style="margin-bottom:4px; margin-right: 20px;" id="pb${product.Id}">`;
                        result += createproduct(catId, product);
                        result += "</div>";
                    }
                    result += "</section>";
                }
                return result;
            };

            let mousedownTime = null;

            const mousedownHandler = (e) => {

                console.log("Mousedown !");
                mousedownTime = Date.now();

            }


            const mouseupHandler = (e) => {

                // TODO : Comment passer aux methode categoryId & productId ?
                // Check if long or short press
                let threshold = 500;
                if(Date.now() - mousedownTime > threshold) {
                    // Longpress
                    console.log("Longpress");
                    // Add to cart normal
                } else {
                    // Regular click
                    console.log("regular click");
                    // Si le produit composé respecte les conditions pour l'ajout rapide, alors on le force au panier
                }
            }

            

            const loadCategory = () => {
                let template = "";
                // Composer le template en bouclant dans les datas
                /** Subcategories header*/
                if (scope.model.category.SubCategories && scope.model.category.SubCategories.length > 0 &&
                    (!$rootScope.storeFilter || $rootScope.storeFilter && $rootScope.storeFilter.SmallMenuEnabled)) {
                    let subCatHeader = "";
                    // ATTENTION : le responsive marchera pas, le mode pad / pos est determiné par le layout a l'initialisation
                    let className = 'subCategoriesHeading';
                    subCatHeader += `<div class="quickAccess ${className}" >`;
                    subCatHeader += `<button class="md-raised md-button md-ink-ripple navigAction scHeadingButton"
                                         onclick="$('#IZIPASSController').scope().scrollTo('Main')">
                                    <i class="glyphicon glyphicon-star"></i>
                                 </button>`;
                    for (let subCat of scope.model.category.SubCategories) {
                        subCatHeader += `<button class="md-raised md-button md-ink-ripple navigAction scHeadingButton"
                                             onclick="$('#IZIPASSController').scope().scrollTo(${subCat.Id})">
                                        ${subCat.Name}
                                     </button>`;
                    }
                    // Repeat dans la subcat
                    subCatHeader += `</div>`;
                    template += subCatHeader;
                }

                let allCategories = "<section id='allCategories' class='layout-column flex-85' style='overflow: scroll; max-height: 100%; padding-left: 20px'>";

                /** Main category products*/
                let mainProducts = "<section id='cMain'>";
                mainProducts += `<h1> ${scope.model.category.Name} </h1>`;

                mainProducts += repeatProducts(scope.model.category.Id, scope.model.category.products);

                mainProducts += "</section>";
                allCategories += mainProducts;

                if (scope.model.category.SubCategories) {
                    scope.model.category.SubCategories.forEach((subCat) => {
                        if (subCat.products && subCat.products.length > 0) {
                            let subCatProducts = `<section id='c${subCat.Id}'>`;
                            subCatProducts += `<h2> ${subCat.Name} </h2>`;
                            subCatProducts += repeatProducts(subCat.Id, subCat.products);
                            subCatProducts += "</section>";
                            allCategories += subCatProducts;
                        }
                    });
                }
                allCategories += "</section>";
                template += allCategories;

                element.empty();
                element.append(template);

                // Add event listener
                document.querySelectorAll(".productboxIZIPASS").forEach((el) => {
                    el.addEventListener("mousedown", mousedownHandler);
                    el.addEventListener("mouseup", mouseupHandler);
                })


                scope.$on('$destroy', () => {
                    // TODO : Does this works ?
                    document.querySelectorAll(".productboxIZIPASS").forEach((el) => {
                        el.removeEventListener("mousedown", mousedownHandler);
                    })
                });
            };
        }
    };
});