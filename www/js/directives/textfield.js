app.directive('textField', function ($timeout,$rootScope) {
	return {
		templateUrl: 'partials/textfield.html',
		require: 'ngModel',
		restrict: 'E',
		scope: {
			location: '@',
			type: '@',
			noshow: '@',
			nativekeyboard: '@',
			tostring: '@',
			firstappend: '@',
			validfunction: '&'
        },
		link: function (scope, element, attrs, ngModelCtrl) {
			scope.currentElement = element;
			//scope.currentElement[0].className += " layout-fill";
			scope.ngModelCtrl = ngModelCtrl;

			var unregister = scope.$watch(function () {
				return ngModelCtrl.$modelValue;
			}, initialize);

			function initialize(value) {
				scope.valueType = typeof (value);
				ngModelCtrl.$setViewValue(value);
				scope.txtValue = value;
				scope.init = true;
				scope.$evalAsync();
				$rootScope.$emit("updateModel", ngModelCtrl);
				//unregister();
			}
		}
	}
});

app.service('textFieldService', ['$rootScope',
    function ($rootScope) {
    	var current = this;
    	var focusedTextField = undefined;

    	this.setFocusedTextField = function (textField) {
    		if (focusedTextField != textField) {
    			if(focusedTextField)$rootScope.closeKeyboard();

				focusedTextField = textField;
    			$rootScope.$emit("focusedTextFieldChanged", textField);
    		}
    	}

    	this.unfocusTextField = function (textField) {
    		if (focusedTextField == textField) {
    			this.setFocusedTextField(undefined);
    		}
    	}

    	this.getFocusedTextField = function () {
    		return focusedTextField;
    	}

    }]);

app.controller('TextFieldCtrl', function ($rootScope, $scope, textFieldService) {
	var tsFocus;

	var focusedTextFieldHandler = $rootScope.$on('focusedTextFieldChanged', function (evt, textfield) {
		if (textfield == $scope.currentElement) {
			$scope.isFocused = true;
		} else {
			$scope.isFocused = false;
		}
		$scope.$evalAsync();
	});


	var txtValueHandler = $scope.$watch('txtValue', function () {
		var newValue;
		if (!$scope.tostring && (!$scope.txtValue || $scope.txtValue.toString().indexOf("-") != 0) && ($scope.valueType == "number" || $scope.type == "numeric" || $scope.type == "decimal")) {
			newValue = Number.parseFloat($scope.txtValue);
			if (isNaN(newValue)) {
				newValue = 0;
				$scope.txtValue = 0;
			}

		} else {
			newValue = $scope.txtValue;
			if (!newValue) {
				newValue = "";
			}
		}
		$scope.ngModelCtrl.$setViewValue(newValue);
	});

	var currentElementHandler = $scope.$watch('currentElement', function () {
		$scope.currentElement.bind("blur", function (e) {
			if (e.timeStamp - tsFocus > 500) {
				textFieldService.unfocusTextField($scope.currentElement);
			} else {
				$scope.currentElement[0].focus();
			}
		});
		$scope.currentElement.bind("focus", function (e) {
			textFieldService.setFocusedTextField($scope.currentElement);
			tsFocus = e.timeStamp;
			if (!$scope.noshow) {
				$rootScope.closeKeyboard();
				$rootScope.openKeyboard($scope.type, $scope.location);
			}
		});

		var resizeInnerDiv = function () {
			var currentHeight = $scope.currentElement[0].clientHeight;
			$scope.currentElement.find("#txtValue")[0].style.minHeight = currentHeight + "px";
		}

		$scope.currentElement.bind("resize", function (e) {
			resizeInnerDiv();
		});

		resizeInnerDiv();
	});

	var modelHandler = $rootScope.$on("updateModel", function (event,ngModel) {
		if (ngModel == $scope.ngModelCtrl) {
			$scope.txtValue = $scope.ngModelCtrl.$viewValue;
		}
	});

	$scope.$on("$destroy", function () {
		$rootScope.closeKeyboard();
		focusedTextFieldHandler();
		keypressHandler();
		modifierKeyPressHandler();
		txtValueHandler();
		modelHandler();

		if ($scope.nativekeyboard) {
			document.removeEventListener("keypress", trapkeypress);
			document.removeEventListener("keydown", trapkeydown);
		}
	});

	$scope.focus = function () {
		$scope.currentElement.focus();
	}

	$scope.init = function () {
		if ($scope.nativekeyboard) {
			document.addEventListener("keypress", trapkeypress);
			document.addEventListener("keydown", trapkeydown);
		}
	}

	var trapkeypress = function (e) {
		$rootScope.$emit(Keypad.KEY_PRESSED, String.fromCharCode(e.keyCode));
	}

	var trapkeydown = function (e) {
		if (e.keyCode == 13) {
			setTimeout(function () {
				$rootScope.$emit(Keypad.MODIFIER_KEY_PRESSED, "NEXT");
			}, 500);
			e.preventDefault();
			e.stopPropagation();
		}
		if (e.keyCode == 8) {
			$rootScope.$emit(Keypad.MODIFIER_KEY_PRESSED, "CLEAR");
			e.preventDefault();
			e.stopPropagation();
		}
	}

	var keypressHandler = $rootScope.$on(Keypad.KEY_PRESSED, function (event, data) {
		if ($scope.isFocused) {
			if ($scope.init && !$scope.firstappend) {
				$scope.txtValue = data;
				$scope.init = false;
			} else {
				$scope.txtValue += data;
			}
			
			$scope.$evalAsync();
		}
	});

	var modifierKeyPressHandler = $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, function (event, key, id) {

		if ($scope.isFocused) {
			$scope.init = false;
			switch (key) {
				case "CLEAR":
					if ($scope.txtValue.toString().length > 0) {
						$scope.txtValue = $scope.txtValue.toString().substring(0, $scope.txtValue.toString().length - 1);
					}
					$scope.$evalAsync();
					break;
				case "NEXT":
					if ($scope.validfunction()) {
						$scope.validfunction()();
					}
					break;
				case "SPACE":
					$scope.txtValue += " ";
					$scope.$evalAsync();
					break;
				case "PLUS":
					$scope.txtValue += "+";
					$scope.$evalAsync();
					break;
				case "MINUS":
					if ($scope.txtValue == "" || $scope.txtValue == "0") {
						$scope.txtValue = "-";
					} else {
						$scope.txtValue += "-";
					}
					$scope.$evalAsync();
					break;
			}
		}
	});


});