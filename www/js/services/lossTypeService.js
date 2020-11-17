app.service('lossTypeService', function ($rootScope, $q, pictureService) {
    this.getLossTypesAsync = function () {
        let lossTypeDefer = $q.defer();

        $rootScope.dbInstance.allDocs({
            include_docs: true,
            startkey: 'LossType',
            endkey: 'LossType\uffff'
        }).then(function (result) {
            let docs = result.rows.map(r => r.doc);
            lossTypeDefer.resolve(docs);
            console.log(result);
        }, (err) => {
            console.error(err);
            lossTypeDefer.reject();
        });

        return lossTypeDefer.promise;
    };

    this.getLossTypeByIdAsync = function (id) {
        let lossTypeDefer = $q.defer();

        $rootScope.dbInstance.get('LossType_1_' + padLeft(id, 16)).then(function (lossType) {
            pictureService.getPictureByIdAsync(lossType.data.PictureId).then((resPicture) => {
                if (resPicture.PictureUrl) {
                    lossType.data.PictureURL = resPicture.PictureUrl;
                }
                lossTypeDefer.resolve(lossType);
            }, (err) => {
                console.error(err);
            });
        }, function (err) {
            lossTypeDefer.reject(err);
        });

        return lossTypeDefer.promise;
    };

    this.getLossTypeUrlByIdAsync = function (id) {
        let lossTypeDefer = $q.defer();
        let pictureUrl;
        $rootScope.dbInstance.get('LossType_1_' + padLeft(id, 16)).then(function (lossType) {
            pictureService.getPictureByIdAsync(lossType.data.PictureId).then((resPicture) => {
                if (resPicture.PictureUrl) {
                    pictureUrl = resPicture.PictureUrl;
                }
                else {
                    pictureUrl = "";
                }
                lossTypeDefer.resolve(pictureUrl);
            }, (err) => {
                console.error(err);
            });
        }, function (err) {
            lossTypeDefer.reject(err);
        });

        return lossTypeDefer.promise;
    };
});