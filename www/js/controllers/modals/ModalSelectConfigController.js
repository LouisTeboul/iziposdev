app.controller('ModalSelectConfigController', function ($scope, $rootScope, $uibModalInstance, configs) {
    let current = this;
    let configsArgs = configs;

    $scope.model = {
        configs: [],
        selectedConfig: undefined
    };

    $scope.init = function () {
        if (configsArgs && configsArgs.length > 0) {
            for(let arg of configsArgs) {
                $scope.model.configs.push(arg);
            }
        }
    };

    $scope.ok = function () {
        $uibModalInstance.close(JSON.parse($scope.model.selectedConfig));
    };
});