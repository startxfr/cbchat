/* global module, require */

//'use strict';

var $geoip = {
    isInit: false,
    tool: require('geoip-lite'),
    init: function (onInitCallback) {
        if (this.isInit === false) {
            require('./cbchat-log').debug("Init cbchat-geoip module", 2);
            this.tool.startWatchingDataUpdate(this.__watchingDataUpdateCallback);
            this.isInit = true;
        }
        ;
        if (typeof onInitCallback === "function") {
            onInitCallback(this);
        }
        ;
        return this;
    },
    lookup: function (ip) {
        require('./cbchat-log').debug("Get geo-info for IP " + ip, 2);
        var geo = this.tool.lookup(ip);
        if (geo) {
            require('./cbchat-log').info("Server is located in " + geo.city);
        }
        var geobj = {
            type: "Point",
            coordinates: (geo) ? geo.ll : [0, 0]
        };
        if (geo && geo.country) {
            geobj.country = geo.country;
        }
        if (geo && geo.region) {
            geobj.region = geo.region;
        }
        if (geo && geo.city) {
            geobj.city = geo.city;
        }
        return geobj;
    },
    __watchingDataUpdateCallback: function () {
        require('./cbchat-log').debug("Updated geoIP database", 2);
    }
};

module.exports = $geoip.init();