app.controller('ModalClosePosController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService, cashMovementService, zposService,$translate) {

	$scope.init = function () {
		settingService.getPaymentModesAsync().then(function (paymentSetting) {

			var paymentModesAvailable = paymentSetting.ValueObject;
			var dateClose = new Date().toString('dd/MM/yyyy H:mm:ss');

			$scope.closePosValues = {
				HardwareId: $rootScope.PosLog.HardwareId,
				PosUserId: $rootScope.PosUserId,
				Date: dateClose,
				MovementType_Id: 0,
				CashMovementLines: []
			}

			Enumerable.from(paymentModesAvailable).forEach(function (p) {
				var addPaymentMode = {
					PaymentType: p.PaymentType,
					Value: p.Value,
					Text: p.Text,
					Total: 0,
					IsBalance: p.IsBalance
				};

				var lineClosePos = {
					PaymentMode: addPaymentMode,
					Count: 0,
					TotalKnown: 0
				}
				$scope.closePosValues.CashMovementLines.push(lineClosePos);
			});

			zposService.getPaymentValuesAsync().then(function (paymentValues) {
				if (paymentValues) {
					Enumerable.from(paymentValues.PaymentLines).forEach(function (l) {
						var lineClose = Enumerable.from($scope.closePosValues.CashMovementLines).firstOrDefault(function (x) {
							return x.PaymentMode.Value == l.PaymentMode.Value && x.PaymentMode.PaymentType == l.PaymentMode.PaymentType;
						});

						if (lineClose) {
							lineClose.TotalKnown = l.PaymentMode.Total;
						}
					});
				}
			});


		}, function (err) {
			console.log(err);
		});
	}

	$scope.selectMotif = function (motif) {
		$scope.openPosValues.Motif = motif;
	}

	$scope.editCashValues = function (paymentValue) {

		var modalInstance = $uibModal.open({
			templateUrl: 'modals/modalCashValues.html',
			controller: 'ModalCashValuesController',
			size: 'lg',
			backdrop: 'static'
		});

		modalInstance.result.then(function (total) {
			paymentValue.PaymentMode.Total = total;

		}, function () {

		});
	}

	$scope.ok = function () {
	

		swal({ title: $translate.instant("Cloturer la caisse ?"), text: "", type: "warning", showCancelButton: true, confirmButtonColor: "#d83448", confirmButtonText: $translate.instant("Oui"), cancelButtonText: $translate.instant("Non"), closeOnConfirm: true },
            function () {
            	cashMovementService.saveMovementAsync($scope.closePosValues);
            	zposService.purgeZPosAsync(true);

            	$uibModalInstance.close();

            	setTimeout(function () {
            		$rootScope.closeKeyboard();
            		$rootScope.closeKeyboard();
            	}, 500);

            }, function () {
            
            });
	}

	$scope.cancel = function () {
	

		$uibModalInstance.dismiss('cancel');

		setTimeout(function () {
			$rootScope.closeKeyboard();
			$rootScope.closeKeyboard();
		}, 500);
	}
});