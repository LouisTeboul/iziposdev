app.directive('ngBarcodetextfield', function () {
    return {
        templateUrl: 'partials/BarcodeTextField.html',
        restrict: 'E'
    }
});

app.directive('ngDataNotificationSwitch', function(){
    return {
        scope: {
            ngIfNotification: '@'
        },
        restrict: 'AE',
        link: function($scope, $elem, $attr){
            //console.log($scope.ngIfNotification);
            if ($scope.ngIfNotification === 'false'){
                $elem.removeAttr("data-notifications");
            }
        }
    };
});

app.directive('modalLocation', function () {
	return {
		restrict: 'A',
		link: function ($scope, $elem, $attr) {
			if ($attr.modalLocation) {
				var modalElem = $elem[0].closest(".modal-dialog");
				modalElem.className += " "+$attr.modalLocation;
			}
		}
	};
});