app.controller('ModalBipperBorneController', function ($scope, $rootScope, $uibModalInstance, $timeout, $mdMedia, shoppingCart) {
    let watcher;

    $scope.$on("$destroy", () => {
        if (watcher) {
            watcher();
        }
    });

    $scope.init = () => {
        $rootScope.borneBipperStarted = true;
        $rootScope.borneBipperScanned = "";

        $scope.bipperNumber = null;

        $scope.mdMedia = $mdMedia;

        $scope.itemName = "Bipper";
        switch ($rootScope.currentShoppingCart.DeliveryType) {
            case DeliveryType.FORHERE:
                if($rootScope.borneForHereCollectLabel) {
                    $scope.itemName = $rootScope.borneForHereCollectLabel;
                }
                break;
            case DeliveryType.TAKEOUT:
                if($rootScope.borneTakeawayCollectLabel) {
                    $scope.itemName = $rootScope.borneTakeawayCollectLabel;
                }
                break;
        }

        $scope.customStyle = {
            'flex-direction': $rootScope.borne && $rootScope.borneVertical ? 'column' : 'row',
            'background-image': $rootScope.borneBgModal ? 'url(' + $rootScope.borneBgModal + ')' : 'url(img/fond-borne.jpg)',
            'background-size': 'cover',
        };

        $timeout(() => {
            $('#txtBarcode #txtValue.textfieldBorne').trigger('click');
            let el = document.querySelector("#txtValue .tfBorneText");
            if (el) {
                el.innerHTML = "N&deg; de " + $scope.itemName;
            }
        }, 250);

        watcher = $rootScope.$watch(() => $rootScope.borneBipperScanned, () => {
            $scope.bipperNumber = $rootScope.borneBipperScanned;
            $scope.ok();
        });
    };

    $scope.ok = () => {
        if ($scope.bipperNumber) {
            $rootScope.borneBipperStarted = false;
            $rootScope.closeKeyboard();
            shoppingCart.BipperNumber = $scope.bipperNumber;
            $uibModalInstance.close();
        } else {
            $("#bipper").focus();
        }
    };

    $scope.cancel = () => {
        $rootScope.borneBipperStarted = false;
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});