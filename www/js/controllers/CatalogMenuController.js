app.config(function ($stateProvider) {
	$stateProvider
		.state('catalog.Categories', {
			url: '/categories',
			templateUrl: 'views/categories.html'
		})
})

app.controller('CatalogMenuController', function ($scope, $rootScope, $state, categoryService, pictureService,$http,$timeout) {
	$scope.$state = $state;
	$scope.$rootScope = $rootScope;
	var isEnabled = false;

	$scope.init = function () {
		initializeCategories();
		$scope.IziBoxConnected = false;
		isEnabled = true;
		observeIzibox(true);
	};

	var observeIzibox = function (force) {
		if ($rootScope.IziBoxConfiguration.LocalIpIziBox) {
			var pingApiUrl = "http://" + $rootScope.IziBoxConfiguration.LocalIpIziBox + ":" + $rootScope.IziBoxConfiguration.RestPort + "/ping";
			var timeout = force ? 0 : 5000;

			setTimeout(function () {
				$http.get(pingApiUrl, {timeout:1000}).then(function (data) {
					$scope.IziBoxConnected = true;
					$scope.$evalAsync();
					if (isEnabled) observeIzibox();
				}).catch(function (err) {
					$scope.IziBoxConnected = false;
					$scope.$evalAsync();
					if (isEnabled) observeIzibox();
				});
			}, timeout);
		}
	}

	var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
		if (args.status == "Change" && (args.id.indexOf('Category') == 0 || args.id.indexOf('Picture') == 0)) {
			initializeCategories();
		}
	});

	$scope.$on("$destroy", function () {
		pouchDBChangedHandler();
		isEnabled = false;
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