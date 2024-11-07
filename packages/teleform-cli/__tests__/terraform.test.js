const { spawn } = require('child_process');
const { applyTerraform, detachTerraform } = require('../terraform');
const winston = require('winston');

jest.mock('child_process');
jest.mock('winston', () => {
    return {
        createLogger: jest.fn(() => ({
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        })),
        format: {
            printf: jest.fn(),
        },
        transports: {
            Console: jest.fn()
        }
    };
});
describe('Terraform', () => {
    let mockProcess;

    beforeEach(() => {
        mockProcess = {
            stdout: {
                on: jest.fn(),
            },
            stderr: {
                on: jest.fn(),
            },
            on: jest.fn(),
        };
        spawn.mockReturnValue(mockProcess);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('applyTerraform', () => {

        test('should apply terraform successfully', async () => {
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(0);
                }
            });

            await expect(applyTerraform('/path/to/cwd', 'http://example.com', 'some-auth-token')).resolves.toBeUndefined();
        });

        test('should reject if terraform apply fails', async () => {
            const exitCode = 1;
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(exitCode);
                }
            });

            await expect(applyTerraform('/path/to/cwd', 'http://example.com', 'some-auth-token')).rejects.toThrow(`Terraform apply process exited with code ${exitCode}`);
        });

        test('should reject if terraform apply emits an error', async () => {
            const errorMessage = 'Terraform error';
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    callback(new Error(errorMessage));
                }
            });

            await expect(applyTerraform('/path/to/cwd', 'http://example.com', 'some-auth-token')).rejects.toThrow(errorMessage);
        });

        test('should require valid workingDirectory', async () => {
            await expect(applyTerraform()).rejects.toThrow('cwd is required');
        });        
        
        test('should require publicUrl', async () => {
            await expect(applyTerraform('/path/to/cwd')).rejects.toThrow('publicUrl is required');
        });        
        
        test('should require authToken', async () => {
            await expect(applyTerraform('/path/to/cwd', 'http://example.com')).rejects.toThrow('authToken is required');
        });
    });

    describe('detachTerraform', () => {

        test('should detach terraform successfully', async () => {
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(0);
                }
            });

            await expect(detachTerraform('/path/to/cwd')).resolves.toBeUndefined();
        });

        test('should reject if terraform detach fails', async () => {
            const exitCode = 1;
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(exitCode);
                }
            });

            await expect(detachTerraform('/path/to/cwd')).rejects.toThrow(`Terraform dettach process exited with code ${exitCode}`);
        });

        test('should reject if terraform detach emits an error', async () => {
            const errorMessage = 'Terraform error';
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    callback(new Error(errorMessage));
                }
            });

            await expect(detachTerraform('/path/to/cwd')).rejects.toThrow(errorMessage);
        });
    });
});