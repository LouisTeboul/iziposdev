app.service('shoppingCartModel', ['$rootScope', '$q', '$state','$timeout', '$uibModal', 'shoppingCartService', 'productService', 'settingService', 'posUserService','$translate','storeMapService','taxesService',
    function ($rootScope, $q, $state,$timeout, $uibModal, shoppingCartService, productService, settingService, posUserService,$translate,storeMapService,taxesService) {
        var current = this;
        var lastShoppingCart = undefined;
        var currentShoppingCart = undefined;
        var currentShoppingCartIn = undefined;
        var currentShoppingCartOut = undefined;
        var paymentModesAvailable = undefined;
        var deliveryType = DeliveryTypes.FORHERE;
        var currentBarcode = { barcodeValue: '' };

        //#region Actions on item
        this.incrementQuantity = function (cartItem) {
            cartItem.Quantity += 1;

            this.calculateTotal();
            this.calculateLoyalty();
            $rootScope.$emit("shoppingCartItemChanged", cartItem);
        }

        this.decrementQuantity = function (cartItem) {
            if (posUserService.isEnable('DELI'))
            {
                cartItem.Quantity -= 1;

                this.calculateTotal();
                this.calculateLoyalty();
                $rootScope.$emit("shoppingCartItemChanged", cartItem);

            }
        }

        this.editComment = function (cartItem) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalComment.html',
                controller: 'ModalCommentController',
                resolve: {
                    obj: function () {
                        return cartItem;
                    }
                },
                backdrop: 'static'
            });

            modalInstance.result.then(function (comment) {
            	console.log("Comment : " + comment);
            	if (comment.length > 0) {
            		//on coupe la ligne si elle n'a pas de commentaire et que la quantité est supérieure à 1
            		if ((!cartItem.Comment || cartItem.Comment.length == 0) && cartItem.Quantity > 1) {
            			cartItem.Quantity--;

            			var newCartItem = clone(cartItem);

            			newCartItem.Quantity = 1;
            			newCartItem.Comment = comment;


            			current.addCartItem(newCartItem);



            		} else {
            			cartItem.Comment = comment;
            		}
            	} else {
            		cartItem.Comment = undefined;
            	}
            }, function () {
            });

        }
        
        this.editMenu = function (cartItem) {
            this.addToCart(cartItem.Product, false, cartItem.Offer, cartItem.IsFree);

            if (cartItem.Quantity > 1) {
                this.decrementQuantity(cartItem);
            } else {
                this.removeItem(cartItem);
            }
        }

        this.removeItem = function (cartItem) {
            if (posUserService.isEnable('DELI'))
            {
                var idxToRemove = currentShoppingCart.Items.indexOf(cartItem);

                if (idxToRemove > -1) {

                	//Si en mode Step et deja imprimé, on passe la qté à 0.
                	if ($rootScope.IziBoxConfiguration.StepEnabled && cartItem.Printed) {
                		cartItem.Quantity = 0;
                		$rootScope.$emit("shoppingCartItemChanged", cartItem);
                	} else {

                		currentShoppingCart.Items.splice(idxToRemove, 1);
                		if (currentShoppingCart.Items.length == 0) {
                			this.clearShoppingCart();
                		}
                		$rootScope.$emit("shoppingCartItemRemoved", cartItem);

                	}
                    this.calculateTotal();
                    this.calculateLoyalty();
                    
                }
            }


        }
        
        this.removeItemFrom = function (shoppingCart,cartItem) {
            var idxToRemove = shoppingCart.Items.indexOf(cartItem);

            if (idxToRemove > -1) {
                shoppingCart.Items.splice(idxToRemove, 1);
                this.calculateTotalFor(shoppingCart);
            }
        }

        this.addCartItem = function (cartItem) {
        	currentShoppingCart.Items.push(cartItem);

        	$timeout(function () {
        		current.calculateTotal();

        		if (!$rootScope.$$phase) {
        			$rootScope.$apply();
        		}
        		$rootScope.$emit("shoppingCartItemAdded", cartItem);
        	});
        }

        this.addItemTo = function (shoppingCartTo,shoppingCartFrom, cartItem, qty) {

            if (!qty) {
                qty = 1;
            }

            var itemExist = undefined;

            if (!cartItem.Offer && !cartItem.Isfree && !cartItem.Product.ProductAttributes.length > 0) {
            	itemExist = Enumerable.from(shoppingCartTo.Items).firstOrDefault(function (x) {
            		return !x.Comment && !x.Offer && !x.IsFree && x.ProductId == cartItem.ProductId && x.Step == cartItem.Step;
            	});
            }
            
            if (itemExist)
            {
                itemExist.Quantity += qty;
                cartItem.Quantity -= qty;
                
            }
            else {
                
                    var item = clone(cartItem);
                    item.Quantity = qty;
                    shoppingCartTo.Items.push(item);
                    cartItem.Quantity -= qty;
                
            }
            if (cartItem.Quantity <= 0 && shoppingCartFrom) {
                this.removeItemFrom(shoppingCartFrom, cartItem);
            }

            if (shoppingCartFrom) this.calculateTotalFor(shoppingCartFrom);
            this.calculateTotalFor(shoppingCartTo);

        }

        this.offerItem = function (cartItem) {
            if (posUserService.isEnable('OFFI'))
            {
            	if (cartItem.Quantity > 1) {
					//on décrémente la ligne de 1
            		cartItem.Quantity--;

            		//index de la ligne
            		var idx = currentShoppingCart.Items.indexOf(cartItem);

					//on la duplique pour rendre un item gratuit
            		cartItem = clone(cartItem);
            		cartItem.Quantity = 1;

            		//on ajoute la nouvelle ligne au panier
            		currentShoppingCart.Items.splice(idx+1,0, cartItem);
            	}
                cartItem.IsFree = true;

                this.calculateTotal();
                this.calculateLoyalty();
                $rootScope.$emit("shoppingCartItemChanged", cartItem);

            }


        }

        //#endregion

    	//#region Actions on ShoppingCart

		//Permet de créer un ticket vide
        this.createShoppingCart = function () {
            if (currentShoppingCart == undefined) {
            	var timestamp = new Date().getTime();
                currentShoppingCart = new ShoppingCart();
                currentShoppingCart.TableNumber = undefined;
                currentShoppingCart.Items = new Array();
                currentShoppingCart.Discounts = new Array();
                currentShoppingCart.Timestamp = timestamp;
                currentShoppingCart.id = timestamp;
                currentShoppingCart.HardwareId = $rootScope.PosLog.HardwareId;
                currentShoppingCart.PosUserId = $rootScope.PosUserId;
                currentShoppingCart.PosUserName = $rootScope.PosUserName;
                currentShoppingCart.DeliveryType = deliveryType;
                currentShoppingCart.CurrentStep = 0;
                currentShoppingCart.StoreId = $rootScope.IziBoxConfiguration.StoreId;
                $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
            }
        }
        //Permet de créer un ticket vide pour le split
        this.createShoppingCartIn = function () {
        	var timestamp = new Date().getTime();
            var currentShoppingCartIn = new ShoppingCart();
            currentShoppingCartIn.TableNumber = undefined;
            currentShoppingCartIn.Items = new Array();
            currentShoppingCartIn.Timestamp = timestamp;
            currentShoppingCartIn.id = timestamp;
            currentShoppingCartIn.HardwareId = $rootScope.PosLog.HardwareId;
            currentShoppingCartIn.PosUserId = $rootScope.PosUserId;
            currentShoppingCartIn.PosUserName = $rootScope.PosUserName;
            currentShoppingCartIn.Discounts = clone(currentShoppingCart.Discounts);
            currentShoppingCartIn.DeliveryType = deliveryType;
            currentShoppingCartIn.CurrentStep = 0;
            currentShoppingCartIn.StoreId = $rootScope.IziBoxConfiguration.StoreId;
            Enumerable.from(currentShoppingCartIn.Discounts).forEach(function (item) {
                item.Total = 0;
            });

            return currentShoppingCartIn;
        }

		//Définie le ticket recepteur du split
        this.setCurrentShoppingCartIn = function (shoppingCart) {
        	currentShoppingCartIn = shoppingCart;
        }
		//Obtenir le ticket recepteur du split en cours
        this.getCurrentShoppingCartIn = function () {
        	return currentShoppingCartIn;
        }

        //Créer le ticket emetteur du split (à partir du ticket courant)
        this.createShoppingCartOut = function () {
            if (currentShoppingCart == undefined) {
            	var timestamp = new Date().getTime();
                var currentShoppingCartOut = new ShoppingCart();
                currentShoppingCartOut.TableNumber = undefined;
                currentShoppingCartOut.Items = new Array();
                currentShoppingCartOut.Discounts = new Array();
                currentShoppingCartOut.Timestamp = timestamp;
                currentShoppingCartOut.id = timestamp;
                currentShoppingCartOut.HardwareId = $rootScope.PosLog.HardwareId;
                currentShoppingCartOut.PosUserId = $rootScope.PosUserId;
                currentShoppingCartOut.PosUserName = $rootScope.PosUserName;
                currentShoppingCartOut.DeliveryType = deliveryType;
                currentShoppingCartOut.CurrentStep = 0;
                currentShoppingCartOut.StoreId = $rootScope.IziBoxConfiguration.StoreId;
            }
            else {
            	currentShoppingCartOut = clone(currentShoppingCart);

            	var cloneItemsArray = [];

            	Enumerable.from(currentShoppingCart.Items).forEach(function (item) {
            		if (item.Quantity > 0) {
            			cloneItemsArray.push(clone(item));
            		}
            	});

            	currentShoppingCartOut.Items = cloneItemsArray;
            }
            return currentShoppingCartOut;
        }

		//Définie le ticket emetteur du split
        this.setCurrentShoppingCartOut = function (shoppingCart) {
        	currentShoppingCartOut = shoppingCart;
        }

		//Obtenir le ticket emetteur du split
        this.getCurrentShoppingCartOut = function () {
        	return currentShoppingCartOut;
        }

    	//NextStep
        this.nextStep = function () {
        	if (currentShoppingCart) {
        		//Récupération de la derniere étape du ticket
        		var lastStep = Enumerable.from(currentShoppingCart.Items).select("x=>x.Step").orderByDescending().firstOrDefault();
				
				//Si il n'y a pas d'items ou si l'étape est < à l'étape courante, on utilise l'étape courante du ticket
        		if (!lastStep || lastStep < currentShoppingCart.CurrentStep) {
        			lastStep = currentShoppingCart.CurrentStep;
        		}
				
				//On vérifie que la dernière étape contient des items
        		//var itemsInCurrentStep = Enumerable.from(currentShoppingCart.Items).any(function (item) {
        		//	return item.Step == lastStep;
        		//});
        		var itemsInCurrentStep = true;

				//Si la dernière étape contient des items alors on peut passer à la suivante
        		if (itemsInCurrentStep) {
        			currentShoppingCart.CurrentStep = lastStep+1;
        			$rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        		}
        	} else {
        		this.createShoppingCart();
        	}
        }

    	//PreviousStep
        this.previousStep = function () {
        	currentShoppingCart.CurrentStep -= 1;

        	if (currentShoppingCart.CurrentStep < 0) {
        		currentShoppingCart.CurrentStep = 0;
        	}

        	$rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        }

        this.setStep = function (step) {
        	currentShoppingCart.CurrentStep = step;
        	$rootScope.$emit("shoppingCartStepChanged", currentShoppingCart);
        }

        this.addToCartBySku = function (sku) {
            var self = this;
            productService.getProductBySKUAsync(sku).then(function (product) {
                if (product) {
                    self.addToCart(product);
                } else {
                    sweetAlert($translate.instant("Produit introuvable"));
                }
            });;
        }

        this.addToCart = function (product, forceinbasket, offer, isfree) {


            if (this.getCurrentShoppingCart() && this.getCurrentShoppingCart().isPayed) return;

            if (!product.DisableBuyButton) {
                if (isfree == undefined) {
                    isfree = false;
                }
                var qty = 1;
                var b = parseInt(currentBarcode.barcodeValue);
                if (b) {
                    if (b > 0 && b < 99) {
                        qty = b;
                        currentBarcode.barcodeValue = "";
                    }
                }
                //Test for a product with attributes
                //ST modif !
                if (!forceinbasket && product.ProductTemplate.ViewPath != 'ProductTemplate.Simple') {
                    $rootScope.currentConfigurableProduct = product;
                    $state.go('catalog.' + product.ProductTemplate.ViewPath, { id: product.Id });

                } else if (!forceinbasket && product.EmployeeTypePrice) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'modals/modalTypePrice.html',
                        controller: 'ModalTypePriceController',
						size: 'sm',
                        resolve: {
                            currentPrice: function () {
                                return product.Price;
                            },
                            minPrice: function () {
                                return product.EmployeeTypePriceMin;
                            },
                            maxPrice: function () {
                                return product.EmployeeTypePriceMax;
                            }
                        },
                        backdrop: 'static'
                    });

                    modalInstance.result.then(function (priceValue) {
                        var newProduct = jQuery.extend(true, {}, product);
                        newProduct.Price = priceValue;
                        current.addToCart(newProduct, true)
                    }, function () {
                    });
                } else {

                    this.createShoppingCart();

                    var cartItem = undefined;

                    if (!offer && !isfree && !product.ProductAttributes.length > 0) {
                    	cartItem = Enumerable.from(currentShoppingCart.Items).firstOrDefault(function(x){
                    		return !x.Comment && !x.Offer && !x.IsFree &&  x.ProductId == product.Id && x.Step == currentShoppingCart.CurrentStep;
                    	});
                    }

                    if (!cartItem || product.ProductAttributes.length > 0 || product.EmployeeTypePrice) {
                        cartItem = new ShoppingCartItem();
                        cartItem.ProductId = product.Id;
                        cartItem.Product = product;
                        cartItem.Quantity = qty;
                        cartItem.Printer_Id = product.Printer_Id;
                        cartItem.Step = currentShoppingCart.CurrentStep;
                        cartItem.IsFree = isfree;
                        var pStep = Enumerable.from(currentShoppingCart.Items).where("x=>x.Step==" + currentShoppingCart.CurrentStep + " && x.StepPrintCount && x.StepPrintCount>0").firstOrDefault();
                        if (pStep) cartItem.StepPrintCount = pStep.StepPrintCount;
                        cartItem.TaxCategory = product.TaxCategory;
                        cartItem.TaxCategoryId = product.TaxCategoryId;
                        cartItem.Offer = offer;
                        if (product.ProductAttributes.length > 0) {
                            cartItem.Step = Enumerable.from(product.ProductAttributes).min("attr=>attr.Step");
                            cartItem.Attributes = [];
                            for (var i = 0; i < product.ProductAttributes.length; i++) {
                                var attribute = product.ProductAttributes[i];
                                for (j = 0; j < attribute.ProductAttributeValues.length; j++) {
                                    var value = attribute.ProductAttributeValues[j];
                                    if (value.Selected) {
                                        var elem = {
                                            ProductAttributeId: attribute.Id,
                                            ProductAttributeValueId: value.Id,
                                            PriceAdjustment: value.PriceAdjustment,
                                        };

                                        if (value.LinkedProduct) {
                                            elem.Name = value.LinkedProduct.Name;
                                            elem.Comment = value.Comment;
                                            if(value.LinkedProduct.StoreInfosObject) elem.Printer_Id = value.LinkedProduct.StoreInfosObject.Printer_Id;
                                        } else {
                                            elem.Name = value.Name;
                                        }
                                        elem.Step = attribute.Step;
                                        cartItem.Attributes.push(elem);
                                    }

                                }
                            }

                        }
                        cartItem.hashkey = objectHash(cartItem);

                        currentShoppingCart.Items.push(cartItem);
                        if (cartItem.Product.ProductComments && cartItem.Product.ProductComments.length>0) {
                            this.editComment(cartItem);
                        }
                    } else {
                    	cartItem.Quantity = cartItem.Quantity + qty;
                    	$rootScope.$emit("shoppingCartItemChanged", cartItem);
                    }

                    $timeout(function () {
                        current.calculateTotal();
                        current.calculateLoyalty();
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                        $rootScope.$emit("shoppingCartItemAdded", cartItem);
                    });
                }
            }
        }

        this.validShoppingCart = function (ignorePrintTicket) {
            if (currentShoppingCart != undefined && currentShoppingCart.Items.length > 0) {
                $rootScope.showLoading();

                if (!currentShoppingCart.Residue == 0) {
                    $rootScope.hideLoading();
                    sweetAlert($translate.instant("Le ticket n'est pas soldé"));
                    return;
                }
                var currentDate = new Date();
                currentShoppingCart.Date = currentDate.toString('dd/MM/yyyy H:mm:ss');

                var toSave = clone(currentShoppingCart);

            	//Suppression des lignes à qté 0
                toSave.Items = Enumerable.from(currentShoppingCart.Items).where("item => item.Quantity > 0").toArray();

                lastShoppingCart = toSave;

                shoppingCartService.saveShoppingCartAsync(toSave).then(function (result) {
                	$rootScope.hideLoading();

					//Si la sauvegarde du ticket validé est ok, on supprime éventuellement les tickets splittés.
                	currentShoppingCartIn = undefined;

                	if (currentShoppingCartOut) {
                		currentShoppingCart = clone(currentShoppingCartOut);
                		deliveryType = currentShoppingCart.DeliveryType;
                		currentShoppingCartOut = undefined;
                		$rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                	}
                	else {
                		current.clearShoppingCart();
                	}

                    current.printPOSShoppingCart(toSave,ignorePrintTicket);

                }, function (err) {
                    $rootScope.hideLoading();
                    sweetAlert($translate.instant("Erreur de sauvegarde du panier !"));
                    console.log(err);
                });
            }

        }

        this.printLastShoppingCart = function () {
            if (lastShoppingCart) {
                shoppingCartService.printShoppingCartAsync(lastShoppingCart, $rootScope.PrinterConfiguration.POSPrinter, true, 1, false).then(function () { }, function () { sweetAlert("Erreur d'impression du dernier ticket !"); });
            }
        }

        this.printShoppingCartNote = function (shoppingCart) {
        	if (!shoppingCart) {
        		shoppingCart = lastShoppingCart;
        	}

        	if (shoppingCart) {

                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalShoppingCartNote.html',
                    controller: 'ModalShoppingCartNoteController',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (nbNote) {
                	shoppingCartService.printShoppingCartAsync(shoppingCart, $rootScope.PrinterConfiguration.POSPrinter, false, 1, false, nbNote).then(function () { }, function () { sweetAlert("Erreur d'impression de la note !"); });

                }, function () {
                });
            }
        }

        this.printPOSShoppingCart = function (shoppingCart, ignorePrintTicket) {

        	shoppingCartService.printShoppingCartAsync(shoppingCart, $rootScope.PrinterConfiguration.POSPrinter, true, $rootScope.PrinterConfiguration.POSPrinterCount, ignorePrintTicket).then(function (msg) {
                
            }, function (err) {

                if (!ignorePrintTicket) {
                    sweetAlert($translate.instant("Erreur d'impression caisse !"));
                }
                
            });
        }

        this.cancelShoppingCart = function () {
            this.clearShoppingCart();
        }

        this.cancelShoppingCartAndSend = function () {
            if (currentShoppingCart != undefined) {
                $rootScope.showLoading();

                var currentDate = new Date();
                currentShoppingCart.Date = currentDate.toString('dd/MM/yyyy H:mm:ss');
                currentShoppingCart.Canceled = true;
                shoppingCartService.saveShoppingCartAsync(currentShoppingCart).then(function (result) {
                	$rootScope.hideLoading();

                	//Si la sauvegarde du ticket validé est ok, on supprime éventuellement les tickets splittés.
                	currentShoppingCartIn = undefined;

                	if (currentShoppingCartOut) {
                		currentShoppingCart = clone(currentShoppingCartOut);
                		deliveryType = currentShoppingCart.DeliveryType;
                		currentShoppingCartOut = undefined;
                		$rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                	}
                	else {
                		current.clearShoppingCart();
                	}

                }, function (err) {
                    $rootScope.hideLoading();
                    sweetAlert($translate.instant("Erreur !"));
                    console.log(err);
                });
            }

        }
                
        this.printProdShoppingCart = function () {
            if (currentShoppingCart != undefined && currentShoppingCart.Items.length > 0) {

            	currentShoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

				//Suppression des lignes à qté 0
            	var toPrint = clone(currentShoppingCart);
            	toPrint.Items = Enumerable.from(currentShoppingCart.Items).where("item => item.Quantity > 0").toArray();

            	shoppingCartService.printShoppingCartAsync(toPrint, $rootScope.PrinterConfiguration.ProdPrinter, false, $rootScope.PrinterConfiguration.ProdPrinterCount).then(function (msg) {
                }, function (err) {
                    sweetAlert($translate.instant("Erreur d'impression production !"));
                });
            }
        }

        this.printStepProdShoppingCart = function () {
            if (currentShoppingCart != undefined && currentShoppingCart.Items.length > 0) {

            	currentShoppingCart.Date = new Date().toString('dd/MM/yyyy H:mm:ss');

                var shoppingCartProd = clone(currentShoppingCart);

                shoppingCartService.printProdAsync(shoppingCartProd, currentShoppingCart.CurrentStep).then(function (req) {
                	Enumerable.from(currentShoppingCart.Items).forEach(function (item) {
                		if (item.Step == req.Step) {
                			item.Printed = true;
                			item.PrintCount = item.StepPrintCount ? item.StepPrintCount + 1 : 1;
                			item.StepPrintCount = item.StepPrintCount ? item.StepPrintCount + 1 : 1;
                			item.PrintedQuantity = item.Quantity;
                		}
                		if(item.Attributes)
                		{
                		    Enumerable.from(item.Attributes).forEach(function (attr) {
                		        if (attr.Step == req.Step) {
                		            attr.Printed = true;
                		            attr.PrintCount = attr.PrintCount ? attr.PrintCount + 1 : 1;                                    
                		        }
                		    });
                		    item.PartialPrinted = false
                		    if (Enumerable.from(item.Attributes).any("x => x.Printed")) {
                		        if (Enumerable.from(item.Attributes).any("x => !x.Printed")) {
                		            item.PartialPrinted = true;
                		        }
                		    }
                		}
                	});
                }, function (err) {
                	sweetAlert($translate.instant("Erreur d'impression production !"));
                });
            }
        }

        this.freezeShoppingCart = function () {
            if (currentShoppingCart != undefined) {
                shoppingCartService.freezeShoppingCartAsync(currentShoppingCart).then(function (result) {
                    if (currentShoppingCartOut) {
                        current.setCurrentShoppingCart(currentShoppingCartOut);
                        currentShoppingCartOut = undefined;
                        currentShoppingCartIn = undefined;
                    } else {
                        current.clearShoppingCart();
                    }
                }, function (err) {
                	sweetAlert($translate.instant("Erreur de mise en attente !"));
                });
            }
        }

        this.setCurrentShoppingCart = function (shoppingCart) {
        	currentShoppingCart = shoppingCart;
        	deliveryType = currentShoppingCart.DeliveryType;
        	current.calculateTotal();
        	current.calculateLoyalty();
        	$rootScope.$emit("shoppingCartChanged", currentShoppingCart);
        }

        this.unfreezeShoppingCartById = function (id) {
            if (currentShoppingCart == undefined) {
                shoppingCartService.getFreezedShoppingCartByIdAsync(id).then(function (shoppingCart) {
                    shoppingCartService.unfreezeShoppingCartAsync(shoppingCart);
                    currentShoppingCart = shoppingCart;
                    deliveryType = currentShoppingCart.DeliveryType;
                    current.calculateTotal();
                    current.calculateLoyalty();

                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                }, function () {
                    sweetAlert($translate.instant("Ticket introuvable")+"...");
                });
            } else {
                sweetAlert($translate.instant("Vous avez déjà un ticket en cours")+"...");
            }
        }

        this.unfreezeShoppingCart = function () {
            if (currentShoppingCart == undefined) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'modals/modalUnfreezeShoppingCart.html',
                    controller: 'ModalUnfreezeShoppingCartController',
                    size: 'lg',
                    backdrop: 'static'
                });

                modalInstance.result.then(function (shoppingCart) {
                    currentShoppingCart = shoppingCart;
                    deliveryType = currentShoppingCart.DeliveryType;
                    current.calculateTotal();
                    current.calculateLoyalty();

                    $rootScope.$emit("shoppingCartChanged", currentShoppingCart);
                }, function () {
                });
            } else {
            	sweetAlert($translate.instant("Vous avez déjà un ticket en cours") + "...");
            }
        }

        this.clearShoppingCart = function () {
            if (currentShoppingCart != undefined) {
                currentShoppingCart = undefined;
                currentShoppingCartIn = undefined;
                currentShoppingCartOut = undefined;
                $rootScope.$emit("shoppingCartCleared");
            };

            this.updatePaymentModes();
        }

        this.selectTableNumber = function () {
            var currentTableNumber;

            if (currentShoppingCart != undefined && currentShoppingCart.TableNumber != undefined) {
                currentTableNumber = currentShoppingCart.TableNumber;
            }

            var currentTableCutleries;

            if (currentShoppingCart != undefined && currentShoppingCart.TableCutleries != undefined) {
                currentTableCutleries = currentShoppingCart.TableCutleries;
            }


            var modalInstance;

            var resultSelectTable = function () {
            	modalInstance.result.then(function (tableValues) {
            		var updateSelectedTable = function (tableValues, isUnfreeze) {
            			var setValues = function (tableValues) {
            				currentShoppingCart.TableNumber = tableValues.tableNumber;
            				currentShoppingCart.TableCutleries = tableValues.tableCutleries;
            				$rootScope.$emit("shoppingCartChanged", currentShoppingCart);
            			}

            			if (isUnfreeze) {
            				setValues(tableValues);
            			} else {
            				shoppingCartService.getFreezedShoppingCartByTableNumberAsync(tableValues.tableNumber).then(function (sc) {
            					sweetAlert($translate.instant("Cette table existe déjà") + "...");
            					$rootScope.$emit("shoppingCartChanged", currentShoppingCart);
            				}, function () {
            					setValues(tableValues);
            				});
            			}
            		}

            		if (currentShoppingCart == undefined) {
            			shoppingCartService.getFreezedShoppingCartByTableNumberAsync(tableValues.tableNumber).then(function (sc) {
            				current.setCurrentShoppingCart(sc);
            				shoppingCartService.unfreezeShoppingCartAsync(sc);
            				updateSelectedTable(tableValues,true);
            			}, function () {
            				current.createShoppingCart();
            				updateSelectedTable(tableValues);
            			});
            		} else {
            			updateSelectedTable(tableValues);
            		}
            	}, function () {
            	});
            }

            var showTable = function () {
            	modalInstance = $uibModal.open({
            		templateUrl: 'modals/modalTable.html',
            		controller: 'ModalTableController',
            		resolve: {
            			currentTableNumber: function () {
            				return currentTableNumber;
            			},
            			currentTableCutleries: function () {
            				return currentTableCutleries;
            			}
            		},
            		size: 'sm',
            		backdrop: 'static'
            	});

            	resultSelectTable();
            }

            var showTablePlan = function (storeMap) {
            	modalInstance = $uibModal.open({
            		templateUrl: 'modals/modalTablePlan.html',
            		controller: 'ModalTablePlanController',
            		resolve: {
            			currentStoreMap: function () {
            				return storeMap;
            			},
            			currentTableNumber: function () {
            				return currentTableNumber;
            			},
            			currentTableCutleries: function () {
            				return currentTableCutleries;
            			}
            		},
            		size: 'full',
            		backdrop: 'static'
            	});

            	resultSelectTable();
            }

            storeMapService.getStoreMapAsync().then(function (storeMap) {
				
            	if (storeMap && storeMap.data && storeMap.data.length > 0) {
            		showTablePlan(storeMap);
            	} else {
            		showTable();
            	}

            }, function () {
            	showTable();
            });
        }
        //#endregion

        //#region Fid
        this.scanFidBarcode = function () {
            var barcode = undefined;

            //TODO to remove it's for test
            //barcode = "0004405498";
            //getLoyalty(barcode);

            //TODO barcodescanner
            try {
                cordova.plugins.barcodeScanner.scan(
                function (result) {
                    barcode = result.text;
                    current.getLoyalty(barcode);
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
                    barcode = value;
                    current.getLoyalty(barcode);
                }, function () {
                });
            }
        }

        this.enterFidBarcode = function () {
            var barcode = undefined;

            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalManualBarcode.html',
                controller: 'ModalManualBarcodeController',
                backdrop: 'static'
            });

            modalInstance.result.then(function (value) {
                barcode = value;
                current.getLoyalty(barcode);
            }, function () {
            });
        }

        this.chooseRelevantOffer = function () {
            //Apply relevant offers
            //If loyalty contains offers : open popup
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalOffers.html',
                controller: 'ModalOffersController',
                resolve: {
                    offers: function () {
                        return currentShoppingCart.customerLoyalty.Offers;
                    },
                    relevantOffers: function () {
                        return currentShoppingCart.customerLoyalty.RelevantOffers;
                    }
                }
            });

            modalInstance.result.then(function (selectedOffer) {
                console.log(selectedOffer);
                current.applyOffer(selectedOffer);
            }, function () {

            });
        }

        this.getLoyalty = function (barcode) {
            barcode = barcode.trim();

            if (barcode) {

                shoppingCartService.getLoyaltyObjectAsync(barcode).then(function (loyalty) {
                    if (loyalty) {
                        console.log(loyalty);
                        current.createShoppingCart();
                        current.removeAllLoyalties();

                        currentShoppingCart.Barcode = barcode;
                        currentShoppingCart.customerLoyalty = loyalty;
                        current.calculateLoyalty();
                        $rootScope.$emit("customerLoyaltyChanged", loyalty);
                    } else {
                        sweetAlert($translate.instant("Carte de fidélité introuvable !"));
                    }
                }, function (err) {
                    console.log(err);
                    sweetAlert($translate.instant("Le serveur de fidélité n'a pas répondu !"));
                });

            }
        }

        this.removeAllLoyalties = function () {
            if (currentShoppingCart.customerLoyalty) {

                var offersToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Offers).where(function (o) {
                    return o.isApplied;
                }).toArray();

                if (offersToRemove.length > 0) {
                    this.removeOffers(offersToRemove);
                }

                var balancesToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).toArray();

                if (balancesToRemove.length > 0) {
                    this.removeBalances(balancesToRemove);
                }
            }
        }

        //Apply offers / add payment mode
        this.calculateLoyalty = function () {
            if (currentShoppingCart != undefined && currentShoppingCart.customerLoyalty != undefined && currentShoppingCart.customerLoyalty.Offers != undefined) {
                var totalCart = currentShoppingCart != undefined && currentShoppingCart.Total != undefined ? currentShoppingCart.Total : 0;

                //Remove offers that no longer apply 
                var offersToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Offers).where(function (o) {
                    return o.isValid && (o.OfferParam.MinOrderIncTax != undefined && o.OfferParam.MinOrderIncTax > totalCart) && o.isApplied;
                }).toArray();

                if (offersToRemove.length > 0) {
                    this.removeOffers(offersToRemove);
                }

                if (!(Enumerable.from(currentShoppingCart.customerLoyalty.Offers).any("o=>o.isApplied"))) {
                    //Obtains relevant offers
                    currentShoppingCart.customerLoyalty.RelevantOffers = Enumerable.from(currentShoppingCart.customerLoyalty.Offers).where(function (o) {
                        return o.isValid && (o.OfferParam.MinOrderIncTax == undefined || (o.OfferParam.MinOrderIncTax != undefined && o.OfferParam.MinOrderIncTax <= totalCart)) && !o.isApplied;
                    }).toArray();

                } else {
                    currentShoppingCart.customerLoyalty.RelevantOffers = undefined;
                }

                if (!$rootScope.$$phase) $rootScope.$apply();

                //Obtains balances can be used to pay
                var relevantBalances = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).where(function (o) {
                    return o.UseToPay && o.MinOrderTotalIncVAT <= totalCart;
                }).toArray();

                if (relevantBalances.length > 0) {
                    this.applyBalances(relevantBalances);
                }

                //Remove balances that no longer apply 
                var balancesToRemove = Enumerable.from(currentShoppingCart.customerLoyalty.Balances).where(function (o) {
                    return o.MinOrderTotalIncVAT > totalCart
                }).toArray();

                if (balancesToRemove.length > 0) {
                    this.removeBalances(balancesToRemove);
                }
            }
        }

        this.removeBalances = function (balancesToRemove) {
            for (var i = 0; i < balancesToRemove.length; i++) {
                var balance = balancesToRemove[i];
                var idxToRemove = Enumerable.from(paymentModesAvailable).indexOf(function (p) { return p.Value == balance; });
                if (idxToRemove > -1) {
                	paymentModesAvailable.splice(idxToRemove);
                }
            }
            $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
        }

        this.removeOffers = function (offersToRemove) {
            for (var i = 0; i < offersToRemove.length; i++) {
                var offer = offersToRemove[i];
                var cartItemToRemove = Enumerable.from(currentShoppingCart.Items).firstOrDefault(function (i) { return i.Offer == offer; });
                if (cartItemToRemove) {
                    offer.isApplied = false;
                    this.removeItem(cartItemToRemove);
                }
            }
        }

        this.applyBalances = function (balances) {
            for (var i = 0; i < balances.length; i++) {
                var balance = balances[i];
                //Create new payment mode
                var paymentModeExists = Enumerable.from(paymentModesAvailable).any(function (p) {
                    return p.Balance != undefined && p.Balance.Id == balance.Id;
                });
                if (!paymentModeExists) {
                    var newPaymentMode = {
                        Text: balance.BalanceName,
                        Value: balance.BalanceName,
                        Balance: balance,
                        IsBalance: true
                    }
                    paymentModesAvailable.push(newPaymentMode);
                }
            }
            $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
        }

        this.applyOffer = function (offer) {
            switch (offer.OfferTypeName) {
                case "AddProduct":
                    offer.isApplied = true;
                    this.offerAddProduct(offer);
                    break;
                case "PromoText":
                    offer.isApplied = true;
                    this.offerPromoText(offer);
                    this.calculateLoyalty();
                    break;
                case "OneProductInCategory":
                    offer.isApplied = true;
                    this.offerOneProductInCategory(offer);
                    break;
                default:
                    console.log("Unrecognized offer");
            }

            currentShoppingCart.Offer = offer;
        }

        this.offerAddProduct = function (offer) {
            //Obtain product id to add
            var productIds = productService.getProductIdsFromOfferParam(offer.OfferParam);
            var offerPrice = offer.OfferParam.Price;

            productService.getProductByIdsAsync(productIds).then(function (products) {
                Enumerable.from(products).forEach(function (product) {
                    //Apply offer price                    
                    product.Price = offerPrice > product.Price ? product.Price : offerPrice;

                    current.addToCart(product, true, offer);
                });
            });

        }

        this.offerPromoText = function (offer) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalPromoText.html',
                controller: 'ModalPromoTextController',
                resolve: {
                    offerPromoText: function () {
                        return offer;
                    }
                },
                backdrop: 'static'
            });
        }

        this.offerOneProductInCategory = function (offer) {
            var modalInstance = $uibModal.open({
                templateUrl: 'modals/modalOneProductInCategory.html',
                controller: 'ModalOneProductInCategoryController',
                size: 'lg',
                resolve: {
                    offerOneProductInCategory: function () {
                        return offer;
                    }
                }
            });
        }

        this.removeBalanceUpdate = function () {
        	currentShoppingCart.BalanceUpdate = undefined;
        }
        //#endregion

        //#region Discount
        this.addShoppingCartDiscount = function (value, percent) {
            if (true) {
                this.createShoppingCart();

                if (currentShoppingCart.Discounts.length > 0) {
                    sweetAlert($translate.instant("Le ticket a déjà une remise"));

                } else {
                    var cartDiscount = new ShoppingCartDiscount();
                    cartDiscount.Value = value;
                    cartDiscount.IsPercent = percent;
                    cartDiscount.Total = 0;

                    currentShoppingCart.Discounts.push(cartDiscount);

                    setTimeout(function () {
                        current.calculateTotal();
                        current.calculateLoyalty();
                        $rootScope.$emit("shoppingCartDiscountAdded", cartDiscount);
                    }, 100)
                }
            }
        }

        this.removeShoppingCartDiscount = function (item) {
            var idxToRemove = currentShoppingCart.Discounts.indexOf(item);
            if (idxToRemove > -1) {
                currentShoppingCart.Discounts.splice(idxToRemove, 1);

                this.calculateTotal();
                this.calculateLoyalty();
                $rootScope.$emit("shoppingCartDiscountRemoved", item);
            }
        }
        //#endregion

        //#region Payment totals
        this.getPaymentModesAvailable = function () {
            return paymentModesAvailable;
        }

        this.addTicketRestaurant = function (barcode) {
            var result = false;

            var tkRestoPaymentMode = Enumerable.from(paymentModesAvailable).firstOrDefault(function (pm) {
                return pm.PaymentType == PaymentType.TICKETRESTAURANT;
            });

            if (tkRestoPaymentMode) {

                var tkResto = {
                    Number: barcode.substr(0, 9),
                    Key: barcode.substr(9, 2),
                    Value: roundValue(parseFloat(barcode.substr(11, 5))/100),
                    Supplier: barcode.substr(16, 1),
                    ControlKey: barcode.substr(17, 2),
                    Family: barcode.substr(19, 3),
                    Product: barcode.substr(22, 1),
                    Year: barcode.substr(23, 1)
                }


                var tkRestoPayment = {
                    PaymentType: tkRestoPaymentMode.PaymentType,
                    Value: tkRestoPaymentMode.Value,
                    Text: tkRestoPaymentMode.Text,
                    Total: tkResto.Value,
                    IsBalance: tkRestoPaymentMode.IsBalance
                };

                result = current.addPaymentMode(tkRestoPayment);

                if (!result) {
                    sweetAlert($translate.instant("Le ticket-restaurant n'a pu être ajouté !"));
                } else {
                    //Add ticketresto to shoppingCart
                    if (!currentShoppingCart.TicketsResto) {
                        currentShoppingCart.TicketsResto = [];
                    }

                    currentShoppingCart.TicketsResto.push(tkResto);
                }
            }

            return result;
        }

        this.removeTicketRestaurant = function (tkResto) {
            var idx = currentShoppingCart.TicketsResto.indexOf(tkResto);
            if (idx > -1) {
                currentShoppingCart.TicketsResto.splice(idx, 1);

                var tkRestoPaymentMode = Enumerable.from(currentShoppingCart.PaymentModes).firstOrDefault(function (pm) {
                    return pm.PaymentType == PaymentType.TICKETRESTAURANT;
                });

                if (tkRestoPaymentMode) {
                    tkRestoPaymentMode.Total = roundValue(tkRestoPaymentMode.Total - tkResto.Value);
                }
            }
        }

        this.addPaymentMode = function(selectedPaymentMode){
            var result = false;

            if (currentShoppingCart != undefined) {
                if (!currentShoppingCart.PaymentModes) {
                    currentShoppingCart.PaymentModes = [];
                }

                var paymentMode = Enumerable.from(currentShoppingCart.PaymentModes).firstOrDefault("x => x.Value == '" + selectedPaymentMode.Value + "'");

                if (!paymentMode) {
                    paymentMode = selectedPaymentMode;
                } else {
                    paymentMode.Total = roundValue(paymentMode.Total + selectedPaymentMode.Total);
                }

                result = current.setPaymentMode(paymentMode);
            }


            return result;
        }

        this.setPaymentMode = function (paymentMode) {
            var result = false;

            if (currentShoppingCart != undefined) {
                if (!currentShoppingCart.PaymentModes) {
                    currentShoppingCart.PaymentModes = [];
                }

                if (!paymentMode.IsBalance) {
                    var idxElem = currentShoppingCart.PaymentModes.indexOf(paymentMode);

                    if (idxElem == -1 && paymentMode.Total > 0) {
                        currentShoppingCart.PaymentModes.push(paymentMode);
                    } else if (paymentMode.Total == 0) {
                        currentShoppingCart.PaymentModes.splice(idxElem, 1);
                    }
                } else {
                    var balanceUpdate = new LoyaltyObjecBalancetUpdateModel();
                    balanceUpdate.Id = paymentMode.Balance.Id;
                    balanceUpdate.UpdateValue = paymentMode.Total;
                    balanceUpdate.BalanceName = paymentMode.Value;

                    if (balanceUpdate.UpdateValue > 0) {
                        currentShoppingCart.BalanceUpdate = balanceUpdate;
                    } else {
                        currentShoppingCart.BalanceUpdate = undefined;
                    }
                }

                current.calculateTotal();

                result = true;

                $rootScope.$emit("paymentModesChanged");
            }


            return result;
        }

        this.selectPaymentMode = function (selectedPaymentMode,customValue, isDirectPayment) {
        	if (currentShoppingCart != undefined) {
        		if (!currentShoppingCart.PaymentModes) {
        			currentShoppingCart.PaymentModes = [];
        		}

        		var currentPaymentMode = undefined;
        		//TODO ? var currentPaymentMode = Enumerable.from(currentShoppingCart.PaymentModes).firstOrDefault("x => x.Value == '" + selectedPaymentMode.Value + "'");

        		var maxValue = undefined;
        		var currentValue = (customValue && customValue < currentShoppingCart.Residue) ? customValue : currentShoppingCart.Residue;

				//TODO ?
        		//if (selectedPaymentMode.PaymentType == PaymentType.CB) {
        		//	maxValue = currentShoppingCart.Residue + (currentPaymentMode ? currentPaymentMode.Total : 0);
        		//}

        		if (selectedPaymentMode.IsBalance) {
        			var totalBalance = currentShoppingCart.BalanceUpdate ? currentShoppingCart.BalanceUpdate.UpdateValue : 0;
        			currentValue = selectedPaymentMode.Balance.Value <= currentShoppingCart.Residue ? selectedPaymentMode.Balance.Value : currentShoppingCart.Residue;
        			maxValue = currentValue + totalBalance;
        		}

        		if (!currentPaymentMode) {
        			currentPaymentMode = {
        				PaymentType: selectedPaymentMode.PaymentType,
        				Value: selectedPaymentMode.Value,
        				Text: selectedPaymentMode.Text,
        				Total: currentValue,
        				IsBalance: selectedPaymentMode.IsBalance
        			};

        			if (selectedPaymentMode.IsBalance) {
        				currentPaymentMode.Balance = selectedPaymentMode.Balance;
        			}
        		}

        		if (!isDirectPayment) {
        			var modalInstance = $uibModal.open({
        				templateUrl: 'modals/modalPaymentMode.html',
        				controller: 'ModalPaymentModeController',
        				resolve: {
        					paymentMode: function () {
        						return currentPaymentMode;
        					},
        					maxValue: function () {
        						return maxValue;
        					}
        				},
        				backdrop: 'static'
        			});

        			modalInstance.result.then(function (paymentMode) {
        				current.setPaymentMode(paymentMode);
        			}, function () {
        			});
        		} else {
        			var b = parseFloat(currentBarcode.barcodeValue);
        			if (b) {
        				if (b > 0 && (maxValue && b < maxValue) || (!maxValue && b < 9999)) {
        					currentPaymentMode.Total = b;
        					currentBarcode.barcodeValue = "";
        				}
        			}
        			current.setPaymentMode(currentPaymentMode);
        		}
        	}
        }

        this.updatePaymentModes = function () {
            settingService.getPaymentModesAsync().then(function (paymentSetting) {
                paymentModesAvailable = paymentSetting.ValueObject;
                $rootScope.$emit("paymentModesAvailableChanged", paymentModesAvailable);
            }, function (err) {
                console.log(err);
            });
        }

        //#endregion
        
        //#region Total Calcul
        this.calculateTotal = function () {
            this.calculateTotalFor(currentShoppingCart);
        }
        
        this.calculateTotalFor = function (shoppingCart) {
            taxesService.calculateTotalFor(shoppingCart);
        }

        //#endregion

        //#region Properties
        this.getCurrentShoppingCart = function () {
            return currentShoppingCart;
        }
        this.getCurrentShoppingCartIn = function () {
            return currentShoppingCartIn;
        }
        this.getCurrentShoppingCartOut = function () {
            return currentShoppingCartOut;
        }


        this.getPaymentModesAvailable = function () {
            return paymentModesAvailable;
        }


        this.getDeliveryType = function(){
        	return deliveryType;
        }

        this.setDeliveryType = function (value) {
            deliveryType = value;
            if(currentShoppingCart) currentShoppingCart.DeliveryType = deliveryType;
            this.calculateTotal();

            //Pour info
        	//if (value == DeliveryTypes.TAKEOUT || value == DeliveryTypes.DELIVERY) {
        	//	this.setAltVAT(true);
        	//} else {
        	//	this.setAltVAT(false);
        	//}
        }

        this.getCurrentBarcode = function () {
            return currentBarcode;
        }

    	//#endregion

    	//#region Event shoppingCart
        $rootScope.$on("shoppingCartItemChanged", function (event, cartItem) {
        	if (cartItem.Printed) {
        		cartItem.Printed = false;
        		cartItem.PrintCount = 0;
        	}
        });
		//#endregion

        //#region Initialization FINALLY

        //initialisation de l'écran temporisation car on en peut pas binder sinon DD 
        setTimeout(function () {
            current.setDeliveryType(DeliveryTypes.FORHERE);
            current.updatePaymentModes();
            current.calculateTotal();
        }, 500);

        /**
        * Event on PouchDbChanged
        */
        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status === "Change" && args.id.indexOf('Setting_') === 0) {
                current.updatePaymentModes();
            }
        });

        //#endregion
    }
]);