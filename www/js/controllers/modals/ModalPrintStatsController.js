app.controller('ModalPrintStatsController', function ($scope, $rootScope, $uibModal, $uibModalInstance, zposService, datas, printMode) {

    $scope.datas = datas;

    $scope.init = function () {
        $scope.printDetails = false;
        $scope.template = zposService.composeStatsHTML(datas, printMode, null, $scope.printDetails);
        document.querySelector(".ticketBody").innerHTML = $scope.template;

        $scope.$watch('printDetails', () => {
            $scope.template = zposService.composeStatsHTML(datas, printMode, null, $scope.printDetails);
            document.querySelector(".ticketBody").innerHTML = $scope.template;
        });
    };

    $scope.printZPos = function() {
        zposService.printZPosAsync($scope.template, $scope.printDetails);
    };

    $scope.ok = function () {
        $uibModalInstance.close('ok');
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
});