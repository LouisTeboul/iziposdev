﻿/**
 *  Modal for customer comment on product
 */
app.controller('ModalCommentController', function ($scope, $rootScope, $uibModalInstance, obj) {
    let current = this;

    $scope.model = {toast: []};

    if (!obj.Comment) {
        obj.Comment = "";
    }
    else {
        let comments = obj.Comment.split(', ');

        for (let i = 0; i < comments.length; i++) {
            $scope.model.toast.push({idx: i, text: comments[i]});
        }

    }
    if (obj.Product && obj.Product.ProductComments) {
        $scope.ProductComments = obj.Product.ProductComments;
    }
    else if (obj.LinkedProduct && obj.LinkedProduct.ProductComments) {
        $scope.ProductComments = obj.LinkedProduct.ProductComments;
    }

    $scope.value = '';

    $scope.init = function () {
        setTimeout(function () {
            let txtComment = document.getElementById("txtComment");
            if (txtComment) {
                txtComment.focus();
            }
        }, 250);
    };

    $scope.ok = function () {
        if ($scope.value != '') {
            $scope.model.toast.push({idx: $scope.model.toast.length, text: $scope.value});
            $scope.value = '';
            $scope.$evalAsync();
        }

        if (!$scope.ProductComments || $scope.ProductComments.length == 0) {
            $rootScope.closeKeyboard();
            const val = Enumerable.from($scope.model.toast).select("x=>x.text").toArray().join(', ');
            $uibModalInstance.close(val);
        }
    };

    $scope.addComment = function (item) {
        $scope.model.toast.push({idx: $scope.model.toast.length, text: item.Name});
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
        const val = Enumerable.from($scope.model.toast).select("x=>x.text").toArray().join(', ');
        $uibModalInstance.close(val);
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