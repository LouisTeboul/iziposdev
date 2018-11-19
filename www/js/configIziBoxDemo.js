let config = undefined;
let defaultConfig = undefined;

app.getConfigIziBoxAsync = function ($rootScope, $q, $http, ipService, $translate, $location) {
	let configDefer = $q.defer();

	const defaultConfig = {
		UrlSmartStoreApi: undefined,
		UrlCouchDb: undefined,
		IdxCouchDb: undefined,
		RestPort: 8080,
		LocalIpIziBox: undefined,
		UseFID: false,
		ConfirmPrint: false,
		CanFreezeShoppingCart: false,
		UseProdPrinter: false,
		UseTable: false,
		StoreId: undefined,
		UseCashMovement: false,
		LoginRequired: false,
		LoginTimeout: 0
	};

	setTimeout(function () {
		configDefer.resolve(defaultConfig);
	}, 200);

	return configDefer.promise;
};