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

app.run(function ($rootScope, $location, $q, $http, ipService, zposService, $translate) {

	try {
		angularLocation = $location;

		$rootScope.Version = "2.0 POS DEMO";
		$rootScope.adminMode = { state: false };
		$rootScope.loading = 0;
		$rootScope.isDemo = true;

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



		//var body = $("body")[0];
		//body.style.zoom = 75%;
		


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

		if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
			FastClick.attach(document.body);
		}
		init($rootScope, $location, $q, $http, ipService, zposService, $translate); //this is the browser

	} catch (exAll) {
		console.log(exAll);
	}
})

var init = function ($rootScope, $location, $q, $http, ipService, zposService, $translate) {

	//Init services
	zposService.init();


	
	//IziBoxConfiguration
	app.getConfigIziBoxAsync($rootScope, $q, $http, ipService, $translate, $location).then(function (config) {

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


	$location.path("/loading");
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


