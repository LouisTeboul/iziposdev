app.controller('ModalAddAddressFormController', function ($scope, $rootScope, $uibModalInstance, $timeout, $translate, $http, $uibModal) {

    $rootScope.currentPage = 1;
    $scope.init = function () {
        $timeout(function () {
            document.querySelector("#Address1").focus();
        }, 50);
        $scope.errorMessage = undefined;
        $scope.model = {
            mandatory : {
                Address1 : undefined,
                ZipPostalCode : undefined,
                City : undefined,
                Phone : undefined,
            },
            Floor : undefined,
            Door : undefined,
            Digicode : undefined,
            InterCom : undefined
        };
    };

    $scope.validPhone = function (strPhone) {
        let re = /^0[1-68][0-9]{8}$/;
        return re.test(strPhone);
    };


    $scope.validZipPostCode = function (strZip) {
        let re = /^[0-9]{5}$/;
        return re.test(strZip);
    };

    $scope.pageChanged = function () {
        $rootScope.closeKeyboard();
        switch ($rootScope.currentPage) {
            case 1:
                $timeout(function () {
                    document.querySelector("#Address1").focus();
                }, 50);
                break;
            case 2:
                $timeout(function () {
                    document.querySelector("#Floor").focus();
                }, 50);
                break;
            case 3:
                $timeout(function () {
                    document.querySelector("#Interphone").focus();
                }, 50);
                break;
            default:
                break;
        }
    };


    $scope.ok = function () {
        var emptyInput = Enumerable.from($scope.model.mandatory).firstOrDefault(function(x){
            return !x.value;
        });

        if(!emptyInput){
            if($scope.validPhone($scope.model.mandatory.Phone)){
                if($scope.validZipPostCode($scope.model.mandatory.ZipPostalCode)){
                    delete $rootScope.currentPage;
                    $rootScope.closeKeyboard();
                    $uibModalInstance.close($scope.model);
                }else {
                    $scope.errorMessage = "Veuillez entrer un code postal valide";
                }
            } else {
                $scope.errorMessage = "Veuillez entrer un numéro de téléphone valide";
            }
        } else {
            $scope.errorMessage = "Veuillez renseigner tous les champs obligatoire";
        }
    };

    $scope.cancel = function () {
        delete $rootScope.currentPage;
        $scope.errorMessage = undefined;
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    }
});