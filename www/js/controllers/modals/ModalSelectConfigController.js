app.controller('ModalSelectConfigController', function ($scope, $rootScope, $uibModalInstance, configs) {
    var current = this;
    var configsArgs = configs;

    $scope.model = {
        configs: [],
        selectedConfig: undefined
    };

    $scope.init = function () {
        if (configsArgs && configsArgs.length > 0) {
            Enumerable.from(configsArgs).forEach(function (arg) {
                $scope.model.configs.push(JSON.parse(arg));
            });
        }
    };

    $scope.ok = function () {
        $uibModalInstance.close($scope.model.selectedConfig);
    };
});