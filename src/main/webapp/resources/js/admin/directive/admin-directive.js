(function () {
    "use strict";
    function parseDate(val) {
        var d;
        if(angular.isDefined(val) && (d = moment(val)).isValid()) {
            return d;
        }
        return moment().startOf('day');
    }

    var directives = angular.module('adminDirectives', ['ui.bootstrap', 'adminServices']);

    directives.directive("organizationsList", function() {
        return {
            scope: true,
            templateUrl: '/resources/angular-templates/admin/partials/main/organizations.html',
            controller: function($scope, $rootScope, OrganizationService) {
                var loadOrganizations = function() {
                    OrganizationService.getAllOrganizations().success(function(result) {
                        $scope.organizations = result;
                    });
                };
                $rootScope.$on('ReloadOrganizations', function(e) {
                    loadOrganizations();
                });
                $scope.organizations = [];
                loadOrganizations();
            },
            link: angular.noop
        };
    });
    directives.directive("usersList", function() {
        return {
            scope: true,
            templateUrl: '/resources/angular-templates/admin/partials/main/users.html',
            controller: function($scope, $rootScope, UserService) {
                $scope.users = [];
                var loadUsers = function() {
                    UserService.getAllUsers().success(function(result) {
                        $scope.users = result;
                    });
                };
                $rootScope.$on('ReloadUsers', function() {
                    loadUsers();
                });
                loadUsers();
            },
            link: angular.noop
        };
    });

    directives.directive('eventsList', function() {
        return {
            scope: true,
            templateUrl: '/resources/angular-templates/admin/partials/main/events.html',
            controller: function($scope, EventService) {
                EventService.getAllEvents().success(function(data) {
                    $scope.events = data;
                });

                $scope.supportsOfflinePayments = function(event) {
                    return _.contains(event.allowedPaymentProxies, 'OFFLINE');
                };
            },
            link: angular.noop
        };
    });

    directives.directive('dateRange', function() {
        return {
            restrict: 'A',
            scope: {
                minDate: '=',
                maxDate: '=',
                startDate: '=',
                startModelObj: '=startModel',
                endModelObj: '=endModel'
            },
            require: '^ngModel',
            link: function(scope, element, attrs, ctrl) {
                var dateFormat = 'YYYY-MM-DD HH:mm';
                var fillDate = function(modelObject) {
                    if(!angular.isDefined(modelObject.date)) {
                        modelObject.date = {};
                        modelObject.time = {};
                    }
                };

                var getNowAtStartOfHour = function() {
                    return moment().startOf('hour');
                };

                var initDateUsingNow = function(modelObj) {
                    if(!angular.isDefined(modelObj) || !angular.isDefined(modelObj.date) || !angular.isDefined(modelObj.time)) {
                        return getNowAtStartOfHour();
                    }
                    var date = moment(modelObj.date + 'T' + modelObj.time);
                    return date.isValid() ? date : getNowAtStartOfHour();
                };


                var startDate = initDateUsingNow(scope.startModelObj);
                var endDate = initDateUsingNow(scope.endModelObj);

                var result = startDate.format(dateFormat) + ' / ' + endDate.format(dateFormat);
                ctrl.$setViewValue(result);
                element.val(result);

                var minDate = scope.minDate || getNowAtStartOfHour();

                element.daterangepicker({
                    format: dateFormat,
                    separator: ' / ',
                    startDate: startDate,
                    endDate: endDate,
                    minDate: minDate,
                    maxDate: scope.maxDate,
                    timePicker: true,
                    timePicker12Hour: false,
                    timePickerIncrement: 1
                });

                element.on('apply.daterangepicker', function(ev, picker) {
                    if(angular.isDefined(picker)) {
                        scope.$apply(function() {
                            var start = picker.startDate;
                            var end = picker.endDate;
                            scope.startModelObj['date'] = start.format('YYYY-MM-DD');
                            scope.startModelObj['time'] = start.format('HH:mm');
                            scope.endModelObj['date'] = end.format('YYYY-MM-DD');
                            scope.endModelObj['time'] = end.format('HH:mm');
                            ctrl.$setViewValue(element.val());
                        });
                    }
                });
            }
        };
    });

    directives.directive('grabFocus', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.focus();
            }
        };
    });

    directives.directive('controlButtons', function() {
        return {
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/form/control-buttons.html',
            scope: {
                formObj: '=',
                cancelHandler: '='
            },
            controller: function($scope, $rootScope) {
                $scope.cancel = function() {
                    if(angular.isFunction($scope.cancelHandler)) {
                        $scope.cancelHandler();
                    } else if(angular.isFunction($scope.$parent.cancel)) {
                        $scope.$parent.cancel();
                    }
                };

                $scope.ok = function(frm) {
                    if(!frm.$valid) {
                        $rootScope.$broadcast('ValidationFailed');
                    }
                    return frm.$valid;
                };
            }
        };
    });

    directives.directive('fieldError', function() {
        return {
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/form/field-error.html',
            scope: {
                formObj: '=',
                fieldObj: '=',
                minChar: '=',
                requiredPattern: '=',
                showExistingErrors: '='
            },
            link:angular.noop
        };
    });

    //edit event: fragments
    directives.directive('eventHeader', function() {
        return {
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/event/fragment/event-header.html',
            link: angular.noop
        }
    });

    directives.directive('editEventHeader', function() {
        return {
            scope: {
                obj: '=targetObj',
                eventObj: '=',
                organizations: '=',
                fullEditMode: '=',
                showDatesWarning: '=',
                showExistingErrors: '='
            },
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/event/fragment/edit-event-header.html',
            controller: function EditEventHeaderController($scope, LocationService) {
                if(!angular.isDefined($scope.fullEditMode)) {
                    var source = _.pick($scope.eventObj, ['id','shortName', 'organizationId', 'location',
                        'description', 'websiteUrl', 'termsAndConditionsUrl', 'imageUrl', 'formattedBegin',
                        'formattedEnd', 'geolocation']);
                    angular.extend($scope.obj, source);
                    var beginDateTime = moment(source['formattedBegin']);
                    var endDateTime = moment(source['formattedEnd']);
                    $scope.obj['begin'] = {
                        date: beginDateTime.format('YYYY-MM-DD'),
                        time: beginDateTime.format('HH:mm')
                    };
                    $scope.obj['end'] = {
                        date: endDateTime.format('YYYY-MM-DD'),
                        time: endDateTime.format('HH:mm')
                    };
                }

                $scope.updateLocation = function (location) {
                    $scope.loadingMap = true;
                    LocationService.geolocate(location).success(function(result) {
                        $scope.obj['geolocation'] = result;
                        $scope.loadingMap = false;
                    }).error(function() {
                        $scope.loadingMap = false;
                    });
                };
            }
        }
    });

    directives.directive('editPrices', function() {
        return {
            scope: {
                obj: '=targetObj',
                eventObj: '=',
                fullEditMode: '=',
                allowedPaymentProxies: '=',
                showPriceWarning: '=',
                showExistingErrors: '='
            },
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/event/fragment/edit-prices.html',
            controller: function EditPricesController($scope, PriceCalculator) {
                if(!angular.isDefined($scope.fullEditMode)) {
                    var source = _.pick($scope.eventObj, ['id','freeOfCharge', 'allowedPaymentProxies', 'availableSeats',
                        'regularPrice', 'currency', 'vat', 'vatIncluded']);
                    if(source.vatIncluded) {
                        source.regularPrice = PriceCalculator.calculateTotalPrice(source, true);
                    }
                    angular.extend($scope.obj, source);
                }

                $scope.calculateTotalPrice = function(event) {
                    return PriceCalculator.calculateTotalPrice(event, false);
                };

            }
        }
    });

    directives.directive('prices', function() {
        return {
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/event/fragment/prices.html',
            controller: function ViewPricesController($scope, PriceCalculator) {
                $scope.calculateTotalPrice = function(event) {
                    return PriceCalculator.calculateTotalPrice(event, true);
                };
            }
        };
    });

    directives.directive('editCategory', function() {
        return {
            restrict: 'E',
            templateUrl: '/resources/angular-templates/admin/partials/event/fragment/edit-category.html'
        };
    });

    directives.directive('pendingReservationsBadge', function($rootScope, $interval, EventService) {
        return {
            restrict: 'E',
            scope: false,
            templateUrl: '/resources/angular-templates/admin/partials/pending-reservations/badge.html',
            link: function(scope, element, attrs) {
                var eventName = attrs.eventName;
                scope.pendingReservations = 0;
                if(angular.isDefined(eventName)) {
                    var getPendingPayments = function() {
                        EventService.getPendingPayments(eventName).success(function(data) {
                            scope.pendingReservations = data.length;
                            $rootScope.$broadcast('PendingReservationsFound', data);
                        });
                    };
                    getPendingPayments();
                    var promise = $interval(getPendingPayments, 10000);

                    element.on('$destroy', function() {
                        $interval.cancel(promise);
                    });
                } else {
                    $rootScope.$on('PendingReservationsFound', function(data) {
                        scope.pendingReservations = data.length;
                    });
                }
            }
        }
    });

    directives.directive('errorSensitive', function($rootScope) {
        return {
            restrict: 'A',
            require: '^form',
            link: function(scope, element, attrs, formController) {
                var prefixes = (attrs['errorSensitive'] || '').split(',');
                var touchField = function(prefix, name) {
                    var obj;
                    if(angular.isDefined(prefix) && angular.isDefined(formController[prefix])) {
                        obj = formController[prefix][name];
                    } else {
                        obj = formController[name];
                    }
                    if(angular.isDefined(obj)) {
                        scope.$applyAsync(function() {
                            obj.$setTouched();
                        });
                    }
                };
                $rootScope.$on('ValidationFailed', function() {
                    element.addClass('force-show-errors');
                    _.chain(element.find(':input'))
                        .filter(function(e) {
                            return prefixes.length > 0 && _.filter(prefixes, function(p) {
                                    return angular.isDefined(formController[p][e.name]);
                                }).length > 0;
                        }).forEach(function(el) {
                            _.forEach(prefixes, function(prefix) {
                                touchField(prefix,el.name);
                            });
                            touchField(undefined, el.name);
                        });
                });

            }
        }
    });

    directives.directive('ticketStatus', function() {
        return {
            restrict: 'E',
            scope: {
                statisticsContainer: '='
            },
            template:'<canvas id="pie" class="chart chart-pie" data-data="ticketStatistics" data-labels="ticketStatisticLabels"></canvas>',
            link:function(scope, element, attrs) {
                var statisticsContainer = scope.statisticsContainer;
                scope.ticketStatistics = [statisticsContainer.notSoldTickets, statisticsContainer.soldTickets, statisticsContainer.checkedInTickets];
                scope.ticketStatisticLabels = ['Still available', 'Sold', 'Checked in'];
            }
        }
    });

    directives.directive('qrScanner', ['$timeout', function($timeout) {
        return {
            restrict: 'E',
            scope: {
                ngSuccess: '&ngSuccess',
                ngError: '&ngError',
                ngVideoError: '&ngVideoError'
            },
            link: function(scope, element, attrs) {

                window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

                var height = attrs.height || 300;
                var width = attrs.width || 250;
                var localMediaStream;

                var video = document.createElement('video');
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                var canvas = document.createElement('canvas');
                canvas.setAttribute('id', 'qr-canvas');
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                canvas.setAttribute('class', 'hidden');
                //canvas.setAttribute('style', 'display:none;');

                angular.element(element).append(video);
                angular.element(element).append(canvas);
                var context = canvas.getContext('2d');

                var scan = function() {
                    if (localMediaStream) {
                        context.drawImage(video, 0, 0, 307,250);
                        try {
                            qrcode.decode();
                        } catch(e) {
                            scope.ngError({error: e});
                        }
                    }
                    $timeout(scan, 500);
                }
                var successCallback = function(stream) {
                    video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
                    localMediaStream = stream;
                    video.play();
                    $timeout(scan, 1000);
                }
                // Call the getUserMedia method with our callback functions
                if (navigator.getUserMedia) {
                    navigator.getUserMedia({video: true}, successCallback, function(e) {
                        scope.ngVideoError({error: e});
                    });
                } else {
                    scope.ngVideoError({error: 'Native web camera streaming (getUserMedia) not supported in this browser.'});
                }
                qrcode.callback = function(data) {
                    scope.ngSuccess({data: data});
                };
            }
        }
    }]);
})();
