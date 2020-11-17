app.service('posUserService', function ($rootScope, $q, $http) {
    const self = this;

    //Get all Pos User
    this.getPosUsersAsync = function () {
        const posUsersDefer = $q.defer();

        if ($rootScope.modelDb.databaseReady) {
            $rootScope.dbInstance.allDocs({
                include_docs: true,
                startkey: 'PosUser_',
                endkey: 'PosUser_\uffff'
            }).then((result) => {
                let posUsers = result.rows ? result.rows.map((row) => row.doc) : [];

                posUsersDefer.resolve(posUsers);
            }).catch((err) => {
                console.error(err);
                posUserDefer.reject(err);
            });
        } else {
            posUsersDefer.reject("Database isn't ready !");
        }

        return posUsersDefer.promise;
    };

    /* Get a pos User by Id */
    // this.getposUserByIdAsync = (idStr) => {
    //     const posUserDefer = $q.defer();
    //     let id = parseInt(idStr);
    //
    //     if ($rootScope.modelDb.databaseReady) {
    //         $rootScope.dbInstance.get('PosUser_' + padLeft(id, 16)).then((posUser) => {
    //             posUserDefer.resolve(posUser);
    //         }, (err) => {
    //             console.error(err);
    //             posUserDefer.reject(err);
    //         });
    //     } else {
    //         posUserDefer.reject("Database isn't ready !");
    //     }
    //
    //     return posUserDefer.promise;
    // };

    /* Save Pos User Event
     * EventId : 0 (login) 1(logout) 2(other) and PosRightId when used
     */
    this.saveEventAsync = (event, eventId, posRightId, posUserId) => {
        const saveDefer = $q.defer();

        let ob = {
            PosUserId: $rootScope.PosUserId,
            EventId: eventId,
            PosRightId: posRightId,
            Date: new Date(),
            Message: event
        };
        if (posUserId) {
            ob.PosUserId = posUserId;
        }

        let urlApi = $rootScope.APIBaseURL + "/saveevent";

        $http.post(urlApi, ob).then(() => {
            saveDefer.resolve({ success: true });
        }, (err) => {
            saveDefer.reject(err);
        });

        return saveDefer.promise;
    };

    /* Is this user ...*/
    this.isEnable = (internalCode, doNotShow) => {
        // TODO: Delete  => Login mandatory with Nf
        if ($rootScope.IziBoxConfiguration && !$rootScope.IziBoxConfiguration.LoginRequired) {
            return true;
        }
        if ($rootScope.PosUser && $rootScope.PosUser.Permissions && $rootScope.PosUser.Permissions.some(x => x.InternalCode === internalCode)) {
            let p = $rootScope.PosUser.Permissions.find(x => x.InternalCode === internalCode);
            if (p.GenerateEvent) {
                self.saveEventAsync(internalCode + ":" + p.Description, 2, p.Id);
            }
            return true;
        } else {
            if (!doNotShow) {
                swal({ title: "Vous n'avez pas les droits nécessaires." });
            }
        }
    };

    // ADD: Modal for listing pos user

    /* True if pos users are  posuser is working */
    // this.AreWorking = function (PosUsers) {
    //     var self = this;
    //     var posUserDefer = $q.defer();
    //
    //     if ($rootScope.modelDb.databaseReady) {
    //         $rootScope.dbFreeze.rel.find('PosUser').then(function (result) {
    //             for (var i = 0; i < result.PosUsers.length; i++) {
    //                 user = Enumerable.from(PosUsers).firstOrDefault('x=> x.Id == ' + result.PosUsers[i].id);
    //                 if (user) {
    //                     user.IsWorking = false;
    //                     if (result.PosUsers[i].IsWorking) user.IsWorking = true;
    //                 }
    //             }
    //             posUserDefer.resolve(true);
    //         }, function (err) {
    //             posUserDefer.resolve(false);
    //         });
    //     } else {
    //         posUserDefer.reject("Database isn't ready !");
    //     }
    //     return posUserDefer.promise;
    // };

    /* True if a posuser is working */
    this.IsWorking = (PosUserId) => {
        const posUserDefer = $q.defer();
        let id = parseInt(PosUserId);
        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";

        if ($rootScope.modelDb.databaseReady) {
            $http.get(urlFreezeApi + "/posUser?userId=" + id).then((result) => {
                if (!result.data) posUserDefer.resolve(false);
                else {
                    if (result.data.IsWorking) posUserDefer.resolve(true);
                    else posUserDefer.resolve(false);
                }
            }, (err) => {
                console.error(err);
                posUserDefer.resolve(false);
            });
        } else {
            posUserDefer.reject("Database isn't ready !");
        }

        return posUserDefer.promise;
    };

    /* Log the event start work in the freeze */
    this.StartWork = (PosUserId) => {
        let id = parseInt(PosUserId);

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";
        $http.post(urlFreezeApi + "/UpdatePosUser?userId=" + id + "&isWorking=true").then(() => {
            //self.saveEventAsync("StopWork", -2, 0, PosUserId);
        }, (err) => {
            console.error("Error posUserService 'StartWork' :" + err);
        });
    };

    /* Log the event stop work in the freeze */
    this.StopWork = (PosUserId) => {
        let id = parseInt(PosUserId);

        let urlFreezeApi = $rootScope.APIBaseURL + "/freeze";
        $http.post(urlFreezeApi + "/UpdatePosUser?userId=" + id + "&isWorking=false").then(() => {
            //self.saveEventAsync("StopWork", -2, 0, PosUserId);
        }, (err) => {
            console.error("Error posUserService 'StopWork' :" + err);
        });
    };
});