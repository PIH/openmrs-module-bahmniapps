'use strict';

angular.module('bahmni.clinical').controller('ConsultationNavigationController',
    ['$scope', '$rootScope', '$state', '$location', '$window', 'clinicalConfigService', 'urlHelper', 'contextChangeHandler', 
        'spinner', 'encounterService', 'messagingService', 'sessionService',
        function ($scope, $rootScope, $state, $location, $window, clinicalConfigService, urlHelper, contextChangeHandler, 
                  spinner, encounterService, messagingService, sessionService) {

            $scope.loadVisit = function(visitUuid) {
                $state.go('patient.visit', {visitUuid: visitUuid});
            };
            
            var boardTypes = {
                visit: 'visit',
                consultation: 'consultation'
            };
            $scope.availableBoards = [
                { label: 'Visit', url: '', type: boardTypes.visit}
            ];
            $scope.currentBoard = $scope.availableBoards[0];
            $scope.showBoard = function (label) {
                $rootScope.collapseControlPanel();
                var board = findBoardByLabel(label);
                return buttonClickAction(board);
            };

            $scope.gotoPatientDashboard = function() {
                $location.path("/patient/" + $rootScope.patient.uuid + "/dashboard");
            };

            var setCurrentBoardBasedOnPath = function() {
                var currentPath = $location.path();
                var board = findBoardByUrl(currentPath);
                $scope.currentBoard = board || $scope.availableBoards[0];
            };

            var stringContains = function (sourceString, pattern) {
                return (sourceString.search(pattern) >= 0);
            };

            var initialize = function () {
                $rootScope.$on('event:appExtensions-loaded', function () {
                    var appExtensions = clinicalConfigService.getAllConsultationBoards();
                    $scope.availableBoards = $scope.availableBoards.concat(appExtensions);
                    setCurrentBoardBasedOnPath();
                });
            };

            $scope.$on('$stateChangeStart', function() { 
                setCurrentBoardBasedOnPath();
            });

            var findBoardByLabel = function (label) {
                var boards = $scope.availableBoards.filter(function (board) {
                    return board.label === label;
                });
                return boards.length > 0 ? boards[0] : null;
            };

            var findBoardByUrl = function (url) {
                var boards = $scope.availableBoards.filter(function (board) {
                    return stringContains(url, board.url);
                });
                return boards.length > 0 ? boards[1] : null;
            };

            var getUrl = function (board) {
                var urlPrefix = board.type === boardTypes.visit ? urlHelper.getVisitUrl($rootScope.consultation.visitUuid) : urlHelper.getPatientUrl();
                var url = board.url ? urlPrefix + "/" + board.url : urlPrefix ; 
                return $location.url(url);                    
            };

            var contextChange = function() {
                return contextChangeHandler.execute();
            };

            var buttonClickAction = function (board) {
                if ($scope.currentBoard === board) return;

                var contextChangeResponse = contextChange();
                if (!contextChangeResponse["allow"]) {
                    if(contextChangeResponse["errorMessage"]) {
                        messagingService.showMessage('error', contextChangeResponse["errorMessage"]);
                    }
                    return;
                }
                contextChangeHandler.reset();
                $scope.currentBoard = board;
                return getUrl(board);
            };

            var addEditedDiagnoses = function (diagnosisList) {
                $rootScope.consultation.pastDiagnoses && $rootScope.consultation.pastDiagnoses.forEach(function (diagnosis) {
                    if (diagnosis.isDirty) {
                        diagnosis.setDiagnosisStatusConcept();
                        diagnosis.diagnosisDateTime = null;
                        diagnosisList.push(diagnosis);
                    }
                });
                $rootScope.consultation.savedDiagnosesFromCurrentEncounter && $rootScope.consultation.savedDiagnosesFromCurrentEncounter.forEach(function (diagnosis) {
                    if (diagnosis.isDirty) {
                        // TODO : shruthi : can avoid this using javascript property
                        diagnosis.setDiagnosisStatusConcept();
                        diagnosis.diagnosisDateTime = null;
                        diagnosisList.push(diagnosis);
                    }
                });
            };

            var clearRootScope = function(){
                $rootScope.consultation.newlyAddedDiagnoses = [];
                $rootScope.consultation.newlyAddedTreatments = new Bahmni.Clinical.DrugOrdersViewModel();
                $rootScope.consultation.discontinuedDrugs = new Bahmni.Clinical.DrugOrdersViewModel();
                $rootScope.consultation.drugOrderGroups = undefined;
            };

            $scope.save = function () {
                var contxChange = contextChange();
                var allowContextChange = contxChange["allow"];
                if(!allowContextChange){
                    var errorMessage = contxChange["errorMessage"] ? contxChange["errorMessage"] : "Please correct errors in the form. Information not saved" ;
                    messagingService.showMessage('error', errorMessage);
                    return;
                }

                $rootScope.consultation.saveHandler.fire();
                var encounterData = {};
                encounterData.locationUuid = sessionService.getLoginLocationUuid();
                encounterData.patientUuid = $scope.patient.uuid;
                encounterData.encounterDateTime = null;

                if ($rootScope.consultation.newlyAddedDiagnoses && $rootScope.consultation.newlyAddedDiagnoses.length > 0) {
                    encounterData.bahmniDiagnoses = $rootScope.consultation.newlyAddedDiagnoses.map(function (diagnosis) {
                        return {
                            codedAnswer: { uuid: !diagnosis.isNonCodedAnswer ? diagnosis.codedAnswer.uuid : undefined},
                            freeTextAnswer: diagnosis.isNonCodedAnswer ? diagnosis.codedAnswer.name : undefined,
                            order: diagnosis.order,
                            certainty: diagnosis.certainty,
                            existingObs: null,
                            diagnosisDateTime: null,
                            diagnosisStatusConcept: diagnosis.getDiagnosisStatusConcept(),
                            voided: diagnosis.voided,
                            comments: diagnosis.comments
                        }
                    });
                } else {
                    encounterData.bahmniDiagnoses = [];
                }
                addEditedDiagnoses(encounterData.bahmniDiagnoses);

                encounterData.testOrders = $rootScope.consultation.investigations.map(function (investigation) {
                    return { uuid: investigation.uuid, concept: {uuid: investigation.concept.uuid }, orderTypeUuid: investigation.orderTypeUuid, voided: investigation.voided || false};
                });

                encounterData.drugOrders = $rootScope.consultation.drugOrders;

                encounterData.disposition = $rootScope.consultation.disposition;

                var addObservationsToEncounter = function () {
                    encounterData.observations = encounterData.observations || [];

                    if ($scope.consultation.consultationNote) {
                        encounterData.observations.push($scope.consultation.consultationNote);
                    }
                    if ($scope.consultation.labOrderNote) {
                        encounterData.observations.push($scope.consultation.labOrderNote);
                    }
                    encounterData.observations = encounterData.observations.concat($rootScope.consultation.observations);
                };
                var observationFilter = new Bahmni.Common.Domain.ObservationFilter();
                $rootScope.consultation.observations = observationFilter.filter($rootScope.consultation.observations);
                $rootScope.consultation.consultationNote = observationFilter.filter([$rootScope.consultation.consultationNote])[0];
                $rootScope.consultation.labOrderNote = observationFilter.filter([$rootScope.consultation.labOrderNote])[0];
                addObservationsToEncounter();

                spinner.forPromise(encounterService.create(encounterData).then(function () {
                    clearRootScope();
                    $state.transitionTo($state.current, $state.params, {
                        reload: true,
                        inherit: false,
                        notify: true
                    }).then(function() {
                        messagingService.showMessage('info', 'Saved');
                    });
                 }).catch(function (error){
                    var message = Bahmni.Clinical.Error.translate(error) || 'An error has occurred on the server. Information not saved.';
                    messagingService.showMessage('error', message);
                }));
            };

            initialize();
        }]);
