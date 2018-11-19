/**
 *  Modal for customer comment on product
 */
app.controller('ModalCommentController', function ($scope, $rootScope, $uibModalInstance, obj, $mdMedia) {
    let current = this;
    $scope.mdMedia = $mdMedia;
    $scope.model = {toast: []};
    $scope.listComments = [];
    $scope.value = '';

    $scope.init = function () {
        if (!obj.Comment) {
            obj.Comment = "";
        } else {
            let comments = obj.Comment.split(', ');

            for (let i = 0; i < comments.length; i++) {
                if($rootScope.borne) {
                    $scope.listComments.push({idx: i, text: comments[i]});
                } else {
                    $scope.model.toast.push({idx: i, text: comments[i]});
                }
            }
        }
        if (obj.Product && obj.Product.ProductComments) {
            $scope.ProductComments = obj.Product.ProductComments;
        } else if (obj.LinkedProduct && obj.LinkedProduct.ProductComments) {
            $scope.ProductComments = obj.LinkedProduct.ProductComments;
        }
        if(!$rootScope.borne) {
            setTimeout(function () {
                let txtComment = document.getElementById("txtComment");
                if (txtComment) {
                    txtComment.focus();
                }
            }, 250);
        }
    };

    $scope.ok = function () {
        if ($scope.value != '') {
            if($rootScope.borne) {
                $scope.listComments.push({idx: $scope.listComments.length, text: $scope.value});
            } else {
                $scope.model.toast.push({idx: $scope.model.toast.length, text: $scope.value});
            }
            $scope.value = '';
            $scope.$evalAsync();
        }

        if (!$scope.ProductComments || $scope.ProductComments.length == 0) {
            $rootScope.closeKeyboard();
            let val = "";
            if($rootScope.borne) {
                val = Enumerable.from($scope.listComments).select("x=>x.text").toArray().join(', ');
            } else {
                val = Enumerable.from($scope.model.toast).select("x=>x.text").toArray().join(', ');
            }
            $uibModalInstance.close(val);
        }
    };

    $scope.addComment = function (item) {
        if($rootScope.borne) {
            item.selected = true;
            $scope.listComments.push({idx: $scope.listComments.length, text: item.Name});
        } else {
            $scope.model.toast.push({idx: $scope.model.toast.length, text: item.Name});
        }
        $scope.$evalAsync();
    };

    $scope.cancel = function () {
        $rootScope.closeKeyboard();
        $uibModalInstance.dismiss('cancel');
    };

    $scope.clear = function () {
        $scope.value = '';
        $scope.$evalAsync();
    };
    $scope.close = function () {
        $scope.ok();
        $rootScope.closeKeyboard();
        let val = "";
        if($rootScope.borne) {
            val = Enumerable.from($scope.listComments).select("x=>x.text").toArray().join(', ');
        } else {
            val = Enumerable.from($scope.model.toast).select("x=>x.text").toArray().join(', ');
        }
        $uibModalInstance.close(val);
    };

    $scope.removeComment = function (item) {
        item.selected = false;
        for(let i = 0; i < $scope.listComments.length; i++) {
            if($scope.listComments[i].text === item.Name) {
                $scope.listComments.splice(i, 1);
            }
        }
    };

    $scope.delSelectedChip = function (event) {
        setTimeout(function () {
            let chipController = angular.element(event.currentTarget).controller('mdChips');
            if (chipController.selectedChip >= 0) {
                chipController.removeChipAndFocusInput(chipController.selectedChip);
            }
            $scope.$evalAsync();
        }, 200);
    }
});