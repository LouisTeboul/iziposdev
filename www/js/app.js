var app = angular.module('app', ['ui.router', 'ngMaterial', 'ui.bootstrap', 'ngSanitize', 'toggle-switch', 'kendo.directives', 'ngIdle', 'ngKeypad', 'ngDraggable', 'angular-md5', 'ngToast', 'pascalprecht.translate', 'md.data.table', 'frapontillo.gage','angularUUID2']);
var controllerProvider = null;
var $routeProviderReference = null;
var angularLocation = null;

$(function () {
    FastClick.attach(document.body);
});

app.config(function ($stateProvider, $urlRouterProvider, ngToastProvider, $translateProvider, $httpProvider, $sceDelegateProvider, $controllerProvider, $mdIconProvider) {

	controllerProvider = $controllerProvider;
	$routeProviderReference = $stateProvider;
	$sceDelegateProvider.resourceUrlWhitelist(['**']);

	$urlRouterProvider
		.otherwise('/');
	ngToastProvider.configure({
		verticalPosition: 'bottom',
		horizontalPosition: 'left',
		animation: 'slide' // or 'fade'
	});

	// Auth custom content - used for booking
	$httpProvider.interceptors.push(function ($q, $rootScope, $injector) {
		return {
			request: function (config) {
				var authService = $injector.get('authService');                
				if (authService && authService.getToken()) {
					config.headers['Authorization'] = 'bearer ' + authService.getToken().access_token;
				}
				return $q.when(config);				
			}            
		};
	});
});

app.run(function ($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal) {

	try {
		angularLocation = $location;

<<<<<<< HEAD
        $rootScope.Version = "3.0.2.20021";
=======
        $rootScope.Version = "3.0.2.09021";
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
		$rootScope.adminMode = { state: false };
        $rootScope.loading = 0;

        $rootScope.modelPos = {
            posNumber: 1,
            isPosOpen: false,
            hardwareId: undefined,
            iziboxConnected: false,
            RKCounter: 0
        };

		$rootScope.showLoading = function () {
			$rootScope.loading++;
			$rootScope.$evalAsync();
		};
		$rootScope.hideLoading = function () {
			$rootScope.loading--;
			if ($rootScope.loading < 0) {
				$rootScope.loading = 0;
			}
			$rootScope.$evalAsync();
        };

		$rootScope.PosUserId = -1;
		$rootScope.PosUserName = "";
		window.sessionStorage.clear();

		window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
			console.error("Error occured: " + errorMsg);//or any message
			return false;
		};

		// Langage configuration
		var codeLng = window.localStorage.getItem("CurrentLanguage");

		if (codeLng) {
			$translate.use(codeLng);
		} else {
			$translate.use('fr_FR');
		}

		// Display configuration
		$rootScope.RatioConfiguration = { Enabled: true };

		if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
            $rootScope.isBrowser = false;
            $rootScope.isWindowsContainer = false;

            var deviceInit = false;

            document.addEventListener("deviceready", function () {
                if (!deviceInit) {
                    deviceInit = true;
                    init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal);
                }
            }, false);

            setTimeout(function () {
                if (!deviceInit) {
                    deviceInit = true;
                    init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal);
                }
            },5000);
            

			if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
				FastClick.attach(document.body);                
			}
        } else if(navigator.userAgent.match(/(WPF)/)){
            $rootScope.isBrowser = false;
            $rootScope.isWindowsContainer = true;
			init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal); 
        } else {
            $rootScope.isBrowser = true;
            $rootScope.isWindowsContainer = false;
            init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal); //this is the browser
        }
	}
	catch (exAll) 
	{
		console.error(exAll);
	}
});

var initServices = function ($rootScope,$injector) {

    syncValidatePoolDb($rootScope);

    var zposService = $injector.get('zposService');
    zposService.init();

    var posService = $injector.get('posService');
    posService.startIziboxDaemon();
    posService.checkIziboxAsync();
    posService.initRkCounterListener();

    var posPeriodService = $injector.get('posPeriodService');
    posPeriodService.initPeriodListener();
    posPeriodService.startPeriodDaemon();
};

var init = function ($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal) {
	// IziBoxConfiguration
	app.getConfigIziBoxAsync($rootScope, $q, $http, ipService, $translate, $location, $uibModal).then(function (config) {

        if (config.IndexIsNotDefined) {
            $rootScope.IziBoxTempConfiguration = config;
            $location.path("/initizibox");
        } else {

            $rootScope.IziBoxConfiguration = config;

            // Convert settings from 'string' to 'boolean'
            for (var prop in config) {
                if (config[prop] == "true") {
                    config[prop] = true;
                }
<<<<<<< HEAD

                if (config[prop] == "false") {
                    config[prop] = false;
                }
            }

=======

                if (config[prop] == "false") {
                    config[prop] = false;
                }
            }

>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87
            // BackButton
            app.configHWButtons($rootScope, $translate);
        }
		
	});


	/**
	 * Use for displaying the wpf keyboard on windows system
	 * @deprecated
	 * */
    $rootScope.showWPFKeyboard = function (openCordovaKeyboard) {
        if ($rootScope.isWindowsContainer) {
			try {
				wpfKeyboard.showKeyboard();
			} catch (err) {}
		}

		if (!openCordovaKeyboard) {
			try {
				cordova.plugins.Keyboard.show();
			} catch (err) {}
		}

		$rootScope.keyboardVisible = true;
	};

	$rootScope.hideWPFKeyboard = function () {

        if ($rootScope.isWindowsContainer) {
			try {
				wpfKeyboard.hideKeyboard();
			} catch (err) {}
		}

		try {
			cordova.plugins.Keyboard.close();
		} catch (err) {}

		$rootScope.keyboardVisible = false;
	};
	$location.path("/");
};

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
};


