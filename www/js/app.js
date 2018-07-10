var app = angular.module('app', ['ui.router', 'ngMaterial', 'ui.bootstrap', 'ngSanitize', 'toggle-switch', 'kendo.directives', 'ngIdle', 'ngKeypad', 'ngDraggable', 'angular-md5', 'ngToast', 'pascalprecht.translate', 'md.data.table', 'frapontillo.gage', 'angularUUID2']);
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

        $rootScope.Version = "3.0.4.07061";
        $rootScope.adminMode = { state: false };
        $rootScope.loading = 0;

        $rootScope.modelPos = {
            posNumber: 1,
            isPosOpen: false,
            hardwareId: undefined,
            iziboxConnected: false,
            RKCounter: 0,
            categoryLoading: false
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
                    $rootScope.deviceReady = true;
                    init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal);
                }
            }, false);

            // Si le device n'est pas ready en 5s, on init quand même
            setTimeout(function () {
                if (!deviceInit) {
                    deviceInit = true;
                    init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal);
                }
            }, 5000);


            if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
                FastClick.attach(document.body);
            }
        } else if (navigator.userAgent.match(/(WPF)/)) {
            $rootScope.isBrowser = false;
            $rootScope.isWindowsContainer = true;
            init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal);

            initLineDisplay($rootScope);

        } else {
            $rootScope.isBrowser = true;
            $rootScope.isWindowsContainer = false;
            init($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal); //this is the browser
        }

        if (navigator.platform == "Linux armv7l") {
            $rootScope.isOnIzibox = true;
        }
    }
    catch (exAll) {
        console.error(exAll);
    }
});

var initLineDisplay = function ($rootScope) {
    lineDisplay.clearScreen();

    $rootScope.$on("shoppingCartChanged", function (event, shoppingCart) {
        if (shoppingCart && shoppingCart.Total) {
            lineDisplay.writeLine1("TOTAL : " + roundValue(shoppingCart.Total).toFixed(2) + " \u20ac");
        }
    });

    $rootScope.$on("shoppingCartTotalChanged", function (event, total) {
        lineDisplay.writeLine1("TOTAL : " + roundValue(total).toFixed(2) + " \u20ac");
    });

    var updateDisplay2 = function (cartItem) {
        var itemLineQty = cartItem.Quantity + " x ";
        var itemLinePrice = " ";
        if (cartItem.IsFree) {
            itemLinePrice += "0.00 \u20ac";
        } else {
            itemLinePrice += roundValue(cartItem.PriceIT + cartItem.DiscountIT).toFixed(2);

            itemLinePrice += " \u20ac";
        }

        var itemLineName = cartItem.Product.Name.substring(0, 19 - (itemLineQty.length + itemLinePrice.length));

        var itemLine = itemLineQty + itemLineName + itemLinePrice;

        lineDisplay.writeLine2(itemLine);
    };

    $rootScope.$on("shoppingCartItemAdded", function (event, cartItem) {
        if (cartItem) updateDisplay2(cartItem);
    });

    $rootScope.$on("shoppingCartItemChanged", function (event, cartItem) {
        if (cartItem) updateDisplay2(cartItem);
    });

    $rootScope.$on("shoppingCartItemRemoved", function (event, cartItem) {
        if (cartItem) updateDisplay2(cartItem);
    });
};

var initServices = function ($rootScope, $injector) {

    var settingsPouchDB = {
        typeDB: "websql",
        opts: {live: true, retry: true, batch_size: 50, batches_limit: 100, heartbeat: 5000},
        optsReplicate: {live: true, retry: true, batch_size: 10, batches_limit: 8, heartbeat: 5000},
        optsSync: {live: false, retry: false, batch_size: 10, batches_limit: 8},
        // auth: {username: 'posnf', password: 'Izipass2018'}
    };

    function onDeviceReady() {
        var adapter = !!window.sqlitePlugin ? 'cordova-sqlite' : 'websql';
        settingsPouchDB = {
            typeDB: adapter,
            opts: {live: true, retry: true, batch_size: 50, batches_limit: 100, heartbeat: 5000},
            optsReplicate: {live: true, retry: true, batch_size: 10, batches_limit: 8, heartbeat: 5000},
            optsSync: {live: false, retry: false, batch_size: 10, batches_limit: 8},
            // auth: {username: 'posnf', password: 'Izipass2018'}
        };
        syncValidatePoolDb($rootScope, settingsPouchDB);
    }

    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
        document.addEventListener("deviceready", onDeviceReady, false);
    } else {
        onDeviceReady();
    }



    var zposService = $injector.get('zposService');
    zposService.init();

    var posService = $injector.get('posService');
    posService.startIziboxDaemon();
    posService.checkIziboxAsync();
    posService.initRkCounterListener();

    var posPeriodService = $injector.get('posPeriodService');
    posPeriodService.initPeriodListener();
    posPeriodService.startPeriodDaemon();

    var taxesService = $injector.get('taxesService');
    taxesService.initTaxCache();
};

var init = function ($rootScope, $location, $q, $http, ipService, zposService, $translate, $uibModal) {
    // IziBoxConfiguration
    app.getConfigIziBoxAsync($rootScope, $q, $http, ipService, $translate, $location, $uibModal).then(function (config) {

        if (config.IndexIsNotDefined) {
            $rootScope.IziBoxTempConfiguration = config;
            $location.path("/initizibox");
        } else {

            $rootScope.IziBoxConfiguration = config;
            // $rootScope.IziBoxConfiguration.LoginRequired = false;

            // Convert settings from 'string' to 'boolean'
            for (let prop in config) {
                if (config[prop] === "true") {
                    config[prop] = true;
                }

                if (config[prop] === "false") {
                    config[prop] = false;
                }
            }

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
    };

    $rootScope.hideWPFKeyboard = function () {

        if ($rootScope.isWindowsContainer) {
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
            setTimeout(function () {
                $rootScope.tryExit = false;
            }, 3000);
        }
    }, false);
};


