app.controller('AppController', function ($scope, $rootScope, $mdMedia, $q) {
    $scope.currentKeyboardType;
    $scope.mdMedia = $mdMedia;

    $scope.init = () => {};

    // Useful for the size options
    $(window).resize(() => {
        updateMeta();
    });

    $rootScope.$watch('RatioConfiguration.LandscapeRatio', () => {
        updateMeta();
    });
    $rootScope.$watch('RatioConfiguration.PortraitRatio', () => {
        updateMeta();
    });

    //Update HTML meta for zooming
    const updateMeta = () => {
        //if ($rootScope.RatioConfiguration) {
        //	let body = $("body")[0];

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

    //Is the keyboard opened
    $rootScope.isKeyboardOpen = (type) => {
        let elems = $("#keyboard-" + type);

        return elems.length > 0 && !elems.hasClass("closed");
    };

    //Open the keyboard
    $rootScope.openKeyboard = (type, alignment) => {
        if (type !== "none") {
            if (!$mdMedia('min-width: 800px')) {
                alignment = "center-end";
            }

            $scope.keyboardLocation = alignment || "center-center";
            $scope.currentKeyboardType = type;

            $rootScope.closeKeyboard().then(() => {
                $scope.$emit(Keypad.OPEN, "keyboard-" + type);
            });
        }
    };

    $rootScope.closeKeyboard = () => {
        let closeKbDefer = $q.defer();
        $scope.$emit(Keypad.CLOSE, "keyboard-decimal");
        $scope.$emit(Keypad.CLOSE, "keyboard-numeric");
        $scope.$emit(Keypad.CLOSE, "keyboard-azerty");
        closeKbDefer.resolve();

        return closeKbDefer.promise;
    };
});