/* global module, require */
//'use strict';

/**
 * Resource manager used to handle caches instances
 * @module cbchat-cache
 * @constructor
 * @type caches
 */
var $cache = {
    config: {},
    /**
     * init method
     * @param {object} config
     * @param {function} callback
     * @returns {$cache}
     */
    init: function (config, callback) {
        require('./cbchat-log').debug("Init cbchat-cache module", 2);
        if (config) {
            for (var id in config) {
                this.add(id, config[id]);
            }
        }
        this.refresh(callback);
        return this;
    },
    /**
     * add a cache to the available pool
     * @param {type} id
     * @param {type} config
     * @returns {$cache}
     */
    add: function (id, config) {
        require('./cbchat-log')
                .debug("Adding cache "
                        + id + " to caches pool", 2);
        if (typeof id !== "string") {
            throw new Error("cache 'id' must be a string");
        }
        if (config === undefined) {
            throw new Error("cache must have a config");
        }
        if (config.type === undefined) {
            throw new Error("cache must have a 'type' param");
        }
        else {
            switch (config.type) {
                case "dbview":
                    this.config[id] = this.createCacheDbView(id, config);
                    break;
                case "dbdoc":
                    this.config[id] = this.createCacheDbDoc(id, config);
                    break;
                case "http":
                    this.config[id] = this.createCacheHttp(id, config);
                    break;
                case "static":
                    this.config[id] = this.createCacheStatic(id, config);
                    break;
                default:
                    throw new Error("cache type must be in 'dbview,dbdoc,http,static'");
            }
        }
        return this;
    },
    /**
     * Get a cache by it's ID
     * @param {string} id
     * @param {object} config
     * @returns {$cache.config}
     */
    createCacheDbView: function (id, config) {
        var cacheObj = {
            id: id,
            config: {},
            data: {},
            init: function (config) {
                if (config) {
                    cacheObj.config = config;
                }
                require("./cbchat-log").debug(
                        "init db cache '" + cacheObj.id + "'", 3);
                if (!cacheObj.config.resource) {
                    throw new Error("no 'resource' key found in config");
                }
                if (!require('./cbchat-resource').exist(config.resource)) {
                    throw new Error("resource '" + config.resource + "' used in '" + cacheObj.id + "' cache doesn't exist");
                }
                if (!cacheObj.config.query_view) {
                    throw new Error("no 'query_view' key found in config");
                }
                return cacheObj;
            },
            refresh: function (callback) {
                require("./cbchat-log").debug(
                        "refresh '" + cacheObj.id + "' cache", 3);
                var view = cacheObj.config.query_view.split(":");
                var queryCallback = function (cacheObj, callback) {
                    return function (err, results) {
                        if (err) {
                            var message = 'could not update \'' + cacheObj.id + '\' cache because ' + err.message;
                            require("./cbchat-log").error(message + ' [' + err.code + ']');
                            if (typeof callback === "function") {
                                callback(message);
                            }
                        }
                        else {
                            cacheObj.data = [];
                            for (var i in results) {
                                cacheObj.data.push(require('merge').recursive(true, {"_id": results[i].id}, results[i].value));
                            }
                            var length = (typeof cacheObj.data === 'object')
                                    ? Object.keys(cacheObj.data).length
                                    : cacheObj.data.length;
                            require("./cbchat-log").info("cache '" + cacheObj.id + "' updated with " + length + " results");
                            if (typeof callback === "function") {
                                callback(null, cacheObj.id);
                            }
                        }
                    };
                };
                require('./cbchat-resource').get(cacheObj.config.resource).query(view[0], view[1], queryCallback(cacheObj, callback));
                return cacheObj;
            },
            get: function () {
                require("./cbchat-log").debug("get "
                        + Object.keys(cacheObj.data).length
                        + " elements from cache '"
                        + cacheObj.id
                        , 3);
                return cacheObj.data;
            }
        };
        cacheObj.init(config);
        return cacheObj;
    },
    /**
     * Get a cache by it's ID
     * @param {string} id
     * @param {object} config
     * @returns {$cache.config}
     */
    createCacheDbDoc: function (id, config) {
        var cacheObj = {
            id: id,
            config: {},
            data: null,
            init: function (config) {
                if (config) {
                    cacheObj.config = config;
                }
                require("./cbchat-log").debug(
                        "init db cache '" + cacheObj.id + "'", 3);
                if (!cacheObj.config.resource) {
                    throw new Error("no 'resource' key found in config");
                }
                if (!require('./cbchat-resource').exist(config.resource)) {
                    throw new Error("resource '" + config.resource + "' used in '" + cacheObj.id + "' cache doesn't exist");
                }
                if (!cacheObj.config.docid) {
                    throw new Error("no 'docid' key found in config");
                }
                return cacheObj;
            },
            refresh: function (callback) {
                require("./cbchat-log").debug(
                        "refresh '" + cacheObj.id + "' cache", 3);
                var queryCallback = function (cacheObj, callback) {
                    return function (err, results) {
                        if (err) {
                            var message = 'could not update \'' + cacheObj.id + '\' cache because ' + err.message;
                            require("./cbchat-log").error(message + ' [' + err.code + ']');
                            if (typeof callback === "function") {
                                callback(message);
                            }
                        }
                        else {
                            if (cacheObj.config.subkey !== undefined) {
                                cacheObj.data = results.value[cacheObj.config.subkey];
                            }
                            else {
                                cacheObj.data = results.value;
                            }
                            var length = (typeof cacheObj.data === 'object')
                                    ? Object.keys(cacheObj.data).length
                                    : cacheObj.data.length;
                            require("./cbchat-log").info("cache '" + cacheObj.id + "' updated with " + length + " results");
                            if (typeof callback === "function") {
                                callback(null, cacheObj.id);
                            }
                        }
                    };
                };
                require('./cbchat-resource').get(cacheObj.config.resource).get(cacheObj.config.docid, queryCallback(cacheObj, callback));
                return cacheObj;
            },
            get: function () {
                var l = (cacheObj.data && cacheObj.data.length) ? cacheObj.data.length : 1;
                require("./cbchat-log").debug("get "
                        + l
                        + " elements from cache '"
                        + cacheObj.id
                        , 3);
                return cacheObj.data;
            }
        };
        cacheObj.init(config);
        return cacheObj;
    },
    createCacheHttp: function (id, config) {
        var cacheObj = {
            id: id,
            config: {},
            data: null,
            jquery: null,
            init: function (config) {
                if (config) {
                    cacheObj.config = config;
                }
                require("./cbchat-log").debug(
                        "init http cache '" + cacheObj.id + "'", 3);
                if (!cacheObj.config.url) {
                    throw new Error("no 'url' key found in config");
                }
                if (!cacheObj.config.search) {
                    throw new Error("no 'search' key found in config");
                }
                return cacheObj;
            },
            refresh: function (callback) {
                require("./cbchat-log").debug(
                        "refresh '" + cacheObj.id + "' cache", 3);
                if (cacheObj.jquery === null) {
                    cacheObj.jquery = require('fs').readFileSync("./cbchat-jquery.js").toString();
                }
                cacheObj.data = [];
                require('jsdom').env({
                    url: cacheObj.config.url,
                    src: [cacheObj.jquery],
                    features: {FetchExternalResources: false},
                    done: function (error, window) {
                        var $ = window.$;
                        $(cacheObj.config.search).each(function () {
                            if (cacheObj.config.filter) {
                                eval('cacheObj.data.push(' + cacheObj.config.filter + ')');
                            }
                            else {
                                cacheObj.data.push($(this).text());
                            }
                        });
                        var length = (typeof cacheObj.data === 'object')
                                ? Object.keys(cacheObj.data).length
                                : cacheObj.data.length;
                        require("./cbchat-log").info("cache '" + cacheObj.id + "' updated with " + length + " results");
                        if (typeof callback === "function") {
                            callback(null, cacheObj.id);
                        }
                    }
                });
                return cacheObj;
            },
            get: function () {
                require("./cbchat-log").debug("get "
                        + cacheObj.data.length
                        + " elements from cache '"
                        + cacheObj.id
                        , 3);
                return cacheObj.data;
            }
        };
        cacheObj.init(config);
        return cacheObj;
    },
    createCacheStatic: function (id, config) {
        var cacheObj = {
            id: id,
            config: {},
            data: null,
            init: function (config) {
                if (config) {
                    cacheObj.config = config;
                }
                require("./cbchat-log").debug(
                        "init http cache '" + cacheObj.id + "'", 3);
                if (!cacheObj.config.data) {
                    throw new Error("no 'data' key found in config");
                }
                return cacheObj;
            },
            refresh: function (callback) {
                require("./cbchat-log").debug(
                        "refresh '" + cacheObj.id + "' cache", 3);
                cacheObj.data = cacheObj.config.data;
                var length = (typeof cacheObj.data === 'object')
                        ? Object.keys(cacheObj.data).length
                        : cacheObj.data.length;
                require("./cbchat-log").info("cache '" + cacheObj.id + "' updated with " + length + " results");
                if (typeof callback === "function") {
                    callback(null, cacheObj.id);
                }
                return cacheObj;
            },
            get: function () {
                require("./cbchat-log").debug("get "
                        + cacheObj.data.length
                        + " elements from cache '"
                        + cacheObj.id
                        , 3);
                return cacheObj.data;
            }
        };
        cacheObj.init(config);
        return cacheObj;
    },
    /**
     * Get a cache by it's ID
     * @param {type} id
     * @returns {$cache.config}
     */
    get: function (id) {
        return this.config[id].get();
    },
    /**
     * test if a cache exist
     * @param {type} id
     * @returns {Boolean}
     */
    exist: function (id) {
        return (this.config[id]) ? true : false;
    },
    /**
     * start all caches
     * @param {type} callback
     * @returns {$cache}
     */
    refresh: function (callback) {
        require('./cbchat-log').debug("Refreshing all caches", 2);
        var series = [];
        for (var id in this.config) {
            if (this.config[id] && typeof this.config[id].refresh === "function") {
                series.push(this.config[id].refresh);
            }
        }
        require('async').parallel(series, callback);
        return this;
    }
};
module.exports = $cache;