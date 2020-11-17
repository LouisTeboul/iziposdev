/**
 * Service used for application authentification
 * used for booking
 */
app.service('authService', function ($rootScope, $http, loyaltyService) {

    const self = this;
    let token = null;
    $rootScope.Logged = false;
    let logged = false;

    //Event : If we have an hardwareId we can log
    $rootScope.$watch('PosLog.HardwareId', () => {
        if($rootScope.PosLog && $rootScope.PosLog.HardwareId) {
            if (typeof devOAuthToken != "undefined") {
                token = devOAuthToken;
                logged = true;                
                $rootScope.Logged = true;

                loyaltyService.getLoyaltyClasses().then((classes) => {
                    $rootScope.loyaltyClasses = classes;
                }, (err) => {
                    console.error(err);
                });
            } else {
                self.login();
            }
        }
    });

    //Get Authentification token
    this.getToken = () => {
        return token;
    };

    //Is the application logged
    this.isLogged = () => {
        return logged;
    };

    //Log the application
    this.login = () => {
        if ($rootScope.PosLog && $rootScope.PosLog.HardwareId) {
            let apiUrl = $rootScope.APIBaseURL + '/GetPosToken?hardwareId=' + $rootScope.PosLog.HardwareId;
            $http.post(apiUrl).then((response) => {
                console.log(response);
                token = response.data;
                logged = true;
                $rootScope.Logged = true;
                loyaltyService.getLoyaltyClasses().then((classes) => {
                    $rootScope.loyaltyClasses = classes;
                }, (err) => {
                    console.error(err);
                });
            }, (response) => {
                console.log(response);
                logged = false;
                $rootScope.Logged = false;

                if(!$rootScope.borne && $rootScope.IziBoxConfiguration.UseFid) {
                    swal({
                        title: "Erreur d'authentification !",
                        text: "Veuillez contacter le support"
                    });
                }    
            });
        }
    };
});