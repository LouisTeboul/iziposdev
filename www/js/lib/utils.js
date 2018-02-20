var ROUND_NB_DIGIT = 2;

//Les calculs sont faits sur la base d'une précision de 3 chiffres mais affiché avec une précision de deux
var roundValue = function (value) {
    if (!isNaN(value)) {
        var pow = Math.pow(10, 3);
        return Math.round(value * pow) / pow;
    } else {
        return value;
    }
};
<<<<<<< HEAD

var adjustDividedQuantity = function (originalQuantity, value, divider) {
    if(value != 0 ){
        var delta = originalQuantity - (parseFloat(value) * divider);
        delta = parseFloat(delta.toFixed(3));
        value = parseFloat(value) + delta;
    }
    return value
};
=======
>>>>>>> 9101faf73f812b9db686d8ab2bdb953304ed7f87

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
