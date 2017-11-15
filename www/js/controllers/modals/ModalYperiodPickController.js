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

        //Si on trouve l'HID de la caisse dans hids, on le selectionne par defaut


        posPeriodService.getAllYPeriodAsync('*').then(function (y) {
            $scope.yperiods = y;
        });

        $scope.activeHidBtn = undefined;
        $scope.activeYpidBtn = undefined;



        // Recupere l'id de la ZPeriod en cours
        posPeriodService.getZPeriodAsync(false).then(function (z) {
            $scope.model.currentZpId = z.id;
            $scope.zp = z;
            console.log(z.id);
            //Recupere la liste de tout les HID associés a un tickets dans zpos
            $rootScope.remoteDbZPos.query("zpos/allHid", {
                startkey : [z.id],
                endkey : [z.id, {}],
                reduce: true,
                group: true
            }).then(function (resAllHid) {
                console.log(resAllHid);
                Enumerable.from(resAllHid.rows).forEach(function (row) {
                    posService.getPosNameAsync(row.key[1]).then(function(alias){

                        if ($scope.model.closingEnable || row.key[1] == $rootScope.PosLog.HardwareId) {
                            $scope.model.hids.push({ hid: row.key[1], alias: alias });
                        }
                        /*
                        if(row.key[1] == $rootScope.PosLog.HardwareId) {
                            $scope.setHid(row.key[1], undefined);
                        }
                        */
                    });

                });
            })
        }).catch(function(err){
            console.log(err);
        });




    };

    $scope.setHid = function (hid, index) {
        $scope.activeHidBtn = index;
        $scope.yperiods = [];

        posPeriodService.getAllYPeriodAsync(hid, null, false).then(function (y) {
            $scope.yperiods = y;
            dateFormat(y[0].startDate);
            if (hid == '*') {
                $scope.model.chosenHid = undefined;
            } else {
                $scope.model.chosenHid = hid;
            }
        });
    };

    $scope.printDate = function (yp){
        return dateFormat(yp.startDate);
    };


    $scope.setYPeriod = function (ypid, index) {

        $scope.activeYpidBtn = index;
        if (ypid == '*') {
            $scope.model.chosenYpid = undefined;
        } else {
            $scope.model.chosenYpid = ypid;
        }


    };

    $scope.openZ = function () {
        $uibModalInstance.close();

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
        //

        var currentYPeriod = $scope.model.chosenYpid ? Enumerable.from($scope.yperiods).firstOrDefault(function (yP) { return yP.id == $scope.model.chosenYpid; }) : undefined;

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
                        yperiod: currentYPeriod,
                        mode: $scope.model.mode

                    }
                }
            }
        });


    };


    $scope.ok = function () {


    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');

        setTimeout(function () {
            $rootScope.closeKeyboard();
            $rootScope.closeKeyboard();
        }, 500);
    }
});