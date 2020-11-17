app.controller('ModalOpenCloseStoreController', function ($scope, $rootScope, $uibModalInstance, storeService) {

    $scope.closeLocalStore = () => {
        storeService.setStateStoreAsync($rootScope.selectedStore, $rootScope.selectedStore.StoreLocalClosed, $rootScope.selectedStore.StoreCloudClosed).then(() => {
            $uibModalInstance.dismiss('close');
        });
    };

    $scope.closeCloudStore = () => {
        storeService.setStateStoreAsync($rootScope.selectedStore, $rootScope.selectedStore.StoreLocalClosed, $rootScope.selectedStore.StoreCloudClosed).then(() => {
            $uibModalInstance.dismiss('close');
        });
    };

    $scope.close = () => {
        $uibModalInstance.dismiss('close');
    };
});

