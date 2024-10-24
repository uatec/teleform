const { spawn } = require('child_process');
const { startLocalServer, stopLocalServer } = require('../localServer');

jest.mock('child_process');

describe('Local Server', () => {
    let mockServer;

    beforeEach(() => {
        mockServer = {
            stdout: {
                on: jest.fn(),
            },
            stderr: {
                on: jest.fn(),
            },
            on: jest.fn(),
            kill: jest.fn(),
        };
        spawn.mockReturnValue(mockServer);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should start the server and resolve with the port number', async () => {
        const port = '3000';
        mockServer.stdout.on.mockImplementation((event, callback) => {
            if (event === 'data') {
                callback(`listening on port ${port}\n`);
            }
        });

        await expect(startLocalServer()).resolves.toBe(port);
    });

    test('should reject if the server fails to start', async () => {
        spawn.mockReturnValue(null);

        await expect(startLocalServer()).rejects.toThrow('Failed to start the server.');
    });

    test('should reject if the server emits an error', async () => {
        const errorMessage = 'Server error';
        mockServer.on.mockImplementation((event, callback) => {
            if (event === 'error') {
                callback(new Error(errorMessage));
            }
        });

        await expect(startLocalServer()).rejects.toThrow(errorMessage);
    });

    test('should reject if the server exits with a code', async () => {
        const exitCode = 1;
        mockServer.on.mockImplementation((event, callback) => {
            if (event === 'exit') {
                callback(exitCode, null);
            }
        });

        await expect(startLocalServer()).rejects.toThrow(`Server exited with code ${exitCode} or signal null`);
    });

    test('should reject if the server is killed with a signal', async () => {
        const signal = 'SIGTERM';
        mockServer.on.mockImplementation((event, callback) => {
            if (event === 'exit') {
                callback(null, signal);
            }
        });

        await expect(startLocalServer()).rejects.toThrow(`Server exited with code null or signal ${signal}`);
    });

    test('should stop the server if it is running', () => {
        startLocalServer();
        stopLocalServer();
        expect(mockServer.kill).toHaveBeenCalled();
    });

    test('should not throw an error if the server is not running', () => {
        server = null;
        expect(() => stopLocalServer()).not.toThrow();
    });
});