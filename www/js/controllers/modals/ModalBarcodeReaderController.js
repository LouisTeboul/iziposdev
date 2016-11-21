app.controller('ModalBarcodeReaderController', function ($scope, $rootScope, $uibModalInstance) {
    var video;

    $scope.value = "";

    $scope.init = function () {
        $('#reader').html5_qrcode(function (data) {
        	localMediaStream.getTracks()[0].stop();
        	$uibModalInstance.close(data);
        	$rootScope.closeKeyboard();
            },
            function (error) {
                //show read errors 
            }, function (videoError) {
                //the video stream could be opened
            }
        );
    }

    $scope.ok = function () {
    	
        try {
            if (localMediaStream) {
            	localMediaStream.getTracks()[0].stop();
            }
        } catch (ex) {

        }

        $uibModalInstance.close($scope.value);
        $rootScope.closeKeyboard();
    }

    $scope.cancel = function () {
    	
        try {
            if (localMediaStream) {
            	localMediaStream.getTracks()[0].stop();
            }
        } catch (ex) {

        }

        $uibModalInstance.dismiss('cancel');
        $rootScope.closeKeyboard();
    }
});