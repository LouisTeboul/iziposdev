app.controller('ModalZPosController', function ($scope, $rootScope, $uibModalInstance, zposService, dateStart, dateEnd,$translate) {
	$scope.dateStart = dateStart;
	$scope.dateEnd = dateEnd;
	$scope.zheaders = [];
	$scope.zlines = [];
	$scope.ztotal = [];
	$scope.ztotalET = [];

	$scope.zpos = undefined;

	$scope.init = function () {
		zposService.getZPosValuesAsync($scope.dateStart, $scope.dateEnd).then(function (resZpos) {
			console.log(resZpos);
			$scope.zpos = resZpos;

			//Headers && total
			$scope.zheaders.push("Date");
			$scope.zheaders.push("Nb");
			$scope.zheaders.push("Total");
			$scope.zheaders.push($translate.instant("Couvert(s)"));
			$scope.zheaders.push($translate.instant("Sur place"));
			$scope.zheaders.push($translate.instant("Emporté"));
			$scope.zheaders.push($translate.instant("Livré"));
			$scope.zheaders.push($translate.instant("Avoirs émis"));

            ////Headers TVA
			Enumerable.from(resZpos.taxDetails).forEach(function (tax) {
			    $scope.zheaders.push(tax.taxCode);
			});

		    ////Headers Modes de paiement
			Enumerable.from(resZpos.paymentModes).forEach(function (pm) {
			    var pmTitle = pm.type;

			    if (pm.type.indexOf("-") != -1) {
			        var tmp = pm.type.split("-");
			        pmTitle = "";
			        Enumerable.from(tmp).forEach(function (t) {
			            pmTitle = pmTitle + " " + t[0];
			        });
			        pmTitle = pmTitle.trim().replace(" ", "-");
			    }

			    $scope.zheaders.push(pmTitle);
			});

		    //Values
			var lineValues = [];
			Enumerable.from(resZpos.totalsByDate).forEach(function (line) {
			    var columnValues = [];

			    columnValues.push(Date.parseExact(line.date, "yyyyMMdd").toString("dd/MM/yyyy"));//date
			    columnValues.push(line.count);//nb
			    columnValues.push(line.totalIT);//total

			    //Cutleries
			    var lineCutleries = Enumerable.from(resZpos.cutleries.byDate).firstOrDefault(function (value) { return value.date == line.date; });
			    columnValues.push(lineCutleries ? lineCutleries.count : 0);

			    //Sur place
			    var lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.FORHERE; });
			    var lineTotalForHere = lineForHere ? Enumerable.from(lineForHere.byDate).firstOrDefault(function (value) { return value.date == line.date; }) : undefined;
			    columnValues.push(lineTotalForHere ? lineTotalForHere.total : 0);

			    //Emporté
			    var lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.TAKEOUT; });
			    var lineTotalTakeOut = lineTakeOut ? Enumerable.from(lineTakeOut.byDate).firstOrDefault(function (value) { return value.date == line.date; }) : undefined;
			    columnValues.push(lineTotalTakeOut ? lineTotalTakeOut.total : 0);

			    //Livré
			    var lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.DELIVERY; });
			    var lineTotalDelivery = lineDelivery ? Enumerable.from(lineDelivery.byDate).firstOrDefault(function (value) { return value.date == line.date; }) : undefined;
			    columnValues.push(lineTotalDelivery ? lineTotalDelivery.total : 0);

			    //Avoirs émis
			    var lineCredit = Enumerable.from(resZpos.credit.byDate).firstOrDefault(function (value) { return value.date == line.date; });
			    columnValues.push(lineCredit ? lineCredit.total : 0);

			    //Taxes
			    Enumerable.from(resZpos.taxDetails).forEach(function (tax) {
			        var lineTax = Enumerable.from(tax.byDate).firstOrDefault(function (value) { return value.date == line.date; });
			        columnValues.push(lineTax ? roundValue(lineTax.total) : 0);
			    });

			    //PaymentModes
			    Enumerable.from(resZpos.paymentModes).forEach(function (pm) {
			        var linePM = Enumerable.from(pm.byDate).firstOrDefault(function (value) { return value.date == line.date; });
			        columnValues.push(linePM ? linePM.total : 0);
			    });

			    lineValues.push(columnValues);

			});

			$scope.zlines = lineValues;


			//TotalIT
			$scope.ztotal.push("Total");
			$scope.ztotal.push(resZpos.count);
			$scope.ztotal.push(resZpos.totalIT);
			$scope.ztotal.push(resZpos.cutleries.count);

			var lineForHere = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.FORHERE; });
			$scope.ztotal.push(lineForHere ? lineForHere.total : 0);

			var lineTakeOut = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.TAKEOUT; });
			$scope.ztotal.push(lineTakeOut ? lineTakeOut.total : 0);

			var lineDelivery = Enumerable.from(resZpos.deliveryValues).firstOrDefault(function (value) { return value.type == DeliveryTypes.DELIVERY; });
			$scope.ztotal.push(lineDelivery ? lineDelivery.total : 0);

			$scope.ztotal.push(resZpos.credit.total);

			while ($scope.ztotal.length < $scope.zheaders.length) {
			    $scope.ztotal.push("");
			}

			//TotalET
			$scope.ztotalET.push($translate.instant("Total HT"));
			$scope.ztotalET.push("");
			$scope.ztotalET.push(resZpos.totalET);
			while ($scope.ztotalET.length < $scope.zheaders.length) {
			    $scope.ztotalET.push("");
			}


		});
	}

	$scope.cancel = function () {
		$uibModalInstance.dismiss('cancel');
	}

	$scope.printZPos = function () {
		zposService.printZPosAsync($scope.zpos);
	}

	$scope.emailZPos = function () {
		zposService.emailZPosAsync($scope.zpos);
	}

});