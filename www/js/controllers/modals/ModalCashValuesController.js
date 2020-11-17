app.controller('ModalCashValuesController', function ($scope, $uibModalInstance, settingService, moneyInventory, allowEdit, returnListBC, isGlory) {
    this.isCountEdit = true;
    this.currentEdit = undefined;
    this.currentText = "";
    this.currentEditElement = undefined;
    let current = this;

    //Recupere l'objet contenant le symbole et le code de la devise
    //Fournis par le settingService
    let currency = settingService.getCurrencyAsync().$$state.value;

    let moneyHandler = undefined;
    let otherHandler = undefined;

    $scope.allowEdit = allowEdit;
    $scope.isGlory = isGlory;

    $scope.model = {
        keypad: "partials/numeric.html"
    };

    // TODO: Changer les devises
    // TODO: Récupérer le settings devise

    $scope.init = () => {
        console.log(currency);
        
        //Default : EUR, €
        let isInventory = !!moneyInventory;

        if (!isInventory) {
            $scope.money = {
                Total: 0, Values: [
                    { Denomination: "0", DevId: 1, Status: 2, Value: 5 },
                    { Denomination: "0", DevId: 1, Status: 2, Value: 10 },
                    { Denomination: "0", DevId: 1, Status: 2, Value: 20 },
                    { Denomination: "0", DevId: 1, Status: 2, Value: 50 },
                    { Denomination: "0", DevId: 1, Status: 2, Value: 100 },
                    { Denomination: "0", DevId: 1, Status: 2, Value: 200 },
                    { Denomination: "0", DevId: 1, Status: 2, Value: 500 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 0.01 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 0.02 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 0.05 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 0.1 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 0.2 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 0.5 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 1 },
                    { Denomination: "0", DevId: 2, Status: 2, Value: 2 }
                ]
            };
        } else {
            $scope.money = moneyInventory;
        }

        let wrongMoney = $scope.money.Values.find(m => m.Value === 0 && m.Denomination === "0" || m.Denomination === 0);
        if (wrongMoney) {
            $scope.money.Values.splice($scope.money.Values.indexOf(wrongMoney), 1);
        }

        for (let m of $scope.money.Values) {
            if (currency && currency.CurrencyCode !== "EUR" && !isInventory) {
                if (currency.currencySymbol || currency.CurrencyCode) {
                    if (currency.currencySymbol.localeCompare('$') == 0) {
                        if (currency.CurrencyCode.localeCompare('CAD') == 0) {
                            if (m.DevId === 1) {
                                m.Picture = "img/money/billet-" + m.Value + "-cad.png";
                            } else {
                                m.Picture = "img/money/piece-" + m.Value + "-cad.png";
                            }
                        } else if (currency.CurrencyCode.localeCompare('USD') == 0) {
                            if (m.DevId === 1) {
                                m.Picture = "img/money/billet-" + m.Value + "-us.png";
                            } else {
                                m.Picture = "img/money/piece-" + m.Value + "-us.png";
                            }
                        }
                    }
                }
            } else {
                if (m.DevId === 1) {
                    m.Picture = "img/money/billet-" + m.Value + ".png";
                } else {
                    m.Picture = "img/money/piece-" + m.Value + ".png";
                }
            }
        }

        $scope.money.Values.sort((a, b) => {
            return a.Value > b.Value ? 1 : a.Value < b.Value ? -1 : 0;
        });
        
        for (let i = 0; i < $scope.money.Values.length; i++) {
            moneyHandler = $scope.$watch("money.Values[" + i + "].Denomination", () => {
                $scope.updateTotal();
            });
        }
    };

    $scope.$on("$destroy", () => {
        if (moneyHandler) {
            moneyHandler();
        }
        if (otherHandler) {
            otherHandler();
        }
    });

    $scope.editMoneyCount = (evt, obj) => {

        $scope.model.keypad = "partials/numeric.html";

        if (current.currentEditElement) {
            current.currentEditElement.style.backgroundColor = "white";
        }

        current.currentEditElement = evt.toElement;

        if (current.currentEditElement) {
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

    $scope.editMoneyValue = (evt) => {

        $scope.model.keypad = "partials/decimal.html";

        if (current.currentEditElement) {
            current.currentEditElement.style.backgroundColor = "white";
        }

        current.currentEditElement = evt.toElement;

        if (current.currentEditElement) {
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

    $scope.$on(Keypad.KEY_PRESSED, (event, data) => {
        current.currentText += data;

        if (current.isCountEdit) {
            current.currentEdit.count = parseInt(current.currentText);
            current.currentEditElement.value = current.currentText;
        } else {
            current.currentEditElement.value = current.currentText;
        }

        $scope.$digest();
    });

    $scope.$on(Keypad.MODIFIER_KEY_PRESSED, (event, key, id) => {
        switch (key) {
            case "CLEAR":
                current.currentText = "";

                if (current.isCountEdit) {
                    current.currentEdit.count = 0;
                }

                $scope.$digest();

                break;
            case "NEXT":
                if (current.currentEditElement) {
                    current.currentEditElement.style.backgroundColor = "white";
                }
                $scope.$digest();

                $scope.$emit(Keypad.CLOSE, "moneyKeypad");
                break;
        }
    });

    $scope.updateTotal = () => {
        let total = 0;

        for (let m of $scope.money.Values) {
            m.Denomination = Number(m.Denomination);
            total = truncator(total + m.Value * m.Denomination, 2);
        }

        $scope.money.Total = total;
    };

    $scope.ok = () => {
        if (current.currentEditElement) {
            current.currentEditElement.style.backgroundColor = "white";
        }
        $scope.$emit(Keypad.CLOSE, "moneyKeypad");
        if (returnListBC) {
            $uibModalInstance.close($scope.money);
        } else {
            $uibModalInstance.close($scope.money.Total);
        }
    };

    $scope.cancel = () => {
        if (current.currentEditElement) {
            current.currentEditElement.style.backgroundColor = "white";
        }
        $scope.$emit(Keypad.CLOSE, "moneyKeypad");
        $uibModalInstance.dismiss('cancel');
    };
});