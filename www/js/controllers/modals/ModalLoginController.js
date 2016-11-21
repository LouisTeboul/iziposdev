app.controller('ModalLoginController', function ($scope, $rootScope, $uibModalInstance, posUserService, pictureService, Idle ,md5) {
    $scope.init = function () {

        initializePosUsers();
        Idle.unwatch();

    	//  $scope.$emit(Keypad.CLOSE, "numeric");
        $rootScope.closeKeyboard();
    };


    var pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('PosUser') == 0 || args.id.indexOf('Picture') == 0)) {
            initializePosUsers();
        }
    });

    $scope.$on("$destroy", function () {
    	pouchDBChangedHandler();
    	$rootScope.closeKeyboard();
    });

    var initializePosUsers = function()
    {
        posUserService.getPosUsersAsync().then(function (posUsers) {
            var posUsersEnabled = Enumerable.from(posUsers).orderBy('x => x.Name').toArray();

            Enumerable.from(posUsersEnabled).forEach(function (c) {
                pictureService.getPictureUrlAsync(c.PictureId).then(function (url) {
                    if (!url) {
                        url = 'img/photo-non-disponible.png';
                    }
                    c.PictureUrl = url;
                });
            });

            $scope.posUsers = posUsersEnabled;
        }, function (err) {
            console.log(err);
        });
    }

    $scope.listenedString = "";
    $scope.password = "";
    $rootScope.$on(Keypad.KEY_PRESSED, function (event, data) {
        $scope.listenedString += data;
        $scope.password += "*";
        if (md5.createHash($scope.listenedString) == $rootScope.PosUser.Password)
        {
            // Login successfull
            
            $rootScope.PosUserId = $rootScope.PosUser.Id;
            $rootScope.PosUserName = $rootScope.PosUser.Name;
            posUserService.saveEventAsync("Login", 0, 0);
            $uibModalInstance.close();
            posUserService.IsWorking($rootScope.PosUserId).then(function(result)
            {
                if (!result) posUserService.StartWork($rootScope.PosUserId);
            });
        }

        $scope.$digest();
    });

    $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, function (event, key, id) {
        switch (key) {
            case "CLEAR":
                $scope.listenedString = "";
                $scope.password = "";
                $scope.$evalAsync();
                break;
        }
    });


    $scope.login = function (posUser) {


        $scope.listenedString = "";
        $rootScope.PosUser = posUser;
        Idle.watch();

        //var params = {
        //    position: {
        //        x: 0,
        //        y: 0
        //    }
        //}

        //params.position.x = ($(window).width() / 2) + 310;
        //params.position.y = 5;

    	//$scope.$emit(Keypad.OPEN, "numeric", params);


        $rootScope.openKeyboard("numeric", "end-start");
    }

});