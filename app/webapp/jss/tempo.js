var $config = {
    debug: true,
    defaultAPI: "http://localhost:8081",
    sessionRefresh: 300,
    loadRemoteConf: function () {
        $.ajax({
            url: "./config.json",
            type: "GET",
            dataType: "json",
            success: function (conf) {
                $log.debug("loading config.json", 2);
                $.extend($config, conf);
                $config.saveLocalConf();
                $(document).trigger("appConfigUpdate", $config);
            },
            error: function () {
                $(document).trigger("appConfigUpdate", $config);
            }
        });
        return this;
    },
    loadLocalConf: function () {
        if ($storage.exist('config')) {
            $.extend($config, $storage.get('config'));
        }
        $(document).trigger("appConfigUpdate", $config);
        return this;
    },
    onUpdateConf: function (callback) {
        $(document).bind("appConfigUpdate", callback);
        return this;
    },
    saveLocalConf: function () {
        var newconf = JSON.parse(JSON.stringify($config));
        delete newconf.loadRemoteConf,
                newconf.loadLocalConf,
                newconf.onUpdateConf,
                newconf.saveLocalConf,
                newconf.saveRemoteConf;
        $storage.set('config', newconf);
        return this;
    }
};

var $log = {
    init: function (callback) {
        this.debug("init log", 3);
        if (typeof callback === "function") {
            callback();
        }
        $log.hasPannel = ($('#pannelLog').length > 0) ? true : false;
        return this;
    },
    debug: function (a, b) {
        var level = parseInt(b);
        var ident = (level > 0) ? Array(level).join("  ") + "- " : "- ";
        if ($config.debug) {
            console.log(ident + a);
        }
        if ($config.debug && $log.hasPannel) {
            $('<li class="list-group-item"/>').append(a).appendTo('#pannelLog');
        }
        return this;
    },
    info: function (a) {
        if ($config.debug) {
            console.info(a);
        }
        if ($log.hasPannel) {
            $('<li class="list-group-item"/>').append(a).appendTo('#pannelLog');
        }
        return this;
    },
    warning: function (a) {
        if ($config.debug) {
            console.warn(a);
        }
        if ($log.hasPannel) {
            $('<li class="list-group-item"/>').append("<span style='color:orange; font-weight: bold'>" + a + "</span>").appendTo('#pannelLog');
        }
        return this;
    },
    error: function (a) {
        if ($config.debug) {
            console.error(a);
        }
        if ($log.hasPannel) {
            $('<li class="list-group-item"/>').append("<span style='color:red; font-weight: bold'>" + a + "</span>").appendTo('#pannelLog');
        }
        return this;
    }
};
var $dialog = {
    init: function (callback) {
        $log.debug("init dialog", 3);
        if (typeof callback === "function") {
            callback();
        }
        return this;
    },
    modialBox: $(
            '<div id="modialBox" class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">' +
            '<div class="modal-dialog modal-m">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
            '<h3 class="modal-title"></h3></div>' +
            '<div class="modal-body">' +
            '</div>' +
            '</div></div></div>'),
    modial: {
        /**
         * Opens our dialog
         * @param message Custom message
         * @param options Custom options:
         * options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
         * options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
         */
        show: function (message, options) {
            // Assigning defaults
            if (typeof options === 'undefined') {
                options = {};
            }
            var settings = $.extend({
                dialogSize: 'm',
                title: 'dialog',
                icon: 'glyphicon-grain'
            }, options);
            // Configuring dialog
            $dialog.modialBox.off();
            $dialog.modialBox.find('.modal-dialog').attr('class', 'modal-dialog').addClass('modal-' + settings.dialogSize);
            $dialog.modialBox.find('h3').html('<span class="glyphicon '
                    + settings.icon
                    + '" aria-hidden="true"></span>&nbsp; '
                    + settings.title);
            $dialog.modialBox.find('.modal-body').html(message);
            $dialog.modialBox.modal();
            return this;
        },
        /**
         * Closes dialog
         */
        hide: function () {
            $dialog.modialBox.modal('hide');
            return this;
        },
        /**
         * get dialog
         */
        get: function () {
            return $dialog.modialBox;
        },
        body: function (body) {
            $dialog.modialBox.find('.modal-body').append(body);
            return this;
        },
        footer: function (footer) {
            var $f = $dialog.modialBox.find('.modal-footer');
            if ($f.length === 0) {
                $dialog.modialBox.find('.modal-content').append('<div class="modal-footer"></div>');
                $f = $dialog.modialBox.find('.modal-footer');
            }
            $f.append(footer);
            return this;
        }
    },
    loadingBox: $(
            '<div id="loadingBox" class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">' +
            '<div class="modal-dialog modal-m">' +
            '<div class="modal-content">' +
            '<div class="modal-header"><h3 style="margin:0;"></h3></div>' +
            '<div class="modal-body">' +
            '<div class="progress progress-striped active" style="margin-bottom:10px;"><div class="progress-bar" style="width: 100%"></div></div>' +
            '</div>' +
            '</div></div></div>'),
    loading: {
        /**
         * Opens our dialog
         * @param message Custom message
         * @param options Custom options:
         * options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
         * options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
         */
        show: function (message, options) {
            // Assigning defaults
            if (typeof message === 'undefined') {
                message = 'Loading';
            }
            if (typeof options === 'undefined') {
                options = {};
            }
            var settings = $.extend({
                dialogSize: 'm',
                progressType: ''
            }, options);
            // Configuring dialog
            $dialog.loadingBox.off();
            $(".modal-body > *:not(.progress), .modal-footer", $dialog.loadingBox).remove();
            $dialog.loadingBox.find('.modal-dialog').attr('class', 'modal-dialog').addClass('modal-' + settings.dialogSize);
            $dialog.loadingBox.find('.progress-bar').attr('class', 'progress-bar');
            if (settings.progressType) {
                $dialog.loadingBox.find('.progress-bar').addClass('progress-bar-' + settings.progressType);
            }
            $dialog.loadingBox.find('h3').text(message);
            // Opening dialog
            $dialog.loadingBox.modal();
            return this;
        },
        /**
         * Closes dialog
         */
        hide: function () {
            $dialog.loadingBox.modal('hide');
            return this;
        },
        /**
         * get dialog
         */
        get: function () {
            return $dialog.loadingBox;
        },
        body: function (body) {
            $dialog.loadingBox.find('.modal-body').append(body);
            return this;
        },
        footer: function (footer) {
            var $f = $dialog.loadingBox.find('.modal-footer');
            if ($f.length === 0) {
                $dialog.loadingBox.find('.modal-content').append('<div class="modal-footer"></div>');
                $f = $dialog.loadingBox.find('.modal-footer');
            }
            $f.append(footer);
            return this;
        }
    },
    messageBox: '<div class="alert alert-info alert-dismissible" role="alert" data-prevstyle="alert-info">' +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
            '<div class="content">alert message</div>' +
            '</div>',
    message: {
        /**
         * Opens our dialog
         * @param message Custom message
         * @param options Custom options:
         * options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
         * options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
         */
        show: function (message, options) {
            var messageBox = $($dialog.messageBox);
            // Assigning defaults
            if (typeof message === 'undefined') {
                message = 'Loading';
            }
            if (typeof options === 'undefined') {
                options = {};
            }
            var settings = $.extend({
                type: 'info'
            }, options);
            var prevstyle = messageBox.data('prevstyle');
            var newstyle = 'alert-' + settings.type;
            messageBox.removeClass(prevstyle).addClass(newstyle).data('prevstyle', newstyle);
            messageBox.find('div.content').html(message);
            if (typeof options.after !== 'undefined') {
                $(options.after).after(messageBox);
            }
            else {
                $(options.to ? options.to : 'body').prepend(messageBox);
            }
            messageBox.show();
            return this;
        }
    }
};
var $storage = {
    storage: window.localStorage,
    init: function (callback) {
        $log.debug("init storage", 3);
        if (typeof callback === "function") {
            callback();
        }
        return this;
    },
    set: function (id, obj, store) {
        $log.debug("adding key " + id + ' to local storage', 3);
        if (store === undefined) {
            store = $storage.storage;
        }
        if (obj !== undefined && typeof obj !== "string") {
            obj = JSON.stringify(obj);
        }
        store[id] = obj;
        return true;
    },
    append: function (id, obj, store) {
        $log.debug("add \"" + obj + "\" content to " + id + " entry in local storage", 3);
        if (store === undefined) {
            store = $storage.storage;
        }
        var old = $storage.get(id, store);
        if (typeof old === 'object') {
            old.push(obj);
            $storage.set(id, old, store);
        }
        else if (typeof old === 'undefined') {
            $storage.set(id, [obj], store);
        }
        else {
            $storage.set(id, [old, obj], store);
        }
        return true;
    },
    remove: function (id, obj, store) {
        $log.debug("remove \"" + obj + "\" content in " + id + " entry in local storage", 3);
        if (store === undefined) {
            store = $storage.storage;
        }
        var old = $storage.get(id, store);
        if (typeof old === 'object') {
            for (var i = old.length; i--; ) {
                if (old[i] === obj) {
                    old.splice(i, 1);
                }
            }
            $storage.set(id, old, store);
        }
        return true;
    },
    get: function (id, store) {
        if (store === undefined) {
            store = $storage.storage;
        }
        var obj = store[id];
        if (typeof obj === "string" && (obj.substring(0, 1) === '[' || obj.substring(0, 1) === '{')) {
            obj = JSON.parse(obj);
        }
        if (obj === "null" || obj === undefined) {
            obj = null;
        }
        return obj;
    },
    exist: function (id, store) {
        if (store === undefined) {
            store = $storage.storage;
        }
        var obj = store[id];
        if (obj === null || obj === undefined) {
            return false;
        }
        return true;
    }
};
var $api = {
    init: function (callback) {
        $log.debug("init api", 3);
        $.ajaxSetup({
            xhrFields: {
                withCredentials: true
            }
        });
        if (typeof callback === "function") {
            callback();
        }
        return this;
    },
    testOnline: function (callback) {
        $log.debug("test if device is online", 3);
        $dialog.loading.show('test reseau', {dialogSize: 'sm', progressType: 'info'});
        if (typeof callback === "function") {
            $api.onAfterOnline = callback;
        }
        if ($api.isOnline()) {
            $api.ping();
        }
        else {
            $api.viewOffline();
        }
        return true;
    },
    isOnline: function () {
        if (navigator.onLine) {
            $log.info("device is online");
            return true;
        }
        else {
            $log.warning("device is offline");
            return false;
        }
    },
    viewOffline: function () {
        $log.debug("show viewOffline");
        $dialog.loading.show('Network is offline', {dialogSize: 'sm', progressType: 'danger'})
                .body('<div class="alert alert-danger" role="alert">You must be offline. Tempo require to be online, please test your network connection and retry.</div>')
                .footer("<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"viewOfflineRetry\">Retry</button>")
                .get()
                .on('click', "#viewOfflineRetry", $api.testOnline);
        return true;
    },
    ping: function () {
        var apiurl = $config.api ? $config.api : $config.defaultAPI;
        $log.debug("Ping api " + apiurl, 3);
        $dialog.loading.show('contact du serveur', {dialogSize: 'sm', progressType: 'info'});
        var purl = apiurl + '/ping';
        $.ajax({
            url: purl,
            type: 'GET',
            success: function (response) {
                $log.info("API " + apiurl + ' health is ' + response.health, 2);
                $config.api_health = response.health;
                $dialog.loading.show('API disponible', {dialogSize: 'sm', progressType: 'sucess'});
                if (typeof $api.onAfterOnline === "function") {
                    $api.onAfterOnline();
                }
            },
            error: function (xhr) {
                $log.warning("ERROR pinging " + apiurl, 2);
                $dialog.loading.show('API indisponible', {dialogSize: 'md', progressType: 'danger'})
                        .body('<div class="alert alert-danger" role="alert">Impossible de contacter l\'API, veuillez re-essayer</div>')
                        .footer("<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"pingApiRetry\">Re-essayer</button>")
                        .get()
                        .on('click', "#pingApiRetry", function () {
                            $api.ping();
                        });
            }
        });
        return this;
    },
    get: function (resource, data, callbackOk, callbackError) {
        var uri = ($config.api ? $config.api : $config.defaultAPI) + resource;
        $log.debug("sending an API GET request to " + uri, 3);
        if (data === "") {
            data = new Array();
        }
        if (typeof callbackOk !== "function") {
            callbackOk = this.__defaultOkCallback;
        }
        if (typeof callbackError !== "function") {
            callbackError = this.__defaultErrorCallback;
        }
        $.ajax({
            url: uri,
            type: "GET",
            dataType: "json",
            data: data,
            success: callbackOk,
//                "throws": true,
            error: callbackError,
            xhrFields: {
                withCredentials: true
            }
        });
        return this;
    },
    post: function (resource, data, callbackOk, callbackError) {
        var uri = ($config.api ? $config.api : $config.defaultAPI) + resource;
        $log.debug("sending an API POST request to " + uri, 3);
        if (data === "") {
            data = new Array();
        }
        if (typeof callbackOk !== "function") {
            callbackOk = this.__defaultOkCallback;
        }
        if (typeof callbackError !== "function") {
            callbackError = this.__defaultErrorCallback;
        }
        $.ajax({
            url: uri,
            type: "POST",
            dataType: "json",
            data: data,
            success: callbackOk,
//                "throws": true,
            error: callbackError,
            xhrFields: {
                withCredentials: true
            }
        });
        return this;
    },
    put: function (resource, data, callbackOk, callbackError) {
        var uri = ($config.api ? $config.api : $config.defaultAPI) + resource;
        $log.debug("sending an API PUT request to " + uri, 3);
        if (data === "") {
            data = new Array();
        }
        if (typeof callbackOk !== "function") {
            callbackOk = this.__defaultOkCallback;
        }
        if (typeof callbackError !== "function") {
            callbackError = this.__defaultErrorCallback;
        }
        $.ajax({
            url: uri,
            type: "PUT",
            dataType: "json",
            data: data,
            success: callbackOk,
//                "throws": true,
            error: callbackError,
            xhrFields: {
                withCredentials: true
            }
        });
        return this;
    },
    delete: function (resource, data, callbackOk, callbackError) {
        var uri = ($config.api ? $config.api : $config.defaultAPI) + resource;
        $log.debug("sxcf.api.delete :: sending an API DELETE request to " + uri, 3);
        if (data === "") {
            data = new Array();
        }
        if (typeof callbackOk !== "function") {
            callbackOk = this.__defaultOkCallback;
        }
        if (typeof callbackError !== "function") {
            callbackError = this.__defaultErrorCallback;
        }
        $.ajax({
            url: uri,
            type: "DELETE",
            dataType: "json",
            data: data,
            success: callbackOk,
//                "throws": true,
            error: callbackError,
            xhrFields: {
                withCredentials: true
            }
        });
        return this;
    },
    __defaultOkCallback: function (response, status, xhr) {
        $log.debug("defaultOkCallback process " + status + " API response");
        $log.info(response);
    },
    __defaultErrorCallback: function (xhr, status, message) {
        $log.error("defaultErrorCallback process " + status + " API response");
        if ($cbchat.isLoaded === false) {
            $dialog.loading.show('erreur du serveur', {dialogSize: 'sm', progressType: 'error'});
        }
        $log.warning(message);
    }
};
var $tools = {
    dateTimeMerge: function (d, t) {
        var date = new Date();
        var time = new Date();
        if (d instanceof Date) {
            date = d.getTime();
        }
        else if (d === undefined) {
            date = 0;
        }
        else {
            date = Date.parse(d);
            if (isNaN(date)) {
                date = parseInt(d);
            }
        }
        if (t instanceof Date) {
            time = t.getTime();
        }
        else if (t === undefined) {
            time = 0;
        }
        else {
            time = Date.parse(t);
            if (isNaN(time)) {
                time = parseInt(t);
            }
        }
        return new Date(date + time);
    }
};

var $session = {
    cache: null,
    init: function (callback) {
        $log.debug("init session", 3);
        $session.cache = $storage.get('session');
        $user.init(callback);
        return this;
    },
    save: function () {
        $log.debug("save session", 2);
        $user.save();
        $storage.set('session', $session.cache);
        return this;
    },
    testExist: function (callback) {
        $log.debug("test if session exist");
        if ($session.isExistInCache() && $session.isExistFreshInCache()) {
            $log.info("session is found");
            $dialog.loading.show('Session trouvée', {dialogSize: 'sm', progressType: 'success'});
            if (typeof callback === "function") {
                callback();
            }
            return true;
        }
        else {
            $log.warning("session doesn't exist in cache");
            $session.refreshCacheFromRemote(callback);
            return true;
        }
        return false;
    },
    isExistInCache: function () {
        if ($session.cache !== null) {
            return true;
        }
        else {
            return false;
        }
    },
    isExistFreshInCache: function () {
        if ($session.cache || $session.cache.end > Date.now()) {
            return true;
        }
        else {
            return false;
        }
    },
    refreshCacheFromRemote: function (callback) {
        $api.get('/session', '', function (response) {
            $log.info("session updated from server");
            $dialog.loading.show('Session récupérée', {dialogSize: 'sm', progressType: 'success'});
            $session.refreshCache(response.data);
            $user.refreshCache(response.data.user);
            if (typeof callback === "function") {
                callback();
            }
        }, function (xhr) {
            $log.warning('ERROR when refreshing session cache from remote because ' + xhr, 3);
            $dialog.loading.show('erreur du serveur de session', {dialogSize: 'sm', progressType: 'error'});
            console.log(xhr);
        });
    },
    refreshCache: function (data) {
        $log.debug('refreshing session cache', 3);
        $session.cache = data;
    }
};
var $user = {
    cache: null,
    init: function (callback) {
        $log.debug("init user", 3);
        $user.cache = ($session.cache) ? $session.cache.user : null;
        if (typeof callback === "function") {
            callback();
        }
        return this;
    },
    save: function () {
        $log.debug("save user", 1);
        $session.cache.user = $user.cache;
        return this;
    },
    testExist: function (callback) {
        $log.debug("test if user exist");
        if ($user.isExist()) {
            $log.info("user is found");
            $dialog.loading.show('utilisateur trouvé', {dialogSize: 'sm', progressType: 'success'});
            if (typeof callback === "function") {
                callback();
            }
        }
        else {
            $user.viewAuth(callback);
        }
        return true;
    },
    isExist: function () {
        if ($user.cache !== null) {
            return true;
        }
        else {
            return false;
        }
    },
    viewAuth: function (callback) {
        $log.debug("show viewAuth");
        $dialog.loading.show('Authentification', {dialogSize: 'sm', progressType: 'warning'})
                .body('<div class="alert alert-warning" role="alert">Vous devez être identifié</div>')
                .body('<form>' +
                        '<div class="form-group">' +
                        '<label for="login" class="control-label">Login:</label>' +
                        '<input type="text" class="form-control" id="login" name="login">' +
                        '</div>' +
                        '<div class="form-group">' +
                        '<label for="password" class="control-label">Password:</label>' +
                        '<input type="password" class="form-control" id="password" name="password">' +
                        '</div>' +
                        '</form>')
                .footer("<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"viewAuthAuthenticate\">Connection</button>")
                .footer("<button type=\"button\" class=\"btn btn-link btn-sm\" id=\"viewAuthCreate\">Créer un compte</button>")
                .get()
                .on("click", "#viewAuthAuthenticate", function () {
                    $user.doAuth(callback);
                })
                .on("click", "#viewAuthCreate", function () {
                    $user.viewCreate(callback);
                });
        return this;
    },
    viewCreate: function (callback) {
        $log.debug("show viewCreate");
        $dialog.loading.show('Créer un compte', {dialogSize: 'md', progressType: 'info'})
                .body('<div class="alert alert-info" role="alert">Creation de compte</div>')
                .footer("<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"viewCreateAdd\">Créer</button> ")
                .footer("<button type=\"button\" class=\"btn btn-default btn-sm\" id=\"viewCreateCancel\">Annuler</button>")
                .get()
                .on('click', "#viewCreateAdd", function () {
                    $user.doAuth(callback);
                })
                .on('click', "#viewCreateCancel", function () {
                    $user.viewAuth(callback);
                });
        return this;
    },
    doAuth: function (callback) {
        $log.debug("update local user config");
        console.log($dialog.loading.get().find('form').serialize());
        var data = $dialog.loading.get().find('form').serialize();
        $api.post('/auth', data, function (response) {
            $user.doAuthCallback(response, callback);
        }, function (xhr) {
            $log.warning('ERROR when authenticating because ' + xhr, 1);
            $dialog.loading.show('erreur d\'authentification', {dialogSize: 'sm', progressType: 'error'})
                    .body('<div class="alert alert-danger" role="alert">Erreur d\'authentification</div>')
                    .footer("<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"viewOfflineRetry\">Re-essayer</button>")
                    .get()
                    .on('click', "#viewAuthErrorRetry", function () {
                        $user.viewAuth(callback);
                    });
            console.log(xhr);
        });
        return this;
    },
    doAuthCallback: function (response, callback) {
        $log.info("user authenticated");
        $dialog.loading.show('utilisateur authentifié', {dialogSize: 'sm', progressType: 'success'});
        $user.refreshCache(response.data);
        if (typeof callback === "function") {
            callback();
        }
        return this;
    },
    refreshCacheFromRemote: function () {
        $api.get('/user', '', function (response) {
            $log.debug('refreshing user cache from remote response', 1);
            $user.refreshCache(response.data);
        }, function (xhr) {
            $log.warning('ERROR when refreshing user cache from remote because ' + xhr, 1);
            $dialog.loading.show('erreur du serveur des utilisateurs', {dialogSize: 'sm', progressType: 'error'});
            console.log(xhr);
        });
    },
    refreshCache: function (data) {
        $log.debug('refreshing user cache', 1);
        $user.cache = data;
    }
};

var $cbchat = {
    isLoaded: false,
    init: function () {
        $log.debug("init application", 1);
        this.isLoaded = false;
        $dialog.loading.show('Initialize ...', {dialogSize: 'sm', progressType: 'info'});
        $log.init(function () {
            $dialog.init(function () {
                $storage.init(function () {
                    $config.onUpdateConf(function () {
                        $session.init(function () {
                            $api.init(function () {
                                $(document).trigger("appInit");
                            });
                        });
                    });
                    if ($storage.exist('config')) {
                        $config.loadLocalConf();
                    }
                    else {
                        $config.loadRemoteConf();
                    }
                });
            });
        });
        $cbchat.onStop(function () {
            $session.save();
            $config.saveLocalConf();
        });
        return this;
    },
    start: function () {
        $log.info("Start application", 1);
        $dialog.loading.show('Starting ...', {dialogSize: 'sm', progressType: 'info'});
        $api.testOnline(function () {
            $session.testExist(function () {
                $user.testExist(function () {
                    $cbchat.isLoaded = true;
                    $log.info("end startup");
                    $(window).on('beforeunload', function () {
                        $cbchat.stop();
                        return;
                    });
                    $(document).trigger("appStart");
                });
            });
        });
        return this;
    },
    stop: function () {
        $log.info("Stop application", 1);
        $(document).trigger("appStop");
        return this;
    },
    onInit: function (callback) {
        $(document).bind("appInit", callback);
        return this;
    },
    onStart: function (callback) {
        $(document).bind("appStart", callback);
        return this;
    },
    onStop: function (callback) {
        $(document).bind("appStop", callback);
        return this;
    }
};
