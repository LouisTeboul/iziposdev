app.controller('ModalBarcodeReaderController', function ($scope, $rootScope, $uibModalInstance) {
    let current = this;

    $scope.value = "";

    $scope.init = function () {
        $('#reader').html5_qrcode(function (data) {
                //localMediaStream.getTracks()[0].stop();
                current.stopReader();
                $uibModalInstance.close(data);
                $rootScope.closeKeyboard();
            },
            function (error) {
                //console.error(error);
            }, function (videoError) {
                //the video stream could be opened
                console.log(videoError);
            }
        );
    };

    this.stopReader = function () {
        $('#reader').html5_qrcode_stop();
    };

    $scope.ok = function () {
        try {
            current.stopReader();
            //if (localMediaStream) {
            //	localMediaStream.getTracks()[0].stop();
            //}
        } catch (ex) {
            console.log(ex);
        }

        $uibModalInstance.close($scope.value);
        $rootScope.closeKeyboard();
    };

    $scope.cancel = function () {
        try {
            current.stopReader();
            //if (localMediaStream) {
            //	localMediaStream.getTracks()[0].stop();
            //}
        } catch (ex) {
            console.log(ex);
        }

        $uibModalInstance.dismiss('cancel');
        $rootScope.closeKeyboard();
    }
});