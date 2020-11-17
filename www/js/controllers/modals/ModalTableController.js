app.controller('ModalTableController', function ($scope, $rootScope, $uibModalInstance, currentTableNumber, currentTableCutleries, $translate) {
    $scope.valueTable = currentTableNumber;
    $scope.valueCutleries = currentTableCutleries;

    $scope.init = () => {
        const loadTable = () => {
            if ($("#txtTable").length) {
                document.querySelector('#txtTable').focus();
            } else {
                window.requestAnimationFrame(loadTable);
            }
        };
        loadTable();
    };

    $scope.ok = () => {
        $rootScope.closeKeyboard();

        const tableNumberValue = parseInt($scope.valueTable);
        const tableCutleriesValue = parseInt($scope.valueCutleries);

        if (tableNumberValue > 10000) {
            $scope.errorMessage = $translate.instant("Le numéro de table doit être inférieur à 10000");
            $scope.$evalAsync();
        } else if (tableCutleriesValue > 100) {
            $scope.errorMessage = $translate.instant("Le nombre de couverts doit être inférieur à 100");
            $scope.$evalAsync();
        } else if (isNaN(tableNumberValue) || isNaN(tableCutleriesValue) || tableNumberValue < 0 || tableCutleriesValue < 0) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
            $scope.$evalAsync();
        } else if (tableNumberValue == 0 && $rootScope.IziBoxConfiguration.TableRequired) {
            $scope.errorMessage = $translate.instant("Numero de table obligatoire");
            $scope.$evalAsync();
        } else if (tableCutleriesValue == 0 && $rootScope.IziBoxConfiguration.CutleriesRequired) {
            $scope.errorMessage = $translate.instant("Nombre de couvert obligatoire");
            $scope.$evalAsync();
        } else {
            const tableValues = {
                tableNumber: tableNumberValue > 0 ? tableNumberValue : undefined,
                tableCutleries: tableCutleriesValue > 0 ? tableCutleriesValue : undefined
            };

            $uibModalInstance.close(tableValues);
        }
    };

    $scope.cancel = () => {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});