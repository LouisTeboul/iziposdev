app.controller('MiniBasketController', ['$scope', '$rootScope', '$state', '$uibModal', '$timeout', '$filter', 'settingService', 'shoppingCartService', 'productService', 'shoppingCartModel', 'posUserService', 'orderShoppingCartService', 'taxesService', '$translate',
	function ($scope, $rootScope, $state, $uibModal, $timeout, $filter, settingService, shoppingCartService, productService, shoppingCartModel, posUserService, orderShoppingCartService, taxesService, $translate) {
		var deliveryTypeHandler = undefined;
		var itemsHandler = undefined;
		var accordionHandler = undefined;
		var loyaltyHandler = undefined;
		var orderServiceHandler = undefined;
		var currentShoppingCartUpdatedHandler = undefined;

		$scope.filter = $filter;

		$scope.DeliveryTypes = DeliveryTypes;

		$scope.totalDivider = 1;

		$scope.shoppingCartQueue = [];
		//#region Controller init
		/**
		* Initialize controller
		*/
		$scope.init = function () {
            $scope.viewmodel = {};
            $scope.TimeOffset = $rootScope.IziBoxConfiguration.OrdersPrepareMinutes;

			updateCurrentShoppingCart();


			//ResizeEvent
			window.addEventListener('resize', function () {
				resizeMiniBasket();
			});

			$scope.tempStep = 0;
			$scope.deliveryType = shoppingCartModel.getDeliveryType();

			$scope.accordionStatus = {
				paiementOpen: false,
				ticketOpen: true
			};

			// BUGFIX: The loyalty div was modified after the miniBasketResize()            
			$scope.$watch(function () {
				return document.getElementById("loyaltyRow").clientHeight;
			}, function () {
				resizeMiniBasket();
			});

			currentShoppingCartHandler = $scope.$watchCollection('currentShoppingCart', function () {
				if ($scope.currentShoppingCart) {
					$scope.filteredTaxDetails = taxesService.groupTaxDetail($scope.currentShoppingCart.TaxDetails);
					$scope.$evalAsync();
				}
			});

			deliveryTypeHandler = $scope.$watch('deliveryType', function () {
				shoppingCartModel.setDeliveryType($scope.deliveryType);
			});

			accordionHandler = $scope.$watch('accordionStatus.ticketOpen', function () {
				setTimeout(resizeMiniBasket, 500);
			});

			loyaltyHandler = $scope.$watch('currentShoppingCart.customerLoyalty', function () {
				resizeMiniBasket();
			});

			if ($rootScope.IziBoxConfiguration.StepEnabled) {
				settingService.getStepNamesAsync().then(function (stepNames) {
					$scope.stepNames = stepNames;
				});
			}

			orderServiceHandler = $rootScope.$on('orderShoppingCartChanged', function () {
				$scope.initOrder();
			});
		};

		$scope.initOrder = function () {
			$scope.orders = orderShoppingCartService.orders;
			$scope.ordersInProgress = orderShoppingCartService.ordersInProgress;
		};


		$scope.setDeliveryType = function (value) {
			$scope.deliveryType = value;
			$scope.$evalAsync();
		};

		var updateCurrentShoppingCart = function () {
			$scope.totalDivider = 1;
			$scope.filteredTaxDetails = undefined;

			if (itemsHandler) itemsHandler();

            $scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();
            $scope.viewmodel.lastShoppingCart = shoppingCartModel.getLastShoppingCart();
            $scope.$evalAsync();

			if ($scope.currentShoppingCart) {
				$scope.deliveryType = shoppingCartModel.getDeliveryType();
				updateBalancePassages();

				itemsHandler = $scope.$watchCollection('currentShoppingCart.Items', function () {
					updateCurrentLines();
				});
			}

			shoppingCartModel.calculateLoyalty();
			resizeMiniBasket();
		};

		var updateCurrentLines = function () {
			if (!$scope.currentShoppingCart) {
				$scope.shoppingCartLines = undefined;
			} else {
				if ($rootScope.IziBoxConfiguration.StepEnabled) {
					var groupedLinesStep = [];

					var addItemToStep = function (item, step) {
						//On recherche si le step existe déjà
						var currentLine = Enumerable.from(groupedLinesStep).firstOrDefault("line => line.Step == " + step);

						//Si il n'existe pas on créer le step
						if (!currentLine) {
							currentLine = { Step: step, Items: [] };
							groupedLinesStep.push(currentLine);
						}

						//Si le step ne contient pas déjà l'item, on l'ajoute
						if (currentLine.Items.indexOf(item) == -1) {
							currentLine.Items.push(item);
						}
					};


					Enumerable.from($scope.currentShoppingCart.Items).forEach(function (item) {
						//Formule
                        if (item.Attributes && item.Attributes.length > 0) {
							Enumerable.from(item.Attributes).forEach(function (attr) {
								addItemToStep(item, attr.Step);
							});
						} else {
							addItemToStep(item, item.Step);
						}
					});

					//Tri des lignes par no de step
					var lastStep = Enumerable.from(groupedLinesStep).select("x=>x.Step").orderByDescending().firstOrDefault();

					if (!lastStep || lastStep < $scope.currentShoppingCart.CurrentStep) {
						lastStep = $scope.currentShoppingCart.CurrentStep;
					}

					for (var s = lastStep; s >= 0; s--) {
						var lineExists = Enumerable.from(groupedLinesStep).any("line => line.Step == " + s);
						if (!lineExists) {

							groupedLinesStep.push({ Step: s, Items: [] });
						}
					}

					$scope.shoppingCartLines = Enumerable.from(groupedLinesStep).orderBy("x => x.Step").toArray();

				} else {

					$scope.shoppingCartLines = [];
					$scope.shoppingCartLines.push({ Step: 0, Items: $scope.currentShoppingCart.Items });
				}
			}

			$scope.$evalAsync();
		};

		/**
		 * Events on ShoppingCartItem
		 */
		var shoppingCartChangedHandler = $rootScope.$on('shoppingCartChanged', function (event, args) {
			updateCurrentShoppingCart();
		});

		var shoppingCartStepChangedHandler = $rootScope.$on('shoppingCartStepChanged', function (event, shoppingCart) {
			updateCurrentLines();

			$timeout(function () {
				var selectedStep = document.getElementById("step" + shoppingCart.CurrentStep);

				if (selectedStep) {
					selectedStep.scrollIntoView(false);
				}
			}, 250);

		});

		var shoppingCartClearedHandler = $rootScope.$on('shoppingCartCleared', function (event, args) {
			$scope.currentShoppingCart = undefined;
			$scope.balancePassages = undefined;
			$scope.filteredTaxDetails = undefined;
			$scope.accordionStatus.paiementOpen = false;
            $scope.accordionStatus.ticketOpen = true;
            $scope.viewmodel.lastShoppingCart = shoppingCartModel.getLastShoppingCart();
            $scope.$evalAsync();
		});

		var shoppingCartItemAddedHandler = $rootScope.$on('shoppingCartItemAdded', function (event, args) {
			resizeMiniBasket();

			var updatedItemElem = document.getElementById("itemRow" + args.hashkey);

			if (updatedItemElem) {
				updatedItemElem.scrollIntoView(false);
			}
		});

		var shoppingCartItemRemovedHandler = $rootScope.$on('shoppingCartItemRemoved', function (event, args) {
			resizeMiniBasket();
		});

		/**
		 * Events on payment modes
		 */
		var paymentModesAvailableChangedHandler = $rootScope.$on('paymentModesAvailableChanged', function (event, args) {
			if (args) {
				args = Enumerable.from(args).orderBy("x => x.PaymentType").toArray();
			}
			$scope.paymentModesAvailable = args;
			resizeMiniBasket();
		});

		var paymentModesChangedHandler = $rootScope.$on('paymentModesChanged', function (event, args) {
			resizeMiniBasket();
		});

		/**
		 * Events on fid
		 */
		var customerLoyaltyChangedHandler = $rootScope.$on('customerLoyaltyChanged', function (event, args) {
			updateBalancePassages();
			resizeMiniBasket();
		});

		var shoppingCartDiscountChangedHandler = $rootScope.$on('shoppingCartDiscountRemoved', function (event, args) {
			//
			resizeMiniBasket();
		});

		$scope.$on("$destroy", function () {
			if (deliveryTypeHandler) deliveryTypeHandler();
			if (itemsHandler) itemsHandler();
			if (accordionHandler) accordionHandler();
			if (loyaltyHandler) loyaltyHandler();
			shoppingCartChangedHandler();
			shoppingCartClearedHandler();
			shoppingCartItemAddedHandler();
			shoppingCartItemRemovedHandler();
			paymentModesAvailableChangedHandler();
			paymentModesChangedHandler();
			customerLoyaltyChangedHandler();
			orderServiceHandler();
			currentShoppingCartUpdatedHandler();
		});

		//#endregion

		//#region Actions on item
		$scope.incrementQuantity = function (cartItem) {
			shoppingCartModel.incrementQuantity(cartItem);
		};

		$scope.decrementQuantity = function (cartItem) {
			shoppingCartModel.decrementQuantity(cartItem);
		};

		$scope.removeItem = function (cartItem) {
			shoppingCartModel.removeItem(cartItem);
		};

		$scope.chooseOffer = function (cartItem) {
            console.log(cartItem);
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalChooseOffer.html',
                controller: 'ModalChooseOfferController',
                backdrop: 'static',
                resolve: {
                    defaultValue: function () {
                        return true;
                    }
                }
            });

            modalInstance.result.then(function (result) {
				if(result.action.localeCompare("Offer") == 0){
					//Offer
                    shoppingCartModel.offerItem(cartItem);


				} else if(result.action.localeCompare("Discount") == 0){
					//Discount
					if(result.type.localeCompare("item") == 0){
                        shoppingCartModel.addCartItemDiscount(cartItem, result.montant, result.isPercent);
					}

                    if(result.type.localeCompare("line") == 0){
                        shoppingCartModel.addCartLineDiscount(cartItem, result.montant, result.isPercent);

                    }

				}
                shoppingCartModel.calculateTotal();
                shoppingCartModel.calculateLoyalty();
                resizeMiniBasket();
            }, function () {
                console.log('Erreur');
            });
		};

        $scope.removeOffer = function (cartItem){
        	console.log(cartItem);
        	cartItem.DiscountET = 0;
        	cartItem.DiscountIT = 0;
            shoppingCartModel.calculateTotal();
            shoppingCartModel.calculateLoyalty();
		};


		$scope.editMenu = function (cartItem) {
			shoppingCartModel.editMenu(cartItem);
		};

		$scope.editComment = function (cartItem) {
			shoppingCartModel.editComment(cartItem);
		};
		//#endregion

		//#region Phone Order Action

		$scope.pickTime = function(){
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalPhoneOrderTime.html',
                controller: 'ModalPhoneOrderTimeController',
                resolve: {
                	currentTimeOffset : function(){
                		return $scope.TimeOffset;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then(function (model) {
            	console.log(model);
                console.log("On a finit");
                if(60 * model.heure + model.minute >= $rootScope.IziBoxConfiguration.OrdersPrepareMinutes){
                    $scope.TimeOffset = 60 * model.heure + model.minute;
				} else {
                    $scope.TimeOffset = $rootScope.IziBoxConfiguration.OrdersPrepareMinutes;
				}
            }, function () {
            	console.log("On a cancel");
            });

        };


        $scope.setShoppingCartTime = function(){
            $scope.currentShoppingCart.DatePickup = new Date().addMinutes($scope.TimeOffset).toString("dd/MM/yyyy HH:mm:ss");
            $scope.currentShoppingCart.id = new Date().addMinutes($scope.TimeOffset).getTime();
        };

        $scope.minutesToDisplay = function(minutes){
            var minutesDisp = 0;
            var heuresDisp = 0;
            var retour = "";
            if(minutes >= 60){
                heuresDisp =  Math.trunc(minutes / 60);
                minutesDisp = minutes % 60;
                retour = heuresDisp + "h" + minutesDisp +"min";

            } else {
                minutesDisp = minutes;
                retour = minutesDisp +"min";
            }

            return retour;

        };

        //#endregion


		//#region Payments
		$scope.removePayment = function (selectedPaymentMode) {

			//reset des tickets resto
            if (selectedPaymentMode.PaymentType == PaymentType.TICKETRESTAURANT) {
				shoppingCartModel.removeTicketRestaurantFromCart();
			}
			selectedPaymentMode.Total = 0;
			shoppingCartModel.setPaymentMode(selectedPaymentMode);
		};

		$scope.removeBalanceUpdate = function () {
			shoppingCartModel.removeBalanceUpdate();
		};

		$scope.selectPaymentMode = function (selectedPaymentMode) {

			// Attention à la fonction d'arrondi
			var customValue = $scope.totalDivider > 1 ? parseFloat((Math.round($scope.currentShoppingCart.Total / $scope.totalDivider * 100) / 100).toFixed(2)) : undefined;

			shoppingCartModel.selectPaymentMode(selectedPaymentMode, customValue, $rootScope.IziPosConfiguration.IsDirectPayment);
		};

		$scope.splitShoppingCart = function () {
            if($scope.currentShoppingCart && $scope.currentShoppingCart.Items.length > 0) {
                if (posUserService.isEnable('SPLIT')) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalShoppingCartSplit.html',
                        controller: 'ModalShoppingCartSplitController',
                        backdrop: 'static',
                        size: 'lg',
                        resolve: {
                            defaultValue: function () {
                                return true;
                            }
                        }
                    });
                }
            }
		};

		$scope.divideTotal = function () {
			if($scope.currentShoppingCart && $scope.currentShoppingCart.Items.length > 0) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalTotalDivider.html',
                    controller: 'ModalTotalDividerController',
                    resolve: {
                        currentTotalDivider: function () {
                            return $scope.totalDivider;
                        }
                    },
                    size: 'sm',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (divider) {

                	$scope.totalDivider = divider;

                	/*
                    shoppingCartModel.createDividedShoppingCartsAsync($scope.currentShoppingCart, divider).then(function(spq){
                        $scope.shoppingCartQueue = spq;
                        shoppingCartModel.setCurrentShoppingCart($scope.shoppingCartQueue[$scope.shoppingCartQueue.length -1]);
                    });
                    */

                }, function () {
                	console.log('cancel divider');
                });
			}
		};
		//#endregion

		//#region Actions on cart
		$scope.addStep = function () {
			shoppingCartModel.nextStep();
		};

		$scope.selectStep = function (step) {
			shoppingCartModel.setStep(step);
		};

		$scope.unfreezeShoppingCart = function () {
			shoppingCartModel.unfreezeShoppingCart();
		};

		$scope.freezeShoppingCart = function () {
            if($rootScope.PhoneOrderMode){
            	if($scope.currentShoppingCart.Items.length > 0){
                    if($scope.currentShoppingCart.Residue == 0){
                        $scope.currentShoppingCart.isPayed = true;
                    }
                    $scope.setShoppingCartTime();
                    $rootScope.PhoneOrderMode = false;
                    shoppingCartModel.freezeShoppingCart();
				} else {
                    swal("Le ticket doit contenir au moins un produit !");
            		return;
				}
            } else {
                shoppingCartModel.freezeShoppingCart();
			}

		};

		$scope.validShoppingCart = function (ignorePrintTicket) {
			shoppingCartModel.validShoppingCart(ignorePrintTicket);
		};

		$scope.openModalDelivery = function (parameter) {
			shoppingCartModel.openModalDelivery(parameter);
		};

		$scope.openCustomActionModal = function () {
			shoppingCartModel.openCustomActionModal();
		};

		$scope.printProdShoppingCart = function () {
			if ($scope.currentShoppingCart != undefined && $scope.currentShoppingCart.Items.length > 0) 
			{				
				shoppingCartModel.printProdShoppingCart();
			}
		};

		$scope.printStepProdShoppingCart = function () {
			if ($scope.currentShoppingCart != undefined && $scope.currentShoppingCart.Items.length > 0) 
			{		
				shoppingCartModel.printStepProdShoppingCart();
			}
		};

		$scope.cancelShoppingCart = function () {
			//Impossible de supprimer le shopping cart si il contient des item splitté
			// TODO: Logger action
			if (posUserService.isEnable('DELT')) {
				swal({ title: $translate.instant("Supprimer le ticket ?"), text: "", type: "warning", showCancelButton: true, confirmButtonColor: "#d83448", confirmButtonText: $translate.instant("Oui"), cancelButtonText: $translate.instant("Non"), closeOnConfirm: true },
					function () {
						$scope.shoppingCartQueue = [];
						shoppingCartModel.cancelShoppingCartAndSend();
					});
			}			
		};
		//#endregion

		//#region Discount
		$scope.removeShoppingCartDiscount = function (item) {
			shoppingCartModel.removeShoppingCartDiscount(item);
		};
		//#endregion

		//#region FID
		$scope.openClientModal = function () {
			var modalInstance = $uibModal.open({
				templateUrl: 'modals/modalCustomer.html',
				controller: 'ModalCustomerController',
				backdrop: 'static',
				size: 'lg'
			});
		};

		$scope.chooseRelevantOffer = function () {
			shoppingCartModel.chooseRelevantOffer();
		};

		var updateBalancePassages = function () {
			if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.Balances) {
				$scope.balancePassages = Enumerable.from($scope.currentShoppingCart.customerLoyalty.Balances).firstOrDefault(function (b) {
					return b.BalanceType == "Passages";
				});

				resizeMiniBasket();
			} else {
				$scope.balancePassages = undefined;
			}
		};
		//#endregion

		//#region Misc
		
		/**
		 * Refresh the miniBasket
		 * */
		var resizeMiniBasket = function () {
			var miniBasketDiv = document.getElementById("miniBasket");

			if (miniBasketDiv) {
				var height = miniBasketDiv.parentElement.clientHeight;

				var textFieldHeight = 38;
				var totalHeight = 62;
				var headerHeight = 42 * 2;
				var switchHeight = 43;
				var divHeight = 0;
				var marginHeight = 30;

				var miniBasketItemsDiv = document.getElementById("miniBasketItems");
				var miniBasketInfosDiv = document.getElementById("miniBasketInfos");
				var buttonBarDiv = document.getElementById("buttonbar");
				var loyaltyRowDiv = document.getElementById("loyaltyRow");
				var paymentModesDiv = document.getElementById("paymentModes");

				if (buttonBarDiv) {
					divHeight = buttonBarDiv.clientHeight;
				}

				if (loyaltyRowDiv) {
					divHeight += loyaltyRowDiv.clientHeight;
				}

				if (paymentModesDiv) {
					divHeight += paymentModesDiv.clientHeight;
				}

				var itemsHeight = height - textFieldHeight - switchHeight - totalHeight - headerHeight - divHeight - marginHeight;

				if (miniBasketItemsDiv) {
					miniBasketItemsDiv.style.maxHeight = itemsHeight + "px";
				}

				if (miniBasketInfosDiv) {
					miniBasketInfosDiv.style.maxHeight = itemsHeight + "px";
				}
			}

		};
		//#endregion

		$scope.selectTable = function () {
			shoppingCartModel.selectTableNumber();
		};

		$scope.isMenuDisable = function (item) {
			var ret = Enumerable.from(item.Attributes).any('attr=>attr.Printed') || item.IsFree || item.Product.ProductAttributes.length == 0;
			return (false);
			return (ret);
		};

		/** Clear the loyalty info linked to the ticket */
		$scope.removeLoyaltyInfo = function () {
			//Une commande telephonique est forcement lié a un client
			//Si on supprime, un client, on sort donc du mode commande telephonique
            $rootScope.PhoneOrderMode = false;
			// Il faut suppr les paymentModesAvailable lié a la fid
            console.log($scope.paymentModesAvailable);
            $scope.paymentModesAvailable = $scope.paymentModesAvailable.filter(function(pma){
            	return !pma.IsBalance;
			});
            $rootScope.$emit('paymentModesAvailableChanged', $scope.paymentModesAvailable);
			$scope.currentShoppingCart.customerLoyalty = null;
			$rootScope.$emit("customerLoyaltyChanged", $scope.currentShoppingCart.customerLoyalty);
			$rootScope.$emit("shoppingCartChanged", $scope.currentShoppingCart);
			resizeMiniBasket();
		}
	}
]);