app.controller('ModalAllShoppingCartsController', function ($scope, $rootScope, $uibModalInstance, $uibModal, zposService, shoppingCartService, shoppingCartModel) {
	var currentDateStart = undefined;
	var currentDateEnd = undefined;
	var dateStartHandler = undefined;
	var dateEndHandler = undefined;

	$scope.init = function () {
		$scope.gridColumns = [
            { field: "Date", title: "Date", type: "date", format: "{0:dd/MM/yyyy}" },
            { field: "Timestamp", title: "No Ticket" },
            { field: "TableNumber", title: "Table", width: 80 },
            { field: "Total", title: "Total", width: 80 },
            { template: "<button class=\"btn btn-default\" ng-click=\"editShopCartItem(dataItem)\"><span class='glyphicon glyphicon-pencil'></span></button>", title: " ", width: 80 },
            { template: "<button class=\"btn btn-info\" ng-click=\"printNote(dataItem)\"><img style=\"width:20px;\" alt=\"Image\" src=\"img/receipt.png\"></button><button class=\"btn btn-rose\" style=\"margin-left:5px\" ng-click=\"selectShopCartItem(dataItem)\"><img style=\"width:20px;\" alt=\"Image\" src=\"img/print.png\"></button>", title: " ", width: 133 }
		];

		$scope.dateStart = new Date();
		$scope.dateEnd = undefined;

		dateStartHandler = $scope.$watch('dateStart', function () {
			var dateStart = $scope.dateStart != undefined ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
			var dateEnd = $scope.dateEnd != undefined ? $scope.dateEnd.toString("dd/MM/yyyy") : undefined;


			if (dateStart != currentDateStart || dateEnd != currentDateEnd) {
				currentDateStart = dateStart;
				currentDateEnd = dateEnd;

				$scope.loadValues(dateStart, dateEnd);
			}
		});

		dateEndHandler = $scope.$watch('dateEnd', function () {
			var dateStart = $scope.dateStart != undefined ? $scope.dateStart.toString("dd/MM/yyyy") : new Date().toString("dd/MM/yyyy");
			var dateEnd = $scope.dateEnd != undefined ? $scope.dateEnd.toString("dd/MM/yyyy") : undefined;

			if (dateStart != currentDateStart || dateEnd != currentDateEnd) {
				currentDateStart = dateStart;
				currentDateEnd = dateEnd;

				$scope.loadValues(dateStart, dateEnd);
			}
		});
	}

	$scope.$on("$destroy", function () {
		if (dateStartHandler) dateStartHandler();
		if (dateEndHandler) dateEndHandler();
	});

	$scope.loadValues = function (dateStart, dateEnd) {
		$scope.loading = true;
		if (dateStart && typeof dateStart == "string") { dateStart = Date.parseExact(dateStart, "dd/MM/yyyy") };
		if (dateEnd && typeof dateEnd == "string") { dateEnd = Date.parseExact(dateEnd, "dd/MM/yyyy") };

		zposService.getAllShoppingCartsAsync(dateStart, dateEnd).then(function (shoppingCarts) {
			$scope.gridDatas = new kendo.data.DataSource({
				data: shoppingCarts,
				pageSize: 4,
				sort: {
					field: "Date",
					dir: "desc"
				}
			});
			$scope.loading = false;

		}, function () {
			$scope.loading = false;
		});
	}

	$scope.selectShopCartItem = function (selectedShoppingCart) {
		shoppingCartService.printShoppingCartAsync(selectedShoppingCart, $rootScope.PrinterConfiguration.POSPrinter, true, 1).then(function (msg) {
		}, function (err) {
			sweetAlert("Erreur d'impression !");
		});
	}

	$scope.printNote = function (selectedShoppingCart) {
		shoppingCartModel.printShoppingCartNote(selectedShoppingCart);
	}

	$scope.editShopCartItem = function (selectedShoppingCart) {

		var modalInstance = $uibModal.open({
			templateUrl: 'modals/modalEditShoppingCart.html',
			controller: 'ModalEditShoppingCartController',
			resolve: {
				shoppingCart: function () {
					return selectedShoppingCart;
				}
			},
			backdrop: 'static'
		});

		modalInstance.result.then(function () {

		}, function () {
		});
	}

	$scope.getItemsCount = function (shoppingCart) {
		var itemCount = 0;

		Enumerable.from(shoppingCart.Items).forEach(function (i) {
			itemCount = itemCount + i.Quantity;
		});

		return itemCount;
	}

	$scope.select = function (shoppingCart) {
		$uibModalInstance.close(shoppingCart);
	}

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	}

	$scope.openDateStart = function ($event) {
		$event.preventDefault();
		$event.stopPropagation();

		$scope.dateStartOpened = true;
	}

	$scope.openDateEnd = function ($event) {
		$event.preventDefault();
		$event.stopPropagation();

		$scope.dateEndOpened = true;
	}

	$scope.showZPos = function () {
		var modalInstance = $uibModal.open({
			templateUrl: 'modals/modalZPos.html',
			controller: 'ModalZPosController',
			size: 'max',
			resolve: {
				dateStart: function () {
					return $scope.dateStart;
				},
				dateEnd: function () {
					return $scope.dateEnd;
				}
			}
		});
	}
});