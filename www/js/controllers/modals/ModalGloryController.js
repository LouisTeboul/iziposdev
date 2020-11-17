app.controller('ModalGloryController', function ($scope, $rootScope, $uibModalInstance, $uibModal) {
    $scope.loading = true;
    $scope.restock = false;
    $scope.deposit = false;
    $scope.coinsOpen = false;
    $scope.billsOpen = false;

    $scope.init = () => {
        if (!window.glory) { //MonoPlugin
            swal({ title: "Glory not connected." });
            $uibModalInstance.dismiss('cancel');
        }

        $scope.loading = false;
    };

    $scope.Restock = () => {
        $scope.loading = true;
        $scope.restock = true;
        console.log("Restock");
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.restock(resolve, reject);
        });
        gloryPromise.then((res) => { }, (err) => {
            console.error("Restock error : " + err);
            swal({ title: "Restock error : " + err });
            $scope.loading = false;
            $scope.restock = false;
            $scope.$evalAsync();
        });
    };

    $scope.StopRestock = () => {
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.stopRestock(resolve, reject);
        });
        $scope.restock = false;
        $scope.$evalAsync();
        gloryPromise.then((res) => {
            let inventory = JSON.parse(res);

            showInventory(inventory);

            $scope.loading = false;
            $scope.$evalAsync();
        }, (err) => {
            console.error("StopRestock error : " + err);
            swal({ title: "StopRestock error : " + err });
            $scope.loading = false;
            $scope.$evalAsync();
        });
    };

    $scope.CancelRestock = () => {
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.cancelRestock(resolve, reject);
        });
        $scope.restock = false;
        $scope.$evalAsync();
        gloryPromise.then((res) => {
            $scope.loading = false;
            $scope.$evalAsync();
        }, (err) => {
            console.error("CancelRestock error : " + err);
            swal({ title: "CancelRestock error : " + err });
            $scope.loading = false;
            $scope.$evalAsync();
        });
    };

    $scope.Collect = (type) => {
        $scope.loading = true;
        console.log("GetInventory for collect");
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.getInventory(resolve, reject, 'MON');
        });
        gloryPromise.then((res) => {
            let inventory;
            if (res) {
                inventory = JSON.parse(res);
            }

            if (type === "EXIT") {
                inventory.Values = inventory.Values.filter(t => t.DevId === 2);
            }

            let modalCash = $uibModal.open({
                templateUrl: 'modals/modalCashValues.html',
                controller: 'ModalCashValuesController',
                size: 'lg',
                backdrop: 'static',
                resolve: {
                    moneyInventory: () => {
                        return inventory;
                    },
                    allowEdit: () => {
                        return true;
                    },
                    returnListBC: () => {
                        return true;
                    },
                    isGlory: () => {
                        return true;
                    }
                }
            });

            modalCash.result.then((inventory) => {
                $scope.loading = true;
                console.log("Collect");
                const gloryPromiseS = new Promise((resolve, reject) => {
                    window.glory.collect(resolve, reject, JSON.stringify(inventory), type);
                });
                gloryPromiseS.then((res) => {
                    $scope.loading = false;
                    $scope.$evalAsync();
                }, (err) => {
                    console.error("Collect error : " + err);
                    swal({ title: "Collect error : " + err });
                    $scope.loading = false;
                    $scope.$evalAsync();
                });
            });

            $scope.loading = false;
            $scope.$evalAsync();
        }, (err) => {
            console.error("GetInventory for collect error : " + err);
            swal({ title: "GetInventory for collecterror : " + err });
            $scope.loading = false;
            $scope.$evalAsync();
        });
    };

    $scope.GetInventory = (type) => {
        $scope.loading = true;
        console.log("GetInventory");
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.getInventory(resolve, reject, type);
        });
        gloryPromise.then((res) => {
            let inventory;
            if (res) {
                inventory = JSON.parse(res);
            }

            inventory.Values = inventory.Values.filter(t => t.Value != 0).reduce((acc, cur) => {
                if (!acc) {
                    acc.push(cur);
                } else {
                    let exist = acc.find(p => p.Value === cur.Value);
                    if (!exist) {
                        acc.push(cur);
                    } else {
                        if (exist.Denomination === "0") {
                            exist.Denomination = cur.Denomination;
                        }
                    }
                }
                return acc;
            }, []);

            showInventory(inventory);

            $scope.loading = false;
            $scope.$evalAsync();
        }, (err) => {
            console.error("GetInventory error : " + err);
            swal({ title: "GetInventory error : " + err });
            $scope.loading = false;
            $scope.$evalAsync();
        });
    };

    $scope.OpenMoney = (type) => {
        $scope.loading = true;
        if (type === 'COIN') {
            $scope.coinsOpen = true;
        } else {
            $scope.billsOpen = true;
        }
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.openMoney(resolve, reject, type);
        });
        gloryPromise.then((res) => { }, (err) => {
            $scope.loading = false;
            if (type === 'COIN') {
                $scope.coinsOpen = false;
            } else {
                $scope.billsOpen = false;
            }
        });
    };

    $scope.CloseMoney = (type) => {
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.closeMoney(resolve, reject, type);
        });
        gloryPromise.then((res) => {
            $scope.loading = false;
            if (type === 'COIN') {
                $scope.coinsOpen = false;
            } else {
                $scope.billsOpen = false;
            }
            $scope.$evalAsync();
        }, (err) => {
            console.error("CloseMoney " + type + " error : " + err);
            swal({ title: "CloseMoney " + type + " error." });
            $scope.loading = false;
            if (type === 'COIN') {
                $scope.coinsOpen = false;
            } else {
                $scope.billsOpen = false;
            }
            $scope.$evalAsync();
        });
    };

    $scope.Reset = () => {
        $scope.loading = true;
        console.log("Reset glory");
        const gloryPromise = new Promise((resolve, reject) => {
            window.glory.reset(resolve, reject);
        });
        gloryPromise.then((res) => {
            $scope.loading = false;
            $scope.$evalAsync();
        }, (err) => {
            console.error("Glory reset error : " + err);
            swal({ title: "Glory reset error : " + err });
            $scope.loading = false;
            $scope.$evalAsync();
        });
    };

    $scope.Admin = () => {
        console.log("Admin glory");
        window.glory.openAdminGlory();
    };

    const showInventory = (inventory) => {
        $uibModal.open({
            templateUrl: 'modals/modalCashValues.html',
            controller: 'ModalCashValuesController',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                moneyInventory: () => {
                    return inventory;
                },
                allowEdit: () => {
                    return false;
                },
                returnListBC: () => {
                    return false;
                },
                isGlory: () => {
                    return true;
                }
            }
        });
    };

    $scope.cancel = () => {
        $uibModalInstance.dismiss('cancel');
    };
});