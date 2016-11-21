app.controller('AppController', function ($scope, $rootScope, $rootElement,$mdMedia, textFieldService) {
	$scope.currentKeyboardType;
	$scope.$mdMedia = $mdMedia;

	$scope.init = function () {
		
	};

	$(window).resize(function () {
		updateMeta();
	});

	$rootScope.$watch('RatioConfiguration.LandscapeRatio', function () { updateMeta(); });
	$rootScope.$watch('RatioConfiguration.PortraitRatio', function () { updateMeta(); });

	var updateMeta = function () {
		if ($rootScope.RatioConfiguration) {
			var metaDesc = $rootElement.parent().find('meta[name=viewport]')[0];

			if ($(window).width() < 1100) {
				metaDesc.setAttribute('content', 'user-scalable=no, initial-scale=' + $rootScope.RatioConfiguration.PortraitRatio + ', maximum-scale=1, minimum-scale=0.5, width=device-width');
			} else {
				metaDesc.setAttribute('content', 'user-scalable=no, initial-scale=' + $rootScope.RatioConfiguration.LandscapeRatio + ', maximum-scale=1, minimum-scale=0.5, width=device-width');
			}
		}
	}

	$scope.keyboardLocation = "center-center";

	$rootScope.isKeyboardOpen = function (type) {
		var elems = $("#keyboard-" + type);

		return elems.length > 0 && !elems.hasClass("closed");
	}

    $rootScope.openKeyboard = function (type, alignment) {
    	if (!$mdMedia('gt-sm')) {
    		alignment = "center-end";
    	}


    	$scope.keyboardLocation = alignment || "center-center";
    	$scope.currentKeyboardType = type;

		//TODO Hack for first show :(
    	setTimeout(function () {
    		$scope.$emit(Keypad.OPEN, "keyboard-" + type);
    	}, 0);
    	setTimeout(function () {
    		$scope.$emit(Keypad.OPEN, "keyboard-" + type);
    	}, 100);
    }

    $rootScope.closeKeyboard = function () {
    	//console.log("closeKb " + $scope.currentKeyboardType);
    	$scope.$emit(Keypad.CLOSE, "keyboard-decimal");// + $scope.currentKeyboardType);
    	$scope.$emit(Keypad.CLOSE, "keyboard-numeric");
    	$scope.$emit(Keypad.CLOSE, "keyboard-azerty");
    }

    //document.addEventListener("keypress", function (e) {
    //	$rootScope.$emit(Keypad.KEY_PRESSED, String.fromCharCode(e.keyCode));
    //});

    //document.addEventListener("keydown", function (e) {
    //	if (e.keyCode == 13) { $rootScope.$emit(Keypad.MODIFIER_KEY_PRESSED, "NEXT"); }
    //	if (e.keyCode == 8) {
    //		$rootScope.$emit(Keypad.MODIFIER_KEY_PRESSED, "CLEAR");
    //		e.preventDefault();
    //		e.stopPropagation();
    //	}
    //});
});