app.controller('ModalEditPresetController', function ($scope, $rootScope, $translate, $uibModalInstance, selectedPreset, mode) {

    $scope.model = {};
    $scope.init = () => {
        switch (mode) {
            case 'edit':
                $scope.mode = 1;
                break;
            case 'create':
                $scope.mode = 2;
                break;
            default:
                break;
        }

        $scope.checkCondition = (condit) => {
            if (condit) {
                return $scope.preset.settings[condit] || $rootScope.IziBoxConfiguration[condit];
            } else {
                return true;
            }
        };

        $scope.checkNotCondition = (condit) => {
            if (condit) {
                return !$scope.preset.settings[condit] && !$rootScope.IziBoxConfiguration[condit];
            } else {
                return true;
            }
        };

        $scope.preset = selectedPreset.value;

        $scope.model.preset = {
            tabs: {
                0: {
                    name: $translate.instant("Affichage"),
                    flags: {
                        DisplayFid: {
                            value: true,
                            text: $translate.instant("Champ de scan & recherche")
                        },
                        DisplayDelivery: {
                            value: true,
                            text: $translate.instant("Modes de consommation")
                        },
                        GroupProducts: {
                            value: true,
                            text: $translate.instant("Grouper les produits")
                        },
                        TablePlan: {
                            value: true,
                            text: $translate.instant("Afficher le plan de table")
                        }
                    },
                    radios: {
                        HandPreference: {
                            values: [{
                                    value: 1,
                                    text: $translate.instant("Droitier")
                                },
                                {
                                    value: 2,
                                    text: $translate.instant("Gaucher")
                                }
                            ],
                            value: 1,
                            text: $translate.instant("Main dominante")
                        },

                        ItemSize: {
                            values: [{
                                    value: 1,
                                    text: $translate.instant("Petit")
                                },
                                {
                                    value: 2,
                                    text: $translate.instant("Moyen")
                                },
                                {
                                    value: 3,
                                    text: $translate.instant("Grand")
                                }
                            ],
                            value: 1,
                            text: $translate.instant("Taille des produits")
                        }
                    },
                    checkboxes: {
                        DisplayButtons: {
                            values: {
                                Valid: {
                                    value: true,
                                    text: "Validation"
                                },
                                ValidAndPrint: {
                                    value: true,
                                    text: $translate.instant("Validation + Impression")
                                },
                                PrintProd: {
                                    value: true,
                                    text: $translate.instant("Impression note")
                                }
                            },
                            text: $translate.instant("Affichage des boutons")
                        },
                        PhoneOrder: {
                            condit: "PhoneOrderEnable",
                            values: {
                                Popup: {
                                    value: false,
                                    text: "Pop-up"
                                },
                                Menu: {
                                    value: true,
                                    text: $translate.instant("Bouton menu")
                                }
                            },
                            text: $translate.instant("Informations commande")
                        }
                    }
                },
                1: {
                    name: $translate.instant("Fonctionnel"),
                    flags: {
                        // TpeEnabled: {
                        //     value: false,
                        //     text: "TPE connecté"
                        // },
                        DisplayWebOrders: {
                            value: false,
                            text: $translate.instant("Afficher commandes web"),
                            notcondit: "EnableKDS"
                        },
                        //AutoLoadReadyOrders: {
                        //    value: false,
                        //    text: "Recup. auto les commandes prêtes",
                        //    condit: "EnableKDS"
                        //}
                    },
                    radios: {

                        PrintProdMode: {
                            values: [{
                                    value: 0,
                                    text: $translate.instant("Imprimantes")
                                },
                                {
                                    value: 1,
                                    text: "IziDisplay"
                                },
                                {
                                    value: 2,
                                    text: $translate.instant("Imprimantes") + " + IziDisplay"
                                }
                            ],
                            value: 0,
                            text: "Production",
                            condit: "EnableKDS"
                        },

                        DefaultDeliveryMode: {
                            values: [{
                                    value: 0,
                                    text: $translate.instant("Sur place")
                                },
                                {
                                    value: 1,
                                    text: $translate.instant("A emporter")
                                },
                                {
                                    value: 2,
                                    text: $translate.instant("Livré")
                                }
                            ],
                            value: 0,
                            text: $translate.instant("Mode de conso. par defaut")
                        },
                        DefaultFreezeActiveTab: {
                            values: [{
                                    value: 0,
                                    text: $translate.instant("Commandes locales")
                                },
                                {
                                    value: 1,
                                    text: $translate.instant("Commandes en ligne")
                                }
                            ],
                            value: 0,
                            text: $translate.instant("Onglet par défaut freeze"),
                            condit: "DisplayWebOrders",
                            notcondit: "EnableKDS"
                        }
                    },
                    checkboxes: {
                        PrintAutoFreeze: {
                            values: {
                                StepProd: {
                                    value: false,
                                    text: $translate.instant("Cuisine")
                                },
                                Prod: {
                                    value: false,
                                    text: $translate.instant("Addition")
                                },
                                /*
                                DeliveryMode: {
                                    value: false,
                                    text: "Mode de conso."
                                },*/
                            },
                            text: $translate.instant("Impr. auto freeze")
                        },
                        ForceOnCreateTicket: {
                            values: {
                                /*
                                Table: {
                                    value: false,
                                    text: "Numéro de table"
                                },*/
                                Cutleries: {
                                    value: false,
                                    text: $translate.instant("Nombre de couverts")
                                },
                                CustomerInfo: {
                                    value: false,
                                    text: $translate.instant("Informations client")
                                }
                                /*
                                DeliveryMode: {
                                    value: false,
                                    text: "Mode de conso."
                                },*/
                            },
                            text: $translate.instant("Forcer la saisie")
                        }
                    }
                }
            }
        };

        if (window.glory) {
            $scope.model.preset.tabs[1].flags.EnableGlory = {
                value: false,
                text: $translate.instant("Activer paiements Glory"),
                condit: "EnableGlory"
            }
        }
    };

    $scope.ok = () => {
        if ($scope.preset.name) {
            $uibModalInstance.close(selectedPreset);
        }

        // TODO : Sauvegarder les moyens de paiement activé / desactivé
    };

    $scope.cancel = () => {

        // TODO : Retablir les moyens de paiement activé / desactivé pre-edition
        
        $uibModalInstance.dismiss('cancel');
    }
});