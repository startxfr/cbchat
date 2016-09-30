/* global module, require, process */
//'use strict';

/**
 * sqs resource handler
 * @module cbchat-resource-sqs
 * @constructor
 * @param {string} id
 * @param {object} config
 * @type $log
 */
module.exports = function (id, config) {
    var $sqs = {
        id: id,
        config: {},
        init: function (config) {
            if (config) {
                $sqs.config = config;
            }
            require("./cbchat-log").debug("init couchbase resource '" + $sqs.id + "'", 3);
            if (!$sqs.config.config) {
                throw new Error("no 'config' key found in config 'queue' section");
            }
            if (!$sqs.config.config.QueueUrl) {
                throw new Error("no 'QueueUrl' key found in config 'queue.config' section");
            }
            if (!$sqs.config.credentialFile) {
                $sqs.config.credentialFile = './aws.credentials.json';
            }
            $sqs.AWS = require('aws-sdk');
            $sqs.AWS.config.loadFromPath($sqs.config.credentialFile);
            return this;
        },
        start: function (callback) {
            require("./cbchat-log").debug("start cbchat-resource-sqs module", 3);
            $sqs.open(callback);
            return this;
        },
        stop: function (callback) {
            require("./cbchat-log").debug("stop cbchat-resource-sqs module", 3);
            if (typeof callback === "function") {
                callback(null, this);
            }
            return this;
        },
        open: function (callback) {
            require('./cbchat-timer').start('open_sqs_'
                    + $sqs.config.config.QueueUrl);
            require("./cbchat-log").debug("Open SQS queue "
                    + $sqs.config.config.QueueUrl, 3);
            $sqs.sqsqueue = new $sqs.AWS.SQS();
            $sqs.__openHandler(callback);
            return this;
        },
        __openHandler: function (callback) {
            require("./cbchat-log").debug("sqs queue "
                    + $sqs.config.config.QueueUrl + " opened", 2,
                    require('./cbchat-timer')
                    .timeStop('open_sqs_' + $sqs.config.config.QueueUrl));
            if (typeof callback === "function") {
                callback(null, this);
            }
        },
        /**
         * Read the SQS queue  defined in the config.queue section of config.json
         * @returns {$queue.sqs}
         */
        read: function (callback) {
            require("./cbchat-timer").start('sqs_read');
            require("./cbchat-log").debug("Read SQS queue "
                    + $sqs.config.config.QueueUrl, 4, null, true);
            var cb = (typeof callback === "function") ? callback : $sqs.__readDefaultCallback;
            $sqs.sqsqueue.receiveMessage($sqs.config.config,
                    function (error, response) {
                        cb(error, response, cb);
                    });
            return this;
        },
        __readDefaultCallback: function (error, response, cb) {
            if (error) {
                require("./cbchat-log").warn(
                        "error from SQS queue because" + error.message,
                        require("./cbchat-timer").timeStop('sqs_read'));
                if (error.retryable) {
                    require("./cbchat-log").debug(
                            'retry to call this queue in '
                            + error.retryDelay + 'sec', 2, null, true);
                    var t = (error.retryDelay * 1000) - $sqs.config.frequency;
                    var timer = (t > 0) ? t : 30;
                    $sqs.stop();
                    $sqs.timer = setTimeout(function () {
                        $sqs.read(cb);
                    }, timer);
                }
                else {
                    require("./cbchat-log").error(
                            'this queue error is not retryable');
                    $sqs.stop();
                }
            }
            else {
                if (response.Messages) {
                    var nb = response.Messages.length;
                    require("./cbchat-log").debug("received " + nb
                            + " messages from SQS queue", 4,
                            require("./cbchat-timer").timeStop('sqs_read'));
                }
                else {
                    require("./cbchat-log").debug(
                            "received an empty response from SQS queue", 4,
                            require("./cbchat-timer").timeStop('sqs_read'));
                }
            }
        },
        /**
         * Remove a message from the SQS queue
         * @param {object} message
         * @param {function} callback
         * @returns {$queue.sqs}
         */
        removeMessage: function (message, callback) {
            require("./cbchat-timer").start('delete_message_'
                    + message.MessageId);
            var defaultCallback = function (error, doc) {
                if (error) {
                    require("./cbchat-log").warn('message '
                            + message.MessageId
                            + ' could not be removed because '
                            + error.message + ' [' + error.code + ']',
                            require("./cbchat-timer")
                            .timeStop('delete_message_' + message.MessageId), true);
                }
                else {
                    require("./cbchat-log").debug("removed sqs message "
                            + message.MessageId, 4,
                            require("./cbchat-timer")
                            .timeStop('delete_message_' + message.MessageId), true);
                }
            };
            $sqs.sqsqueue.deleteMessage({
                QueueUrl: $sqs.config.config.QueueUrl,
                ReceiptHandle: message.ReceiptHandle
            }, (callback) ? callback : defaultCallback);
            return this;
        },
        /**
         * Remove a message from the SQS queue
         * @param {object} message
         * @param {function} callback
         * @returns {$queue.sqs}
         */
        sendMessage: function (message, callback) {
            var messId = message.id;
            require('./cbchat-timer').start('send_event_' + messId);
            var $this = this;
            var params = {
                MessageBody: JSON.stringify(message),
                QueueUrl: $sqs.config.config.QueueUrl,
                DelaySeconds: 0
            };
            var defaultCallback = function (error, response) {
                if (error) {
                    require("./cbchat-log").warn('message ' + message.id
                            + ' could not be send because ' + error.message
                            + ' [' + error.code + ']',
                            require("./cbchat-timer")
                            .timeStop('send_event_' + messId),
                            true);
                }
                else {
                    require("./cbchat-log").debug("sended sqs message "
                            + response.MessageId, 4,
                            require("./cbchat-timer")
                            .timeStop('send_event_' + messId),
                            true);
                }
            };
            $sqs.sqsqueue.sendMessage(params, callback ? callback : defaultCallback);
            return this;
        }
    };
    $sqs.init(config);
    return $sqs;
};