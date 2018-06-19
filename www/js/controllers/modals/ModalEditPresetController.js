app.controller('ModalEditPresetController', function ($scope, $rootScope, $uibModal, $uibModalInstance, selectedPreset, mode) {

        $scope.model = {};
        $scope.init = function () {
            switch(mode){
                case 'edit':
                    $scope.mode = 1;
                    break;
                case 'create':
                    $scope.mode = 2;
                    break;
                default:
                    break;
            }
            $scope.preset = selectedPreset.value;

            $scope.model.preset = {
                tabs : {
                    0: {
                        name: "Affichage",
                        flags: {
                            DisplayFid: {
                                value: true,
                                text: "Bandeau fid.",
                            },
                            DisplayDelivery: {
                                value: true,
                                text: "Modes de conso.",
                            },
                            GroupProducts: {
                                value: true,
                                text: "Grp. les produits",
                            }

                        },
                        radios: {
                            HandPreference: {
                                values : [
                                    {value: 1, text: 'Droitier'},
                                    {value: 2, text: 'Gaucher'}
                                ],
                                value: 1,
                                text: "Main dominante"
                            },

                            ItemSize: {
                                values: [
                                    {value: 1, text: "Petit"},
                                    {value: 2, text: "Moyen"},
                                    {value: 3, text: "Grand"},
                                ],
                                value: 1,
                                text: "Taille des produits",
                            },
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
                                        text: "Validation + Impr."
                                    },
                                    PrintProd: {
                                        value: true,
                                        text: "Impr. note"
                                    },
                                },
                                text: "Affichage des boutons",
                            },
                            PhoneOrder: {
                                values: {
                                    Popup: {
                                        value: false,
                                        text: "Pop-up"
                                    },
                                    Menu: {
                                        value: true,
                                        text: "Bouton menu"
                                    },
                                },
                                text: "Commande tel.",
                            },
                        },
                    },
                    1: {
                        name : "Fonctionnel",
                        flags: {
                            PrintOnFreeze: {
                                value: false,
                                text: "Impr. auto freeze"
                            }

                        },
                        radios: {
                            DefaultDeliveryMode: {
                                values: [
                                    {value: 0, text: "Sur Place"},
                                    {value: 1, text: "A Emporté"},
                                    {value: 2, text: "Livré"},
                                ],
                                value: 0,
                                text: "Mode de conso. par defaut",
                            },
                        },
                        checkboxes: {
                            ForceOnCreateTicket: {
                                values: {
                                    /*
                                    Table: {
                                        value: false,
                                        text: "Numéro de table"
                                    },*/
                                    Cutleries: {
                                        value: false,
                                        text: "Nb. de couverts"
                                    },
                                    /*
                                    DeliveryMode: {
                                        value: false,
                                        text: "Mode de conso."
                                    },*/
                                },
                                text: "Forcer la saisie",
                            },
                        },
                    }


                }

            };
        };

        $scope.ok = function () {
            $uibModalInstance.close(selectedPreset);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        }
    }
);