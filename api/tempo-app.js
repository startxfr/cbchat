/* global module, require, process */

//'use strict';

var $app = {
    package: {},
    config: {
        ip: require("ip").address()
    },
    oninitQueue: [],
    onstopQueue: [],
    onstartQueue: [],
    /**
     * Stop the application
     * @param {function} callback
     * @returns {$app}
     */
    onInit: function (callback) {
        if (typeof callback === "function") {
            this.oninitQueue.push(callback);
        }
        return this;
    },
    /**
     * Main init function who start the application
     * @param {function} callback
     * @returns {$app}
     */
    init: function (callback) {
        if (process.env.TEMPO_DIR) {
            process.chdir(process.env.TEMPO_DIR);
        }
        else {
            console.error('environment variable TEMPO_DIR must be set');
            process.exit(5);
        }
        require('./cbchat-timer').start('app');
        this._initLoadConfigFiles();
        require("./cbchat-log").info("Init application " + $app.config.appsign);
        require('./cbchat-geoip').init(function ($this) {
            $app.config.geo = $this.lookup($app.config.ip);
            require("./cbchat-log").setGeoll($app.config.geo);
        });
        var afterResourceLoaded = function () {
            require('./cbchat-log').init($app.config.log, $app.config.debug);
            if ($app.config.events) {
                require("./cbchat-event").init($app.config.events);
            }
            if ($app.config.server) {
                require("./cbchat-ws").init($app.config.server);
            }
            for (var i in $app.oninitQueue) {
                $app.oninitQueue[i]();
            }
            if (typeof callback === "function") {
                callback();
            }
        };
        if ($app.config.resources) {
            require('./cbchat-resource')
                    .init($app.config.resources)
                    .starts(function () {
                        if ($app.config.cache) {
                            require("./cbchat-cache").init($app.config.cache, afterResourceLoaded);
                        }
                        else {
                            afterResourceLoaded();
                        }
                    });
        }
        else {
            afterResourceLoaded();
        }
        return this;
    },
    /**
     * Main init function who start the application
     * @returns {$app}
     */
    _initLoadConfigFiles: function () {
        try {
            require('merge').recursive(
                    $app.package,
                    JSON.parse(
                            require('fs')
                            .readFileSync('./package.json', 'utf-8')));
            require('merge').recursive(
                    $app.config,
                    JSON.parse(
                            require('fs')
                            .readFileSync('./config.json', 'utf-8')));
        }
        catch (e) {
            console.error("config.json or package.json is missing");
            process.exit(5);
        }
        $app.config.appsign =
                $app.config.log.appsign =
                $app.package.name
                + '::' + $app.package.version
                + '::' + $app.config.ip
                + ':' + $app.config.server.port;
        $app.config.log.apptype = $app.package.name;
        var logConf = JSON.parse(JSON.stringify($app.config.log));
        delete logConf['couchbase'];
        delete logConf['sqs'];
        require('./cbchat-log').init(logConf, $app.config.debug);
        return this;
    },
    /**
     * Stop the application
     * @param {function} callback
     * @returns {$app}
     */
    onStart: function (callback) {
        if (typeof callback === "function") {
            $app.onstartQueue.push(callback);
        }
        return this;
    },
    /**
     * Start the application
     * @param {function} callback
     * @returns {$app}
     */
    start: function (callback) {
        require("./cbchat-log").info("Starting application "
                + $app.config.appsign, 1);
        for (var i in $app.onstartQueue) {
            $app.onstartQueue[i]();
        }
        if (typeof callback === "function") {
            callback();
        }
        return this;
    },
    /**
     * Stop the application
     * @param {function} callback
     * @returns {$app}
     */
    onStop: function (callback) {
        if (typeof callback === "function") {
            $app.onstopQueue.push(callback);
        }
        return this;
    },
    /**
     * Stop the application
     * @param {function} callback
     * @returns {$app}
     */
    stop: function (callback) {
        require("./cbchat-log").debug("Stopping application "
                + $app.config.appsign, 1);
        for (var i in $app.onstopQueue) {
            $app.onstopQueue[i]();
        }
        if (typeof callback === "function") {
            callback();
        }
        require('./cbchat-resource').stops();
        process.exit(0);
    },
    /**
     * Stop the application
     * @param {function} callback
     * @returns {$app}
     */
    launch: function (callback) {
        require("./cbchat-log").debug("Launching application", 1);
        $app.init(function () {
            $app.start(callback);
        });
        return this;
    }
};

module.exports = $app;