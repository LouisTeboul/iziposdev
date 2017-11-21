app.controller('ModalYperiodPickController', function ($scope, $rootScope, $uibModal, $uibModalInstance, settingService, eventService, cashMovementService, zposService, $translate, posPeriodService, posService, posUserService) {


    $scope.init = function () {
        $scope.model = {
            chosenHid: undefined,
            chosenYpid: undefined,
            currentZpId: undefined,
            mode: undefined,
            hids: [],
            closingEnable: posUserService.isEnable('CLOS', true)
        };

        $scope.activeHidBtn = undefined;
        $scope.activeYpidBtn = undefined;



        // Recupere l'id de la ZPeriod en cours
        posPeriodService.getZPeriodAsync(false).then(function (z) {
            $scope.model.currentZpId = z.id;
            $scope.zp = z;
            console.log(z.id);
            //Recupere la liste de tout les HID associés a un tickets dans zpos
            //Il faut recup toutes les caisse associé à une periode Y
            posPeriodService.getAllYPeriodAsync('*').then(function(yp){
                console.log(yp);
                var index = -1;
                Enumerable.from(yp).forEach(function (row) {
                    console.log(row);
                    posService.getPosNameAsync(row.hardwareId).then(function(alias){

                        if ($scope.model.closingEnable || row.hardwareId == $rootScope.PosLog.HardwareId) {

                            var hidExist = Enumerable.from($scope.model.hids).firstOrDefault(function(x){
                                return row.hardwareId == x.hid;
                            });
                            if(!hidExist){
                                $scope.model.hids.push({ hid: row.hardwareId, alias: alias });
                                index++;
                                if (row.hardwareId == $rootScope.PosLog.HardwareId) {
                                    $scope.setHid(row.hardwareId, index);
                                }
                            }
                        }
                    });
                });
                console.log(yp);
            });
        }).catch(function(err){
            console.log(err);
        });




    };
    var getYperiods = function(hid, currentyPeriod){
        if (hid == '*') {
            $scope.model.chosenHid = undefined;
            $scope.model.chosenYpid = undefined;
        } else {
            $scope.model.chosenHid = hid;
            posPeriodService.getAllYPeriodAsync(hid).then(function (ys) {
                console.log(ys);
                $scope.yperiods = ys;
                dateFormat(ys[0].startDate);

                // Préselectionner du YPeriod Courant :
                var indexY = -1;
                Enumerable.from(ys).forEach(function (y) {
                    /*
                    posPeriodService.getYPaymentValuesAsync(y.id).then(function(p){

                        console.log(p.PaymentLines);
                        y.isEmpty = p ? false : true;
                        */
                        indexY++;
                        if (currentyPeriod && y.id == currentyPeriod.id) {
                            $scope.setYPeriod(y, indexY);
                        }
                        /*
                    });
                    */

                });


            });
        }

    };

    $scope.setHid = function (hid, index) {
        console.log(index);
        $scope.activeHidBtn = index;
        $scope.activeYpidBtn = undefined;
        $scope.yperiods = [];

        posPeriodService.getYPeriodAsync(hid, undefined, false, false).then(function(currentyPeriod) {
            getYperiods(hid, currentyPeriod);

        }, function(err){
            getYperiods(hid, undefined);
        });
    };

    $scope.printDate = function (yp){
        return dateFormat(yp.startDate);
    };


    $scope.setYPeriod = function (yp, index) {

        $scope.activeYpidBtn = index;
        $scope.isZdisabled = yp.isEmpty;

        if (yp == '*') {
            //Si il n'y a aucune periode ouverte pour cette caisse, on empeche la fermeture
            var atLeastOneOpenPeriod = Enumerable.from($scope.yperiods).firstOrDefault(function(x){
                return !x.endDate;
            });
            if(atLeastOneOpenPeriod){
                $scope.isClosingEnabled = true;
            } else {
                $scope.isClosingEnabled = false;
            }
            $scope.model.chosenYpid = undefined;
        } else {
            $scope.isClosingEnabled = yp.endDate ? false : true;
            $scope.model.chosenYpid = yp.id;
            //Verifié si la periode contient des ticket,
            //Si non, il faut bloquer l'affichage du Z
        }


    };
    $scope.determineMode = function(){
        /** Il faut set le mode
         *  Mode 1 : Fermeture Service = Une caisse une periode
         *  Mode 2 : Fermeture Caisse = Une caisse toutes les periodes
         *  Mode 3 : Fermeture journée = toutes les caisses (ou caisse unique) toutes les periodes
         */

        //Si on a selectionner toutes les caisses
        if ($scope.model.chosenHid == undefined || $scope.model.hids.length == 1) {
            //Si on a selectionner toutes les periodes
            if ($scope.model.chosenYpid == undefined) {
                $scope.model.mode = { idMode: 3, text: "Fermeture de journée", title: "Z de journée" };
                //Si on a selectionner une periode
            } else {
                $scope.model.mode = { idMode: 1, text: "Fermeture de service", title: "Z de service" };
            }
            //Si on a selectionné une caisse
        } else {
            //Si on a selectionner toutes les periodes
            if ($scope.model.chosenYpid == undefined) {
                //SI c'est la seul caisse du store, c'est une fermeture journée
                $scope.model.mode = { idMode: 2, text: "Fermeture de caisse", title: "Z de caisse" };
                //Si on a selectionner une periode
            } else {
                $scope.model.mode = { idMode: 1, text: "Fermeture de service", title: "Z de service" };
            }
        }
    };

    $scope.openZ = function () {
        $uibModalInstance.close();

        $scope.determineMode();

        $scope.currentYPeriod = $scope.model.chosenYpid ? Enumerable.from($scope.yperiods).firstOrDefault(function (yP) { return yP.id == $scope.model.chosenYpid; }) : undefined;

        $uibModal.open({
            templateUrl: 'modals/modalStatsPeriod.html',
            controller: 'ModalStatsPeriodController',
            size: 'max',
            resolve: {
                closePosParameters: function () {
                    return {
                        hidList: $scope.model.hids,
                        hid: $scope.model.chosenHid,
                        zperiod: $scope.zp,
                        yperiods: $scope.yperiods,
                        yperiod: $scope.currentYPeriod,
                        mode: $scope.model.mode

                    }
                }
            }
        });
    };


    $scope.closePos = function () {
        $uibModalInstance.close();


        $scope.determineMode();
        $scope.currentYPeriod = $scope.model.chosenYpid ? Enumerable.from($scope.yperiods).firstOrDefault(function (yP) { return yP.id == $scope.model.chosenYpid; }) : undefined;
        console.log($scope.currentYPeriod);

        $uibModal.open({
            templateUrl: 'modals/modalClosePos.html',
            controller: 'ModalClosePosController',
            size: 'lg',
            resolve: {
                closePosParameters: function () {
                    var closePosParameters = {
                        hid: $scope.model.chosenHid,
                        hidList: $scope.model.hids,
                        mode : $scope.model.mode,
                        yperiod:$scope.currentYPeriod,
                        yperiods: $scope.model.yperiods,
                        zperiod: $scope.zp
                    };
                    return closePosParameters;

                },
                modalStats : function(){
                    return $uibModalInstance
                }
            },
            backdrop: 'static'
        });
    };



    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');

        setTimeout(function () {
            $rootScope.closeKeyboard();
            $rootScope.closeKeyboard();
        }, 500);
    }
});