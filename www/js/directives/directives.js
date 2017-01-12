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


app.directive('horloge', function () {
    return {
        link: function (scope, element, attrs) {
            function afficheHeure() {
                var d = new Date();              
                var datestring = ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
                d.getFullYear();                
                element.text(datestring);            
            }
            var interval = setInterval(afficheHeure, 1000);
        }
    };
});