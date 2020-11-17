app.controller('ModalPickQuantityController', function ($scope, $rootScope, $uibModalInstance, product) {
    $scope.init = () => {
        $scope.newQuantity = product.Quantity || 1;
        $scope.product = product;
        $scope.errorMessage = "";

        const loadQuantity = () => {
            if ($("#txtQuantityValue").length) {
                document.querySelector('#txtQuantityValue').focus();
            } else {
                window.requestAnimationFrame(loadQuantity);
            }
        };
        loadQuantity();
    };

    $scope.ok = () => {
        if ((product.OrderMinimumQuantity && $scope.newQuantity >= product.OrderMinimumQuantity || !product.OrderMinimumQuantity && $scope.newQuantity > 0)
            && (product.OrderMaximumQuantity && $scope.newQuantity <= product.OrderMaximumQuantity || !product.OrderMaximumQuantity && $scope.newQuantity < 1000)) {
            $rootScope.closeKeyboard();
            $uibModalInstance.close(Number($scope.newQuantity));
        } else {
            if (product.OrderMinimumQuantity && $scope.newQuantity < product.OrderMinimumQuantity) {
                $scope.errorMessage = "La quantité minimum pour ce produit est de " + product.OrderMinimumQuantity + " " + (product.SaleUnit || product.Product.SaleUnit);
            } else if (product.OrderMaximumQuantity && $scope.newQuantity > product.OrderMaximumQuantity) {
                $scope.errorMessage = "La quantité maximum pour ce produit est de " + product.OrderMaximumQuantity + " " + (product.SaleUnit || product.Product.SaleUnit);
            } else if (!product.OrderMinimumQuantity && $scope.newQuantity <= 0) {
                $scope.errorMessage = "La quantité minimum est de 0.001 " + (product.SaleUnit || product.Product.SaleUnit);
            } else if (!product.OrderMaximumQuantity && $scope.newQuantity >= 1000) {
                $scope.errorMessage = "La quantité maximum est de 1000 " + (product.SaleUnit || product.Product.SaleUnit);
            } else {
                swal({
                    title: $translate.instant("Veuillez vérifier la quantité.")
                });
                $rootScope.closeKeyboard();
                $uibModalInstance.close(Number($scope.newQuantity));
            }
        }
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
        $rootScope.closeKeyboard();
    };
});