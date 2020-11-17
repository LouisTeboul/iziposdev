app.directive('textField', function ($timeout, $rootScope) {
    return {
        templateUrl: 'partials/textfield.html',
        require: 'ngModel',
        restrict: 'E',
        scope: {
            location: '@',
            placeholder: '@',
            type: '@',
            nullable: '@',
            nativekeyboard: '@',
            tostring: '@',
            validfunction: '&'
        },
        link: function (scope, element, attrs, ngModelCtrl) {

            const initialize = (value) => {
                scope.valueType = typeof value;
                ngModelCtrl.$setViewValue(value);
                scope.txtValue = value;
                scope.init = true;
                scope.$evalAsync();
                $rootScope.$emit("updateModel", ngModelCtrl);
                //unregister();
            };

            scope.currentElement = element;
            //scope.currentElement[0].className += " layout-fill";
            scope.ngModelCtrl = ngModelCtrl;
            scope.$watch(() => {
                return ngModelCtrl.$modelValue;
            }, initialize);
        }
    };
});

app.directive('textFieldBorne', function ($timeout, $rootScope) {
    return {
        templateUrl: 'partials/textfieldBorne.html',
        require: 'ngModel',
        restrict: 'E',
        scope: {
            location: '@',
            type: '@',
            nullable: '@',
            nativekeyboard: '@',
            tostring: '@',
            validfunction: '&',
            placeholder: '@',
            mandatory: '@'
        },
        link: function (scope, element, attrs, ngModelCtrl) {

            const initialize = (value) => {
                scope.valueType = typeof value;
                ngModelCtrl.$setViewValue(value);
                scope.txtValue = value;
                scope.init = true;
                scope.$evalAsync();
                $rootScope.$emit("updateModel", ngModelCtrl);
                //unregister();
            };

            scope.currentElement = element;
            //scope.currentElement[0].className += " layout-fill";
            scope.ngModelCtrl = ngModelCtrl;
            scope.$watch(() => {
                return ngModelCtrl.$modelValue;
            }, initialize);
        }
    };
});

app.service('textFieldService', ['$rootScope', function ($rootScope) {

    let focusedTextField = null;

    this.setFocusedTextField = (textField) => {
        if (focusedTextField != textField) {
            if (focusedTextField) $rootScope.closeKeyboard();
            focusedTextField = textField;
            $rootScope.$emit("focusedTextFieldChanged", textField);
        }
    };

    this.unfocusTextField = (textField) => {
        if (focusedTextField == textField) {
            this.setFocusedTextField(undefined);
        }
    };

    this.getFocusedTextField = () => {
        return focusedTextField;
    };

}]);

app.controller('TextFieldCtrl', function ($rootScope, $scope, textFieldService) {

    //let tsFocus;
    let lastEvent;

    // $scope.init = () => {
    //
    //     $scope.initialized = false;
    //
    //     // if (!$rootScope.KeyboardEventsLoaded) {
    //     //     window.addEventListener("keypress", trapkeypress);
    //     //     window.addEventListener("keydown", trapkeydown);
    //     //     $rootScope.KeyboardEventsLoaded = true;
    //     // }
    // };

    const focusedTextFieldHandler = $rootScope.$on('focusedTextFieldChanged', (evt, textfield) => {
        $scope.isFocused = textfield === $scope.currentElement;
        $scope.$evalAsync();
    });

    const removeMultipleDots = () => {
        let dot = $scope.txtValue.indexOf(".", $scope.txtValue.indexOf(".") + 1);
        if (dot !== -1) {
            $scope.txtValue = $scope.txtValue.slice(0, dot) + $scope.txtValue.slice(dot + 1);
            removeMultipleDots();
        }
    }

    const removeLetters = () => {
        let last = $scope.txtValue.substring($scope.txtValue.length - 1);
        let regex = "0123456789."; /* /^\d+(\.\d+)*$/ */
        let isNumber = regex.includes(last);
        if (last && !isNumber) {
            $scope.txtValue = $scope.txtValue.substring(0, $scope.txtValue.length - 1);
        }
    }

    const txtValueHandler = $scope.$watch('txtValue', () => {
        let newValue;

        if (!$scope.tostring && (!$scope.txtValue || $scope.txtValue.toString().indexOf("-") !== 0) && ($scope.valueType === "number" || $scope.type === "numeric" || $scope.type === "decimal")) {
            if (Number.isNaN($scope.txtValue)) {
                $scope.txtValue = "0";
            } else {
                $scope.txtValue = String($scope.txtValue).replace(",", ".");
                removeMultipleDots();
                removeLetters();
            }
            if ($scope.txtValue == "00") {
                $scope.txtValue = "0";
            }

            if ($scope.txtValue && !$scope.txtValue.includes(".")) {
                newValue = Number.parseFloat($scope.txtValue);
            } else {
                if ($scope.txtValue === "") {
                    newValue = 0;
                } else {
                    newValue = $scope.txtValue;
                }
            }

            let last = String(newValue).substring($scope.txtValue.length - 1);
            if (last !== "." && last !== "0") {
                newValue = Number($scope.txtValue);
            } else if (newValue === ".") {
                newValue = "0.";
            }
        } else {
            newValue = $scope.txtValue;
            if (!newValue) {
                newValue = "";
            }
        }

        if (Number.isNaN(newValue)) {
            newValue = 0;
        }

        $scope.ngModelCtrl.$setViewValue(String(newValue));
    });

    //Déterminer si le champ est visible pour éviter
    const isVisible = () => {
        let el = $scope.currentElement[0];
        let top = el.offsetTop;
        let left = el.offsetLeft;
        let width = el.offsetWidth;
        let height = el.offsetHeight;

        while (el.offsetParent) {
            el = el.offsetParent;
            top += el.offsetTop;
            left += el.offsetLeft;
        }
        return top < window.pageYOffset + document.body.offsetHeight &&
            left < window.pageXOffset + document.body.offsetWidth &&
            top + height > window.pageYOffset &&
            left + width > window.pageXOffset;
    };


    //Détermine le champ actif de la page
    const currentElementHandler = $scope.$watch('currentElement', () => {
        $scope.currentElement.bind("blur", (e) => {
            // if (e.timeStamp - tsFocus > 500) {
                textFieldService.unfocusTextField($scope.currentElement);
            // } else {
            //     $scope.currentElement[0].focus();
            // }
        });
        $scope.currentElement.bind("focus", (e) => {
            textFieldService.setFocusedTextField($scope.currentElement);
            // tsFocus = e.timeStamp;
            if (!lastEvent || !lastEvent.type || lastEvent.type !== "keypress") {
                // $rootScope.closeKeyboard();
                $rootScope.openKeyboard($scope.type, $scope.location, $scope);
            }
        });
        const resizeInnerDiv = () => {
            const currentHeight = $scope.currentElement[0].clientHeight;
            if (currentHeight > 0) {
                $scope.currentElement.find("#txtValue")[0].style.minHeight = currentHeight + "px";
            }
        };
        $scope.currentElement.bind("resize", (e) => {
            resizeInnerDiv();
        });
        setTimeout(() => {
            resizeInnerDiv();
        }, 1000);
    });

    const modelHandler = $rootScope.$on("updateModel", (event, ngModel) => {
        if (ngModel === $scope.ngModelCtrl) {
            $scope.txtValue = $scope.ngModelCtrl.$viewValue;
        }
    });

    $scope.$on("$destroy", () => {
        $rootScope.closeKeyboard();
        focusedTextFieldHandler();
        keypressHandler();
        modifierKeyPressHandler();
        txtValueHandler();
        modelHandler();
        currentElementHandler();
        $rootScope.KeyboardEventsLoaded = false;
    });

    $scope.focus = ($event) => {
        lastEvent = $event;
        $scope.currentElement.focus();
    };
    
    const keypressHandler = $rootScope.$on(Keypad.KEY_PRESSED, (event, data) => {
        const isQrModal = $("#txtQRCode").hasClass("modalQrOpen");
        const isModal = $("body").hasClass("modal-open");
        if ($scope.isFocused || $scope.nativekeyboard && isVisible() && (!isModal || isQrModal)) {
            if (!$scope.initialized && $scope.txtValue && $scope.txtValue.toString().length > 0) {
                $scope.txtValue = data;
            } else {
                if (!$scope.txtValue) {
                    $scope.txtValue = "";
                }
                $scope.txtValue += data;
            }
            $scope.initialized = true;
            $scope.$evalAsync();
        }
    });

    const modifierKeyPressHandler = $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, (event, key, id) => {
        if ($scope.isFocused) {
            $scope.init = false;
            switch (key) {
                case "CLEAR":
                    if ($scope.txtValue.toString().length > 0) {
                        $scope.txtValue = $scope.txtValue.toString().substring(0, $scope.txtValue.toString().length - 1);
                        $scope.$evalAsync();
                    }
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