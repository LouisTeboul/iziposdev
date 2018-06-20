app.directive('textField', function ($timeout, $rootScope) {
    return {
        templateUrl: 'partials/textfield.html',
        require: 'ngModel',
        restrict: 'E',
        scope: {
            location: '@',
            type: '@',
            nativekeyboard: '@',
            tostring: '@',
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

<<<<<<< HEAD
app.service('textFieldService', ['$rootScope',
    function ($rootScope) {
        var current = this;
        var focusedTextField = undefined;

        this.setFocusedTextField = function (textField) {
            if (focusedTextField != textField) {
                if (focusedTextField) $rootScope.closeKeyboard();

                focusedTextField = textField;
                $rootScope.$emit("focusedTextFieldChanged", textField);
            }
        };

=======
app.service('textFieldService', ['$rootScope', function ($rootScope) {

        var current = this;
        var focusedTextField = undefined;
        this.setFocusedTextField = function (textField) {
            if (focusedTextField != textField) {
                if (focusedTextField) $rootScope.closeKeyboard();
                focusedTextField = textField;
                $rootScope.$emit("focusedTextFieldChanged", textField);
            }
        };
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        this.unfocusTextField = function (textField) {
            if (focusedTextField == textField) {
                this.setFocusedTextField(undefined);
            }
        };
<<<<<<< HEAD

        this.getFocusedTextField = function () {
            return focusedTextField;
        }

    }]);
=======
        this.getFocusedTextField = function () {
            return focusedTextField;
        };
}]);
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409

app.controller('TextFieldCtrl', function ($rootScope, $scope, textFieldService) {

    var tsFocus;
    var lastEvent;
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

    /*
     * D�terminer si le champ est visible pour �viter 
     * 
     */
    var isVisible = function () {

        var el = $scope.currentElement[0];
        var top = el.offsetTop;
        var left = el.offsetLeft;
        var width = el.offsetWidth;
        var height = el.offsetHeight;
        while (el.offsetParent) {
            el = el.offsetParent;
            top += el.offsetTop;
            left += el.offsetLeft;
        }
        var boolResult = top < (window.pageYOffset + document.body.offsetHeight) &&
            left < (window.pageXOffset + document.body.offsetWidth) &&
            (top + height) > window.pageYOffset &&
            (left + width) > window.pageXOffset;
<<<<<<< HEAD

=======
>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        return boolResult;
    };


    //D�termine le champ actif de la page
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
            if (!lastEvent || !lastEvent.type || lastEvent.type !== "keypress") {
                $rootScope.closeKeyboard();
                $rootScope.openKeyboard($scope.type, $scope.location, $scope);
            }
        });
        var resizeInnerDiv = function () {
            var currentHeight = $scope.currentElement[0].clientHeight;
            if (currentHeight > 0) {
                $scope.currentElement.find("#txtValue")[0].style.minHeight = currentHeight + "px";
            }
        };
        $scope.currentElement.bind("resize", function (e) {
            resizeInnerDiv();
        });
        setTimeout(function () {
            resizeInnerDiv();
        }, 1000);
    });

    var modelHandler = $rootScope.$on("updateModel", function (event, ngModel) {
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
        //Native Keyboard
        if ($scope.nativekeyboard) {
            document.removeEventListener("keypress", trapkeypress);
            document.removeEventListener("keydown", trapkeydown);
        }
    });

    $scope.focus = function ($event) {
        lastEvent = $event;
        $scope.currentElement.focus();
    };

    $scope.init = function () {

        $scope.initialized = false;
        //Native keyboard
        if ($scope.nativekeyboard && !($('#qr-canvas').length > 0)) {
            document.addEventListener("keypress", trapkeypress);
            document.addEventListener("keydown", trapkeydown);
        }
    };

    // This functions traps the physical keyboard interaction in
    // By default it is enabled 
    //Keypress and Keydown handle different character but we have 
    var trapkeypress = function (e) {

        //How to tell if a uibModal is opened
        //https://github.com/angular-ui/bootstrap/tree/master/src/modal/docs
        var isModal = $("body").hasClass("modal-open");
        if (isVisible() || isModal) {
            lastEvent = e;
            $scope.$emit(Keypad.KEY_PRESSED, String.fromCharCode(e.keyCode));
        }
    };

    var trapkeydown = function (e) {

        //How to tell if a uibModal is opened
        //https://github.com/angular-ui/bootstrap/tree/master/src/modal/docs
        var isModal = $("body").hasClass("modal-open");
        if (isVisible() || isModal) {
            if (e.keyCode == 13) { //enter
                setTimeout(function () {
                    $scope.$emit(Keypad.MODIFIER_KEY_PRESSED, "NEXT");
                }, 500);
                e.preventDefault();
                e.stopPropagation();
            }
            if (e.keyCode == 8) { //backspace
                $scope.$emit(Keypad.MODIFIER_KEY_PRESSED, "CLEAR");
                e.preventDefault();
                e.stopPropagation();
            }
        }
    };

    var keypressHandler = $rootScope.$on(Keypad.KEY_PRESSED, function (event, data) {
<<<<<<< HEAD
        //
=======

>>>>>>> f5b9be395d974d3c45b610601bee2ed23b023409
        var isQrModal = $("#txtQRCode").hasClass("modalQrOpen");
        var isModal = $("body").hasClass("modal-open");
        if ($scope.isFocused || ($scope.nativekeyboard && isVisible() && (!isModal || isQrModal))) {
            if (!$scope.initialized && $scope.txtValue && $scope.txtValue.toString().length > 0) {
                $scope.txtValue = data;
            } else {
                $scope.txtValue += data;
            }
            $scope.initialized = true;
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
                    $scope.initialized = true;
                    $scope.$evalAsync();
                    break;
            }
        }
    });
});