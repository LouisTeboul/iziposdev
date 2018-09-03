app.controller('ModalTableController', function ($scope, $rootScope, $uibModalInstance, currentTableNumber, currentTableCutleries, $translate) {
    $scope.valueTable = currentTableNumber;
    $scope.valueCutleries = currentTableCutleries;

    $scope.init = function () {
        setTimeout(function () {
            const txtTable = document.getElementById("txtTable");
            if (txtTable) {
                txtTable.focus();
            }
        }, 200);
    };


    $scope.ok = function () {
        $rootScope.closeKeyboard();
        const tableNumberValue = parseInt($scope.valueTable);
        const tableCutleriesValue = parseInt($scope.valueCutleries);

        if (isNaN(tableNumberValue) || isNaN(tableCutleriesValue) || tableNumberValue < 0 || tableCutleriesValue < 0) {
            $scope.errorMessage = $translate.instant("Valeur non valide");
            $scope.$evalAsync();
        } else if (tableNumberValue == 0 && $rootScope.IziBoxConfiguration.TableRequired) {
            $scope.errorMessage = $translate.instant("No de table obligatoire");
            $scope.$evalAsync();
        } else if (tableCutleriesValue == 0 && $rootScope.IziBoxConfiguration.CutleriesRequired) {
            $scope.errorMessage = $translate.instant("Nb de couvert obligatoire");
            $scope.$evalAsync();
        } else {

            const tableValues = {
                tableNumber: tableNumberValue > 0 ? tableNumberValue : undefined,
                tableCutleries: tableCutleriesValue > 0 ? tableCutleriesValue : undefined
            };

            $uibModalInstance.close(tableValues);
        }
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});