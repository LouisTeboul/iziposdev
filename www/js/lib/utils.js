var ROUND_NB_DIGIT = 2;

//Les calculs sont faits sur la base d'une précision de 3 chiffres mais affiché avec une précision de deux
var roundValue = function (value) {
    if (!isNaN(value)) {
        var pow = Math.pow(10, 3);
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
};


var dateFormat = function (date) {
    /*
    console.log(tmpDate.toLocaleDateString());
    console.log(tmpDate.toLocaleTimeString());
    */
    var ts = Date.parse(date);
    if(!isNaN(ts)){

        var tmpDate = new Date(date);
        return tmpDate.toLocaleDateString() + " - " + tmpDate.toLocaleTimeString();
    } else {
        return date;
    }
};

var uniq = function (a) {
    return a.sort().filter(function(item, pos, ary) {
        return !pos || item != ary[pos - 1];
    })
};
