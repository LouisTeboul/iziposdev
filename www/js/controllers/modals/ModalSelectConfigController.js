app.controller('ModalSelectConfigController', function ($scope, $rootScope, $uibModalInstance, configs) {
    let self = this;
    let configsArgs = configs;

    $scope.model = {
        configs: [],
        selectedConfig: undefined
    };

    $scope.init = () => {
        if (configsArgs && configsArgs.length > 0) {
            for (let arg of configsArgs) {
                $scope.model.configs.push(arg);
            }
        }
    };

    $scope.ok = () => {
        $uibModalInstance.close(JSON.parse($scope.model.selectedConfig));
    };

    /**
     * Clear the last configuration and reload all data
     */
    $scope.reset = () => {
        window.localStorage.removeItem("IziBoxConfiguration");
        window.location.reload();
    };
});