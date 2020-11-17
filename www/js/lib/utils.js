let ROUND_NB_DIGIT = 2;

//Les calculs sont faits sur la base d'une précision de 3 chiffres mais affiché avec une précision de deux
const roundValue = function (value, nbdigit) {
    if (!isNaN(value)) {
        let round_nb_digit = nbdigit && !isNaN(nbdigit) ? nbdigit : ROUND_NB_DIGIT;
        let pow = Math.pow(10, round_nb_digit);
        return Math.round(value * pow) / pow;
    } else {
        return value;
    }
};

const roundSup = (value, nbdigit) => {
    if (!isNaN(value)) {
        let a = Math.ceil(value * Math.pow(10, nbdigit));
        let b = a / Math.pow(10, nbdigit);

        return b;
    } else {
        return value;
    }
};

const roundInf = (value, nbdigit) => {
    if (!isNaN(value)) {
        let a = Math.floor(value * Math.pow(10, nbdigit));
        let b = a / Math.pow(10, nbdigit);

        return b;
    } else {
        return value;
    }
};

const truncator = (numToTruncate, nbrDecimal) => {
    let numParts = numToTruncate.toFixed(nbrDecimal + 1).split(".");
    return Number(numParts[0] + "." + numParts[1].substring(0, nbrDecimal));
};

// Ancien ajustement quantité en se basant sur la quantité uniquement
const adjustDividedQuantity = function (originalQuantity, value, divider) {
    if (value !== 0) {
        let delta = originalQuantity - (parseFloat(value) * divider);
        delta = parseFloat(roundValue(delta, 10));
        value = parseFloat(value) + delta;
    }
    return value;
};

// Ajuste la quantité en se basant sur le prix
const adjustDividedQuantity2 = function (price, unitPrice, origQty, divider) {
    let s = price * (divider - 1);
    let r = ((unitPrice * 100000) - (s * 100000)) / 100000;
    let p = r / origQty;
    return roundValue(p / unitPrice, 10);
};

const clone = function (objToClone) {
    return angular.copy(objToClone);

    // var newObj = undefined;
    // if (objToClone) {
    //     if (Array.isArray(objToClone)) {
    //         newObj = [];
    //         Enumerable.from(objToClone).forEach(function (item) {
    //             newObj.push(clone(item));
    //         });
    //     } else {
    //         newObj = jQuery.extend(true, {}, objToClone);
    //     }
    // }
    // return newObj;
};

// Get tax value
const getTaxValue = function (valueET, taxRate) {
    return (valueET * (taxRate / 100));
};

/**
 * From price without tax to price included tax
 * @param valueET
 * @param taxRate
 * @returns {number}
 */
const ETtoIT = function (valueET, taxRate) {
    return valueET + getTaxValue(valueET, taxRate);
};

//From price included tax to price  without tax
const ITtoET = function (valueIT, taxRate) {
    return (valueIT / ((taxRate / 100) + 1));
};

const getTaxRateFromProvider = function (taxCategory, cacheTaxProvider, deliveryType) {
    var taxRate = 0;
    switch (cacheTaxProvider) {
        case "Tax.FixedRate":
            taxRate = deliveryType == DeliveryType.FORHERE ? taxCategory.VAT : taxCategory.AltVAT;
            break;

        case "Tax.Quebec":
            taxRate = taxCategory.TPSValue + taxCategory.TVQValue;
            break;
    }
    return taxRate;
};

const padLeft = function (str, size, ctopad) {
    return Array(size - String(str).length + 1).join(ctopad || '0') + str;
};

const dateFormat = function (date) {
    var ts = Date.parse(date);
    if (!isNaN(ts)) {
        var tmpDate = new Date(date);
        return tmpDate.toLocaleDateString() + " - " + tmpDate.toLocaleTimeString();
    } else {
        return date;
    }
};

const uniq = function (a) {
    return a.sort().filter(function (item, pos, ary) {
        return !pos || item != ary[pos - 1];
    });
};

const getStringBoolValue = (string) => {
    try {
        if (string && typeof string === "string") {
            if (string === 'true') {
                return true;
            }
            else if (string === 'false') {
                return false;
            }
            else {
                throw "Not a boolean value";
            }
        } else if (typeof string === "boolean") {
            return string;
        } else {
            throw "No string provided";
        }
    } catch (msg) {
        console.error(msg);
    }
};

const objectHash = function (value) {
    return sum(value);
};

const groupBy = function (xs, key) {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

const measureText = (pText, pFontSize, pFamily, pWeight) => {
    let lDiv = document.createElement('div');

    document.body.appendChild(lDiv);

    if (pFamily != null) {
        lDiv.style.fontFamily = pFamily;
    }
    if (pWeight != null) {
        lDiv.style.fontWeight = pWeight;
    }
    lDiv.style.fontSize = "" + pFontSize + "px";
    lDiv.style.position = "absolute";
    lDiv.style.left = -1000;
    lDiv.style.top = -1000;

    lDiv.innerHTML = pText;

    let lResult = {
        width: lDiv.clientWidth,
        height: lDiv.clientHeight
    };

    document.body.removeChild(lDiv);
    lDiv = null;

    return lResult;
};

const stripHtml = (html) => {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

const lightOrDark = (color) => {
    // Variables for red, green, blue values
    var r, g, b, hsp;

    // Check the format of the color, HEX or RGB?
    if (color.match(/^rgb/)) {
        // If HEX --> store the red, green, blue values in separate variables
        color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

        r = color[1];
        g = color[2];
        b = color[3];
    }
    else {
        // If RGB --> Convert it to HEX: http://gist.github.com/983661
        color = +("0x" + color.slice(1).replace(
            color.length < 5 && /./g, '$&$&'));

        r = color >> 16;
        g = color >> 8 & 255;
        b = color & 255;
    }

    // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
    hsp = Math.sqrt(
        0.299 * (r * r) +
        0.587 * (g * g) +
        0.114 * (b * b)
    );

    // Using the HSP value, determine whether the color is light or dark
    if (hsp > 127.5) {
        return 'light';
    }
    else {
        return 'dark';
    }
};