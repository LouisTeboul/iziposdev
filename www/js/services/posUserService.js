app.service('posUserService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        this.getPosUsersAsync = function () {
            var self = this;
            var posUsersDefer = $q.defer();

            if ($rootScope.modelDb.databaseReady) {
                $rootScope.dbInstance.rel.find('PosUser').then(function (results) {
                    var posUsers = self.composePosUsers(results);
                    posUsersDefer.resolve(posUsers);

                }, function (err) {
                });
            } else {
                posUsersDefer.reject("Database isn't ready !");
            }

            return posUsersDefer.promise;
        }

        this.getposUserByIdAsync = function (idStr) {
            var self = this;
            var posUserDefer = $q.defer();
            var id = parseInt(idStr);

            if ($rootScope.modelDb.databaseReady) {
                $rootScope.dbInstance.rel.find('PosUser',id).then(function (results) {
                    var posUsers = self.composePosUsers(results);
                    var posUser = Enumerable.from(posUsers).firstOrDefault();
                    posUserDefer.resolve(posUser);

                }, function (err) {
                });
            } else {
                posUserDefer.reject("Database isn't ready !");
            }

            return posUserDefer.promise;
        }

        this.composePosUsers = function (values) {

            var self = this;
            var posUsers = [];

            for (var i = 0; i < values.PosUsers.length; i++) {
                var posUser = values.PosUsers[i];

                var posUserPicture = undefined;


                if (posUser.PictureId) {
                    posUserPicture = Enumerable.from(values.Pictures).firstOrDefault('x=> x.Id == ' + posUser.PictureId);
                }

                posUser.Picture = posUserPicture;
                posUsers.push(posUser);
            }
            self.AreWorking(posUsers);
            return posUsers;
        }
        // EventId : 0 (login) 1(logout) 2(other) and PosRightId when used
        this.saveEventAsync = function (event,eventId,posRightId,posUserId) {
            var saveDefer = $q.defer();

            var ob = {
                PosUserId : $rootScope.PosUserId,
                EventId: eventId,
                PosRightId:posRightId,
                Date : new Date(),
                Message : event
            };
            if (posUserId) ob.PosUserId = posUserId;
            $rootScope.dbReplicate.rel.save('Event', ob).then(function (result) {
                saveDefer.resolve(
                {
                    success: true
                });
            }, function (errSave) {
                saveDefer.reject(errSave);
            });
            return saveDefer.promise;
        }
        this.isEnable =  function(internalCode)
        {
            if (!$rootScope.IziBoxConfiguration.LoginRequired) {
                return true;
            }
            if (Enumerable.from($rootScope.PosUser.Permissions).any('x => x.InternalCode=="' + internalCode + '"'))
            {
                var p = Enumerable.from($rootScope.PosUser.Permissions).where('x => x.InternalCode=="' + internalCode + '"').first();
                if (p.GenerateEvent)
                {
                    this.saveEventAsync(internalCode + ":" + p.Description, 2, p.Id);
                }
                return true;
            }
            else
            {
                swal("Vous n'avez pas les droits nécessaires.");
            }
        }

        this.AreWorking = function (PosUsers) {
            var self = this;
            var posUserDefer = $q.defer();            

            if ($rootScope.modelDb.databaseReady) {
                $rootScope.dbFreeze.rel.find('PosUser').then(function (result) {
                    for(var i=0;i<result.PosUsers.length;i++)
                    {
                    	user = Enumerable.from(PosUsers).firstOrDefault('x=> x.Id == ' + result.PosUsers[i].id);
                    	if (user) {
                    		user.IsWorking = false;
                    		if (result.PosUsers[i].IsWorking) user.IsWorking = true;
                    	}
                    }
                    posUserDefer.resolve(true);
                }, function (err) {
                    posUserDefer.resolve(false);
                });
            } else {
                posUserDefer.reject("Database isn't ready !");
            }

            return posUserDefer.promise;
        }

        this.IsWorking = function(PosUserId)
        {

            var self = this;
            var posUserDefer = $q.defer();
            var id = parseInt(PosUserId);

            if ($rootScope.modelDb.databaseReady) {
                $rootScope.dbFreeze.rel.find('PosUser', id).then(function (result) {
                    if (result.PosUsers.length == 0) posUserDefer.resolve(false);
                    else
                    {
                        if (result.PosUsers[0].IsWorking) posUserDefer.resolve(true);
                        else posUserDefer.resolve(false);
                    }
                }, function (err) {
                    posUserDefer.resolve(false);
                });
            } else {
                posUserDefer.reject("Database isn't ready !");
            }

            return posUserDefer.promise;
        }
        this.StartWork = function (PosUserId)
        {
            var self = this;
            var id = parseInt(PosUserId);
            var u = { id: id, IsWorking: true };
            $rootScope.dbFreeze.rel.find('PosUser', id).then(function (result) {
                if (result.PosUsers.length == 0) $rootScope.dbFreeze.rel.save('PosUser',u);
                else {
                    result.PosUsers[0].IsWorking = true;
                    $rootScope.dbFreeze.rel.save('PosUser', result.PosUsers[0]);
                    self.saveEventAsync("StartWork", -1, 0);
                }
            }, function (err) {
           });
        }

        this.StopWork = function (PosUserId) {
            var self = this;
            var id = parseInt(PosUserId);
            var u = { id: PosUserId, IsWorking: true };
            $rootScope.dbFreeze.rel.find('PosUser', id).then(function (result) {
                if (result.PosUsers.length > 0)
                {
                    result.PosUsers[0].IsWorking = false;
                    $rootScope.dbFreeze.rel.save('PosUser', result.PosUsers[0]);
                    
                }
                self.saveEventAsync("StopWork", -2, 0, PosUserId);

            }, function (err) {
            });
        }



    }])