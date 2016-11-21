app.controller('MiniBasketController', function ($scope, $rootScope, $state, $uibModal, $timeout,$filter, settingService, shoppingCartService, productService, shoppingCartModel, posUserService, settingService, orderShoppingCartService,taxesService, $translate) {
	var deliveryTypeHandler = undefined;
	var itemsHandler = undefined;
	var accordionHandler = undefined;
	var loyaltyHandler = undefined;
	var orderServiceHandler = undefined;
	$scope.filter = $filter;

	$scope.DeliveryTypes = DeliveryTypes;

	$scope.totalDivider = 1;
    //#region Controller init
    /**
    * Initialize controller
    */
    $scope.init = function () {
        
        updateCurrentShoppingCart();
        

        //ResizeEvent
        window.addEventListener('resize', function () {
            resizeMiniBasket();
        });

        $scope.viewmodel = {};
        $scope.tempStep = 0;
        $scope.deliveryType = shoppingCartModel.getDeliveryType();

        $scope.accordionStatus = {
            paiementOpen: false,
            ticketOpen : true
        }

        deliveryTypeHandler = $scope.$watch('deliveryType', function () {
        	//alert($scope.deliveryType);
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
    }

    $scope.setDeliveryType = function (value) {
    	$scope.deliveryType = value;
    	$scope.$evalAsync();
    }

    var updateCurrentShoppingCart = function () {
        $scope.totalDivider = 1;
        $scope.filteredTaxDetails = undefined;

    	if (itemsHandler) itemsHandler();

    	$scope.currentShoppingCart = shoppingCartModel.getCurrentShoppingCart();

    	if ($scope.currentShoppingCart) {
    		$scope.deliveryType = shoppingCartModel.getDeliveryType();
    		updateBalancePassages();

    		itemsHandler = $scope.$watchCollection('currentShoppingCart.Items', function () {
    			updateCurrentLines();
    		});
    	}

    	resizeMiniBasket();
    }

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
    	        }


    	        Enumerable.from($scope.currentShoppingCart.Items).forEach(function (item) {
                    //Formule
    		        if(item.Attributes){
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


    			//var linesStep = [];
    			//var step = -1;

    			////Récupération de la 1ere étape du ticket
    			//var firstStep = Enumerable.from(groupedLinesStep).select("x=>x.Step").firstOrDefault();

    			////Création des lignes d'étape à insérer dans la collection de lignes ticket.
    			//for (var idx = 0; idx < groupedLinesStep.length; idx++) {
    			//    var line = groupedLinesStep[idx];
    			//	if (line.Step != step) {
    			//		if (line.Step - step > 1) {
    			//			for (var inStep = line.Step - step - 1; inStep > 0 ; inStep--) {
    			//			    var inlineStep = { idx: idx, data: { isStep: true, stepNumber: groupedLinesStep[idx].Step - inStep } };
    			//				linesStep.push(inlineStep);
    			//			}
    			//		}

    			//		var lineStep = { idx: idx, data: { isStep: true, stepNumber: groupedLinesStep[idx].Step } };
    			//		linesStep.push(lineStep);

    			//		step = line.Step;
    			//	}
    			//}

    			////Insertion des lignes d'étapes
    			//Enumerable.from(linesStep).orderByDescending().forEach(function (lineStep) {
    			//    if (groupedLinesStep.length > 0) {
    			//        groupedLinesStep.splice(lineStep.idx, 0, lineStep.data);
    			//	}
    			//});


    			////Insertion des dernières lignes d'étapes sans items
    			//if (step < $scope.currentShoppingCart.CurrentStep) {
    			//	for (var idx = step+1; idx <= $scope.currentShoppingCart.CurrentStep; idx++) {
    			//	    groupedLinesStep.push({ isStep: true, stepNumber: idx });
    			//	}
    			//}

    	        ////Mise à plat de la collection
    			//$scope.shoppingCartLines = [];
    			//Enumerable.from(groupedLinesStep).forEach(function (line) {
                    
    			//    if (line.isStep) {
    			//        $scope.shoppingCartLines.push(line);
     			//    } else {
    			//        Enumerable.from(line.Items).forEach(function(item){
    			//            $scope.shoppingCartLines.push(item);
     			//        });
    			//    }
    			//});
				
    		} else {
    	        $scope.shoppingCartLines = [];
    	        $scope.shoppingCartLines.push({Step:0, Items: $scope.currentShoppingCart.Items});
    		}
    	}

    	$scope.$evalAsync();
    }

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
        $scope.accordionStatus.paiementOpen = false;
        $scope.accordionStatus.ticketOpen = true;
    });

    var shoppingCartItemAddedHandler = $rootScope.$on('shoppingCartItemAdded', function (event, args) {
    	resizeMiniBasket();

    	var updatedItemElem = document.getElementById("itemRow"+args.hashkey);

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
    });

    //#endregion

    //#region Actions on item
    $scope.incrementQuantity = function (cartItem) {
        shoppingCartModel.incrementQuantity(cartItem);
    }

    $scope.decrementQuantity = function (cartItem) {
        shoppingCartModel.decrementQuantity(cartItem);
    }

    $scope.removeItem = function (cartItem) {
        shoppingCartModel.removeItem(cartItem);
    }

    $scope.offerItem = function (cartItem) {
        shoppingCartModel.offerItem(cartItem);
    }

    $scope.editMenu = function (cartItem) {
        shoppingCartModel.editMenu(cartItem);
    }

    $scope.editComment = function (cartItem) {
        shoppingCartModel.editComment(cartItem);
    }
    //#endregion

	//#region Payments
    $scope.removePayment = function (selectedPaymentMode) {
    	selectedPaymentMode.Total = 0;
    	shoppingCartModel.setPaymentMode(selectedPaymentMode);
    }

    $scope.removeBalanceUpdate = function () {
    	shoppingCartModel.removeBalanceUpdate();
    }

    $scope.selectPaymentMode = function (selectedPaymentMode) {

    	var customValue = $scope.totalDivider > 1 ? parseFloat((Math.round($scope.currentShoppingCart.Total / $scope.totalDivider * 100) / 100).toFixed(2)) : undefined;

    	shoppingCartModel.selectPaymentMode(selectedPaymentMode, customValue, $rootScope.IziPosConfiguration.IsDirectPayment);
    }

    $scope.splitShoppingCart = function () {
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

    $scope.divideTotal = function () {
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
    	}, function () {
    	});

    }
    //#endregion

	//#region Actions on cart
    $scope.addStep = function () {
    	shoppingCartModel.nextStep();
    }

    $scope.selectStep = function (step) {
    	shoppingCartModel.setStep(step);
    }

    $scope.unfreezeShoppingCart = function () {
        shoppingCartModel.unfreezeShoppingCart();
    }

    $scope.freezeShoppingCart = function () {
        shoppingCartModel.freezeShoppingCart();
    }

    $scope.validShoppingCart = function (ignorePrintTicket) {
        shoppingCartModel.validShoppingCart(ignorePrintTicket);
    }

    $scope.printProdShoppingCart = function () {
        if($scope.currentShoppingCart != undefined && $scope.currentShoppingCart.Items.length > 0){
            //$rootScope.showLoading();

            shoppingCartModel.printProdShoppingCart();

            //setTimeout(function () {
            //    $rootScope.hideLoading();
            //}, 500);
        }
    }

    $scope.printStepProdShoppingCart = function () {
        if ($scope.currentShoppingCart != undefined && $scope.currentShoppingCart.Items.length > 0) {
            //$rootScope.showLoading();

        	shoppingCartModel.printStepProdShoppingCart();

            //setTimeout(function () {
            //    $rootScope.hideLoading();
            //}, 500);
        }
    }

    $scope.cancelShoppingCart = function () {

        if (posUserService.isEnable('DELT'))
        {
            swal({ title: $translate.instant("Supprimer le ticket ?"), text: "", type: "warning", showCancelButton: true, confirmButtonColor: "#d83448", confirmButtonText: $translate.instant("Oui"), cancelButtonText: $translate.instant("Non"), closeOnConfirm: true },
                function () {
                    shoppingCartModel.cancelShoppingCartAndSend();
                });

        }


        //if(confirm()) shoppingCartModel.cancelShoppingCart();
    }
    //#endregion

    //#region Discount
    $scope.removeShoppingCartDiscount = function (item) {
        shoppingCartModel.removeShoppingCartDiscount(item);
    }
    //#endregion

    //#region FID

    $scope.openClientModal = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'modals/modalCustomer.html',
            controller: 'ModalCustomerController',
            backdrop: 'static',
            size: 'lg'
        });
    }

    $scope.chooseRelevantOffer = function () {
        shoppingCartModel.chooseRelevantOffer();
    }

    var updateBalancePassages = function () {
    	if ($scope.currentShoppingCart && $scope.currentShoppingCart.customerLoyalty && $scope.currentShoppingCart.customerLoyalty.Balances) {
            $scope.balancePassages = Enumerable.from($scope.currentShoppingCart.customerLoyalty.Balances).firstOrDefault(function (b) {
                return b.BalanceType == "Passages";
            });

            resizeMiniBasket();
        } else {
            $scope.balancePassages = undefined;
        }
    }
    //#endregion

	//#region Misc
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

        if ($scope.currentShoppingCart) {
            $scope.filteredTaxDetails = taxesService.groupTaxDetail($scope.currentShoppingCart.TaxDetails);
        }
    }
    //#endregion

    $scope.selectTable = function () {
        shoppingCartModel.selectTableNumber();
    }

    $scope.isMenuDisable= function(item)
    {
        var ret = Enumerable.from(item.Attributes).any('attr=>attr.Printed') || item.IsFree || item.Product.ProductAttributes.length == 0;
        return (false);
        return (ret);
    }

});