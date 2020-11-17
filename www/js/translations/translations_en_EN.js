﻿app.config(['$translateProvider', function ($translateProvider) {

    $translateProvider.useSanitizeValueStrategy('sanitizeParameters');

    // register english translation table
    $translateProvider.translations('en_EN', {
        "Chargement en cours": "Loading",
        "Veuillez patienter": "Please wait",
        "Configuration": "Configuration",
        "Imprimante caisse": "POS printer",
        "Imprimante prod.": "Production printer",
        "Nb impression": "Print count",
        "Remise sur ticket": "Discount",
        "Partager un ticket": "Split one receipt ",
        "Imprimer le dernier ticket": "Print the last receipt ",
        "Imprimer une note": "Print a note",
        "Consulter les tickets": "Check stored receipts",
        "Fonds de caisse": "Cash fund",
        "Fermeture caisse": "Close POS",
        "Caisse": "POS",
        "Ouvrir le tiroir": "Open cashdrawer",
        "Changer d'utilisateur": "Change user",
        "Déconnecter": "Logout",
        "Fermer l'application": "Exit",
        "Commande telephonique": "Phone Order",
        "Paiement Rapide": "Speed payment",
        "Veuillez renseigner le fond de caisse": "Please fill in the cash fund",
        "Ajouter au panier": "Add",
        "Saisir le prix": "Enter price",
        "Rupture": "Sold out",
        "Attention ! Mise en veille !": "Warning ! Sleep mode !",
        "Mise en veille dans": "Sleep mode in",
        "secondes": "seconds",
        "Bienvenue": "Welcome",
        "Nombre de passages": "Passage count",
        "Emporté": "Take away",
        "A emporter": "To take away",
        "Sur place": "For here",
        "Livré": "Delivery",
        "Offres": "Offers",
        "Table": "Table",
        "Couvert(s)": "Diner(s)",
        "Rendu": "Change",
        "REMISE": "DISCOUNT",
        "Reste à payer": "Have to pay",
        "Avoir": "Credit note",
        "Total": "Total",
        "Développé par": "Developed by",
        "Total HT": "Total ET",
        "TVA": "VAT",
        "Le ticket est vide": "Receipt is empty",
        "Début": "Start",
        "Fin": "End",
        "Chargement": "Loading",
        "Z de caisse": "Z Pos",
        "Scannez votre QRCode": "Scan QRCode",
        "Détail des espèces": "Cash detail",
        "Autre montant": "Other amount",
        "Fermeture de caisse": "Close POS",
        "Paiements": "Payments",
        "Montant": "Amount",
        "Attendu": "Expected",
        "Fermer la caisse": "Close POS",
        "Commentaire": "Comment",
        "Modification des paiements": "Adjust payments",
        "Saisissez le numéro de carte": "Enter card number",
        "Choisir une offre": "Select an offer",
        "Ne rien choisir": "Nothing",
        "Ajouter au ticket": "Add",
        "Choisir produit": "Select product",
        "Montant en caisse": "Value",
        "Montant du mouvement": "Adjustement amount",
        "Motif": "Reason",
        "Sélectionner un motif": "Select a reason",
        "Pourcentage": "Percentage",
        "Editer une note": "Edit a note",
        "Nombre de repas": "Number of meals",
        "Numéro": "Number",
        "Scannez": "Scan",
        "votre carte": "your card",
        "Parts": "Shares",
        "Saisissez le prix": "Enter price",
        "Prix": "Price",
        "Reprendre un ticket": "Recall a receipt",
        "Ticket": "Receipt",
        "produit(s)": "product(s)",
        "Horaire": "Schedule",
        "Aucun ticket en attente": "No pending receipt",
        "Les tickets en attentes sont en cours de synchronisation": "Pending receipts are being synchronized",
        "A traiter": "To deal",
        "Aucune commande à préparer": "No order to prepare",
        "Aucune commande en attente": "No pending order",
        "Les commandes en attentes sont en cours de synchronisation": "Pending orders are being synchronized",
        "Joindre tickets sélectionnés": "Merge selected receipts",
        "En attente": "Pending",
        "Commandes": "Orders",
        "Produit introuvable": "Product can not be found",
        "Le ticket n'est pas soldé": "The receipt is not closed",
        "Erreur de sauvegarde du panier !": "Save error !",
        "Erreur d'impression caisse !": "POS printing error !",
        "Erreur !": "Error !",
        "Erreur d'impression production !": "Production printing error !",
        "Le ticket n'a pas été supprimé.": "The receipt has not been deleted.",
        "Avoirs émis": "Emitted credit",
        "Ticket introuvable": "The receipt can not be found",
        "Vous avez déjà un ticket en cours": "You already have a processing receipt",
        "Le serveur de fidélité n'est pas joignable ...": "Loyalty server can't be reached ...",
        "Carte de fidélité introuvable !": "Loyalty card can not be found !",
        "Le client a été supprimé, cette carte n'est plus utilisable": "The client has been deleted, this card is no longer usable",
        "Le ticket a déjà une remise": "A discount is already deducted from this receipt ",
        "Le ticket-restaurant n'a pu être ajouté !": "Meal voucher can't be added",
        "Supprimer le ticket ?": "Delete the receipt ?",
        "Abandonner la commande ?": "Cancel the order ?",
        "Cloturer la caisse ?": "Close POS ?",
        "Veuillez renseigner le motif": "Please select a reason",
        "Montant non valide": "Invalid amount",
        "Valeur non valide": "Invalid value",
        "Valeur de remise invalide": "Invalid discount value",
        "Saisissez le nombre de repas": "Enter the number of meals",
        "No de table obligatoire": "Table number required",
        "Nb de couvert obligatoire": "Number of diners required",
        "Le montant ne peut pas dépasser": "Amount can not exceed",
        "Le prix doit être compris entre ": "Price must be between ",
        "et": "and",
        "Joindre les tickets sélectionnés ?": "Gather selected receipts ?",
        "Appuyez une autre fois pour quitter": "Press again to quit",
        "Izibox non trouvée !": "Izibox can not be found !",
        "Cette table existe déjà": "Table already exists",
        "Oui": "Yes",
        "Non": "No",
        "Annuler": "Cancel",
        "Continuer": "Continue",
        "Réessayer": "Retry",
        "Merci de votre visite": "xxxxx",
        "Nombre d'articles": "xxxxx",
        "Qté": "Qty",
        "Description": "Description",
        "Remise ": "Discount",
        "Mode Paiement:": "Payment Option",
        "COUVERT(S) ": "xxxxxxx",
        "TABLE ": "xxxxxxxxx",
        "Erreur lors de l'enregistrement de l'utilisation de l'offre": "Error registering the use of the offer",
        "L'offre a été utilisée": "The offer was used",
        "Sélectionner": "Select",
        "Utiliser l'offre": "Use the offer",
        "Date limite d'utilisation : ": "Expiration date :",
        "Impossible de faire une remise de plus de 100% !": "Can not make a discount greater than 100% !",
        "Impossible de faire une remise superieur au prix du produit !": "Can not make a discount greater than item price !",
        "Impossible de faire une remise superieur au prix de la ligne !": "Can not make a discount greater than line price !",
        "Le ticket a déjà une remise !": "This receipt already has a discount !",
        "Selectionnez un type de remise": "Select a discount type",
        "Remise %": "Discount %",
        "Remise": "Discount",
        "Offrir": "Free of charge",
        "Appliquer sur un produit": "Apply on one item",
        "Appliquer sur toute la ligne": "Apply on the whole line",
        "Le service n'a pas répondu. Veuillez essayer de nouveau": "The service did not respond. Please try again",
        "Le ticket est vide, impossible de le valider": "The receipt is empty, it can not be validate",
        "Aucun article n'a été ajouté au ticket, impossible de le valider": "No items have been added to the receipt, it can not be validated",
        "Les moyens de payment ne sont pas renseignés, impossible de valider le ticket": "The payments mode are not filled in, it is impossible to validate the receipt",
        "Choisissez les services à fermer": "Pick the service(s) to close",
        "Toutes les caisses": "All cash registers",
        "Tous les services": "All services",
        "Date début": "Start date",
        "Date fin": "End date",
        "Nb": "Count",
        "Cagnotte utilisée": "Used balance",
        "Cagnotte": "Balance",
        "ESPECE": "CASH",
        "C-B": "Credit Card",
        "Total TTC": "Total IT",
        "Total par utilisateur :": "Total by user :",
        "Fermeture": "Close services",
        "Afficher le Z": "Display Z",
        "Envoyer par email": "Send to email",
        "Imprimer": "Print",
        "Inclure le detail des services": "Include services details",
        "Correction des tickets": "Edit tickets",
        "Choisissez une op&eacute;ration": "Choose an operation",
        "Nombre de parts": "Number of parts",
        "Informations de commande": "Order information",
        "Dans": "In",
        "Pour": "For",
        "Pas de client": "No linked customer",
        "N° de carte": "Card ID",
        "Effacer": "Clear",
        "Fermer": "Close",
        "Appliquer": "Apply changes",
        "Passage sur place": "Take away",
        "Etage": "Floor",
        "Porte": "Door",
        "Interphone": "Intercom",
        "Nombre d'article(s)": "Number of items",
        "Carte sans compte": "Card without account",
        "Passages": "Count",
        "Frais de Livraison": "Shipping fees",
        "Livraison HT": "Shipping ET",
        "Veuillez payer à la caisse.": "Please pay at checkout",
        "RECHERCHE": "RESEARCH",
        "RECHERCHER": "SEARCH",
        "ENREGISTREMENT": "REGISTER",
        "Nom, prénom, email, téléphone ou société": "Firstname, Lastname, email, phone or company",
        "Téléphone": "Phone",
        "Société": "Company",
        "Aucun résultat": "No result",
        "Appuyez pour passer commande !": "Press to order !",
        "Touchez pour commander": "Press to order",
        "Gestion des espèces": "Cash management",
        "Vous devez d&eacute;finir un mouvement de caisse de type fonds de caisse dans le BO, merci": "You have to define a cash movement of cash funds in the BO, thanks",
        "Vous devez d&eacute;finir au moins un mouvement de caisse d'entrée, sortie dans le BO, merci": "You must define at least one cash movement (in or out) in the BO, thank you",
        "Compteur": "Count",
        "La borne est actuellement fermée !": "Terminal is closed !",
        "Etape Suivante": "Next Step",
        "Valider votre": "Validate your",
        "Votre": "Your",
        "ou": "or",
        "Valider": "Validate",
        "Confirmer": "Confirm",
        "Connexion": "Connection",
        "Inscription": "Registration",
        "Veuillez scanner votre carte de fidélité": "Please scan your loyalty card",
        "Vous n'avez pas encore de carte de fidélité ?": "You don't have a loyalty card yet ?",
        "S'inscrire": "Register",
        "Mode de consommation": "Consumption mode",
        "Mode de paiement": "Payment mode",
        "Veuillez choisir votre mode de consommation": "Please choose your consumption mode",
        "Continuer sans carte": "Continue without loyalty card",
        "Votre commande": "Your order",
        "Merci de votre visite !": "Thanks for coming !",
        "Veuillez récupérer votre commande à la caisse.": "Please pick up your order at checkout.",
        "Veuillez payer et récupérer votre commande à la caisse.": "Please pay and pick up your order at checkout.",
        "Ma cagnotte": "My balance",
        "Code Postal": "Postal Code",
        "Ville": "City",
        "Adresse": "Adress",
        "Commander ici": "Order here",
        "Mon Panier": "My Cart",
        "Prénom": "Firsname",
        "Moyen de paiement": "Payment mode",
        "Nom": "Lastname",
        "Enregistrer": "Register",
        "N° Carte": "Loyalty Card Number",
        "Imprimante borne": "Terminal printer",
        "Mode borne": "Terminal mode",
        "La izibox n'est pas accessible": "The izibox is not reachable",
        "Erreur lors de la fermeture": "Error closing",
        "Abandonner ma commande": "Cancel order",
        "Valider ma commande": "Confirm order",
        "Personnalisez votre produit": "Customize your product",
        "Connectez-vous en scannant votre carte de fidélité": "Login by scanning your loyalty card",
        "Créez votre compte fidélité dès-maintenant": "Create your loyalty account now",
        "Ignorer": "Skip",
        "Terminer": "Stop",
        "Retour": "Go back",
        "Continuez sans vous identifier": "Continue without identifying yourself",
        "identifiez-vous": "Login",
        "Commandez et savourez votre repas à table": "Order and enjoy your meal on a table",
        "Commandez et dégustez votre repas où vous voulez": "Order and enjoy your meal wherever you want",
        "Mon compte fidélité": "My loyalty account",
        "Une erreur s'est produite ! Veuillez réessayer ou selectionner le paiement au comptoir.": "An error occured ! Please retry or pay at checkout.",
        "Paiement en cours de traitement": "Payment is being processed",
        "Veuillez passer votre carte sur le scanner NFC": "Please scan your card by NFC",
        "Veuillez suivre les instructions de paiement affichées sur le terminal de la borne": "Please follow the payment instructions on the point of sale terminal",
        "J'accepte de recevoir par mail les informations concernant mon compte et les offres de fidélité": "I accept to receive email about my account and loyalty offers",
        "En cliquant sur cette case, vous acceptez notre politique sur les données personnelles": "By checking this, you hereby agree our politics about personal datas",
        "Valider mon Menu": "Confirm Menu",
        "Les modes de règlement déjà saisis ont été supprimés, veuillez les saisir à nouveau": "Payment methods already entered have been removed, please re-enter",
        "Erreur lors de la récupération des données": "Error while retrieving data",
        "Pertes / Repas employé": "Losses / employee meals",
        "Appareils connectés": "Device list",
        "Docs à syncro": "Syncing docs",
        "Mouvements d'espèces": "Cash movements",
        "Commande": "Order",
        "Tickets enregistrés": "Stored receipt",
        "Statistiques de date à date": "Interval stats",
        "Liste des terminaux connectés": "Connected device list",
        "Derniere mise à jour": "Last updated",
        "Ouvrir une periode": "Open a period",
        "Nom du terminal": "Device name",
        "Periode": "Period",
        "Une erreur s'est produite ! Veuillez réessayer ou demander de l'aide.": "An error occured, please try again or ask for help.",
        "Voulez-vous utiliser votre cagnotte ?": "Do you want to use your balance ?",
        "Voulez-vous payer avec votre cagnotte ?": "Do you want to pay with your balance ?",
        "Prenez votre reçu et dirigez-vous au comptoir pour régler votre commande": "Take your receipt and pick up your order at checkout",
        "Merci pour votre visite, votre commande porte le numéro": "Thanks for coming, your order number :",
        "vont être utilisé et retiré du prix total": "will be used and removed from the total price",
        "vont être utilisé": "will be used",
        "Pertes": "Losses",
        "Ce service est déjà fermé": "This service is already closed",
        "Toutes les services de cette caisse sont fermés": "All services of this cash machine are closed",
        "Service à fermer": "Service to close",
        "Service(s) à fermer": "Service(s) to close",
        "Service(s) fermé(s) compté(s)": "Closed service(s) counted",
        "Ecart": "Gap",
        "Bonjour": "Hello",
        "Recherche IziBox": "Searching IziBox",
        "Rechercher IziBox": "Search IziBox",
        "Ecart service(s) compté(s)": "Counted service(s) gap",
        "CreditCount": "Credit count",
        "La izibox n'a pas été trouvée, veuillez vérifier ses branchements ou contacter le support.": "The izibox wasn't found, please check its connections or contact the support.",
        "La izibox n'a pas été trouvée, veuillez vérifier ses branchements ou continuer en mode hors ligne.": "The izibox wasn't found, please check its connections or continue in offline mode.",
        "Cet appareil n'est pas connecté au réseau. Veuillez le connecter ou continuer en mode hors ligne.": "This device isn't connected to the network. Please connect it or continue in offline mode.",
        "Cet appareil n'est pas connecté au réseau. Veuillez le connecter ou contacter le support.": "This device isn't connected to the network. Please connect it or contact the support.",
        "Nouveau profil": "New profile",
        "+ Nouveau": "+ New",
        "Config. imprimante": "Printer config",
        "Aucun": "None",
        "Edition de la config :": "Edit configuration :",
        "Création de config": "Create configuration",
        "Main dominante": "Handedness",
        "Droitier": "Right-handed",
        "Gaucher": "Left-handed",
        "Taille des produits": "Product size",
        "Petit": "Small",
        "Moyen": "Medium",
        "Grand": "Large",
        "Champ de scan & recherche": "Scan & search field",
        "Modes de consommation": "Delivery types",
        "Grouper les produits": "Group products",
        "Afficher le plan de table": "Show seating plan",
        "Affichage des boutons": "Show buttons",
        "Impression note": "Print bill",
        "Validation + Impression": "Validation + printing",
        "Informations commande": "Order informations",
        "Bouton menu": "Menu button",
        "Affichage": "Display",
        "Fonctionnel": "Functional",
        "Afficher commandes web": "Show web orders",
        "Imprimantes": "Printers",
        "Mode de conso. par defaut": "Default delivery type",
        "Impr. auto mise en attente": "Auto print on freeze",
        "Cuisine": "Kitchen",
        "Addition": "Bill",
        "Forcer la saisie": "Force entry",
        "Nombre de couverts": "Number of diners",
        "Informations client": "Customer informations",
        "Activer paiements Glory": "Enable Glory payments",
        "Onglet par défaut freeze": "Default freeze tab",
        "Commandes locales": "Local orders",
        "Commandes en ligne": "Web orders",
        "Nom du preset :": "Preset name",
        "Configuration des imprimantes": "Printers configuration",
        "IP imprimantes": "Printers IP",
        "Rôle(s)": "Role(s)",
        "MàJ Uniquement": "Only updates",
        "Ligne(s) d'entête": "Header line(s)",
        "Nb. impression addition": "Number of bills printed",
        "Police grande taille": "Large font",
        "Tickets d'annonce": "Announcement tickets",
        "Grd. numéro de commande": "Large order number",
        "Sur les additions": "On bills",
        "Sur les tickets cuisine": "On kitchen tickets",
        "Numéro de ligne": "Line number",
        "Impression auto": "Auto print",
        "Aucune": "None",
        "Addition": "Bill",
        "Ticket cuisine": "Kitchen tickets",
        "Impr. QRCode": "Print QRCode",
        "Appliquer la configuration": "Apply configuration",
        "Imprimer une addition à la validation": "Print bill on validation",
        "Aucune imprimante trouvée, veuillez scanner le réseau ou ajouter une imprimante": "No printer found, please scan the network or add a printer",
        "Entrer adresse IP": "Enter IP address",
        "+ Ajouter": "+ Add"
    });
}]);