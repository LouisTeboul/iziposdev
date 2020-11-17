app.controller('ModalTRValuesController', function ($scope, $rootScope, $uibModalInstance, paymentValues) {
    $scope.PaymentValues = paymentValues;
    $scope.TicketsResto = null;
    $scope.SearchTR = "";
    $scope.count = 0;
    $scope.TRSupplier = TRSupplier;

    let current = this;
    let TRWatcher = null;

    $scope.model = {
        keypad: "partials/numeric.html"
    };

    $scope.init = () => {
        $scope.TicketsResto = $scope.PaymentValues.TicketsResto;
        if ($scope.TicketsResto) {
            for (let ticket of $scope.TicketsResto) {
                ticket.selected = false;
                ticket.Supplier = parseInt(ticket.Supplier);
            }
        }

        TRWatcher = $scope.$watch("TicketsResto", function () {
            $scope.updateTotal();
        }, true);

        document.addEventListener('keypress', keypressEvent);
    };

    const keypressEvent = (e) => {
        if ($scope.count === 0) {
            if ($scope.SearchTR.length === 0) {
                console.log('Start typing : ' + Date.now());
            }
            $scope.SearchTR += String.fromCharCode(e.keyCode);
            if ($scope.SearchTR.length === 24) {
                if ($scope.count === 0) {
                    $scope.SearchForTR();
                }
            }
        }
    }

    $scope.updateTotal = () => {
        let total = 0;

        if ($scope.TicketsResto) {
            total = $scope.TicketsResto.reduce((acc, cur) => {
                return cur.selected ? acc + cur.value : acc;
            }, 0);
        }

        $scope.total = roundValue(total);
    };

    $scope.ok = () => {
        if (TRWatcher) TRWatcher();
        document.removeEventListener('keypress', keypressEvent);
        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "white";
        }
        $uibModalInstance.close({ total: $scope.total, count: $scope.TicketsResto.length });
    };

    $scope.cancel = () => {
        if (TRWatcher) TRWatcher();
        document.removeEventListener('keypress', keypressEvent);
        if (current.currentEditElement != undefined) {
            current.currentEditElement.style.backgroundColor = "white";
        }
        $uibModalInstance.dismiss('cancel');
    };

    $scope.SearchForTR = () => {
        if ($scope.count === 0) {
            $scope.count++;
            if ($scope.TicketsResto) {
                let currentTR = $scope.TicketsResto.find((tr) => {
                    return tr.barcode === $scope.SearchTR;
                });

                if (currentTR && !currentTR.selected) {
                    currentTR.selected = true;
                    $scope.$evalAsync();
                } else if (currentTR && currentTR.selected) {
                    if ($scope.count === 1) {
                        swal({ title: "Ticket restaurant déjà scanné." });
                    }
                } else if (!currentTR) {
                    if ($scope.count === 1) {
                        swal({ title: "Ticket restaurant déjà scanné." });
                    }
                }
                setTimeout(() => {
                    $scope.SearchTR = "";
                    $scope.count = 0;
                }, 260);
            }
        }
    };
});