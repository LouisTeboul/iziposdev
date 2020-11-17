app.directive('autoFocus', function () {
    return {
        require: 'ngModel',
        restrict: 'A',
        link: function (scope, element, attrs) {
            setTimeout(() => {
                element[0].focus();
            }, 50);
        }
    };
});