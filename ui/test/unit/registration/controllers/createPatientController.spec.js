'use strict';

var $aController, scopeMock, rootScopeMock, stateMock, patientServiceMock, preferencesMock, patientModelMock, spinnerMock,
    appServiceMock, ngDialogMock, ngDialogLocalScopeMock;

describe('CreatePatientController', function () {

    var identifierSource = function () {
        return {
            prefix: "GAN",
            uuid: "identifier-source-uuid-GAN"
        };
    };

    beforeEach(module('bahmni.registration'));

    beforeEach(
        inject(function ($controller) {
            $aController = $controller;
        })
    );
    beforeEach(function () {
        scopeMock = jasmine.createSpyObj('scopeMock', ['actions']);
        rootScopeMock = jasmine.createSpyObj('rootScopeMock', ['patientConfiguration']);
        stateMock = jasmine.createSpyObj('stateMock', ['go']);
        patientServiceMock = jasmine.createSpyObj('patientServiceMock', ['generateIdentifier', 'getLatestIdentifier', 'setLatestIdentifier', 'create']);
        preferencesMock = jasmine.createSpyObj('preferencesMock', ['']);
        patientModelMock = jasmine.createSpyObj('patientModelMock', ['']);
        spinnerMock = jasmine.createSpyObj('spinnerMock', ['forPromise']);
        appServiceMock = jasmine.createSpyObj('appServiceMock', ['getAppDescriptor']);

        ngDialogMock = jasmine.createSpyObj('ngDialogMock', ['open', 'close']);
        ngDialogLocalScopeMock = scopeMock;
        scopeMock.$new = function () {
            return ngDialogLocalScopeMock;
        };

        appServiceMock.getAppDescriptor = function () {
            return {
                getConfigValue: function () {
                }
            };
        };

        rootScopeMock.patientConfiguration = {
            identifierSources: {
                results: []
            }
        };

        $aController('CreatePatientController', {
            $scope: scopeMock,
            $rootScope: rootScopeMock,
            $state: stateMock,
            patientService: patientServiceMock,
            preferences: preferencesMock,
            patientModel: patientModelMock,
            spinner: spinnerMock,
            appService: appServiceMock,
            ngDialog: ngDialogMock
        });

        scopeMock.actions = {
            followUpAction: function () {
                scopeMock.afterSave();
            }
        };

        scopeMock.patientConfiguration = {
            identifierSources: {
                results: []
            }
        };

        scopeMock.patient = {
            identifierPrefix: {},
            relationships: []
        };
    });

    it("should set patient identifierPrefix details with the matching one", function () {
        rootScopeMock.patientConfiguration = {
            identifierSources: [{
                prefix: "GAN"
            }, {
                prefix: "SEM"
            }]

        };
        preferencesMock.identifierPrefix = "GAN";
        $aController('CreatePatientController', {
            $scope: scopeMock,
            $rootScope: rootScopeMock,
            $state: stateMock,
            patientService: patientServiceMock,
            preferences: preferencesMock,
            patientModel: patientModelMock,
            spinner: spinnerMock,
            appService: appServiceMock,
            ngDialog: ngDialogMock
        });

        expect(scopeMock.patient.selectedIdentifierSource.prefix).toBe("GAN");
    });

    it("should set patient identifierPrefix details with the first source details when it doesn't match", function () {
        rootScopeMock.patientConfiguration = {
            identifierSources: [{
                prefix: "SEM"
            }, {
                prefix: "BAN"
            }]
        };
        preferencesMock.identifierPrefix = "GAN";
        $aController('CreatePatientController', {
            $scope: scopeMock,
            $rootScope: rootScopeMock,
            $state: stateMock,
            patientService: patientServiceMock,
            preferences: preferencesMock,
            patientModel: patientModelMock,
            spinner: spinnerMock,
            appService: appServiceMock,
            ngDialog: ngDialogMock
        });

        expect(scopeMock.patient.selectedIdentifierSource.prefix).toBe("SEM");
    });

    it("should create a patient and go to edit page", function () {
        scopeMock.patient.selectedIdentifierSource = identifierSource();


        patientServiceMock.generateIdentifier.and.returnValue(specUtil.createFakePromise(
            {identifier: "uuid"}));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(scopeMock.patient.identifier).toBe("uuid");
        expect(stateMock.go).toHaveBeenCalledWith("patient.edit", {
            patientUuid: 'patientUuid'
        });
    });

    it("should create a patient with custom id and go to edit page", function () {
        scopeMock.patient.selectedIdentifierSource = identifierSource();

        scopeMock.hasOldIdentifier = true;
        patientServiceMock.getLatestIdentifier.and.stub();
        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise(
            {
                uuid: "identifier-source-uuid-GAN",
                nextSequenceValue: "100000"
            }));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(stateMock.go).toHaveBeenCalledWith("patient.edit", {
            patientUuid: 'patientUuid'
        });
    });

    it("should open the pop up when the custom identifier is greater then the next identifier in the sequence", function () {
        scopeMock.patient.selectedIdentifierSource = identifierSource();

        scopeMock.patient.registrationNumber = "1050";

        scopeMock.hasOldIdentifier = true;

        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise({
            uuid: "identifier-source-uuid-GAN",
            nextSequenceValue: "1000"
        }));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(patientServiceMock.getLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN");
        expect(ngDialogMock.open).toHaveBeenCalledWith({
            template: 'views/customIdentifierConfirmation.html',
            data: {
                sizeOfTheJump: 50
            },
            scope: ngDialogLocalScopeMock
        });
    });

    it("should not open the pop up when the custom identifier is less then the next identifier in the sequence", function () {
        scopeMock.patient.selectedIdentifierSource = identifierSource();

        scopeMock.patient.registrationNumber = "1050";

        scopeMock.hasOldIdentifier = true;

        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise({
            uuid: "identifier-source-uuid-GAN",
            nextSequenceValue: "1055"
        }));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(patientServiceMock.getLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN");
        expect(ngDialogMock.open).not.toHaveBeenCalled();
        expect(patientServiceMock.create).toHaveBeenCalledWith(scopeMock.patient);
        expect(scopeMock.patient.uuid).toBe("patientUuid");
    });

    it("should not open the pop up when the custom identifier is equal to the next identifier in the sequence", function () {
        scopeMock.patient.selectedIdentifierSource = {
            prefix: "GAN",
            uuid: "identifier-source-uuid-GAN"
        };

        scopeMock.patient.registrationNumber = "1050";

        scopeMock.hasOldIdentifier = true;

        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise({
            uuid: "identifier-source-uuid-GAN",
            nextSequenceValue: "1050"
        }));
        patientServiceMock.setLatestIdentifier.and.returnValue(specUtil.createFakePromise("1051"));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(patientServiceMock.getLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN");
        expect(ngDialogMock.open).not.toHaveBeenCalled();
        expect(patientServiceMock.create).toHaveBeenCalledWith(scopeMock.patient);
        expect(patientServiceMock.setLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN", 1051);
        expect(scopeMock.patient.uuid).toBe("patientUuid");
    });

    it("should not create patient when the set Identifier throws error", function () {
        var serverError = new Error("Server Error : User is logged in but doesn't have the relevant privilege");
        scopeMock.patient.selectedIdentifierSource = {
            prefix: "GAN",
            uuid: "identifier-source-uuid-GAN"
        };

        scopeMock.patient.registrationNumber = "1050";

        scopeMock.hasOldIdentifier = true;

        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise({
            uuid: "identifier-source-uuid-GAN",
            nextSequenceValue: "1050"
        }));
        patientServiceMock.setLatestIdentifier.and.throwError(serverError);

        expect(scopeMock.create).toThrow(serverError);

        expect(patientServiceMock.getLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN");
        expect(patientServiceMock.setLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN", 1051);
        expect(patientServiceMock.create).not.toHaveBeenCalled();
    });

    it("should create patient when the user says yes to the pop up", function () {
        scopeMock.patient.selectedIdentifierSource = {
            prefix: "GAN",
            uuid: "identifier-source-uuid-GAN"
        };

        scopeMock.patient.registrationNumber = "1050";

        scopeMock.hasOldIdentifier = true;

        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise({
            uuid: "identifier-source-uuid-GAN",
            nextSequenceValue: "1000"
        }));
        patientServiceMock.setLatestIdentifier.and.returnValue(specUtil.createFakePromise("1051"));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(patientServiceMock.getLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN");
        expect(ngDialogMock.open).toHaveBeenCalledWith({
            template: 'views/customIdentifierConfirmation.html',
            data: {
                sizeOfTheJump: 50
            },
            scope: ngDialogLocalScopeMock
        });
        ngDialogLocalScopeMock.yes();
        expect(patientServiceMock.setLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN", 1051);
        expect(patientServiceMock.create).toHaveBeenCalledWith(scopeMock.patient);
    });

    it("should not create patient when the user says no to the pop up", function () {
        scopeMock.patient.selectedIdentifierSource = identifierSource();

        scopeMock.patient.registrationNumber = "1050";

        scopeMock.hasOldIdentifier = true;

        patientServiceMock.getLatestIdentifier.and.returnValue(specUtil.createFakePromise({
            uuid: "identifier-source-uuid-GAN",
            nextSequenceValue: "1000"
        }));
        patientServiceMock.setLatestIdentifier.and.returnValue(specUtil.createFakePromise("1051"));
        patientServiceMock.create.and.returnValue(specUtil.createFakePromise({
            patient: {
                uuid: "patientUuid",
                person: {
                    names: [{
                        display: "somename"
                    }]
                }
            }
        }));

        scopeMock.create();

        expect(patientServiceMock.getLatestIdentifier).toHaveBeenCalledWith("identifier-source-uuid-GAN");
        expect(ngDialogMock.open).toHaveBeenCalledWith({
            template: 'views/customIdentifierConfirmation.html',
            data: {
                sizeOfTheJump: 50
            },
            scope: ngDialogLocalScopeMock
        });
        ngDialogLocalScopeMock.no();
        expect(patientServiceMock.setLatestIdentifier).not.toHaveBeenCalled();
        expect(patientServiceMock.create).not.toHaveBeenCalled();
    });
});
