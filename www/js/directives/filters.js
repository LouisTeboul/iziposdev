app


.filter('PictureNameToImage', function () {
	return function (input, alt) {
		var res = undefined;

		if (input) {
			var filename = input.SeoFilename;
			res = 'img/' + filename + '.png';
		} else {
			res = alt;
		}

		return res;
	}
})

.filter('CurrencyFormat', function ($rootScope) {
	return function (input) {
		var res = 0;

		if (!input || isNaN(input)) {
			input = 0;
		}

		try{
			res = input.toLocaleString($rootScope.IziPosConfiguration.Currency.DisplayLocale, { style: 'currency', currency: $rootScope.IziPosConfiguration.Currency.CurrencyCode, minimumFractionDigits: ROUND_NB_DIGIT });
		} catch(exRes){}

		if (res == 0 || input.toString() == res) {
			//Pas réussi à déterminer la devise
			if ($rootScope.IziPosConfiguration.Currency.CurrencyCode == "EUR") res = roundValue(input).toFixed(2) + " €";
			if ($rootScope.IziPosConfiguration.Currency.CurrencyCode == "USD") res = "$" + roundValue(input).toFixed(2);
			if ($rootScope.IziPosConfiguration.Currency.CurrencyCode == "CAD") res = "$" + roundValue(input).toFixed(2);
		}

		return res;
	}
})

.filter('RoundedValue', function (settingService) {
	return function (input) {
		var res = 0;

		if (!input || isNaN(input)) {
			input = 0;
		}

		res = roundValue(input).toFixed(2);

		return res;
	}
})

.filter('NullConverter', function () {
	return function (input, defaultValue) {
		var ret = input;

		if (!input || input == null) {
			ret = defaultValue;
		}

		return ret;
	}
})

.filter('PercentFormat', function () {
	return function (input) {
		var res = 0;

		if (!input || isNaN(input)) {
			input = 0;
		}

		res = parseFloat(Math.round(input * 100) / 100).toFixed(2);

		return res;
	}
})

.filter('DateTimeFormat', function () {
	return function (input) {
		var dateOfDay = input.split("T")[0];
		var date = Date.parse(dateOfDay);
		var ret = date.toString('dd/MM/yyyy HH:mm');
		return ret;
	}
})

.filter('DateFormat', function () {
	return function (input) {
		var dateOfDay = input.split("T")[0];
		var date = Date.parse(dateOfDay);
		var ret = date.toString('dd/MM/yyyy');
		return ret;
	}
})

.filter('Truncate', function () {
	return function (input, max) {
		var ret = input;

		if (input && input.length > max) {
			ret = input.substring(0,max-1)+".";
		} else {
			ret = input;
		}

		return ret;
	}
})

.filter('PaymentTypeImg', function () {
	return function (input) {

		var type = input.PaymentType;

		if (!type) {
			type = PaymentType.AUTRE;
		}

		var ret = "img/paymentModes/" + type + ".png";

		return ret;
	}
})

.filter('StepName', function () {
	return function (input, stepNames) {
		var res = "Etape "+input;

		if (stepNames) {
			var name = stepNames[input];
			if (name) {
				res = name.Name;
			}
		}
		
		return res;
	}
})
