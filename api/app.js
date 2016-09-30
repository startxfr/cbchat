/* global require, process */
require('./cbchat-timer').start('app');
var $app = require("./cbchat-app");

var $hv = {
    /**
     * Router called in server.endpoints config section
     * see cbchat-ws router for more information
     * @param {object} configs config for this router endpoint
     * @returns {undefined}
     */
    router: function (configs) {
        var $ws = require("./cbchat-ws");
        var endpoints = configs.endpoints;
        delete configs.endpoints;
        require("./cbchat-log").debug("Use router '$hv.router' for '" + configs.path + "'", 2);
        for (var i = 0; i < endpoints.length; i++) {
            var config = require('merge').recursive(true, configs, endpoints[i]);
            var eptype = (typeof config.handler === "string") ? "dynamic" : "static ";
            var ephdname = (config.handler) ? config.handler : "$ws.__endpointCallback";
            if (typeof config.handler === "string") {
                config.handler = eval(config.handler);
            }
            else if (typeof config.handler === "undefined" && config.method !== "ROUTER") {
                config.handler = $ws.__endpointCallback;
            }
            if (config.method === "ROUTER") {
                config.handler(config);
            }
            else if (config.method === "POST") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [POST]   " + config.path + " > " + ephdname, 3);
                $ws.app.post(config.path, config.handler(config));
            }
            else if (config.method === "PUT") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [PUT]    " + config.path + " > " + ephdname, 3);
                $ws.app.put(config.path, config.handler(config));
            }
            else if (config.method === "DELETE") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [DELETE] " + config.path + " > " + ephdname, 3);
                $ws.app.delete(config.path, config.handler(config));
            }
            else {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [GET]    " + config.path + " > " + ephdname, 3);
                $ws.app.get(config.path, config.handler(config));
            }
        }
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    listEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.listEndpoint');
            require("./cbchat-log").debug("Start '$hv.listEndpoint'", 2);
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.listEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.listEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                confError = true;
                require("./cbchat-log").error("no 'query_view' key found in '$hv.listEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                confError = true;
                require("./cbchat-log").error("in '$hv.listEndpoint' config key 'query_view' must be a string");
            }
            var view = config.query_view.split(":");
            if (req.query && req.query.q && typeof req.query.q === 'string') {
                view[1] = req.query.q;
            }
            if (typeof view[0] !== 'string' || typeof view[1] !== 'string') {
                confError = true;
                require("./cbchat-log").error("in '$hv.listEndpoint' config key 'query_view' must be of format 'design:view'");
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.listEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        var data = [];
                        require("./cbchat-log").debug('Query ' + view[1] + ' with ' + results.length + " results", 3);
                        for (var i in results) {
                            data.push(require('merge').recursive(true, {"id": results[i].id}, results[i].value));
                        }
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", data)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.listEndpoint'))
                                .addTotal(results.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.listEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('./cbchat-resource').get(config.resource).query(view[0], view[1], queryCallback(req, res));
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    detailEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.detailEndpoint');
            require("./cbchat-log").debug("Start '$hv.detailEndpoint'", 2);
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.detailEndpoint' config");
            }
            if (!req.params || !req.params.id) {
                confError = true;
                require("./cbchat-log").error("no ID key found in URL, please check your path");
            }
            var docId = req.params.id;
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.detailEndpoint' config doesn't exist");
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.detailEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").war("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        var data = require('merge').recursive(true, {"id": results.id}, results.value);
                        require("./cbchat-ws")
                                .okResponse(res, req.params.id + " found", data)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.detailEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.detailEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('./cbchat-resource').get(config.resource).get(docId, queryCallback(req, res));
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    addEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.addEndpoint');
            require("./cbchat-log").debug("Start '$hv.addEndpoint'", 2);
            var inVar = req.body;
            var docId = "hv::" + 
                    require('change-case').snakeCase(inVar.name);
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.addEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.addEndpoint' config doesn't exist");
            }
            if (!config.authorized_profile) {
                confError = true;
                require("./cbchat-log").error("no 'authorized_profile' key found in '$hv.addEndpoint' config");
            }
            var control_params = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!inVar.name) {
                    clientError.push("you must provide a name for this hv");
                }
                if (!inVar.owner) {
                    clientError.push("you must provide an owner for this hv");
                }
                if (!inVar.max_cell) {
                    clientError.push("you must provide a max_cell for this hv");
                }
                if (!inVar.state) {
                    clientError.push("you must provide a state for this hv");
                }
                else {
                    if (config.authorized_state) {
                        var authState = config.authorized_state.split(",");
                        if (authState.indexOf(inVar.state) === -1) {
                            clientError.push("state '" + inVar.state + "' is not autorized. Authorized list is : " + config.authorized_state);
                        }
                    }
                }
                if (!inVar.profile) {
                    clientError.push("you must provide a profile for this hv");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, inVar);
            };
            var control_docid = function (document, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                require('./cbchat-resource').get(config.resource).get("hv::" + document.name, function (callback) {
                    return function (err, results) {
                        if (!err) {
                            callback("hypervisor named '" + document.name + "' already exist");
                        }
                        else {
                            callback(null, document);
                        }
                    };
                }(callback));
            };
            var fill_params = function (document, callback) {
                require("./cbchat-log").debug("fill HV document with automatic params", 3);
                document.type = "hv";
                document.running_cell = 0;
                document.token = require('crypto')
                        .createHash("sha256")
                        .update(JSON.stringify(document)
                                + require('./cbchat-timer')
                                .time('$hv.addEndpoint'))
                        .digest("base64");
                callback(null, document);
            };
            var fill_profile = function (document, callback) {
                require("./cbchat-log").debug("fill HV document with server-profile params", 3);
                var profiles = require('./cbchat-cache').get('ref_hvProfiles');
                if (typeof profiles[document.profile] === 'undefined') {
                    callback("hv profile '"
                            + document.profile
                            + "' is not autorized. Authorized list is : "
                            + config.authorized_profile);
                }
                else {
                    document.instance_params = JSON.parse(JSON.stringify(profiles[document.profile]));
                    callback(null, document);
                }
            };
            var addDocument = function (document, callback) {
                require("./cbchat-log").debug("fill HV document with server-profile params", 3);
                require('./cbchat-resource').get(config.resource).insert(docId, document, function (key) {
                    return function (err) {
                        if (err) {
                            callback('error inserting ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, document);
                        }
                    };
                });
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.addEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    control_params,
                    control_docid,
                    fill_params,
                    fill_profile,
                    addDocument
                ], function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.addEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " added", results)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.addEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    updateEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.updateEndpoint');
            require("./cbchat-log").debug("Start '$hv.updateEndpoint'", 2);
            var docId = "";
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.updateEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.updateEndpoint' config doesn't exist");
            }
            var control_params = function (callback) {
                require("./cbchat-log").debug("control input params", 3);
                if (!req.params.id) {
                    callback("you must provide an ID to update");
                    require("./cbchat-log").warn('could not update ' + docId
                            + ' because no ID given ');
                    return;
                }
                docId = req.params.id;
                callback(null, req.body);
            };
            var check_state = function (document, callback) {
                require("./cbchat-log").debug("Check if HV state could be updated", 3);
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        var message = "only '" + config.authorized_state + "' are autorized to be updated.";
                        callback(message);
                        require("./cbchat-log").warn('could not update ' + docId
                                + ' because in ' + document.state
                                + ' and ' + message);
                        return;
                    }
                }
                callback(null, document);
            };
            var filter_params = function (document, callback) {
                require("./cbchat-log").debug("filter input params", 3);
                var out = {};
                if (config.authorized_params) {
                    var filters = config.authorized_params.split(",");
                    for (var i in document) {
                        if (filters.indexOf(i) !== -1) {
                            out[i] = document[i];
                        }
                    }
                }
                callback(null, out);
            };
            var get_document = function (document, callback) {
                require("./cbchat-log").debug("find current document", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback, document) {
                    return function (err, results) {
                        if (err) {
                            callback("can't find document");
                            require("./cbchat-log").warn('could not find ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, [document, results.value]);
                        }
                    };
                }(callback, document));
            };
            var update_content = function (documents, callback) {
                require("./cbchat-log").debug("update document with updates", 3);
                callback(null, require('merge').recursive(true, documents[1], documents[0]));
            };
            var record_document = function (document, callback) {
                require("./cbchat-log").debug("record new document", 3);
                require('./cbchat-resource').get(config.resource).update(docId, document, function (key) {
                    return function (err) {
                        if (err) {
                            callback('error in recording new document');
                            require("./cbchat-log").error('could not update ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, document);
                        }
                    };
                });
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.updateEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    control_params,
                    check_state,
                    filter_params,
                    get_document,
                    update_content,
                    record_document
                ], function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.updateEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " updated", results)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.updateEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    deleteEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.deleteEndpoint');
            require("./cbchat-log").debug("Start '$hv.deleteEndpoint'", 2);
            var docId = req.params.id;
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.deleteEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.deleteEndpoint' config doesn't exist");
            }
            var controlParams = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!docId) {
                    clientError.push("you must provide a hv ID");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, true);
            };
            var getDocument = function (control, callback) {
                require("./cbchat-log").debug("get hv document", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (err) {
                            callback("hypervisor '" + docId + "' doesn't exist");
                        }
                        else {
                            callback(null, require('merge').recursive(true, {"id": docId}, results.value));
                        }
                    };
                }(callback));
            };
            var controlState = function (docInfo, callback) {
                require("./cbchat-log").debug("control HV state", 3);
                if (docInfo.state === "scheduled"
                        || docInfo.state === "prepared"
                        || docInfo.state === "stopped"
                        || docInfo.state === "dead") {
                    callback(null, docInfo);
                }
                else {
                    callback("is in " + docInfo.state + ' state');
                }
            };
            var controlCells = function (docInfo, callback) {
                require("./cbchat-log").debug("control HV running cells", 3);
                if (docInfo.running_cell > 0) {
                    callback("has " + docInfo.running_cell + ' cell still associated');
                }
                else {
                    callback(null, docInfo);
                }
            };
            var deleteDocument = function (docInfo, callback) {
                require("./cbchat-log").debug("delete Hypervisor", 3);
                require('./cbchat-resource').get(config.resource).delete(docId, function (key) {
                    return function (err) {
                        if (err) {
                            callback('error deleting ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, docInfo);
                        }
                    };
                });
            };

            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.updateEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    controlParams,
                    getDocument,
                    controlState,
                    controlCells,
                    deleteDocument
                ], function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.deleteEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " deleted", results)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.deleteEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    startEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.startEndpoint');
            require("./cbchat-log").debug("Start '$hv.startEndpoint'", 2);
            var docId = req.params.id;
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.startEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.startEndpoint' config doesn't exist");
            }
            var controlParams = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!docId) {
                    clientError.push("you must provide a hv ID");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, true);
            };
            var getDocument = function (control, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (err) {
                            callback("hypervisor '" + docId + "' doesn't exist");
                        }
                        else {
                            callback(null, require('merge').recursive(true, {"id": docId}, results.value));
                        }
                    };
                }(callback));
            };
            var controlStartable = function (document, callback) {
                require("./cbchat-log").debug("control if hv can be started", 3);
                var clientError = [];
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        clientError.push("HV with '" + document.state + "' state could not be started. Startable state's are : " + config.authorized_state);
                    }
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, document);
            };
            var goStartable = function (document, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                document.state = "startable";
                delete document.id;
                require('./cbchat-resource').get(config.resource).update(docId, document, function (callback, document) {
                    return function () {
                        return function (err, results) {
                            if (err) {
                                callback("hypervisor '" + docId + "' could not be updated");
                            }
                            else {
                                callback(null, document);
                            }
                        };
                    };
                }(callback, document));
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.startEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    controlParams,
                    getDocument,
                    controlStartable,
                    goStartable
                ], function (err) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.startEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " is marked as startable and will be started soon", true)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.startEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    stopEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$hv.stopEndpoint');
            require("./cbchat-log").debug("Start '$hv.stopEndpoint'", 2);
            var docId = req.params.id;
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$hv.stopEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$hv.stopEndpoint' config doesn't exist");
            }
            var controlParams = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!docId) {
                    clientError.push("you must provide a hv ID");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, true);
            };
            var getDocument = function (control, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (err) {
                            callback("hypervisor '" + docId + "' doesn't exist");
                        }
                        else {
                            callback(null, require('merge').recursive(true, {"id": docId}, results.value));
                        }
                    };
                }(callback));
            };
            var controlStartable = function (document, callback) {
                require("./cbchat-log").debug("control if hv can be stopped", 3);
                var clientError = [];
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        clientError.push("HV with '" + document.state + "' state could not be stopped. Stoppable state's are : " + config.authorized_state);
                    }
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, document);
            };
            var goStartable = function (document, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                document.state = "stoppable";
                delete document.id;
                require('./cbchat-resource').get(config.resource).update(docId, document, function (callback, document) {
                    return function () {
                        return function (err, results) {
                            if (err) {
                                callback("hypervisor '" + docId + "' could not be updated");
                            }
                            else {
                                callback(null, document);
                            }
                        };
                    };
                }(callback, document));
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$hv.stopEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    controlParams,
                    getDocument,
                    controlStartable,
                    goStartable
                ], function (err) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.stopEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " is now stoppable and will be stopped soon", true)
                                .addDuration(require('./cbchat-timer').timeStop('$hv.stopEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    metricsEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('hvMetricsEndpoint');
            require("./cbchat-log").debug("Start 'hvMetricsEndpoint'", 2);
            if (!config.resource) {
                throw new Error("no 'resource' key found in 'hvMetricsEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                throw new Error("resource '" + config.resource + "' found in 'hvMetricsEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                throw new Error("no 'query_view' key found in 'hvMetricsEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                throw new Error("in 'hvMetricsEndpoint' config key 'query_view' must be a string (design:view)");
            }
            var view = config.query_view.split(":");
            if (req.query && req.query.q) {
                view[1] = req.query.q;
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        require("./cbchat-log").error('query could not be executed because ' + err.message + ' [' + err.code + ']');
                    }
                    else {
                        require("./cbchat-log").debug('Query ' + view[1] + ' with ' + results.length + " results", 3);
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", results)
                                .addDuration(require('./cbchat-timer').timeStop('hvMetricsEndpoint'))
                                .addTotal(results.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            var query = require('./cbchat-resource').get(config.resource).cb.ViewQuery.from(view[0], view[1]).reduce(true).group(true);
            require('./cbchat-resource').get(config.resource).queryFree(query, queryCallback(req, res));
        };
    }
};
var $log = {
    /**
     * Router called when cbchat-ws init and find a router endpoint
     * linked with this function
     * @param {object} configs
     * @returns {undefined}
     */
    router: function (configs) {
        var $ws = require("./cbchat-ws");
        var endpoints = configs.endpoints;
        delete configs.endpoints;
        require("./cbchat-log").debug("Use router '$logs.router' for '" + configs.path + "'", 2);
        for (var i = 0; i < endpoints.length; i++) {
            var config = require('merge').recursive(true, configs, endpoints[i]);
            config.method = config.method ? config.method : 'GET';
            config.path = config.path ? config.path : '/';
            var eptype = "static ";
            var ephdname = config.handler;
            if (typeof config.handler === "string") {
                eptype = "dynamic";
                config.handler = eval(config.handler);
            }
            else if (typeof config.handler === "undefined" && config.method !== "ROUTER") {
                ephdname = "$ws.__endpointCallback";
                config.handler = $ws.__endpointCallback;
            }
            if (config.method === "ROUTER") {
                config.handler(config);
            }
            else if (config.method === "POST") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [POST]   " + config.path + " > " + ephdname, 3);
                $ws.app.post(config.path, config.handler(config));
            }
            else if (config.method === "PUT") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [PUT]    " + config.path + " > " + ephdname, 3);
                $ws.app.put(config.path, config.handler(config));
            }
            else if (config.method === "DELETE") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [DELETE] " + config.path + " > " + ephdname, 3);
                $ws.app.delete(config.path, config.handler(config));
            }
            else {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [GET]    " + config.path + " > " + ephdname, 3);
                $ws.app.get(config.path, config.handler(config));
            }
        }
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    listEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$log.listEndpoint');
            require("./cbchat-log").debug("Start '$log.listEndpoint'", 2);
            if (!config.resource) {
                throw new Error("no 'resource' key found in '$log.listEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                throw new Error("resource '" + config.resource + "' found in '$log.listEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                throw new Error("no 'query_view' key found in '$log.listEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                throw new Error("in '$log.listEndpoint' config key 'query_view' must be a string (design:view)");
            }
            var view = config.query_view.split(":");
            if (req.query && req.query.q) {
                view[1] = req.query.q;
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        require("./cbchat-log").error('query could not be executed because ' + err.message + ' [' + err.code + ']');
                    }
                    else {
                        var data = [];
                        require("./cbchat-log").debug('Query ' + view[1] + ' with ' + results.length + " results", 3);
                        for (var i in results) {
                            data.push(require('merge').recursive(true, {"id": results[i].id}, results[i].value));
                        }
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", data)
                                .addDuration(require('./cbchat-timer').timeStop('$log.listEndpoint'))
                                .addTotal(results.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            var from = (req.query && req.query.from) ? req.query.from : 0;
            var limit = (req.query && req.query.limit) ? req.query.limit : 200;
            var resource = require('./cbchat-resource').get(config.resource);
            var query = resource.cb.ViewQuery.from(view[0], view[1]).limit(limit).skip(from);
            resource.queryFree(query, queryCallback(req, res));
        };
    },
    /**
     * Callback called when a log endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    detailEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$log.detailEndpoint');
            require("./cbchat-log").debug("Start '$log.detailEndpoint'", 2);
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$log.detailEndpoint' config");
            }
            if (!req.params || !req.params.id) {
                confError = true;
                require("./cbchat-log").error("no ID key found in URL, please check your path");
            }
            var docId = req.params.id;
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$log.detailEndpoint' config doesn't exist");
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$log.detailEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").war("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        var data = require('merge').recursive(true, {"id": results.id}, results.value);
                        require("./cbchat-ws")
                                .okResponse(res, req.params.id + " found", data)
                                .addDuration(require('./cbchat-timer').timeStop('$log.detailEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$log.detailEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('./cbchat-resource').get(config.resource).get(docId, queryCallback(req, res));
            }
        };
    },
    /**
     * Callback called when a hv endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    metricsEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$log.metricsEndpoint');
            require("./cbchat-log").debug("Start '$log.metricsEndpoint'", 2);
            if (!config.resource) {
                throw new Error("no 'resource' key found in '$log.metricsEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                throw new Error("resource '" + config.resource + "' found in '$log.metricsEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                throw new Error("no 'query_view' key found in '$log.metricsEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                throw new Error("in '$log.metricsEndpoint' config key 'query_view' must be a string (design:view)");
            }
            var view = config.query_view.split(":");
            if (req.query && req.query.q) {
                view[1] = req.query.q;
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        require("./cbchat-log").error('query could not be executed because ' + err.message + ' [' + err.code + ']');
                    }
                    else {
                        require("./cbchat-log").debug('Query ' + view[1] + ' with ' + results.length + " results", 3);
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", results)
                                .addDuration(require('./cbchat-timer').timeStop('$log.metricsEndpoint'))
                                .addTotal(results.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            var query = require('./cbchat-resource').get(config.resource).cb.ViewQuery.from(view[0], view[1]).reduce(true).group(true);
            require('./cbchat-resource').get(config.resource).queryFree(query, queryCallback(req, res));
        };
    }
};
var $cell = {
    /**
     * Router called when cbchat-ws init and find a router endpoint
     * linked with this function
     * @param {object} configs
     * @returns {undefined}
     */
    router: function (configs) {
        var $ws = require("./cbchat-ws");
        var endpoints = configs.endpoints;
        delete configs.endpoints;
        require("./cbchat-log").debug("Use router '$cell.router' for '" + configs.path + "'", 2);
        for (var i = 0; i < endpoints.length; i++) {
            var config = require('merge').recursive(true, configs, endpoints[i]);
            config.method = config.method ? config.method : 'GET';
            config.path = config.path ? config.path : '/';
            var eptype = "static ";
            var ephdname = config.handler;
            if (typeof config.handler === "string") {
                eptype = "dynamic";
                config.handler = eval(config.handler);
            }
            else if (typeof config.handler === "undefined" && config.method !== "ROUTER") {
                ephdname = "$ws.__endpointCallback";
                config.handler = $ws.__endpointCallback;
            }
            if (config.method === "ROUTER") {
                config.handler(config);
            }
            else if (config.method === "POST") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [POST]   " + config.path + " > " + ephdname, 3);
                $ws.app.post(config.path, config.handler(config));
            }
            else if (config.method === "PUT") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [PUT]    " + config.path + " > " + ephdname, 3);
                $ws.app.put(config.path, config.handler(config));
            }
            else if (config.method === "DELETE") {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [DELETE] " + config.path + " > " + ephdname, 3);
                $ws.app.delete(config.path, config.handler(config));
            }
            else {
                require("./cbchat-log").debug("Add " + eptype + " endpoint  [GET]    " + config.path + " > " + ephdname, 3);
                $ws.app.get(config.path, config.handler(config));
            }
        }
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    listEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.listEndpoint');
            require("./cbchat-log").debug("Start '$cell.listEndpoint'", 2);
            if (!config.resource) {
                throw new Error("no 'resource' key found in '$cell.listEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                throw new Error("resource '" + config.resource + "' found in '$cell.listEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                throw new Error("no 'query_view' key found in '$cell.listEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                throw new Error("in '$cell.listEndpoint' config key 'query_view' must be a string (design:view)");
            }
            var view = config.query_view.split(":");
            if (req.query && req.query.q) {
                view[1] = req.query.q;
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        require("./cbchat-log").error('query could not be executed because ' + err.message + ' [' + err.code + ']');
                    }
                    else {
                        var data = [];
                        require("./cbchat-log").debug('Query ' + view[1] + ' with ' + results.length + " results", 3);
                        for (var i in results) {
                            data.push(require('merge').recursive(true, {"id": results[i].id}, results[i].value));
                        }
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", data)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.listEndpoint'))
                                .addTotal(results.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            require('./cbchat-resource').get(config.resource).query(view[0], view[1], queryCallback(req, res));
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    detailEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.detailEndpoint');
            require("./cbchat-log").debug("Start '$cell.detailEndpoint'", 2);
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$cell.detailEndpoint' config");
            }
            if (!req.params || !req.params.id) {
                confError = true;
                require("./cbchat-log").error("no ID key found in URL, please check your path");
            }
            var docId = req.params.id;
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$cell.detailEndpoint' config doesn't exist");
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.detailEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").war("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        var data = require('merge').recursive(true, {"id": results.id}, results.value);
                        require("./cbchat-ws")
                                .okResponse(res, req.params.id + " found", data)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.detailEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$cell.detailEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('./cbchat-resource').get(config.resource).get(docId, queryCallback(req, res));
            }
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    metricsEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.metricsEndpoint');
            require("./cbchat-log").debug("Start '$cell.metricsEndpoint'", 2);
            if (!config.resource) {
                throw new Error("no 'resource' key found in '$cell.metricsEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                throw new Error("resource '" + config.resource + "' found in '$cell.metricsEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                throw new Error("no 'query_view' key found in '$cell.metricsEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                throw new Error("in '$cell.metricsEndpoint' config key 'query_view' must be a string (design:view)");
            }
            var view = config.query_view.split(":");
            if (req.query && req.query.q) {
                view[1] = req.query.q;
            }
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        require("./cbchat-log").error('query could not be executed because ' + err.message + ' [' + err.code + ']');
                    }
                    else {
                        require("./cbchat-log").debug('Query ' + view[1] + ' with ' + results.length + " results", 3);
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", results)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.metricsEndpoint'))
                                .addTotal(results.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            var query = require('./cbchat-resource').get(config.resource).cb.ViewQuery.from(view[0], view[1]).reduce(true).group(true);
            require('./cbchat-resource').get(config.resource).queryFree(query, queryCallback(req, res));
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    addEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.addEndpoint');
            require("./cbchat-log").debug("Start '$cell.addEndpoint'", 2);
            var inVar = req.body;
            var docId = "cell::" + 
                    require('change-case').snakeCase(inVar.owner) + "::" + 
                    require('change-case').snakeCase(inVar.name);
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$cell.addEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$cell.addEndpoint' config doesn't exist");
            }
            if (!config.min_duration) {
                confError = true;
                require("./cbchat-log").error("no 'min_duration' key found in '$cell.addEndpoint' config");
            }
            var control_params = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!inVar.name) {
                    clientError.push("you must provide a name for this cell");
                }
                if (!inVar.start) {
                    clientError.push("you must provide a start for this cell");
                }
                if (!inVar.duration) {
                    clientError.push("you must provide a duration for this cell");
                }
                else {
                    if (config.min_duration > inVar.duration) {
                        clientError.push("state '" + inVar.duration + "' must be more than " + config.min_duration + "s");
                    }
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, inVar);
            };
            var control_docid = function (document, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (!err) {
                            callback("cell named '" + document.name + "' already exist");
                        }
                        else {
                            callback(null, document);
                        }
                    };
                }(callback));
            };
            var fill_params = function (document, callback) {
                require("./cbchat-log").debug("fill Cell document with automatic params", 3);
                document.id = docId;
                document.type = "cell";
                document.app = "cbchat-cell@0.1.7";
                document.state = "scheduled";
                document.container = {
                    image: "startx/cbchat-cell"
                };
                document.secret = require('crypto')
                        .createHash("sha256")
                        .update(JSON.stringify(document)
                                + require('./cbchat-timer')
                                .time('$cell.addEndpoint'))
                        .digest("base64");
                callback(null, document);
            };
            var addDocument = function (document, callback) {
                require("./cbchat-log").debug("record Cell document", 3);
                require('./cbchat-resource').get(config.resource).insert(docId, document, function (key) {
                    return function (err) {
                        if (err) {
                            callback('error inserting ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, document);
                        }
                    };
                });
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$cell.addEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    control_params,
                    control_docid,
                    fill_params,
                    addDocument
                ], function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.addEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " added", results)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.addEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    updateEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.updateEndpoint');
            require("./cbchat-log").debug("Start '$cell.updateEndpoint'", 2);
            var docId = "";
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$cell.updateEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$cell.updateEndpoint' config doesn't exist");
            }
            var control_params = function (callback) {
                require("./cbchat-log").debug("control input params", 3);
                if (!req.params.id) {
                    callback("you must provide an ID to update");
                    require("./cbchat-log").warn('could not update ' + docId
                            + ' because no ID given ');
                    return;
                }
                docId = req.params.id;
                callback(null, req.body);
            };
            var check_state = function (document, callback) {
                require("./cbchat-log").debug("Check if Cell state could be updated", 3);
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        var message = "only '" + config.authorized_state + "' are autorized to be updated.";
                        callback(message);
                        require("./cbchat-log").warn('could not update ' + docId
                                + ' because in ' + document.state
                                + ' and ' + message);
                        return;
                    }
                }
                callback(null, document);
            };
            var filter_params = function (document, callback) {
                require("./cbchat-log").debug("filter input params", 3);
                var out = {};
                if (config.authorized_params) {
                    var filters = config.authorized_params.split(",");
                    for (var i in document) {
                        if (filters.indexOf(i) !== -1) {
                            out[i] = document[i];
                        }
                    }
                }
                callback(null, out);
            };
            var get_document = function (document, callback) {
                require("./cbchat-log").debug("find current document", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback, document) {
                    return function (err, results) {
                        if (err) {
                            callback("can't find document");
                            require("./cbchat-log").warn('could not find ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, [document, results.value]);
                        }
                    };
                }(callback, document));
            };
            var update_content = function (documents, callback) {
                require("./cbchat-log").debug("update document with updates", 3);
                callback(null, require('merge').recursive(true, documents[1], documents[0]));
            };
            var record_document = function (document, callback) {
                require("./cbchat-log").debug("record new document", 3);
                require('./cbchat-resource').get(config.resource).update(docId, document, function (key) {
                    return function (err) {
                        if (err) {
                            callback('error in recording new document');
                            require("./cbchat-log").error('could not update ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, document);
                        }
                    };
                });
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$cell.updateEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    control_params,
                    check_state,
                    filter_params,
                    get_document,
                    update_content,
                    record_document
                ], function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.updateEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " updated", results)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.updateEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    deleteEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.deleteEndpoint');
            require("./cbchat-log").debug("Start '$cell.deleteEndpoint'", 2);
            var docId = req.params.id;
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$cell.deleteEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$cell.deleteEndpoint' config doesn't exist");
            }
            var controlParams = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!docId) {
                    clientError.push("you must provide a cell ID");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, true);
            };
            var getDocument = function (control, callback) {
                require("./cbchat-log").debug("get cell document", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (err) {
                            callback("cell '" + docId + "' doesn't exist");
                        }
                        else {
                            callback(null, require('merge').recursive(true, {"id": docId}, results.value));
                        }
                    };
                }(callback));
            };
            var check_state = function (document, callback) {
                require("./cbchat-log").debug("Check if Cell state could be deleted", 3);
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        var message = "only '" + config.authorized_state + "' are autorized to be deleted.";
                        callback(message);
                        require("./cbchat-log").warn('could not deleted ' + docId
                                + ' because in ' + document.state
                                + ' and ' + message);
                        return;
                    }
                }
                callback(null, document);
            };
            var deleteDocument = function (docInfo, callback) {
                require("./cbchat-log").debug("delete Cell", 3);
                require('./cbchat-resource').get(config.resource).delete(docId, function (key) {
                    return function (err) {
                        if (err) {
                            callback('error deleting ' + docId + ' because ' + err.message);
                        }
                        else {
                            callback(null, docInfo);
                        }
                    };
                });
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$cell.deleteEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    controlParams,
                    getDocument,
                    check_state,
                    deleteDocument
                ], function (err, results) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.deleteEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " deleted", results)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.deleteEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    startEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.startEndpoint');
            require("./cbchat-log").debug("Start '$cell.startEndpoint'", 2);
            var docId = req.params.id;
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$cell.startEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$cell.startEndpoint' config doesn't exist");
            }
            var controlParams = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!docId) {
                    clientError.push("you must provide a cell ID");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, true);
            };
            var getDocument = function (control, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (err) {
                            callback("cell '" + docId + "' doesn't exist");
                        }
                        else {
                            callback(null, require('merge').recursive(true, {"id": docId}, results.value));
                        }
                    };
                }(callback));
            };
            var controlStartable = function (document, callback) {
                require("./cbchat-log").debug("control if cell can be started", 3);
                var clientError = [];
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        clientError.push("Cell with '" + document.state + "' state could not be started. Startable state's are : " + config.authorized_state);
                    }
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, document);
            };
            var goStartable = function (document, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                document.state = "startable";
                delete document.id;
                require('./cbchat-resource').get(config.resource).update(docId, document, function (callback, document) {
                    return function () {
                        return function (err, results) {
                            if (err) {
                                callback("cell '" + docId + "' could not be updated");
                            }
                            else {
                                callback(null, document);
                            }
                        };
                    };
                }(callback, document));
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$cell.startEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    controlParams,
                    getDocument,
                    controlStartable,
                    goStartable
                ], function (err) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.startEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " is marked as startable and will be started soon", true)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.startEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    },
    /**
     * Callback called when a cell endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    stopEndpoint: function (config) {
        /**
         * Callback called when a cell endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('$cell.stopEndpoint');
            require("./cbchat-log").debug("Start '$cell.stopEndpoint'", 2);
            var docId = req.params.id;
            var confError = false;
            if (!config.resource) {
                confError = true;
                require("./cbchat-log").error("no 'resource' key found in '$cell.stopEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                confError = true;
                require("./cbchat-log").error("resource '" + config.resource + "' found in '$cell.stopEndpoint' config doesn't exist");
            }
            var controlParams = function (callback) {
                require("./cbchat-log").debug("control client params", 3);
                var clientError = [];
                if (!docId) {
                    clientError.push("you must provide a cell ID");
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, true);
            };
            var getDocument = function (control, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                require('./cbchat-resource').get(config.resource).get(docId, function (callback) {
                    return function (err, results) {
                        if (err) {
                            callback("cell '" + docId + "' doesn't exist");
                        }
                        else {
                            callback(null, require('merge').recursive(true, {"id": docId}, results.value));
                        }
                    };
                }(callback));
            };
            var controlStartable = function (document, callback) {
                require("./cbchat-log").debug("control if cell can be stopped", 3);
                var clientError = [];
                if (config.authorized_state) {
                    var authState = config.authorized_state.split(",");
                    if (authState.indexOf(document.state) === -1) {
                        clientError.push("Cell with '" + document.state + "' state could not be stopped. Stoppable state's are : " + config.authorized_state);
                    }
                }
                callback((clientError.length > 0) ? clientError.join(', ') : null, document);
            };
            var goStartable = function (document, callback) {
                require("./cbchat-log").debug("control if docId exist", 3);
                document.state = "stoppable";
                delete document.id;
                require('./cbchat-resource').get(config.resource).update(docId, document, function (callback, document) {
                    return function () {
                        return function (err, results) {
                            if (err) {
                                callback("cell '" + docId + "' could not be updated");
                            }
                            else {
                                callback(null, document);
                            }
                        };
                    };
                }(callback, document));
            };
            if (confError) {
                require("./cbchat-ws")
                        .nokResponse(res, "error in endpoint configuration")
                        .addDuration(require('./cbchat-timer').timeStop('$cell.stopEndpoint'))
                        .httpCode(409).send();
            }
            else {
                require('async').waterfall([
                    controlParams,
                    getDocument,
                    controlStartable,
                    goStartable
                ], function (err) {
                    if (err) {
                        var message = (err.message) ? err.message : err;
                        require("./cbchat-ws")
                                .nokResponse(res, message)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.stopEndpoint'))
                                .httpCode(409).send();
                        require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR : " + message);
                    }
                    else {
                        require("./cbchat-ws")
                                .okResponse(res, docId + " is now stoppable and will be stopped soon", true)
                                .addDuration(require('./cbchat-timer').timeStop('$cell.stopEndpoint'))
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                });
            }
        };
    }
};

var $api = {
    hv: $hv,
    log: $log,
    cell: $cell,
    /**
     * Callback called when a search endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    authEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('authEndpoint');
            require("./cbchat-log").debug("Start 'authEndpoint'", 2);
            var crypto = require('crypto');
            var login = req.body.login;
            var pwd = req.body.password;
            var pwdhash = crypto
                    .createHash(config.hashAlgorithm)
                    .update(pwd)
                    .digest(config.digest);

            // in db toto = MfemXjFVhqwZi9eYtmKc5JA9CJlHbVdBqfMuLlIbamY=
            // 1. dans cb créer la clef userpwd::toto::MfemXjFVhqwZi9eYtmKc5JA9CJlHbVdBqfMuLlIbamY=
            //    associé au doc suivant : {"type" : "userpwd" , "user" : "toto" , "hash" : "MfemXjFVhqwZi9eYtmKc5JA9CJlHbVdBqfMuLlIbamY=", "updated": 1430616693927}
            var responseCouchbase = {type: "userpwd", user: "toto", hash: "MfemXjFVhqwZi9eYtmKc5JA9CJlHbVdBqfMuLlIbamY=", updated: 1430616693927};

            if (responseCouchbase) {
                require("./cbchat-ws")
                        .okResponse(res, "auth found", {
                            name: login,
                            hash: pwdhash
                        })
                        .addDuration(require('./cbchat-timer').timeStop('authEndpoint'))
                        .send();
                require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
            }
            else {
                require("./cbchat-ws")
                        .nokResponse(res, "auth not found", {
                            name: login,
                            hash: pwdhash
                        })
                        .addDuration(require('./cbchat-timer').timeStop('authEndpoint'))
                        .httpCode(401)
                        .send();
                require("./cbchat-log").warn("Endpoint '" + config.path + "' answered ERROR");
            }
        };
    },
    /**
     * Callback called when a search endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    registryEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            require('./cbchat-timer').start('registryEndpoint');
            require("./cbchat-log").debug("Start 'registryEndpoint'", 2);
            if (!config.resource) {
                throw new Error("no 'resource' key found in 'registryEndpoint' config");
            }
            if (!require('./cbchat-resource').exist(config.resource)) {
                throw new Error("resource '" + config.resource + "' found in 'registryEndpoint' config doesn't exist");
            }
            if (!config.query_view) {
                throw new Error("no 'query_view' key found in 'registryEndpoint' config");
            }
            if (typeof config.query_view !== 'string') {
                throw new Error("in 'registryEndpoint' config key 'query_view' must be a string (design:view)");
            }
            var view = config.query_view.split(":");
            var queryCallback = function (req, res) {
                return function (err, results) {
                    if (err) {
                        require("./cbchat-log").error('query could not be executed because ' + err.message + ' [' + err.code + ']');
                    }
                    else {
                        var data = [];
                        require("./cbchat-log").debug('Query with ' + results.length + " results", 3);
                        for (var i in results) {
                            data.push(require('merge').recursive(true, {"id": results[i].id}, results[i].value));
                        }
                        require("./cbchat-ws")
                                .okResponse(res, results.length + " results found", data)
                                .addDuration(require('./cbchat-timer').timeStop('registryEndpoint'))
                                .addTotal(data.length)
                                .send();
                        require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
                    }
                };
            };
            require('./cbchat-resource').get(config.resource).query(view[0], view[1], queryCallback(req, res));
        };
    },
    /**
     * Callback called when a session endpoint is called
     * @param {object} config
     * @returns {undefined}
     */
    sessionEndpoint: function (config) {
        /**
         * Callback called when a hv endpoint is called
         * @param {object} req
         * @param {object} res
         * @returns {undefined}
         */
        return function (req, res) {
            // normalement ici on va faire : 
            // 1. lecture des param de session passé en en-tete
            // 2.1 si pas de param, on créeer un session anonyme
            // 2.2 si param on verifie dans cb si elle existe
            //   2.2.1 on check si pas expiré
            //   2.2.2 si lié à un user, on l'importe
            require('./cbchat-timer').start('sessionEndpoint');
            require("./cbchat-log").debug("Start 'sessionEndpoint'", 2);
            require("./cbchat-ws")
                    .okResponse(res, "session found", {
                        id: "sdqsfdgfgdhhdfghfgh",
                        start: 15464646,
                        end: 15464646,
                        duration: 3600,
                        user: null
                    })
                    .addDuration(require('./cbchat-timer').timeStop('sessionEndpoint'))
                    .send();
            require("./cbchat-log").info("Endpoint '" + config.path + "' answered OK");
        };
    }
};
process.$api = $api;

$app
        .onInit(function () {
            require("./cbchat-log").info('application '
                    + $app.config.appsign + ' initialized',
                    require('./cbchat-timer').timeStop('app_init'));
            require('./cbchat-event').shortEvent("apiIsStarted");
        })
        .onStart(function () {
            require("./cbchat-ws").start(function () {
                require("./cbchat-log").info("application "
                        + $app.config.appsign + " started",
                        require('./cbchat-timer').time('app'));
                require('./cbchat-event').shortEvent("apiIsRunning");
            });
        })
        .onStop(function () {
            require('./cbchat-event').shortEvent("apiIsStopped", {}, function () {
                require("./cbchat-log").info('application '
                        + $app.config.appsign + ' stopped',
                        require('./cbchat-timer').timeStop('app'));
                require("./cbchat-ws").stop();
            });
            return this;
        })
        .launch();