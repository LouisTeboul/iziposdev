
app.config(function ($mdIconProvider) {

    // Icone management
    $mdIconProvider
              .iconSet("file", '/img/icons/sets/file-icons.svg', 24)
              .iconSet("editor", '/img/icons/sets/editor-icons.svg', 24)
              .iconSet("social", '/img/icons/sets/social-icons.svg', 24)
              .iconSet("action", '/img/icons/sets/action-icons.svg', 24)
              .iconSet("content", '/img/icons/sets/content-icons.svg', 24)
              .iconSet("av", '/img/icons/sets/av-icons.svg', 24)
              .iconSet("navigation", '/img/icons/sets/navigation-icons.svg', 24);


});

app.filter('makeRange', function () {
    return function (input) {
        var lowBound, highBound;
        switch (input.length) {
            case 1:
                lowBound = 0;
                highBound = parseInt(input[0]) - 1;
                break;
            case 2:
                lowBound = parseInt(input[0]);
                highBound = parseInt(input[1]);
                break;
            default:
                return input;
        }
        var result = [];
        for (var i = lowBound; i <= highBound; i++)
            result.push(i);
        return result;
    };
});

app.filter('notCanceledBookingsCount', function () {
    return function (input) {
        var ret = 0;
        for (var i = 0; i < input.length; i++) {
            if (input[i].status != 5) ret += input[i].cutleries;
        }
        return ret;
    }
})
