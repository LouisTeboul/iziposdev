app.service('ipService', function ($rootScope, $q) {
    // Get IP of the terminal
    this.getLocalIpAsync = (iziboxIp) => {
        let localIp = undefined;
        let localIpDefer = $q.defer();

        if (typeof IsOnIzibox != "undefined" && IsOnIzibox) {
            localIpDefer.resolve({ izibox: window.location.host });
        }
        else if (typeof ForcedIpIzibox != "undefined" && ForcedIpIzibox) {
            localIpDefer.resolve({ izibox: ForcedIpIzibox });
        }
        else {
            try {
                networkinterface.getIPAddress(function (ip) {
                    localIpDefer.resolve({ local: ip, izibox: iziboxIp });
                }, function (errGetWifiIp) {
                    console.error(errGetWifiIp);
                    networkinterface.getCarrierIPAddress(function (ip) {
                        localIpDefer.resolve({ local: ip, izibox: iziboxIp });
                    }, function (errGetLanIp) {
                        console.error(errGetLanIp);
                    });
                });
            }
            catch (errIP) {
                try {
                    //compatibility for firefox and chrome
                    window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
                    let pc = new RTCPeerConnection({ iceServers: [] });
                    let noop = function () { };
                    //create a bogus data channel
                    pc.createDataChannel("");
                    // create offer and set local description
                    pc.createOffer(pc.setLocalDescription.bind(pc), noop);
                    //listen for candidate events
                    pc.onicecandidate = function (ice) {
                        if (!ice || !ice.candidate || !ice.candidate.candidate) {
                            return;
                        }
                        let parseIp = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate);
                        if (parseIp) {
                            localIp = parseIp[1];
                            pc.onicecandidate = noop;
                            localIpDefer.resolve({ local: localIp, izibox: iziboxIp });
                        }
                    };

                    setTimeout(() => {
                        if (!localIp) {
                            pc.onicecandidate = noop;
                            localIpDefer.resolve({ izibox: iziboxIp });
                        }
                    }, 5000);
                }
                catch (errRTC) {
                    localIpDefer.resolve({ local: iziboxIp });
                }
            }
        }
        return localIpDefer.promise;
    };
});