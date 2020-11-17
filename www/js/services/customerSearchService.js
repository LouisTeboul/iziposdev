// Reddit constructor function to encapsulate HTTP and pagination logic
app.factory('CustomerSearch', function ($rootScope, $http) {
    let CustomerSearch = function (newBooking) {
        this.query = '';
        this.items = [];
        this.busy = false;
        this.pageSize = 10;
        this.page = 0;
        this.totalCount = 0;

        this.loadedPages = {};
        this.numItems = 0;
        this.loadedItems = false;
        this.PAGE_SIZE = 50;
        this.fetchNumItems_();
    };

    CustomerSearch.prototype.search = function () {
        this.page = 0;
        this.loadedItems = false;
        this.items = [];
        this.loadedPages = {};

        this.getItemAtIndex(0);
    };

    CustomerSearch.prototype.getItemAtIndex = function (index) {
        let pageNumber = Math.floor(index / this.PAGE_SIZE);
        let page = this.loadedPages[pageNumber];
        if (page) {
            return page[index % this.PAGE_SIZE];
        } else if (page !== null) {
            this.fetchPage_(pageNumber);
        }
    };
    CustomerSearch.prototype.fetchPage_ = function (pageNumber) {
        // Set the page to null so we know it is already being fetched.
        this.loadedPages[pageNumber] = null;

        if (this.query != undefined && this.query != '') {
            let url = $rootScope.IziBoxConfiguration.BookingEndpoint + "/Admin/Booking/SearchCustomer?query=" + this.query + "&pageSize=" + this.PAGE_SIZE + "&page=" + pageNumber;

            $http({
                method: 'GET',
                url: url
            }).then(function successCallback(response) {
                if (response.data) {
                    this.totalCount = response.data.totalCount;
                    this.loadedPages[pageNumber] = [];
                    if (response.data.items) {
                        let ret = response.data.items;
                        this.loadedItems = true;
                        for (let i = 0; i < ret.length; i++) {
                            this.loadedPages[pageNumber].push(ret[i]);
                        }
                    }
                }
            }.bind(this));
        }
    };

    CustomerSearch.prototype.fetchNumItems_ = function () {
        this.fetchPage_(0);
    };

    CustomerSearch.prototype.getLength = function () {
        return this.totalCount;
    };

    return CustomerSearch;
});