var ROUND_NB_DIGIT = 2;

//Les calculs sont faits sur la base d'une précision de 3 chiffres mais affiché avec une précision de deux
var roundValue = function (value) {
    if (!isNaN(value)) {
        var pow = Math.pow(10, ROUND_NB_DIGIT);
        return Math.round(value * pow) / pow;
    } else {
        return value;
    }
};

var adjustDividedQuantity = function (originalQuantity, value, divider) {
    if(value != 0 ){
        var delta = originalQuantity - (parseFloat(value) * divider);
        delta = parseFloat(Math.round10(delta, -3));
        value = parseFloat(value) + delta;
    }
    return value;
};

var clone = function (objToClone) {
    return angular.copy(objToClone);
    /*
    var newObj = undefined;
    if (objToClone) {
    	if (Array.isArray(objToClone)) {
    		newObj = [];
    		Enumerable.from(objToClone).forEach(function (item) {
    			newObj.push(clone(item));
    		});
    	} else {
    		newObj = jQuery.extend(true, {}, objToClone);
    	}
    }
    return newObj;
    */
};

// Get tax value
var getTaxValue = function (valueET, taxRate) {
    return (valueET * (taxRate / 100));
};

/**
 * From price without tax to price included tax
 * @param valueET
 * @param taxRate
 * @returns {number}
 */
var ETtoIT = function (valueET, taxRate) {
    return valueET + getTaxValue(valueET, taxRate);

};

/**
 * From price included tax to price  without tax
 * @param valueIT
 * @param taxRate
 * @returns {number}
 */
var ITtoET = function (valueIT, taxRate) {
    return (valueIT / ((taxRate / 100) + 1));
};

var decimalAdjust = function (type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
};

// Decimal round
if (!Math.round10) {
    Math.round10 = function(value, exp) {
        return decimalAdjust('round', value, exp);
    };
}
// Decimal floor
if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
        return decimalAdjust('floor', value, exp);
    };
}
// Decimal ceil
if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
        return decimalAdjust('ceil', value, exp);
    };
}



var getTaxRateFromProvider = function (taxCategory, cacheTaxProvider, deliveryType) {
    var taxRate = 0;
    switch (cacheTaxProvider) {
        case "Tax.FixedRate":
            taxRate = deliveryType == DeliveryTypes.FORHERE ? taxCategory.VAT : taxCategory.altVAT;
            break;

        case "Tax.Quebec":
            taxRate = taxCategory.TPSValue + taxCategory.TVQValue;
            break;
    }
    return taxRate;
};


var padLeft = function (str, size, ctopad) {
    return Array(size - String(str).length + 1).join(ctopad || '0') + str;
};

var dateFormat = function (date) {

    var ts = Date.parse(date);
    if (!isNaN(ts)) {

        var tmpDate = new Date(date);
        return tmpDate.toLocaleDateString() + " - " + tmpDate.toLocaleTimeString();
    } else {
        return date;
    }
};

var uniq = function (a) {
    return a.sort().filter(function (item, pos, ary) {
        return !pos || item != ary[pos - 1];
    })
};
