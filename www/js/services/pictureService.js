app.service('pictureService', function ($rootScope, $q, $http) {
    let cacheProductPictures = {};
    let cachePictures = {};
    let useCache = true;
    let useBlob = true;

    $rootScope.$on('pouchDBChanged', (event, args) => {
        if (args.status === "Change" && (args.id.indexOf('Picture') === 0 || args.id.indexOf('ProductPicture') === 0)) {
            cacheProductPictures = {};
            cachePictures = {};
        }
    });

    this.getPictureFileUrl = (itemId, type) => {
        let setPictureFor = $rootScope.borne ? SetPictureFor.Borne : SetPictureFor.Pos;
        return $rootScope.APIBaseURL + "/picturestreambyid/" + itemId + "?setPictureFor=" + setPictureFor + "&type=" + type;
    };

    this.deletePictureCache = () => {
        let urlDatasApi = $rootScope.APIBaseURL + "/deletepicturecache";
        $http.get(urlDatasApi);
    };

    /* Get a picture */
    this.getPictureByIdAsync = (idStr) => {
        let self = this;
        let pictureDefer = $q.defer();
        let id = parseInt(idStr);

        if ($rootScope.modelDb.databaseReady) {
            if (useCache && cachePictures && cachePictures[id] != undefined) {
                pictureDefer.resolve(cachePictures[id]);
            } else {
                var urlDatasApi = $rootScope.APIBaseURL + "/picture/" + id;

                $http.get(urlDatasApi).then((picture) => {
                    if(picture && picture.data) {
                        if (useBlob && picture) {
                            let blobDoc = b64toBlob(picture.data.PictureBinary, picture.data.MimeType);
                            picture.PictureUrl = URL.createObjectURL(blobDoc);
                        }
    
                        if (useCache) {
                            cachePictures[id] = picture;
                        }
                        pictureDefer.resolve(picture);
                    } else {
                        pictureDefer.reject();
                    }
                }, () => {
                    pictureDefer.reject();
                });
            }
        } else {
            pictureDefer.reject("Database isn't ready !");
        }
        return pictureDefer.promise;
    };

    this.loadPictureForProductAsync = (idProduct) => {
        let pictureDefer = $q.defer();

        let id = parseInt(idProduct);

        if (cacheProductPictures && cacheProductPictures[id] !== undefined) {
            pictureDefer.resolve(cacheProductPictures[id]);
        } else {
            var setPictureFor = $rootScope.borne ? SetPictureFor.Borne : SetPictureFor.Pos;

            var urlDatasApi = $rootScope.APIBaseURL + "/pictureforproductid/" + id + "?setPictureFor=" + setPictureFor;

            $http.get(urlDatasApi).then((picture) => {
                picture = picture.data;

                if (useBlob && picture) {
                    if (picture.PictureUrl) {
                        let imgDatas = parseImgBase64Datas(picture.PictureUrl);
                        let blobDoc = b64toBlob(imgDatas.datas, imgDatas.contentType);
                        picture.PictureUrl = URL.createObjectURL(blobDoc);
                    }
                }

                cacheProductPictures[id] = picture;

                pictureDefer.resolve(picture);
            }, (err) => {
                console.error(err);
                pictureDefer.reject(err);
            });
        }

        return pictureDefer.promise;
    };

    this.getCorrectPictureId = (listIds) => {
        let image = Enumerable.from(listIds).firstOrDefault();
        let id = image ? image.PictureId : null;
        let firstId = angular.copy(id);

        for (let i = 0; i < listIds.length; i++) {
            if ($rootScope.borne && listIds[i].SetPictureFor === SetPictureFor.Borne) {
                id = listIds[i].PictureId;
                break;
            } else if (!$rootScope.borne && listIds[i].SetPictureFor === SetPictureFor.Pos) {
                id = listIds[i].PictureId;
                break;
            } else if (listIds[i].SetPictureFor === SetPictureFor.All) {
                if (listIds[i].PictureId !== firstId) {
                    id = listIds[i].PictureId;
                }
            }
        }
        return id;
    };

    this.getPictureUrlAsync = (pictureId) => {
        let pictureUrlDefer = $q.defer();

        let pictureUrl = undefined;

        useCache = true;

        if (useCache) {
            pictureUrl = window.sessionStorage.getItem("Image" + pictureId);
        }

        if (!pictureUrl) {
            this.getPictureByIdAsync(pictureId).then((picture) => {
                if (picture) {
                    let contentType = picture.data.MimeType;
                    let base64Data = picture.data.PictureBinary;

                    if (useBlob) {
                        contentType = contentType || '';
                        let sliceSize = 1024;
                        let byteCharacters = atob(base64Data);
                        let bytesLength = byteCharacters.length;
                        let slicesCount = Math.ceil(bytesLength / sliceSize);
                        let byteArrays = new Array(slicesCount);

                        for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                            let begin = sliceIndex * sliceSize;
                            let end = Math.min(begin + sliceSize, bytesLength);

                            let bytes = new Array(end - begin);
                            for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
                                bytes[i] = byteCharacters[offset].charCodeAt(0);
                            }
                            byteArrays[sliceIndex] = new Uint8Array(bytes);
                        }
                        let blob = new Blob(byteArrays, { type: contentType });

                        pictureUrl = URL.createObjectURL(blob);
                    } else {
                        pictureUrl = "data:" + contentType + ";base64," + base64Data;
                    }

                    if (useCache) {
                        window.sessionStorage.setItem("Image" + pictureId, pictureUrl);
                    }
                }

                pictureUrlDefer.resolve(pictureUrl);
            }, (err) => {
            });
        }
        else {
            pictureUrlDefer.resolve(pictureUrl);
        }

        return pictureUrlDefer.promise;
    };
});