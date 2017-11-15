app.config(function ($stateProvider) {
	$stateProvider
		.state('catalog.Categories', {
			url: '/categories',
			templateUrl: 'views/categories.html'
		})
})

app.controller('CatalogMenuController', function ($scope, $rootScope, $state, categoryService, pictureService, posPeriodService,posService,$http,$timeout) {
	$scope.$state = $state;
	$scope.$rootScope = $rootScope;

	$scope.init = function () {
        initializeCategories();
        initializePosPeriod();
	};


    var initializePosPeriod = function () {
        posPeriodService.getYPeriodAsync($rootScope.modelPos.hardwareId, $rootScope.PosUserId,false);
    };



	var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
		if (args.status == "Change" && (args.id.indexOf('Category') == 0 || args.id.indexOf('Picture') == 0)) {
            initializeCategories();
		}
	});

	$scope.$on("$destroy", function () {
		pouchDBChangedHandler();
	});

	var initializeCategories = function()
	{
		categoryService.getCategoriesAsync().then(function (categories) {
			var categoriesEnabled = Enumerable.from(categories).where('x=>x.IsEnabled === true').orderBy('x => x.DisplayOrder').toArray();

			Enumerable.from(categoriesEnabled).forEach(function (c) {
				pictureService.getPictureUrlAsync(c.PictureId).then(function (url) {
					if (!url) {
						url = 'img/photo-non-disponible.png';
					}
					c.PictureUrl = url;
				});
			});

			$scope.categories = categoriesEnabled;
		}, function (err) {
			console.log(err);
		});
	}		
});