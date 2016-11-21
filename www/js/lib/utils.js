var ROUND_NB_DIGIT = 2;

var roundValue = function (value) {
    if (!isNaN(value)) {
        var pow = Math.pow(10, ROUND_NB_DIGIT);
        return Math.round(value * pow) / pow;
    } else {
        return value;
    }
}

var clone = function (objToClone) {
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
}
