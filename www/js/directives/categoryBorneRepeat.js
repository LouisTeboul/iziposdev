app.directive('categoryBorneRepeat', function ($rootScope, $compile, $filter) {
    return {
        replace: true,
        restrict: 'E',
        scope: true,
        link: function (scope, element) {

            /*scope.$watch('deliveryType', function (deliveryType) {
                element.empty();*/

            function repeatProducts(products) {
                if (products) {
                    var result = "";
                    result += "<section class='layout-row layout-wrap' style='padding-top: 10px;'>";
                    for (var product of products) {
                        result += `<div style="margin-bottom:4px" class='caseAttribute' flex='20' flex-xs='20' flex-sm='50' flex-md='30'>
                    <div class="productboxIZIPASS`;
                        if ($rootScope.UserPreset) {
                            if ($rootScope.UserPreset.ItemSize == 1 || $rootScope.UserPreset.ItemSize && scope.$mdMedia('max-width: 799px')) {
                                result += ' small';
                            } else if ($rootScope.UserPreset.ItemSize == 2 && scope.$mdMedia('min-width: 800px')) {
                                result += ' medium';
                            } else if ($rootScope.UserPreset.ItemSize == 3 && scope.$mdMedia('min-width: 800px')) {
                                result += ' big';
                            }
                        } else if (scope.$mdMedia('max-width: 799px')) {
                            result += ' small';
                        }
                        if (product.DisableBuyButton) {
                            result += ' disabled productIPDisabled';
                        }
                        result += `" onclick="$('#IZIPASSController').scope().addToCart(${product.Id})" >`;
                        result +=
                            `<div class="layout-column layout-fill">
                        <div class="conteneur-images">
                            <img alt="" src='${product.DefaultPictureUrl}' class="image">
                        </div>
                        <div class="titleRow">  
                            ${product.Name}
                        </div>
                        <div class="descriptionRow">
                        <div class="price">`;
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
                        result += "</div></div></div></div>";
                    }
                    result += "</section>";
                    return result;
                }
            }

            var template = "";
            // Composer le template en bouclant dans les datas
            /** Subcategories header*/
            if (scope.model.subCategories && scope.model.subCategories.length > 0) {
                var subCatHeader = "";
                // ATTENTION : le responsive marchera pas, le mode pad / pos est determiné par le layout a l'initialisation
                var className = 'subCategoriesHeading';
                subCatHeader += `<div class="quickAccess ${className}" >`;
                subCatHeader += `<button class="md-raised md-button md-ink-ripple navigAction scHeadingButton"
                                         onclick="$('#IZIPASSController').scope().scrollTo('Main')">
                                    <i class="glyphicon glyphicon-star"></i>
                                 </button>`;
                for (var subCat of scope.model.subCategories) {
                    subCatHeader += `<button class="md-raised md-button md-ink-ripple navigAction scHeadingButton"
                                             onclick="$('#IZIPASSController').scope().scrollTo(${subCat.Id})">
                                        ${subCat.Name}
                                     </button>`;
                }
                // Repeat dans la subcat
                subCatHeader += `</div>`;
                template += subCatHeader;
            }

            var allCategories = "<section id='allCategories' class='layout-column flex-85' style='overflow: scroll; max-height: 100%'>";

            /** Main category products*/
            var mainProducts = "<section id='cMain'>";
            mainProducts += `<h1> ${scope.model.category.Name} </h1>`;

            mainProducts += repeatProducts(scope.model.category.products);

            mainProducts += "</section>";
            allCategories += mainProducts;

            if (scope.model.subCategories) {
                scope.model.subCategories.forEach(function (subCat) {
                    if (subCat.products && subCat.products.length > 0) {
                        var subCatProducts = `<section id='c${subCat.Id}'>`;
                        subCatProducts += `<h2> ${subCat.Name} </h2>`;
                        subCatProducts += repeatProducts(subCat.products);
                        subCatProducts += "</section>";
                        allCategories += subCatProducts;
                    }

                });
            }


            allCategories += "</section>";

            template += allCategories;

            element.append(template);
            //});
        }
    }
});