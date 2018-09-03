app.controller('ModalCashValuesController', function ($scope, $rootScope, $uibModalInstance, settingService) {
    this.isCountEdit = true;
    this.currentEdit = undefined;
    this.currentText = "";
    this.currentEditElement = undefined;
    let current = this;

    //Recupere l'objet contenant le symbole et le code de la devise
    //Fournis par le settingService
    let currency = settingService.getCurrencyAsync().$$state.value;

    let billsHandler = undefined;
    let coinsHandler = undefined;
    let otherHandler = undefined;

    $scope.model = {
        keypad: "partials/numeric.html"
    };

    // TODO: Changer les devises
    // TODO: Récupérer le settings devise

    $scope.init = function () {
        console.log(currency);

        //Default : EUR, €
        $scope.money = {
            "total": 0,
            "other": 0,
            "bills":
                [
                    {
                        "value": 500,
                        "picture": "img/money/billet-500e.png",
                        "count": 0
                    },
                    {
                        "value": 200,
                        "picture": "img/money/billet-200e.png",
                        "count": 0
                    },
                    {
                        "value": 100,
                        "picture": "img/money/billet-100e.png",
                        "count": 0
                    },
                    {
                        "value": 50,
                        "picture": "img/money/billet-50e.png",
                        "count": 0
                    },
                    {
                        "value": 20,
                        "picture": "img/money/billet-20e.png",
                        "count": 0
                    },
                    {
                        "value": 10,
                        "picture": "img/money/billet-10e.png",
                        "count": 0
                    },
                    {
                        "value": 5,
                        "picture": "img/money/billet-5e.png",
                        "count": 0
                    }
                ],
            "coins":
                [
                    {
                        "value": 2,
                        "picture": "img/money/piece-2e.png",
                        "count": 0
                    },
                    {
                        "value": 1,
                        "picture": "img/money/piece-1e.png",
                        "count": 0
                    },
                    {
                        "value": 0.5,
                        "picture": "img/money/piece-50c.png",
                        "count": 0
                    },
                    {
                        "value": 0.20,
                        "picture": "img/money/piece-20c.png",
                        "count": 0
                    },
                    {
                        "value": 0.1,
                        "picture": "img/money/piece-10c.png",
                        "count": 0
                    },
                    {
                        "value": 0.05,
                        "picture": "img/money/piece-5c.png",
                        "count": 0
                    },
                    {
                        "value": 0.02,
                        "picture": "img/money/piece-2c.png",
                        "count": 0
                    },
                    {
                        "value": 0.01,
                        "picture": "img/money/piece-1c.png",
                        "count": 0
                    }
                ]
        };

        //Si l'objet currency est defini (il existe dans le fichier settings)
        if (currency) {
            //Si les propriété symbole ou code existe
            if (currency.currencySymbol || currency.CurrencyCode) {
                //Si le symbole est $
                if (currency.currencySymbol.localeCompare('$') == 0) {
                    //Si le code est CAD
                    if (currency.CurrencyCode.localeCompare('CAD') == 0) {
                        $scope.money = {
                            "total": 0,
                            "other": 0,
                            "bills":
                                [
                                    {
                                        "value": 100,
                                        "picture": "img/money/billet-100-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 50,
                                        "picture": "img/money/billet-50-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 20,
                                        "picture": "img/money/billet-20-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 10,
                                        "picture": "img/money/billet-10-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 5,
                                        "picture": "img/money/billet-5-cad.png",
                                        "count": 0
                                    }
                                ],
                            "coins":
                                [
                                    {
                                        "value": 1,
                                        "picture": "img/money/piece-1-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.5,
                                        "picture": "img/money/piece-50c-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.25,
                                        "picture": "img/money/piece-25c-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.1,
                                        "picture": "img/money/piece-10c-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.05,
                                        "picture": "img/money/piece-5c-cad.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.01,
                                        "picture": "img/money/piece-1c-cad.png",
                                        "count": 0
                                    }
                                ]
                        };
                        //Si le symbole est USD
                    }
                    else if (currency.CurrencyCode.localeCompare('USD') == 0) {
                        $scope.money = {
                            "total": 0,
                            "other": 0,
                            "bills":
                                [
                                    {
                                        "value": 100,
                                        "picture": "img/money/billet-199e.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 50,
                                        "picture": "img/money/billet-50e.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 20,
                                        "picture": "img/money/billet-20e.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 10,
                                        "picture": "img/money/billet-10e.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 5,
                                        "picture": "img/money/billet-5e.png",
                                        "count": 0
                                    }
                                ],
                            "coins":
                                [
                                    {
                                        "value": 2,
                                        "picture": "img/money/piece-2e.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 1,
                                        "picture": "img/money/piece-1e.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.5,
                                        "picture": "img/money/piece-50c.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.25,
                                        "picture": "img/money/piece-20c.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.1,
                                        "picture": "img/money/piece-10c.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.05,
                                        "picture": "img/money/piece-5c.png",
                                        "count": 0
                                    },
                                    {
                                        "value": 0.01,
                                        "picture": "img/money/piece-1c.png",
                                        "count": 0
                                    }
                                ]
                        };
                    }
                }
            }
        }


        for (let i = 0; i < $scope.money.bills.length; i++) {
            billsHandler = $scope.$watch("money.bills[" + i + "].count", function () {
                $scope.updateTotal();
            });
        }

        for (let i = 0; i < $scope.money.coins.length; i++) {
            coinsHandler = $scope.$watch("money.coins[" + i + "].count", function () {
                $scope.updateTotal();
            });
        }

        otherHandler = $scope.$watch("money.other", function () {
            $scope.updateTotal();
        });

    };

    $scope.$on("$destroy", function () {
        if (billsHandler) billsHandler();
        if (coinsHandler) coinsHandler();
        if (otherHandler) otherHandler();
    });

    $scope.editMoneyCount = function (evt, obj) {

        $scope.model.keypad = "partials/numeric.html";

        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "white";
        }

        current.currentEditElement = evt.toElement;

        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "#EFEB98";
        }

        current.currentText = evt.toElement.value == 0 ? "" : evt.toElement.value;

        const elementBounds = evt.toElement.getBoundingClientRect();

        let params = {
            position: {
                x: 0,
                y: 0
            }
        };

        params.position.x = elementBounds.left > $(window).width() / 2 ? ($(window).width() / 2) - 215 : ($(window).width() / 2);
        params.position.y = ($(window).height() / 2) - 250;

        $scope.$emit(Keypad.OPEN, "moneyKeypad", params);
        current.currentEdit = obj;
        current.isCountEdit = true;
    };

    $scope.editMoneyValue = function (evt) {

        $scope.model.keypad = "partials/decimal.html";

        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "white";
        }

        current.currentEditElement = evt.toElement;

        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "#EFEB98";
        }

        current.currentText = evt.toElement.value == 0 ? "" : evt.toElement.value;

        const elementBounds = evt.toElement.getBoundingClientRect();

        let params = {
            position: {
                x: 0,
                y: 0
            }
        };

        params.position.x = ($(window).width() / 2) - 107;
        params.position.y = elementBounds.top - 340;

        $scope.$emit(Keypad.OPEN, "moneyKeypad", params);
        current.currentEdit = undefined;
        current.isCountEdit = false;
    };

    $scope.$on(Keypad.KEY_PRESSED, function (event, data) {
        current.currentText += data;

        if (current.isCountEdit) {
            current.currentEdit.count = parseInt(current.currentText);
            current.currentEditElement.value = current.currentText;
        } else {
            $scope.money.other = parseFloat(current.currentText);
            current.currentEditElement.value = current.currentText;
        }

        $scope.$digest();
    });

    $scope.$on(Keypad.MODIFIER_KEY_PRESSED, function (event, key, id) {
        switch (key) {
            case "CLEAR":
                current.currentText = "";

                if (current.isCountEdit) {
                    current.currentEdit.count = 0;
                } else {
                    $scope.money.other = 0;
                }

                $scope.$digest();

                break;
            case "NEXT":
                if (current.currentEditElement != undefined) {
                    current.currentEditElement.style.backgroundColor = "white";
                }
                $scope.$digest();

                $scope.$emit(Keypad.CLOSE, "moneyKeypad");
                break;
        }
    });

    $scope.updateTotal = function () {
        var total = 0;

        for(let b of $scope.money.bills) {
            total = total + (b.value * b.count);
        }

        for(let c of $scope.money.coins) {
            total = total + (c.value * c.count);
        }

        total = total + roundValue($scope.money.other);
        $scope.money.total = roundValue(total);
    };

    $scope.ok = function () {
        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "white";
        }
        $scope.$emit(Keypad.CLOSE, "moneyKeypad");
        $uibModalInstance.close($scope.money.total);
    };

    $scope.cancel = function () {
        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "white";
        }
        $scope.$emit(Keypad.CLOSE, "moneyKeypad");
        $uibModalInstance.dismiss('cancel');
    }
});