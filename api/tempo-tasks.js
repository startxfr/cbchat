/* global module, require */

//'use strict';

var $tasks = {
    configs: [],
    pool: [],
    processor: {},
    init: function (config, taskprocessor) {
        require('./cbchat-log').debug("Init cbchat-task module", 2);
        if (config) {
            for (var i in config) {
                this.registerTask(config[i]);
            }
        }
        this.processor = taskprocessor;
        return this;
    },
    registerTask: function (config) {
        if (config === undefined) {
            throw new Error("task must have a config");
        }
        if (!config._id) {
            throw new Error("no '_id' key found in config 'tasks[]' section");
        }
        if (!config._frequency) {
            throw new Error("no '_frequency' key found in config 'tasks[" + config._id + "]' section");
        }
        if (!config._exec) {
            throw new Error("no '_exec' key found in config 'tasks[" + config._id + "]' section");
        }
        require('./cbchat-log').debug("register new task " + config._id + " to tasks pool", 2);
        this.configs[config._id] = config;
        return this;
    },
    /**
     * Stop the application
     * @returns {$tasks}
     */
    getConfig: function (id) {
//        require('./cbchat-log').debug("get config for task " + id, 3);
        for (var i in this.configs) {
            if (this.configs[i]._id === id) {
                return this.configs[i];
            }
        }
        return {};
    },
    starts: function () {
        require('./cbchat-log').info("Start tasks");
        for (var i in this.configs) {
            this.start(this.configs[i]._id);
        }
        return this;
    },
    /**
     * Start the application
     * @returns {$tasks}
     */
    start: function (id) {
        for (var i in $tasks.configs) {
            var task = $tasks.configs[i];
            if (task._id === id) {
                var tf = task._frequency + 'ms';
                if (task._frequency >= 1000) {
                    tf = (task._frequency / 1000) + 's';
                }
                require('./cbchat-log').info("run task " + task._id + ' every ' + tf);
                this.pool[task._id] = setInterval(this.processor[task._exec], task._frequency);
            }
        }
        return this;
    },
    stops: function () {
        require('./cbchat-log').info("Stop tasks");
        for (var i in this.configs) {
            this.stop(this.configs[i]._id);
        }
        return this;
    },
    /**
     * Stop the application
     * @returns {$tasks}
     */
    stop: function (id) {
        for (var i in $tasks.configs) {
            var task = $tasks.configs[i];
            if (task._id === id) {
                require('./cbchat-log').info("stop running task " + task._id);
                clearInterval(this.pool[task._id]);
                this.pool[task._id] = undefined;
            }
        }
    }
};

module.exports = $tasks;