app.service('posLogService', function ($rootScope, $q, $http) {
    const self = this;
    let _hardwareId = undefined;

    //Get the hardware id
    //CAUTION : can sometimes be null and cause trouble
    this.getHardwareIdAsync = () => {
        const hIdDefer = $q.defer();

        try {
            if (!_hardwareId) {
                setTimeout(() => {
                    try {
                        _hardwareId = device.uuid;
                        hIdDefer.resolve(_hardwareId);
                    }
                    catch (errHid) {
                        new Fingerprint2().get((result) => {
                            if (result.length === 0) {
                                result = undefined;
                            }

                            _hardwareId = result;
                            hIdDefer.resolve(_hardwareId);
                        });
                    }
                }, 2000);
            }
            else {
                hIdDefer.resolve(_hardwareId);
            }
        }
        catch (err) {
            hIdDefer.reject(err);
        }

        return hIdDefer.promise;
    };

    // démarrage du terminal

    //Log the event from post
    //Events are sent to the replicate
    //TODO: Log in the audit event
    this.updatePosLogAsync = () => {
        const posLogDefer = $q.defer();

        try {
            let dateInfo = new Date().toString('dd/MM/yyyy H:mm:ss');
            let hardwareType = "BROWSER";

            if ($rootScope.isWindowsContainer) {
                hardwareType = "WINDOWS";
            }
            else if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                hardwareType = "TABLET";
            }

            self.getHardwareIdAsync().then((result) => {
                let posLog = {
                    HardwareId: result,
                    Date: dateInfo,
                    IziboxVersion: $rootScope.IziBoxConfiguration.VersionIziBox,
                    PosVersion: $rootScope.Version,
                    PosDescription: hardwareType
                };
                let urlApi = $rootScope.APIBaseURL + "/saveposlog";

                $http.post(urlApi, posLog).then(() => {
                    posLogDefer.resolve(posLog);
                }, (err) => {
                    posLogDefer.reject(err);
                });
            }, (errHId) => {
                posLogDefer.reject(errHId);
            });
        }
        catch (err) {
            posLogDefer.reject(err);
        }
        return posLogDefer.promise;
    };
});