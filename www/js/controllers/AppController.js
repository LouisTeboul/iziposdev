app.controller('AppController', function ($scope, $rootScope, $rootElement,$mdMedia, textFieldService) {
	$scope.currentKeyboardType;
	$scope.$mdMedia = $mdMedia;

    $scope.init = function () {
	};

	// Useful for the size options
	$(window).resize(function () {
		updateMeta();
	});

	$rootScope.$watch('RatioConfiguration.LandscapeRatio', function () { updateMeta(); });
	$rootScope.$watch('RatioConfiguration.PortraitRatio', function () { updateMeta(); });

    /**
	 * Update HTML meta for zooming
     */
	var updateMeta = function () {
		//if ($rootScope.RatioConfiguration) {
		//	var body = $("body")[0];

		//	if ($(window).width() < $(window).height()) {
		//		if ($rootScope.RatioConfiguration.PortraitRatio < 10) $rootScope.RatioConfiguration.PortraitRatio = 100;
		//		body.style.zoom = $rootScope.RatioConfiguration.PortraitRatio+"%";
		//	} else {
		//		if ($rootScope.RatioConfiguration.LandscapeRatio < 10) $rootScope.RatioConfiguration.LandscapeRatio = 100;
		//		body.style.zoom = $rootScope.RatioConfiguration.LandscapeRatio+"%";
		//	}
		//}
	};

	$scope.keyboardLocation = "center-center";

    /**
	 * Is the keyboard opened
     * @param type
     * @returns {boolean}
     */
	$rootScope.isKeyboardOpen = function (type) {
		var elems = $("#keyboard-" + type);

		return elems.length > 0 && !elems.hasClass("closed");
	};

    /**
	 * Open the keyboard
     * @param type
     * @param alignment
     */
	$rootScope.openKeyboard = function (type, alignment) {
        if (!$mdMedia('(min-width: 799px)')) {
			alignment = "center-end";
		}

		$scope.keyboardLocation = alignment || "center-center";
		$scope.currentKeyboardType = type;

		// TODO: Hack for first show
		setTimeout(function () {
			$scope.$emit(Keypad.OPEN, "keyboard-" + type);
		}, 0);
		setTimeout(function () {
			$scope.$emit(Keypad.OPEN, "keyboard-" + type);
		}, 100);
	};

	$rootScope.closeKeyboard = function () {		
		$scope.$emit(Keypad.CLOSE, "keyboard-decimal");
		$scope.$emit(Keypad.CLOSE, "keyboard-numeric");
		$scope.$emit(Keypad.CLOSE, "keyboard-azerty");
	}
});