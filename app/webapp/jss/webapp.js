/* global $log, $cbchat, $api, google, $dialog, async, $storage, $config, angular, $tools, $user */


var temp = {
    models: {
        _default: function (atts) {
            var self = this;
            var autorized = [];
            self.set = function (obj) {
                var firstObj = obj || {};
                for (var i in autorized) {
                    self.setProp(autorized[i], firstObj.hasOwnProperty(autorized[i]) ? firstObj[autorized[i]] : null);
                }
                return this;
            };
            self.get = function () {
                var obj = {};
                for (var i in autorized) {
                    if (self.hasOwnProperty(autorized[i])) {
                        obj[autorized[i]] = self[autorized[i]];
                    }
                }
                return obj;
            };
            self.setProp = function (prop, val) {
                if (self.isAutorized(prop)) {
                    self[prop] = val;
                }
                return this;
            };
            self.getProp = function (prop) {
                return self[prop];
            };
            self.hasProp = function (prop) {
                return self[prop] ? true : false;
            };
            self.isAutorized = function (prop) {
                return (autorized.indexOf(prop) !== -1) ? true : false;
            };
            self.defineAutorized = function (list) {
                autorized = list ? list : [];
                return this;
            };
            self.getAutorized = function () {
                return autorized;
            };
            if (atts !== undefined) {
                self.set(atts);
            }
            return self;
        },
        cell: function (atts) {
            this.parent = temp.models._default;
            this.parent();
            this.defineAutorized(['id', 'name', 'duration', 'start', 'tags', 'category', 'description', 'owner', 'stop', 'activity', 'location', 'ui']);
            this.setProp = function (prop, val) {
                if (this.isAutorized(prop)) {
                    switch (prop) {
                        case 'name' :
                            this[prop] = (val === null) ? "my cell" : val;
                            break;
                        case 'start' :
                            this[prop] = (val === null) ? Date.now() : val;
                            break;
                        case 'duration' :
                            this[prop] = (val === null) ? 350 : val;
                            break;
                        case 'stop' :
                            this[prop] = (val === null) ? Date.now() + this.duration : val;
                            break;
                        case 'location' :
                            this[prop] = new temp.models.location(val);
                            break;
                        case 'ui' :
                            var ui = {
                                topbar: {
                                    bgColor: "darkred",
                                    borderColor: "red",
                                    icon: "tower"
                                }
                            };
                            this[prop] = (val === null) ? ui : val;
                            break;
                        case 'owner' :
                            this[prop] = (val !== null) ? val : ($user.cache ? $user.cache.name : null);
                            break;
                        case 'activity' :
                            this[prop] = (val === null) ? [] : val;
                            break;
                        default :
                            this[prop] = val;
                            break;
                    }
                }
                return this;
            };
            this.set(atts);
            return this;
        },
        location: function (atts) {
            this.parent = temp.models._default;
            this.parent();
            this.defineAutorized(['type', 'coordinates']);
            this.setProp = function (prop, val) {
                if (this.isAutorized(prop)) {
                    switch (prop) {
                        case 'type' :
                            this[prop] = (val === null) ? "Point" : val;
                            break;
                        case 'coordinates' :
                            var loc = [
                                $config.geoloc ? $config.geoloc.lat : 0,
                                $config.geoloc ? $config.geoloc.lng : 0
                            ];
                            this[prop] = (val === null) ? loc : val;
                            break;
                        default :
                            this[prop] = val;
                            break;
                    }
                }
                return this;
            };
            this.set = function (obj) {
                if (Array.isArray(obj) && obj.length === 2) {
                    this.setProp('type', 'Point').setProp('coordinates', obj);
                }
                else if (typeof obj === 'string' && obj.indexOf(",") !== -1) {
                    this.setProp('type', 'Point').setProp('coordinates', obj.split(','));
                }
                else {
                    var firstObj = obj || {};
                    var autorized = this.getAutorized();
                    for (var i in autorized) {
                        this.setProp(autorized[i], firstObj.hasOwnProperty(autorized[i]) ? firstObj[autorized[i]] : null);
                    }
                }
                return this;
            };
            this.set(atts);
            return this;
        }
    }
};


angular.module("cbchatCell", [])
        .factory('cellService', function () {
            var model = temp.models.cell;
            var cellService = {
                init: function () {
                    $log.debug("-- init cellService factory");
                    return this;
                },
                create: function (obj, callbackok, callbacknok) {
                    if (!obj instanceof model) {
                        obj = new model(obj);
                    }
                    var defaultOk = function (response, status, xhr) {
                        $log.info('cell ' + response.data.id + " added");
                        $log.debug(response, 3);
                    };
                    var defaultNok = function (xhr, status, message) {
                        $log.warning('ERROR when adding a cell because ' + message);
                        $log.debug(xhr, 3);
                    };
                    $api.post(
                            '/cells',
                            obj.get(),
                            callbackok || defaultOk,
                            callbacknok || defaultNok
                            );
                    return this;
                },
                read: function (q, callbackok, callbacknok) {
                    var defaultOk = function (response, status, xhr) {
                        $log.info(response.data.length + " cells founded");
                        $log.debug(response, 3);
                    };
                    var defaultNok = function (xhr, status, message) {
                        $log.warning('ERROR when searching cells because ' + message);
                        $log.debug(xhr, 3);
                    };
                    $api.get(
                            '/cells',
                            q,
                            callbackok || defaultOk,
                            callbacknok || defaultNok
                            );
                    return this;
                },
                update: function (key, object, callbackok, callbacknok) {
                    if (!object instanceof model) {
                        object = new model(object);
                    }
                    ;
                    var defaultOk = function (response, status, xhr) {
                        $log.info('cell ' + key + " updated");
                        $log.debug(response, 3);
                    };
                    var defaultNok = function (xhr, status, message) {
                        $log.warning('ERROR when updating cell ' + key + ' because ' + message);
                        $log.debug(xhr, 3);
                    };
                    $api.put(
                            '/cells/' + key,
                            object.get(),
                            callbackok || defaultOk,
                            callbacknok || defaultNok
                            );
                    return this;
                },
                delete: function (key, callbackok, callbacknok) {
                    var defaultOk = function (response, status, xhr) {
                        $log.info('cell ' + key + " deleted");
                        $log.debug(response, 3);
                    };
                    var defaultNok = function (xhr, status, message) {
                        $log.warning('ERROR when deleting cell ' + key + ' because ' + message);
                        $log.debug(xhr, 3);
                    };
                    $api.delete(
                            '/cells/' + key,
                            null,
                            callbackok || defaultOk,
                            callbacknok || defaultNok
                            );
                    return this;
                },
                getModel: function () {
                    return model;
                }
            };
            cellService.init();
            return cellService;
        })




        .controller("appCtrl", function ($scope) {
            $log.debug("-- init appCtrl controller");
            $scope.cell = {
                name: "cellname"
            };
            $scope.isDebug = $config.debug;
            $scope.config = $config;
            $scope.api = {
                url: $config.api,
                health: $config.api_health
            };
            $scope.app = {
                platform: 'web',
                version: $config.version
            };
        })
        .controller("navCtrl", function ($scope, $location) {
            $log.debug("-- init navCtrl controller");
            $scope.mainView = 'home';
            $scope.$watch(function () {
                return $location.path();
            }, function (newPath) {
                $log.debug("---- location path change to " + newPath);
                var tabPath = newPath.split("/");
                var mainView = tabPath[0] ? tabPath[0] : (tabPath[1] ? tabPath[1] : "home");
                if (mainView.substr(0, 4) === 'tab_') {
                    $log.debug("------ " + mainView + " is a tab, no change");
                }
                else {
                    $scope.path = newPath;
                    $scope.mainView = mainView;
                    $log.debug("------ define mainView to " + $scope.mainView);
                    $scope.$broadcast("changePage", $scope.mainView);
                }
            });
        })
        .controller("historyCellCtrl", function ($scope) {
            $log.debug("-- init historyCellCtrl controller");
        })
        .controller("myprofileCtrl", function ($scope) {
            $log.debug("-- init myprofileCtrl controller");
            $scope.profile = {
                username: '',
                birthdate: null,
                gender: null,
                picture: null,
                fb: null,
                fb_profile: null,
                gplus: null,
                glpus_profile: null,
                linkedin: null,
                linkedin_profile: null,
                meetup: null,
                meetup_profile: null
            };
        })





        .directive("inputAutocompleteCell", function () {
            return {
                restrict: "E",
                templateUrl: 'tpt/directive_inputAutocompleteCell.html',
                scope: {
                    user: "="
                },
                controller: function ($scope) {
                    $log.debug("-- init inputAutocompleteCell directive");
//                    var userService = $scope.$parent.userService;
//                    $scope.message = "";
//                    $scope.messageUpdate = "Vos modifications ont bien été prises en compte";
//                    $scope.user = userService.get();
//                    $scope.isUpdated = false;
//                    $scope.razProfil = function () {
//                        $("#formProfilForm")[0].reset();
//                        $scope.formProfilForm.$setPristine();
//                    };
//                    $scope.updateProfil = function () {
//                        $log.debug("---- updateProfil in profilForm directive");
//                        var ou = userService.init().get();
//                        var nu = $scope.user;
//                        $scope.message = ". ";
//                        if (ou.login !== nu.login) {
//                            $scope.message += "identifiant " + ou.login + " changé en " + nu.login + ', ';
//                        }
//                        if (ou.type !== nu.type) {
//                            $scope.message += "droit " + ou.type + " changé en " + nu.type + ', ';
//                        }
//                        if (ou.name !== nu.name) {
//                            $scope.message += "nom " + ou.name + " changé en " + nu.name + ', ';
//                        }
//                        if (ou.adherent !== nu.adherent) {
//                            $scope.message += "adhérent associé " + ou.adherent + " changé en " + nu.adherent + ', ';
//                        }
//                        if (ou.picture !== nu.picture) {
//                            $scope.message += "photo changée, ";
//                        }
//                        userService.set(nu.login, nu.type, nu.name, nu.adherent, nu.picture).save();
//                        $scope.isUpdated = true;
//                    };
//                    $("#formProfilForm").on('click', '.form-group', function () {
//                        $(this).parent().find('.form-helptxt p').addClass('hidden');
//                        $(this).find('.form-helptxt p').removeClass('hidden').addClass('show');
//                    });
                }
            };
        })



        .controller("cellCtrl", ['$scope', 'cellService', function ($scope, cellService) {
                $log.debug("-- init cellCtrl controller");
            }])
        .directive("cellAddForm", ['cellService', function (cellService) {
                $log.debug("-- init cellAddForm directive");
                return {
                    restrict: "E",
                    templateUrl: 'tpt/directive_cellAddForm.html',
                    scope: {
                        cell: "="
                    },
                    controller: function ($scope) {
                        $log.debug("-- init cellAddForm controller");
                        var model = cellService.getModel();
                        $scope.cell = new model();
                        $scope.start_date = $scope.start_time = new Date();
                        $scope.duration_range = 5;
                        $scope.cell.setProp('location', [$config.geoloc.lat, $config.geoloc.lng]);
                        $('#caf_location').val($config.geoloc.lat + ',' + $config.geoloc.lng);
                        var mapElId = 'mapAddCellLocation';
                        var myLatlng = new google.maps.LatLng($config.geoloc.lat, $config.geoloc.lng);
                        var mapOptions = {
                            zoom: 18,
                            center: myLatlng
                        };
                        var map = new google.maps.Map(document.getElementById(mapElId), mapOptions);
                        var marker = new google.maps.Marker({
                            position: myLatlng,
                            map: map,
                            draggable: true,
                            title: "Your event place"
                        });
                        google.maps.event.addListener(marker, 'dragend', function () {
                            $scope.cell.setProp('location', [this.getPosition().lat(), this.getPosition().lng()]);
                            $('#caf_location').val(this.getPosition().lat() + ',' + this.getPosition().lng());
                        });
                        var razError = function () {
                            $scope.message = "";
                            $scope.onErrorFields = [];
                        };
                        var addError = function (message, field) {
                            if ($scope.message !== "") {
                                $scope.message += ", ";
                            }
                            $scope.message += message;
                            $scope.onErrorFields.push(field);
                        };
                        var controlForm = function () {
                            $log.debug("-- controlForm in cellAddForm directive");
                            razError();
                            if ($scope.cell.name === '' || $scope.cell.name === null) {
                                addError("Cell name could not be empty", 'name');
                            }
                            else if ($scope.cell.name.length > 64) {
                                addError("Cell name could not be longer than 64 characters", 'name');
                            }
                            if ($scope.start_date === undefined ||
                                    $scope.start_date === '') {
                                addError("Cell starting date could not be null", 'start_date');
                            }
                            if ($scope.start_time === undefined ||
                                    $scope.start_time === '') {
                                addError("Cell starting time could not be null", 'start_time');
                            }
                            if ($scope.duration_range === undefined ||
                                    $scope.duration_range === null ||
                                    parseInt($scope.duration_range) <= 5) {
                                addError("Cell duration have to be more than 5minutes", 'duration_range');
                            }
                            console.log($scope.onErrorFields);
                            return !$scope.hasError();
                        };
                        var saveForm = function () {
                            $log.debug("---- saveForm in cellAddForm directive");
                            $scope.cell.setProp('start', $tools.dateTimeMerge($scope.start_date, $scope.start_time).getTime());
                            $scope.cell.setProp('duration', parseInt($scope.duration_range) * 60);
                            cellService.create($scope.cell, function () {
                                $scope.cell = new model();
                                $scope.reset();
                                $dialog.message.show('Your cell is now created', {to: '#cellCurrentList', type: 'success'});
                                location.href = "#/current";
                            }, function () {
                                $dialog.message.show('error in adding your cell, please retry', {to: '#cellAddForm', type: 'danger'});
                            });
                            return true;
                        };
                        /* init controller */
                        razError();
                        $scope.step = {
                            tabprefix: 'tab_cellAddForm_step',
                            current: 1,
                            steps: [1, 2, 3, 4, 5],
                            done: [],
                            getCurrent: function () {
                                return this.current;
                            },
                            setCurrent: function (step) {
                                this.current = step;
                                return this;
                            },
                            isCurrent: function (step) {
                                return (this.current === step) ? true : false;
                            },
                            setAsDone: function (step) {
                                if (!this.isDone(step)) {
                                    this.done.push(step);
                                }
                                return this;
                            },
                            isDone: function (step) {
                                return (this.done.indexOf(step) !== -1) ? true : false;
                            },
                            isAvailable: function (step) {
                                return (this.steps.indexOf(step) !== -1) ? true : false;
                            }
                        };
                        $scope.goStep = function (step) {
                            $log.debug("-- switch to step " + step + " in cellAddForm directive");
                            if ($scope.step.isAvailable(step)) {
                                $scope.step.setAsDone(step - 1).setCurrent(step);
                                $(".steptab").hide();
                                $("#" + $scope.step.tabprefix + $scope.step.getCurrent()).show();
                                if (step === 2) {
                                    google.maps.event.trigger(map, "resize");
                                }
                            }
                        };
                        $scope.resetSteps = function () {
                            $log.debug("-- reset step in cellAddForm directive");
                            $scope.step.done = [];
                            $scope.step.setCurrent(1);
                            $(".steptab").hide();
                            $("#" + $scope.step.tabprefix + 1).show();
                        };
                        $scope.chooseTemplate = function (templateName) {
                            $log.debug("-- choose template " + templateName + " in cellAddForm directive");
                            switch (templateName) {
                                case 'train' :
                                    $scope.cell
                                            .setProp('name', 'my train')
                                            .setProp('category', 'other');
                                    $("#caf_tags").tagsinput('add', 'transport,sncf');
                                case 'music' :
                                    $scope.cell
                                            .setProp('name', 'my concert')
                                            .setProp('category', 'arts');
                                    $("#caf_tags").tagsinput('add', 'concert,live,music');
                                case 'business' :
                                    $scope.cell
                                            .setProp('name', 'my seminar')
                                            .setProp('category', 'business');
                                    $("#caf_tags").tagsinput('add', 'event,seminar');
                                case 'friends' :
                                    $scope.cell
                                            .setProp('name', 'my birthday')
                                            .setProp('category', 'fun');
                                    $("#caf_tags").tagsinput('add', 'friends');
                                case 'sport' :
                                    $scope.cell
                                            .setProp('name', 'my football match')
                                            .setProp('category', 'sport');
                                    $("#caf_tags").tagsinput('add', 'football,team,tournament');
                                    break;
                            }
                            console.log($scope.cell)
                            $scope.goStep(2);
                        };
                        $scope.resetSteps();
                        $scope.reset = function () {
                            $log.debug("-- reset in cellAddForm directive");
                            $("#cellAddForm")[0].reset();
                        };
                        $scope.save = function () {
                            $log.debug("-- save in cellAddForm directive");
                            if (controlForm()) {
                                saveForm();
                            }
                        };
                        $scope.hasError = function () {
                            return ($scope.onErrorFields.length > 0) ? true : false;
                        };
                        $scope.duration_range = Math.round($scope.cell.duration / 60);
                        $("#caf_tags").tagsinput();
                        $("#caf_duration").on('change', function () {
                            var min = parseInt($scope.duration_range) || 0;
                            var display = "0s";
                            if (min < 60) {
                                display = min + "min";
                            }
                            else {
                                var hour = Math.floor(min / 60);
                                min = Math.round(min - (hour * 60));
                                display = hour + "h " + min + "min";
                            }
                            $scope.duration_display = display;
                            $scope.$apply();
                        });
                        $("#caf_duration").val($scope.duration_range);
                    }
                };
            }])
        .directive("cellCurrentList", ['cellService', function (cellService) {
                $log.debug("-- init cellCurrentList directive");
                return {
                    restrict: "E",
                    templateUrl: 'tpt/directive_cellCurrentList.html',
                    scope: {
                        cell: "="
                    },
                    controller: function ($scope) {
                        $log.debug("-- init cellCurrentList controller");
                        var model = cellService.getModel();
                        $scope.model = model;
                    }
                };
            }])
        .directive("cellHistoryList", ['cellService', function (cellService) {
                $log.debug("-- init cellHistoryList directive");
                return {
                    restrict: "E",
                    templateUrl: 'tpt/directive_cellHistoryList.html',
                    scope: {
                        cell: "="
                    },
                    controller: function ($scope) {
                        $log.debug("-- init cellHistoryList controller");
                        var model = cellService.getModel();
                        $scope.model = model;
                    }
                };
            }])
        .directive("cellSearchPanel", ['cellService', function (cellService) {
                $log.debug("-- init cellSearchPanel directive");
                return {
                    restrict: "E",
                    templateUrl: 'tpt/directive_cellSearchPanel.html',
                    scope: {
                        cell: "="
                    },
                    controller: function ($scope) {
                        $log.debug("-- init cellSearchPanel controller");
                        var model = cellService.getModel();
                        $scope.results = [];
                        $scope.gmap = null;
                        $scope.filter = {
                            category: '',
                            rate: '',
                            q: ''
                        };
                        $scope.locationMarker = {};
                        $scope.infoMarkers = [];
                        $scope.cellMarkers = [];
                        $scope.init = function () {
                            $log.debug("Init page find", 3);
                            if (!$scope.gmap) {
                                $scope.initMap();
                            }
                            $("#findForm").on('change', ":input", function () {
                                $("#findForm").find(':input[name=latLgn]').val($config.geoloc.lat + ',' + $config.geoloc.lng);
                                var data = $("#findForm").serialize();
                                $api.get('/registry', data, function (response) {
                                    $log.info("session updated from server");
                                    var responseFake = {
                                        result: [{
                                                id: "toto",
                                                desc: "description of cbchat-cell toto",
                                                status: "running",
                                                coord: {lat: 47.2157631, lng: -1.555672}
                                            }, {
                                                id: "titi",
                                                status: "dead",
                                                desc: "description of cbchat-cell titi",
                                                coord: {lat: 47.2167631, lng: -1.556672}
                                            }, {
                                                id: "tata",
                                                status: "default",
                                                desc: "description of cbchat-cell tata",
                                                coord: {lat: 47.2167631, lng: -1.557672}
                                            }, {
                                                id: "tutu",
                                                status: "scheduled",
                                                desc: "description of cbchat-cell tutu",
                                                coord: {lat: 47.2177631, lng: -1.557672}
                                            }, {
                                                id: "pas loin de chez toi",
                                                status: "dead",
                                                desc: "description of cbchat-cell pas loin de chez toi",
                                                coord: {lat: $config.geoloc.lat + .021, lng: $config.geoloc.lng - .014}
                                            }, {
                                                id: "juste a cote",
                                                status: "dead",
                                                desc: "description of cbchat-cell pas loin de chez toi",
                                                coord: {lat: $config.geoloc.lat - .0021, lng: $config.geoloc.lng + .0014}
                                            }
                                        ]
                                    };
                                    if (responseFake && responseFake.result) {
                                        $scope.mapResetAllMarkers().mapAddLocationMarker();
                                        for (var i = 0; i < responseFake.result.length; i++) {
                                            $scope.mapAddCellMarker(responseFake.result[i]);
                                        }
                                    }
                                }, function (xhr, status, message) {
                                    $log.warning('ERROR when searching cells because ' + message, 3);
                                    $dialog.message.show('error in cell search, please retry', {to: '#findForm'});
                                    $log.log(xhr);
                                });
                                google.maps.event.trigger($scope.gmap, "resize");
                            });
                            $("#findForm").change();
                            return this;
                        };
                        $scope.initMap = function () {
                            $log.debug("Init Map in page find", 3);
                            var mapOptions = {
                                zoom: 13,
                                center: $config.geoloc
                            };
                            $scope.gmap = new google.maps.Map(document.getElementById('cellSearchPanel_gmap'), mapOptions);
                            $scope.mapAddLocationMarker();
                            return this;
                        };
                        $scope.mapAddCellMarker = function (cell) {
                            $log.debug("adding cbchat " + cell.id + " marker to the find map", 3);
                            var contentString = '<div id="content">' +
                                    '<h4 class="firstHeading">' + cell.id + '</h4>' +
                                    '<div id="bodyContent">' +
                                    '<p>' + cell.desc + '</p>' +
                                    '<p><a href="#pageGo_' + cell.id + '">' +
                                    '<span class="glyphicon glyphicon-log-in" aria-hidden="true"></span>&nbsp; Connect</a> ' +
                                    '</div>' +
                                    '</div>';
                            var infowindow = new google.maps.InfoWindow({
                                content: contentString
                            });
                            var marker = new google.maps.Marker({
                                position: cell.coord,
                                map: $scope.gmap,
                                icon: 'img/mapMarkers/cell_' + cell.status + '.svg',
                                title: cell.id
                            });
                            google.maps.event.addListener(marker, 'click', function () {
                                $scope.mapCloseAllInfowindow();
                                infowindow.open($scope.gmap, marker);
                            });
                            $scope.cellMarkers.push(marker);
                            $scope.infoMarkers.push(infowindow);
                            return this;
                        };
                        $scope.mapAddLocationMarker = function () {
                            $log.debug("Adding location marker to the find map", 3);
                            $scope.locationMarker = new google.maps.Marker({
                                position: $config.geoloc,
                                map: $scope.gmap,
                                title: 'Your location'
                            });
                            return this;
                        };
                        $scope.mapResetAllMarkers = function () {
                            $log.debug("Remove all markers from find map", 3);
                            if ($scope.locationMarker) {
                                $scope.locationMarker.setMap(null);
                            }
                            if ($scope.cellMarkers) {
                                for (var i = 0; i < $scope.cellMarkers.length; i++) {
                                    $scope.cellMarkers[i].setMap(null);
                                }
                            }
                            return this;
                        };
                        $scope.mapCloseAllInfowindow = function () {
                            $log.debug("Close all info window in map", 3);
                            if ($scope.infoMarkers) {
                                for (var i = 0; i < $scope.infoMarkers.length; i++) {
                                    $scope.infoMarkers[i].close();
                                }
                            }
                            return this;
                        };
                        $scope.init();
                    }
                };
            }])
        .directive("profileForm", ['cellService', function (cellService) {
                $log.debug("-- init profileForm directive");
                return {
                    restrict: "E",
                    templateUrl: 'tpt/directive_profileForm.html',
                    scope: {
                        cell: "="
                    },
                    controller: function ($scope) {
                        $log.debug("-- init profileForm controller");
                        var model = cellService.getModel();
                        $scope.model = model;
                    }
                };
            }])


        ;
var $app = {
    init: function () {
        $log.debug("init cbchat-app", 1);
        return this;
    },
    testGeoloc: function (callback) {
        if (navigator.geolocation) {
            var geoCallback = function (position) {
                $config.geoloc = {lat: position.coords.latitude, lng: position.coords.longitude};
                $log.debug('Geolocation is ' + position.coords.latitude + ':' + position.coords.longitude);
                if (typeof callback === 'function') {
                    callback(position);
                }
            };
            navigator.geolocation.getCurrentPosition(geoCallback);
        } else {
            $log.warning('Geolocation is not supported by this browser');
            $dialog.loading.show('Geolocation error', {dialogSize: 'sm', progressType: 'error'})
                    .body('<div class="alert alert-danger" role="alert">Geolocation is not supported by this browser</div>');
        }
        return this;
    },
    start: function () {
        $log.info("Startup of cbchat-app", 3);
        $("body").on('click', '.form-group', function () {
            $('body .form-helptxt p').removeClass('show').addClass('hidden');
            var selectedHelp = $(this).find('.form-helptxt');
            if (selectedHelp.length > 0) {
                $('p', selectedHelp).removeClass('hidden').addClass('show');
            }
        });
        $app.testGeoloc(function () {
            $dialog.loading.show('Location found', {dialogSize: 'sm', progressType: 'success'});
            $log.info("Start of cbchat-app", 1);
            $dialog.loading.show('Welcome', {dialogSize: 'sm', progressType: 'success'})
                    .body('<div class="alert alert-success" role="alert">Welcome <strong>' + $user.cache.name + '</strong></div>');
            setTimeout(function () {
                $dialog.loading.hide();
            }, 450);
        });
        return this;
    },
    save: function () {
        $log.debug("save application", 1);
        return this;
    }
};
$cbchat
        .onInit($app.init)
        .onStart($app.start)
        .onStop($app.save)
        .init();
$($cbchat.start);