app.controller('ModalPaymentTypesConfigController', function ($scope, $rootScope, $translate, $uibModalInstance) {

    $scope.PaymentType = PaymentType;
    $scope.model = {};

    let origPaymentTypesConfig = null;

    $scope.init = () => {
        origPaymentTypesConfig = angular.copy($rootScope.paymentTypesConfig);
        $scope.model = angular.copy($rootScope.paymentTypesConfig);

    };

    $scope.ok = () => {
        $rootScope.paymentTypesConfig = $scope.model;
        $uibModalInstance.close();
    };

    $scope.cancel = () => {
        $rootScope.paymentTypesConfig = origPaymentTypesConfig;
        $uibModalInstance.dismiss();
    };
});