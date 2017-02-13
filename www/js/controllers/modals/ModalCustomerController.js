app.controller('ModalCustomerController', function ($scope, $rootScope,$q, $uibModalInstance, $uibModal, shoppingCartService, ngToast,  shoppingCartModel) {

    var current = this;
    $scope.registerOperation = "getEmail"; // for display
   
	$scope.init = function () {
		$scope.searchResults = [];
		$scope.barcode = {};
		$scope.firstName;
		$scope.lastName;
		$scope.email;
		$scope.clientSelected = false;
		
		$scope.newLoyalty = {            
		};
		$scope.isLoyaltyEnabled = {
			value: 'Fid'
		};

		$scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
		$scope.clientUrl = $rootScope.IziBoxConfiguration.UrlSmartStoreApi.replace("/api", "");
	}



	//Recherche de client par nom, prénom ou email
	$scope.searchForCustomer = function (query) {
		shoppingCartService.searchForCustomerAsync(query).then(function (res) {
			$scope.searchResults = res;
		}, function () {
			$scope.searchResults = [];
		});
	};

	// Ajoute les infos du clients au shoppingCart
	$scope.selectCustomer = function (barcode) {        
		barcode = barcode.trim();
		if (barcode) {
			shoppingCartService.getLoyaltyObjectAsync(barcode).then(function (loyalty) {
				if (loyalty) {
					if ($scope.currentShoppingCart == undefined) {
						shoppingCartModel.createShoppingCart();
					}
					$scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
				   
					$scope.currentShoppingCart.Barcode = barcode;
					$scope.currentShoppingCart.customerLoyalty = loyalty;
					$rootScope.$emit("customerLoyaltyChanged", loyalty);
					$rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);                    
					$scope.$evalAsync();
					$scope.clientSelected = true;
					//$uibModalInstance.close();
				} else {
					sweetAlert($translate.instant("Carte de fidélité introuvable !"));
				}
			}, function (err) {
				console.log(err);
				sweetAlert($translate.instant("Le serveur de fidélité n'a pas répondu !"));
			});
		}
	}

	//Scanne la carte du client
	$scope.scanBarcode = function () {
		try {
			cordova.plugins.barcodeScanner.scan(
			function (result) {
				$scope.newLoyalty.barcode.barcodeValue = result.text;
			},
			function (error) {
			}
			);
		} catch (err) {
			var modalInstance = $uibModal.open({
				templateUrl: 'modals/modalBarcodeReader.html',
				controller: 'ModalBarcodeReaderController',
				backdrop: 'static'
			});

			modalInstance.result.then(function (value) {
				$scope.newLoyalty.barcode.barcodeValue = value;
				
			}, function () {
			});
		}
	}

    
	$scope.changeOperation = function (strOperation){
	    $scope.registerOperation = strOperation;
	    console.log(strOperation);
	}

	$scope.ok = function () {

        // Pas d'enregistrement si un client est sélectionné
	    if ($scope.clientSelected == true) {
	        $uibModalInstance.close();
	        return;
	    }

		//Si pas d'infos saisie pour les mails- aucune opération
	    if ($scope.newLoyalty.CustomerEmail == '' || $scope.newLoyalty.CustomerEmail == undefined) {
	            $uibModalInstance.close();
	            return;			
		}		

		//on récupère le ticket courant
		var curShoppingCart = shoppingCartModel.getCurrentShoppingCart();

		if (curShoppingCart == undefined) {
			shoppingCartModel.createShoppingCart();
		}

		curShoppingCart = shoppingCartModel.getCurrentShoppingCart();        

		//si la case fidélité est coché on enregistre le client    
		if ($scope.registerOperation == "registerFid") {
		    try {
		       // var loyalty;

                //On récupère le loyalty si il existe 
		        if ($scope.newLoyalty.barcode.barcodeValue) {

		            shoppingCartService.getLoyaltyObjectAsync($scope.newLoyalty.barcode.barcodeValue).then(function (loyalty) {

		                if (!loyalty) {
		                    loyalty = $scope.newLoyalty;
		                } else {
		                    //On associe le client à la carte		                    
		                    loyalty.CustomerEmail = $scope.newLoyalty.CustomerEmail;
		                    loyalty.CustomerFirstName = $scope.newLoyalty.CustomerFirstName;
		                    loyalty.CustomerLastName = $scope.newLoyalty.CustomerLastName;                            
		                }

		                //On enregistre le client 
		                shoppingCartService.registerCustomerAsync(loyalty);

		                // On ajoute la fidélité au ticket
		                curShoppingCart.customerLoyalty = loyalty;
		                $rootScope.$emit("customerLoyaltyChanged", $scope.newLoyalty);
		                $rootScope.$emit("shoppingCartChanged", curShoppingCart);		                
		            });         
		        }
		        else {
		            ngToast.create({
		                className: 'info',
		                content: 'le code barre n\'est pas renseigné',
		                dismissOnTimeout: true,
		                timeout: 10000,
		                dismissOnClick: true
		            });

		            return;		            
		        }               
			}
			catch (err) {			
			    ngToast.create({
			        className: 'danger',
			        content: '<b>Impossible d\'enregistrer le client</b>',
			        dismissOnTimeout: true,
			        timeout: 10000,
			        dismissOnClick: true
			    });
			}
		}

		if ($scope.registerOperation == "getEmail") {		 
		    curShoppingCart.customerLoyalty = $scope.newLoyalty;
		    $rootScope.$emit("customerLoyaltyChanged", $scope.newLoyalty);
		    $rootScope.$emit("shoppingCartChanged", curShoppingCart);
		    
		    ngToast.create({
		        className: 'info',
		        content: 'le mail ' + $scope.newLoyalty.CustomerEmail + 'a été ajouté au ticket',
		        dismissOnTimeout: true,
		        timeout: 10000,
		        dismissOnClick: true
		    });
		}

		$uibModalInstance.close();
		return;	   
		
	}

	$scope.close = function () {
		$uibModalInstance.close();
	}

	//Fid


	/** @function containsBalanceType
	* Retourne si les offres de fid contiennent le type de balance en paramètre */
	$scope.containsBalanceType = function (balanceType) {
		var ret = false;

		if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.Balances && $scope.currentShoppingCart.customerLoyalty.Balances.length > 0) {
			ret = Enumerable.from($scope.currentShoppingCart.customerLoyalty.Balances).any(function (balance) {
				return balance.BalanceType == balanceType;
			});
		}

		return ret;
	};

	$scope.getDate = function (date) {
		return new Date(date);
	};

	$scope.getTotalPositiveHistory = function (history, balance) {
		var total = 0;
		for (var i = 0; i < history.length; i++) {
			total += history[i].Value > 0 && history[i].BalanceType_Id == balance.BalanceType_Id ? history[i].Value : 0;
		}
		return balance.UseToPay ? roundValue(total) : total;
	};

	$scope.addPassage = function () {
		$scope.isAddingPassage = true;
		var passageObj = createEmptyPassageObj();
		shoppingCartService.addPassageAsync(passageObj).then(function (res) {
			customAlert($translate.instant("Un passage a été ajouté"));
		});
	};

	$scope.clickAction = function (actionId, isTiles) {
		$scope.currentShoppingCart.customerLoyalty.customAction = actionId;
		$scope.useAction(true);
	}

	$scope.useAction = function (isTiles) {

		var amount = $('#orderAmountInput').val();
		// If the amount is mandatory
		if ($scope.currentShoppingCart.customerLoyalty.CustomActionMandatoryAmount && (amount == null || amount == undefined || amount === "")) {
			customAlert($translate.instant("Veuillez saisir") + " " + ($scope.currentShoppingCart.customerLoyalty.OneRuleWithOrderAmountString ? $scope.currentShoppingCart.customerLoyalty.OneRuleWithOrderAmountString : $translate.instant("Montant d'achat")));
		}
		else {
			$scope.isUsingAction = true;
			customConfirm($translate.instant("Voulez-vous effectuer cette action ?"), "", function (isAccept) {
				if (isAccept) {
					var passageObj = createEmptyPassageObj();
					if (amount != null && amount != undefined && amount != "") {
						passageObj.OrderTotalIncludeTaxes = amount;
						passageObj.OrderTotalExcludeTaxes = amount;
					}
					if (isTiles) {
						passageObj.CustomAction = {
							"CustomActionId": $scope.currentShoppingCart.customerLoyalty.customAction
						};
					} else {
						passageObj.CustomAction = {
							"CustomActionId": $('#actionSelect').val()
						};
					}
					$log.info(passageObj);

					shoppingCartService.addPassageAsync(passageObj).success(function () {
						customAlert($translate.instant("Action exécutée"));
					});
				} else {
					$scope.isUsingAction = false;
				}
			});
		}

	};

	var customAlert = function(newTitle, newText, callback) {
		swal({
			title: newTitle,
			text: newText,
			showCancelButton: false,
			confirmButtonColor: "#28A54C",
			confirmButtonText: "OK",
			closeOnCancel: false,
			closeOnConfirm: true
		}, callback);
	}

	var customConfirm = function(newTitle, newText, callback) {
		swal({
			title: newTitle,
			text: newText,
			showCancelButton: true,
			confirmButtonColor: "#28A54C",
			confirmButtonText: $translate.instant("Oui"),
			cancelButtonText: $translate.instant("Non"),
			closeOnCancel: true,
			closeOnConfirm: true
		}, callback);
	};

	var createEmptyPassageObj = function () {
		return {
			"Login": null,
			"Password": null,
			"Key": null,
			"Barcode": $scope.currentShoppingCart.customerLoyalty.Barcodes[0].Barcode,
			"CustomerFirstName": $scope.currentShoppingCart.customerLoyalty.CustomerFirstName,
			"CustomerLastName": $scope.currentShoppingCart.customerLoyalty.CustomerLastName,
			"CustomerEmail": $scope.currentShoppingCart.customerLoyalty.CustomerEmail,
			"OrderTotalIncludeTaxes": 0,
			"OrderTotalExcludeTaxes": 0,
			"CurrencyCode": "EUR",
			"Items": [],
			"BalanceUpdate": {},
			"OrderSpecificInfo": "2"
		};
	};

});