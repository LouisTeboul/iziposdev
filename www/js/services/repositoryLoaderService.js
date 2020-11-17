app.service('repositoryLoaderService', function ($rootScope, $http, storeService, productService, $translate) {
    const self = this;
    let hasChanges = false;

    const setDataSchema = () => {
        $rootScope.dbInstance.setSchema([
            {
                singular: 'Category',
                plural: 'Categories',
                relations: {
                    'PictureId': { belongsTo: 'Picture' },
                    'CategoryTemplateId': { belongsTo: 'CategoryTemplate' }
                }
            },
            {
                singular: 'DeliveryPartner',
                plural: 'DeliveryPartners'
            },
            {
                singular: 'LossType',
                plural: 'LossTypes'
            },
            {
                singular: 'PosUser',
                plural: 'PosUsers',
                relations: {
                    'PictureId': { belongsTo: 'Picture' }
                }
            },
            {
                singular: 'Picture',
                plural: 'Pictures'
            },
            {
                singular: 'CategoryTemplate',
                plural: 'CategoryTemplates'
            },
            {
                singular: 'ProductCategory',
                plural: 'ProductCategories'
            },
            {
                singular: 'Product',
                plural: 'Products',
                relations: {
                    'ProductTemplateId': { belongsTo: 'ProductTemplate' }
                }
            },
            {
                singular: 'ProductPicture',
                plural: 'ProductPictures'
            },
            {
                singular: 'ShoppingCart',
                plural: 'ShoppingCarts'
            },
            {
                singular: 'Setting',
                plural: 'Settings'
            },
            {
                singular: 'Update',
                plural: 'Updates'
            },
            {
                singular: 'ProductAttributeValue',
                plural: 'ProductAttributeValues'
            },
            {
                singular: 'ProductAttribute',
                plural: 'ProductAttributes'
            },
            {
                singular: 'ProductTemplate',
                plural: 'ProductTemplates'
            },
            {
                singular: 'CashMovementType',
                plural: 'CashMovementTypes'
            },
            {
                singular: 'Currency',
                plural: 'Currencies'
            },
            {
                singular: 'PosSetting',
                plural: 'PosSettings'
            },
            {
                singular: 'Pos',
                plural: 'Pos'
            },
            {
                singular: 'Discount',
                plural: 'Discounts'
            },
            {
                singular: 'CustomerRole',
                plural: 'CustomerRoles'
            },
            {
                singular: 'Store',
                plural: 'Stores',
                relations: {
                    'LogoPictureId': { belongsTo: 'Picture' }
                }
            }
        ]);
    };

    const listenRepositoryServer = () => {

        // FIXME : Inexploité pour le moment
        // Sert a detecter une changement sur le referentiel produit

        // const urlDatasApi = $rootScope.APIBaseURL + "/dataevents";
        // const source = new EventSource(urlDatasApi);

        // source.onmessage = (event) => {
        //     console.log('onmessage dataevents : ' + event.data);
        //     if (event.data === "RepositoryChanged") {
        //         hasChanges = true;
        //     }
        // };
        // source.onopen = (event) => {
        //     console.log('onopen dataevents');
        // };
        // source.onerror = (event) => {
        //     console.log('onerror dataevent');
        // };
    };

    const windowsBulkInsert = (datas) => {
        if ($rootScope.isWindowsContainer) {
            const repoPromise = new Promise((resolve, reject) => {
                window.repository.insertDatas(datas, resolve, reject);
            });
            console.log("Load repo windows");
            repoPromise.then(() => {
                console.log("Load repo windows ok !");
            }, (err) => {
                console.error("Load repo windows error : " + err);
            });
        }
    };

    this.load = () => {
        hasChanges = false;
        const urlDatasApi = $rootScope.APIBaseURL + "/datas/";
        const infoDatas = {
            percent: 0,
            status: "Change"
        };

        $rootScope.menusDataProducts = [];

        $rootScope.dbInstance = new PouchDB('izipos_datas', { adapter: $rootScope.settingsPouchDB.typeDB });
        setDataSchema();

        storeService.getTenantInfoAsync().then((tenantInfo) => {
            if (tenantInfo) {
                $rootScope.EnableMultiStore = tenantInfo.EnableMultiStore;
                $rootScope.MainStoreId = tenantInfo.MainStore_Id;
            }
        }).catch((err) => {
            console.log(err);
        }).then(() => {
            $http.get(urlDatasApi + "ping").then((res) => {
                $rootScope.dbInstance.destroy().then(() => {
                    $rootScope.dbInstance = new PouchDB('izipos_datas', { adapter: $rootScope.settingsPouchDB.typeDB });
                    infoDatas.percent = 20;

                    $rootScope.$emit("dbDatasReplicate", infoDatas);

                    $http.get(urlDatasApi + "settings").then((settings) => {
                        $rootScope.dbInstance.bulkDocs(settings.data.Datas).then(() => {
                            infoDatas.percent = 40;

                            $rootScope.$emit("dbDatasReplicate", infoDatas);

                            $http.get(urlDatasApi + "posusers").then((posusers) => {
                                $rootScope.dbInstance.bulkDocs(posusers.data.Datas).then(() => {
                                    infoDatas.percent = 60;

                                    $rootScope.$emit("dbDatasReplicate", infoDatas);

                                    $http.get(urlDatasApi + "categories").then((categories) => {
                                        $rootScope.dbInstance.bulkDocs(categories.data.Datas).then(() => {
                                            infoDatas.percent = 80;

                                            $rootScope.$emit("dbDatasReplicate", infoDatas);

                                            $http.get(urlDatasApi + "products?storeId=" + $rootScope.IziBoxConfiguration.StoreId).then((products) => {
                                                productService.indexProducts(products.data.Datas);

                                                if ($rootScope.IziBoxConfiguration.EnableAutoMatch) {
                                                    $rootScope.menusData = products.data.Datas.filter(p => p.EnableAutoMatch && p.ProductAttributes && p.ProductAttributes.length > 0).filter((item, idx, array) => {
                                                        return !idx || item.Id !== array[idx - 1].Id;
                                                    });

                                                    productService.loadMenus();
                                                }

                                                windowsBulkInsert(JSON.stringify(products.data.Datas));

                                                $rootScope.dbInstance.bulkDocs(products.data.Datas).then(() => {
                                                    infoDatas.percent = 100;

                                                    $rootScope.$emit("dbDatasReplicate", infoDatas);

                                                    $http.get(urlDatasApi + "deliverypartners").then((deliveryPartners) => {
                                                        $rootScope.dbInstance.bulkDocs(deliveryPartners && deliveryPartners.data ? deliveryPartners.data.Datas : []).then(() => {
                                                            $http.get(urlDatasApi + "losstypes").then((lossTypes) => {
                                                                $rootScope.dbInstance.bulkDocs(lossTypes && lossTypes.data ? lossTypes.data.Datas : []).then(() => {
                                                                    // Si on est en mode multistore
                                                                    // il faut aussi recuperer la liste des stores
                                                                    if ($rootScope.EnableMultiStore) {
                                                                        $http.get(urlDatasApi + "stores").then((stores) => {
                                                                            $rootScope.dbInstance.bulkDocs(stores && stores.data ? stores.data.Datas : []).then(() => {
                                                                                setDataSchema();

                                                                                setTimeout(() => {
                                                                                    listenRepositoryServer();

                                                                                    $rootScope.modelDb.dataReady = true;
                                                                                    $rootScope.modelDb.configReplicationReady = true;
                                                                                    $rootScope.$evalAsync();
                                                                                    $rootScope.$emit("dbDatasReplicate", { status: "UpToDate" });
                                                                                }, 2000);
                                                                            });
                                                                        });
                                                                    }
                                                                    else {
                                                                        setDataSchema();

                                                                        setTimeout(() => {
                                                                            listenRepositoryServer();

                                                                            $rootScope.modelDb.dataReady = true;
                                                                            $rootScope.modelDb.configReplicationReady = true;
                                                                            $rootScope.$evalAsync();
                                                                            $rootScope.$emit("dbDatasReplicate", { status: "UpToDate" });
                                                                        }, 2000);
                                                                    }
                                                                }).catch((err) => {
                                                                    console.error(err);
                                                                    this.reloadPos();
                                                                });
                                                            }).catch((err) => {
                                                                console.error(err);
                                                                this.reloadPos();
                                                            });
                                                        }).catch((err) => {
                                                            console.error(err);
                                                            this.reloadPos();
                                                        });
                                                    }).catch((err) => {
                                                        console.error(err);
                                                        this.reloadPos();
                                                    });
                                                }).catch((err) => {
                                                    console.error(err);
                                                    this.reloadPos();
                                                });
                                            }).catch((err) => {
                                                console.error(err);
                                                this.reloadPos();
                                            });
                                        }).catch((err) => {
                                            console.error(err);
                                            this.reloadPos();
                                        });
                                    }).catch((err) => {
                                        console.error(err);
                                        this.reloadPos();
                                    });
                                }).catch((err) => {
                                    console.error(err);
                                    this.reloadPos();
                                });
                            }).catch((err) => {
                                console.error(err);
                                this.reloadPos();
                            });
                        }).catch((err) => {
                            console.error(err);
                            this.reloadPos();
                        });
                    }).catch((err) => {
                        console.error(err);
                        this.reloadPos();
                    });
                });
            }, (err) => {
                console.error(err);
                setTimeout(() => {
                    $rootScope.modelDb.dataReady = true;
                    $rootScope.modelDb.configReplicationReady = true;
                    $rootScope.$evalAsync();
                    $rootScope.$emit("dbDatasReplicate", { status: "UpToDate" });

                    if ($rootScope.IziBoxConfiguration.EnableAutoMatch) {
                        $rootScope.dbInstance.allDocs({
                            include_docs: true,
                            startkey: 'Product_',
                            endkey: 'Product_\ufff0'
                        }).then((products) => {
                            $rootScope.menusData = products.rows.filter(p => p.doc.EnableAutoMatch && p.doc.ProductAttributes && p.doc.ProductAttributes.length > 0).map(p => p.doc);

                            productService.loadMenus();
                        });
                    }
                }, 2000);
            });
        });
    };

    this.reloadPos = () => {
        swal({
            title: $translate.instant("Une erreur est survenue lors du démarrage de votre caisse. Celle-ci va redémarrer."),
            text: $translate.instant("Veuillez contacter le support si ce problème persiste."),
            buttons: [$translate.instant("Ok"), false]
        }).then(() => {
            window.location.reload();
        });
    };
});