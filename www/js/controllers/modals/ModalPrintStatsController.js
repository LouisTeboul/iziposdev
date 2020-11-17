app.controller('ModalPrintStatsController', function ($scope, $uibModalInstance, zposService, datas, count, printMode) {
    $scope.datas = datas;

    $scope.init = () => {
        $scope.printDetails = false;
        $scope.template = zposService.composeStatsHTML(datas, printMode, count, $scope.printDetails, true);
        document.querySelector(".ticketBody").innerHTML = $scope.template;

        $scope.$watch('printDetails', () => {
            $scope.template = zposService.composeStatsHTML(datas, printMode, count, $scope.printDetails, true);
            document.querySelector(".ticketBody").innerHTML = $scope.template;
        });
    };

    $scope.printZPos = () => {
        zposService.printZPosAsync($scope.template, $scope.printDetails);
    };

    $scope.ok = () => {
        $uibModalInstance.close('ok');
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };
});