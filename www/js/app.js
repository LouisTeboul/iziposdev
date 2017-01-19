var app = angular.module('app', ['ui.router', 'ngMaterial', 'ui.bootstrap', 'ngSanitize', 'toggle-switch', 'kendo.directives', 'ngIdle', 'ngKeypad', 'ngDraggable', 'angular-md5', 'ngToast', 'pascalprecht.translate']);
var controllerProvider = null;
var $routeProviderReference = null;
var angularLocation = null;
app.config(function ($stateProvider, $urlRouterProvider, ngToastProvider, $translateProvider, $httpProvider, $sceDelegateProvider, $controllerProvider, $mdIconProvider) {


	controllerProvider = $controllerProvider;
	$routeProviderReference = $stateProvider;
	//$stateProvider
	//.state("booking", {
	//    url: "/booking",
	//    templateUrl: 'http://montpellier.bigsister.biz/PosAdminV2/Booking/Page1',
	//})
	$sceDelegateProvider.resourceUrlWhitelist(['**']);

	$urlRouterProvider
		.otherwise('/');
	ngToastProvider.configure({
		verticalPosition: 'bottom',
		horizontalPosition: 'left',
		animation: 'slide' // or 'fade'
	});

	$translateProvider.translations('fr_FR', {});


	// Auth custom content
	$httpProvider.interceptors.push(function ($q, $rootScope, $injector) {
		return {
			request: function (config) {
				var authService = $injector.get('authService');                
				if (authService && authService.getToken()) {
					config.headers['Authorization'] = 'bearer ' + authService.getToken().access_token;
					// config.headers['Content-Type'] = 'application/json';//'application/x-www-form-urlencoded';
				}
				return $q.when(config);
			}            

		};
	});


})

app.run(function ($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal) {

	try {
		angularLocation = $location;

		$rootScope.Version = "2.1.0.19011";
		$rootScope.adminMode = { state: false };
		$rootScope.loading = 0;

		$rootScope.showLoading = function () {
			$rootScope.loading++;
			$rootScope.$evalAsync();
		}
		$rootScope.hideLoading = function () {
			$rootScope.loading--;
			if ($rootScope.loading < 0) {
				$rootScope.loading = 0;
			}
			$rootScope.$evalAsync();
		}
		$rootScope.PosUserId = -1;
		$rootScope.PosUserName = "";
		window.sessionStorage.clear();

		window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
			console.log("Error occured: " + errorMsg);//or any message
			return false;
		}

		var codeLng = window.localStorage.getItem("CurrentLanguage");

		if (codeLng) {
			$translate.use(codeLng);
		} else {
			$translate.use('fr_FR');
		}

		if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {

			//var windowWidth = window.innerWidth > window.innerHeight ? window.innerWidth : window.innerHeight;
			//var bodyWidth = 1280;
			//var scaleFactor = windowWidth / bodyWidth;

			//$('meta[name=viewport]').remove();
			//$('head').append('<meta name="viewport" content="user-scalable=no, initial-scale='+scaleFactor+', maximum-scale=1, minimum-scale=0.1, width=device-width" />');
			$rootScope.RatioConfiguration = {Enabled: true};

			document.addEventListener("deviceready", function () {
				init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal);
			}, false);

			if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
				FastClick.attach(document.body);                
			}
		} else {
			init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal); //this is the browser
		}
		//debugger;
		//$http({
		//    method: 'POST',
		//    url: 'http://montpellier.bigsister.biz/apiV2/login',
		//    data: 'grant_type=password&username=stephen.tissot@bigsister.fr&password=potiron9'
		//}).then(function successCallback(response) {
		//    console.log(response);

		//}, function errorCallback(response) {
		//    console.log(response);
		//});

	} catch (exAll) {
		console.log(exAll);
	}
})

var init = function ($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal) {

	//Init services
	zposService.init();

	//IziBoxConfiguration
	app.getConfigIziBoxAsync($rootScope, $q, $http, ipService, $translate, $location, $uibModal).then(function (config) {

		$rootScope.IziBoxConfiguration = config;

		for (var prop in config) {
			if (config[prop] == "true") {
				config[prop] = true;
			}

			if (config[prop] == "false") {
				config[prop] = false;
			}
		}
		//CouchDb
		//app.configPouchDb($rootScope);

		//BackButton
		app.configHWButtons($rootScope, $translate);
		
	})


	//Keyboard wpf
	$rootScope.showWPFKeyboard = function (openCordovaKeyboard) {
		if (navigator.userAgent.match(/(WPF)/)) {
			try {
				wpfKeyboard.showKeyboard();
			} catch (err) {
			}
		}

		if (!openCordovaKeyboard) {
			try {
				cordova.plugins.Keyboard.show();
			} catch (err) {

			}
		}

		$rootScope.keyboardVisible = true;
	}

	$rootScope.hideWPFKeyboard = function () {

		if (navigator.userAgent.match(/(WPF)/)) {
			try {
				wpfKeyboard.hideKeyboard();
			} catch (err) {
			}
		}

		try {
			cordova.plugins.Keyboard.close();
		} catch (err) {

		}

		$rootScope.keyboardVisible = false;
	}


	$location.path("/");
}

app.configHWButtons = function ($rootScope, $translate) {
	document.addEventListener("backbutton", function () {
		if ($rootScope.tryExit == true) {
			try {
				navigator.app.exitApp();
			}
			catch (err) {
				sweetAlert("EXIT");
			}
		} else {
			$rootScope.tryExit = true;
			try {
				window.plugins.toast.showLongBottom($translate.instant("Appuyez une autre fois pour quitter"));
			}
			catch (err) {
				sweetAlert($translate.instant("Appuyez une autre fois pour quitter"));
			}
			setTimeout(function () { $rootScope.tryExit = false; }, 3000);
		}

	}, false);
}


