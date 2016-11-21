app.service('ipService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        this.getLocalIpAsync = function (iziboxIp) {
            var self = this;
            var localIp = undefined;
            var localIpDefer = $q.defer();

            try {
                networkinterface.getIPAddress(function (ip) {
                    localIpDefer.resolve({ local: ip, izibox: iziboxIp });
                });
            } catch (errIP) {
                try {
                    window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;   //compatibility for firefox and chrome
                    var pc = new RTCPeerConnection({ iceServers: [] }), noop = function () { };
                    pc.createDataChannel("");    //create a bogus data channel
                    pc.createOffer(pc.setLocalDescription.bind(pc), noop);    // create offer and set local description
                    pc.onicecandidate = function (ice) {  //listen for candidate events
                        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                        var parseIp = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate);
                        if (parseIp) {
                            localIp = parseIp[1];
                            pc.onicecandidate = noop;
                            localIpDefer.resolve({ local: localIp, izibox: iziboxIp });
                        }
                    };

                    setTimeout(function () {
                        if (!localIp) {
                            pc.onicecandidate = noop;
                            localIpDefer.resolve({ izibox: iziboxIp });
                        }
                    }, 5000)
                } catch (errRTC) {
                    localIpDefer.resolve({ local: iziboxIp });
                }
            }

            return localIpDefer.promise;
        }
    }])