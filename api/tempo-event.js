/* global module, require */
//'use strict';

/**
 * Event manager
 * @module cbchat-event
 * @constructor
 * @type $eventmanager
 */
var $eventmanager = {
    config: {},
    /**
     * Initialise eventmanager according to the events section in config.json. 
     * @param {type} config
     * @returns {$eventmanager}
     */
    init: function (config) {
        require('./cbchat-log').debug(
                "initialize cbchat-event module", 2);
        if (config) {
            this.config = config;
        }
        this.queue.init();
        require('./cbchat-log').debug(this.queue.counter
                + " event queues initialized", 2);
        return this;
    },
    /**
     * Prepare and send a event to matching queue(s)
     * @param {string} what
     * @param {string} why
     * @param {string} withh
     * @param {string} how
     * @param {string} who
     * @param {geo} where
     * @param {date} when
     * @param {object} other
     * @param {function} callback
     * @returns {$eventmanager.queue}
     */
    event: function (what, why, withh, how, who, where, when, other, callback) {
        if (where === undefined || where === null) {
            where = require('./cbchat-log').geoll;
        }
        if (when === undefined || when === null) {
            when = Date.now();
        }
        if (who === undefined || who === null) {
            who = require('./cbchat-app').config.appsign;
        }
        var message = {
            what: what,
            who: who,
            where: where,
            when: when
        };
        if (why !== null && why !== undefined) {
            message.why = why;
        }
        if (withh !== null && withh !== undefined) {
            message.with = withh;
        }
        if (how !== null && how !== undefined) {
            message.how = how;
        }
        if (other !== null && other !== undefined) {
            message = require('merge').recursive({}, other, message);
        }
        this.__sendEvent(message, callback);
        return this;
    },
    /**
     * Prepare and send a event to matching queue(s)
     * @param {string} what
     * @param {object} other
     * @param {function} callback
     * @returns {$eventmanager.queue}
     */
    shortEvent: function (what, other, callback) {
        var message = {
            what: what,
            who: require('./cbchat-app').config.appsign,
            where: require('./cbchat-log').geoll,
            when: Date.now()
        };
        if (other !== null && other !== undefined) {
            require('merge').recursive(message, other);
        }
        this.__sendEvent(message, callback);
        return this;
    },
    /**
     * queue management 
     * @type type
     */
    queue: {
        isActive: false,
        availables: {},
        counter: 0,
        /**
         * Initialise SQS queue using the $eventmanager.queue section in config.json. 
         * @returns {$eventmanager.queue}
         */
        init: function () {
            if ($eventmanager.config.queues) {
                var conf = $eventmanager.config.queues;
                for (var qid in conf) {
                    this.addQueue(qid, $eventmanager.config.queues[qid]);
                }
            }
            return this;
        },
        /**
         * Add an event channel to the queue pool
         * @param {type} id
         * @param {type} config
         * @returns {$eventmanager.queue}
         */
        addQueue: function (id, config) {
            var qtype = config.type;
            if ($eventmanager[qtype] === undefined) {
                throw new Error("queue type  '" + qtype
                        + "' in queue '" + id
                        + "' is not implemented in this cbchat-event version");
            }
            this.counter++;
            this.availables[id] = $eventmanager[qtype](id, config);
            return this;
        }
    },
    /**
     * Send an event to matching queue(s)
     * @param {object} message
     * @param {function} callback
     * @returns {$eventmanager.queue}
     */
    __sendEvent: function (message, callback) {
        if (message.what === undefined ||
                message.where === undefined ||
                message.when === undefined ||
                message.who === undefined) {
            throw new Error("event must have what,where,when,who"
                    + " attribute before sending");
        }
        var nbChannel = 0;
        for (var qid in this.queue.availables) {
            if (this.queue.availables[qid].match(message)) {
                if (qid === (this.queue.availables.length - 1)) {
                    this.queue.availables[qid].send(message, callback);
                }
                else {
                    this.queue.availables[qid].send(message);
                }
                nbChannel++;
            }
        }
        if (nbChannel === 0) {
            require('./cbchat-log').warn(
                    "no event queue for handling event "
                    + message.what + ', please add '
                    + message.what + ' to the event config section');
        }
        return this;
    },
    /**
     * Constructor for SQS event channels
     * @param {type} id
     * @param {type} config
     * @returns {$eventmanager.sqs.handler}
     */
    sqs: function (id, config) {
        var handler = {
            id: null,
            config: null,
            /**
             * Initialise SQS queue using the events.queues[] section in config.json. 
             * @param {type} id
             * @param {type} config
             * @returns {$eventmanager.sqs}
             */
            init: function (id, config) {
                this.id = id;
                this.config = config;
                if (!this.config.resource) {
                    throw new Error("no 'resource' key found in event config '"
                            + this.id + "'");
                }
                if (!require('./cbchat-resource').exist(this.config.resource)) {
                    throw new Error("resource '" + this.config.resource
                            + "' doesn't exist");
                }
                require('./cbchat-log').debug("create event queue '"
                        + this.id + "' linked to resource '"
                        + this.config.resource + "'", 3);
                return this;
            },
            /**
             * Add a message in the SQS queue
             * @param {string} eventmessage
             * @returns {$eventmanager.couchbase}
             */
            match: function (eventmessage) {
                if (this.config.match === undefined ||
                        this.config.match === null ||
                        this.config.match === true) {
                    return true;
                }
                for (var keysearch in this.config.match) {
                    var valuesearch = this.config.match[keysearch];
                    if (typeof valuesearch === "string") {
                        valuesearch = this.config.match[keysearch].split(
                                ",");
                    }
                    if (eventmessage[keysearch] !== undefined) {
                        for (var possible in valuesearch) {
                            if (eventmessage[keysearch] === valuesearch[possible]) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            },
            /**
             * Add a message in the SQS queue
             * @param {object} eventmessage
             * @param {function} cb
             * @returns {$eventmanager.sqs} instance
             */
            send: function (eventmessage, cb) {
                require('./cbchat-timer').start('send_event_' + eventmessage.what);
                var callback = function (err, response) {
                    if (err) {
                        require('./cbchat-log').warn("error sending event "
                                + eventmessage.what + ' because '
                                + err.message + ' [' + err.code + ']',
                                require('./cbchat-timer')
                                .timeStop('send_event_'
                                        + eventmessage.what));
                    }
                    else {
                        require('./cbchat-log').info("event "
                                + eventmessage.what + ' sended as message '
                                + response.MessageId,
                                require('./cbchat-timer')
                                .timeStop('send_event_'
                                        + eventmessage.what),
                                true);
                    }
                };
                require('./cbchat-resource')
                        .get(this.config.resource)
                        .sendMessage(eventmessage, cb ? cb : callback);
                return this;
            }
        };
        handler.init(id, config);
        return handler;
    }
};

module.exports = $eventmanager;