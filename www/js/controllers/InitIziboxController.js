app.config(function ($stateProvider) {
    $stateProvider.state('initizibox', {
        url: '/initizibox',
        templateUrl: 'views/initIzibox.html'
    });
});


app.controller('InitIziboxController', function ($scope, $rootScope, $location, $http, $uibModal, shoppingCartService, posLogService, posService) {
	let current = this;

	$scope.init = () => {
        $scope.model = {
            rebootInProgress: false,
            rebootPercent: 0
        };
        
        // For developpement
		if ($location.$$path == "/restart") {
			$scope.validConfig();
		}

        $scope.closable = $rootScope.isWindowsContainer;
	};

    //Clear the last configuration and reload all data
	$scope.reset = () => {
		window.localStorage.removeItem("IziBoxConfiguration");
        window.location.reload();
	};

    //Exit the application - only appears and works on windows system
	$scope.exit = function () {
        if ($rootScope.isWindowsContainer) {
			try {
				wpfCloseApp.shutdownApp();
            } catch (err) {
                console.error(err);
			}
		}
	};

    //Store the user preferences
    $scope.validConfig = function () {
        $rootScope.showLoading();

        $http({
            method: 'GET',
            url: 'http://' + $rootScope.IziBoxTempConfiguration.LocalIpIziBox + ':8080/setupizibox/' + $scope.model.iziboxcode
        }).then((response) => {
            $rootScope.hideLoading();

            $scope.model.rebootInProgress = true;

            let rebootProgress = () => {
                setTimeout(() => {
                    if ($scope.model.rebootPercent < 100) {
                        $scope.model.rebootPercent++;
                        $scope.$evalAsync();
                        rebootProgress();
                    } else {
                        window.location.reload();
                    }
                }, 800);
            };

            rebootProgress();

        }, (response) => {
            $rootScope.hideLoading();
            swal({ title: "Code unavailable" });
        });	
	};
});