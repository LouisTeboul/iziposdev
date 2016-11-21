app.service('posLogService', ['$rootScope', '$q',
    function ($rootScope, $q) {
    	var _hardwareId = undefined;

        this.getHardwareIdAsync = function () {
            var self = this;
            var hIdDefer = $q.defer();

            try {

            	if (!_hardwareId) {
            		setTimeout(function () {
            			try {
            				_hardwareId = device.uuid;
            				hIdDefer.resolve(_hardwareId);
            			} catch (errHid) {

            				new Fingerprint2().get(function (result) {
            					if (result.length == 0) result = undefined;
            					_hardwareId = result;
            					hIdDefer.resolve(_hardwareId);
            				});
            			}
            		}, 2000);
            	} else {
            		hIdDefer.resolve(_hardwareId);
            	}
            } catch (err) {
                hIdDefer.reject(err);
            }

            return hIdDefer.promise;
        }

        this.updatePosLogAsync = function () {
            var self = this;
            var posLogDefer = $q.defer();

            try {
                var dateInfo = new Date().toString('dd/MM/yyyy H:mm:ss');
                var hardwareType = "BROWSER";

                if (navigator.userAgent.match(/(WPF)/)) {
                    hardwareType = "WINDOWS";
                } else if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                    hardwareType = "TABLET";
                }

                this.getHardwareIdAsync().then(function (result) {
                    var posLog = {
                        HardwareId: result,
                        Date: dateInfo,
                        IziboxVersion: $rootScope.IziBoxConfiguration.VersionIziBox,
                        PosVersion: $rootScope.Version,
                        PosDescription: hardwareType
                    }

                    $rootScope.dbReplicate.rel.save('PosLog', posLog).then(function () {
                        posLogDefer.resolve(posLog);
                    }, function (errSave) {
                        posLogDefer.reject(errSave);
                    });
                }, function (errHId) {
                    posLogDefer.reject(errHId);
                });
            } catch (err) {
                posLogDefer.reject(err);
            }

            return posLogDefer.promise;
        }
    }])