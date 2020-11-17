app.controller('ModalLoginController', function ($scope, $rootScope, $uibModalInstance, posUserService, pictureService, Idle, md5) {
    $scope.init = () => {
        delete $rootScope.PosUser;
        initializePosUsers();
        Idle.unwatch();    	 // mise en veille 
        $rootScope.closeKeyboard();
    };

    const pouchDBChangedHandler = $rootScope.$on('pouchDBChanged', function (event, args) {
        if (args.status == "Change" && (args.id.indexOf('PosUser') == 0 || args.id.indexOf('Picture') == 0)) {
            initializePosUsers();
        }
    });
    const loginKeyPressHandler = $rootScope.$on(Keypad.KEY_PRESSED, (event, data) => {
        if($rootScope.PosUser) {
            $scope.listenedString += data;
            $scope.password += "*";
            if (md5.createHash($scope.listenedString) === $rootScope.PosUser.Password) {
                // Login successfull            
                $rootScope.PosUserId = $rootScope.PosUser.Id;
                $rootScope.PosUserName = $rootScope.PosUser.Name;
                //posUserService.saveEventAsync("Login", 0, 0);
                $uibModalInstance.close();
                //posUserService.IsWorking($rootScope.PosUserId).then((result) => {
                    //if (!result) posUserService.StartWork($rootScope.PosUserId);
                //});
            }    
            $scope.$digest();
        }
    });

    const loginModifierKeyPressHandler = $rootScope.$on(Keypad.MODIFIER_KEY_PRESSED, (event, key) => {
        switch (key) {
            case "CLEAR":
                $scope.listenedString = "";
                $scope.password = "";
                $scope.$evalAsync();
                break;
        }
    });
    

    $scope.$on("$destroy", () => {
        pouchDBChangedHandler();
        loginKeyPressHandler();
        loginModifierKeyPressHandler();
        $rootScope.closeKeyboard();
    });

    const initializePosUsers = () => {
        posUserService.getPosUsersAsync().then((posUsers) =>{
            const posUsersEnabled = Enumerable.from(posUsers).orderBy('x => x.Name').toArray();

            for (let cat of posUsersEnabled) {
                if (!cat.PictureUrl) {
                    cat.PictureUrl = 'img/photo-non-disponible.png';
                }
            }

            $scope.posUsers = posUsersEnabled;
        }, (err) => {
            console.error(err);
        });
    };

    $scope.listenedString = "";
    $scope.password = "";


    $scope.login = (posUser) => {
        $scope.password = "";
        $scope.listenedString = "";
        $rootScope.PosUser = posUser;
        Idle.watch();
        $rootScope.openKeyboard("numeric", "end-start");
    };
});