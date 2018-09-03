app.service('pictureService', ['$rootScope', '$q',
    function ($rootScope, $q) {

        var cacheProductPictures = undefined;
        var cachePictures = {};
        var useCache = true;
        var useBlob = true;

        $rootScope.$on('pouchDBChanged', function (event, args) {
            if (args.status == "Change" && (args.id.indexOf('Picture') == 0 || args.id.indexOf('ProductPicture') == 0)) {
                cacheProductPictures = undefined;
                cachePictures = {};
            }
        });

        /** Get a picture */
        this.getPictureByIdAsync = function (idStr) {
            var self = this;
            var pictureDefer = $q.defer();
            var id = parseInt(idStr);

            if ($rootScope.modelDb.databaseReady) {

                if (useCache && cachePictures && cachePictures[id]) {
                    pictureDefer.resolve(cachePictures[id]);
                } else {
                    $rootScope.dbInstance.rel.find('Picture', id).then(function (results) {
                        var picture = Enumerable.from(results.Pictures).firstOrDefault();

                        if (useCache) {
                            cachePictures[id] = picture;
                        }

                        pictureDefer.resolve(picture);

                    }, function (err) {
                        pictureDefer.reject();
                    });
                }

            } else {
                pictureDefer.reject("Database isn't ready !");
            }
            return pictureDefer.promise;
        }

        this.getAllPicturesAsync = function () {
            var allPicturesDefer = $q.defer();

            if (useCache && cacheProductPictures) {
                allPicturesDefer.resolve(cacheProductPictures);
            } else {
                if ($rootScope.modelDb.databaseReady) {
                    $rootScope.dbInstance.rel.find('ProductPicture').then(function (results) {
                        if (useCache) {
                            cacheProductPictures = results.ProductPictures;
                        }

                        allPicturesDefer.resolve(results.ProductPictures);
                    }, function (err) {
                        allPicturesDefer.reject();
                    });
                } else {
                    allPicturesDefer.reject("Database isn't ready !");
                }
            }

            return allPicturesDefer.promise;
        };

        this.getPictureIdsForProductAsync = function (idProduct) {
            var pictureIdsDefer = $q.defer();
            idProduct = parseInt(idProduct);
            this.getAllPicturesAsync().then(function (productPictures) {
                var pictureIds = Enumerable.from(productPictures).where("x => x.ProductId == " + idProduct).orderBy("x => x.DisplayOrder").toArray();
                pictureIdsDefer.resolve(pictureIds);
            }, function (err) {
                pictureIdsDefer.reject();
            });

            return pictureIdsDefer.promise;
        };

        this.getCorrectPictureId = function (listIds) {
            let id = 0;
            for(let i = 0; i < listIds.length; i++) {
                if($rootScope.borne && listIds[i].ProductPictureFor === 3) {
                    id = listIds[i].PictureId;
                    break;
                } else if(!$rootScope.borne && listIds[i].ProductPictureFor === 2) {
                    id = listIds[i].PictureId;
                    break;
                } else if (listIds[i].ProductPictureFor === 1) {
                    id = -1;
                    break;
                } else if (listIds[i].ProductPictureFor || listIds[i].ProductPictureFor === 0) {
                    id = listIds[i].PictureId;
                } else {
                    id = Enumerable.from(listIds).firstOrDefault().PictureId;
                }
            }
            return id;
        };

        this.getPictureUrlAsync = function (pictureId) {
            var pictureUrlDefer = $q.defer();

            var pictureUrl = undefined;

            useCache = true;

            if (useCache) {
                pictureUrl = window.sessionStorage.getItem("Image" + pictureId);
            }

            if (!pictureUrl) {

                this.getPictureByIdAsync(pictureId).then(function (picture) {
                    if (picture) {
                        var contentType = picture.MimeType;
                        var base64Data = picture.PictureBinary;

                        if (useBlob) {
                            contentType = contentType || '';
                            var sliceSize = 1024;
                            var byteCharacters = atob(base64Data);
                            var bytesLength = byteCharacters.length;
                            var slicesCount = Math.ceil(bytesLength / sliceSize);
                            var byteArrays = new Array(slicesCount);

                            for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                                var begin = sliceIndex * sliceSize;
                                var end = Math.min(begin + sliceSize, bytesLength);

                                var bytes = new Array(end - begin);
                                for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                                    bytes[i] = byteCharacters[offset].charCodeAt(0);
                                }
                                byteArrays[sliceIndex] = new Uint8Array(bytes);
                            }
                            var blob = new Blob(byteArrays, { type: contentType });

                            pictureUrl = URL.createObjectURL(blob);
                        } else {
                            pictureUrl = "data:" + contentType + ";base64," + base64Data;
                        }

                        if (useCache) {
                            window.sessionStorage.setItem("Image" + pictureId, pictureUrl);
                        }

                    }

                    pictureUrlDefer.resolve(pictureUrl);

                }, function (err) { })
            }
            else {
                pictureUrlDefer.resolve(pictureUrl);
            }

            return pictureUrlDefer.promise;
        }
    }]);