const {Core} = require('../core');
const { startLocalServer, stopLocalServer } = require('../localServer');
const { startNgrokClient, stopNgrokClient } = require('../ngrokClient');
const { applyTerraform, detachTerraform } = require('../terraform');
const { generateAuthToken } = require('../authToken');
const chokidar = require('chokidar');

jest.mock('../terraform');
jest.mock('../ngrokClient');
jest.mock('../localServer');
jest.mock('../authToken');


describe('handleExit', () => {
    let originalExit;
    let sut;

    beforeAll(() => {
        originalExit = process.exit;
        process.exit = jest.fn();
    });

    afterAll(() => {
        process.exit = originalExit;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        sut = new Core();
        sut.isShuttingDown = false; // Reset the shutdown flag before each test
    });

    test('should call process.exit with code 0 on successful shutdown', async () => {
        await sut.handleExit();
        expect(detachTerraform).toHaveBeenCalledWith(expect.any(String));
        expect(stopNgrokClient).toHaveBeenCalled();
        expect(stopLocalServer).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle errors during Terraform detachment and call process.exit with code 1', async () => {
        detachTerraform.mockImplementation(() => {
            throw new Error('Terraform error');
        });
        await sut.handleExit();
        expect(detachTerraform).toHaveBeenCalledWith(expect.any(String));
        expect(stopNgrokClient).toHaveBeenCalled();
        expect(stopLocalServer).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should not run multiple times if already shutting down', async () => {
        sut.isShuttingDown = true;
        await sut.handleExit();
        expect(detachTerraform).not.toHaveBeenCalled();
        expect(stopNgrokClient).not.toHaveBeenCalled();
        expect(stopLocalServer).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
    });
});

describe('core.js', () => {
    let originalExit;
    let sut;

    beforeAll(() => {
        originalExit = process.exit;
        process.exit = jest.fn();
    });

    afterAll(() => {
        process.exit = originalExit;
    });

    beforeEach(() => {
        jest.resetAllMocks();
        sut = new Core();
    });


    test('should call detachTerraform with correct arguments', async () => {
        const cwd = `${process.cwd()}/../terraform`;
        await sut.runDetach();
        expect(detachTerraform).toHaveBeenCalledWith(cwd);
    });

    test('debounceAsync should delay function execution', async () => {
        const func = jest.fn();
        const debouncedFunc = sut.debounceAsync(func, 100);
        await debouncedFunc();
        expect(func).toHaveBeenCalled();
    });
});
jest.mock('chokidar');

describe('core.js - runDev', () => {
    let originalExit;
    let sut;
    let watcher;

    beforeAll(() => {
        originalExit = process.exit;
        process.exit = jest.fn();
        watcher = {
            on: jest.fn(() => new Promise(() => {})),
        };
        chokidar.watch.mockReturnValue(watcher);
    });

    afterAll(() => {
        process.exit = originalExit;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        sut = new Core();
    });

    test('should start local server, ngrok client, and apply Terraform', async () => {
        generateAuthToken.mockReturnValue('some-auth-token');
        startLocalServer.mockResolvedValue(3000);
        startNgrokClient.mockResolvedValue('http://localhost:4040');
        applyTerraform.mockResolvedValue();

        await sut.runDev();

        expect(startLocalServer).toHaveBeenCalled();
        expect(startNgrokClient).toHaveBeenCalledWith(3000);
        expect(applyTerraform).toHaveBeenCalledWith(expect.any(String), 'http://localhost:4040', 'some-auth-token');
    });

    test('should handle errors during service startup', async () => {
        startLocalServer.mockRejectedValue(new Error('Local server error'));


        await expect(sut.runDev()).rejects.toThrow('Local server error');

        expect(startLocalServer).toHaveBeenCalled();
        // TODO: ensure handleExit is called
    });

    test('should watch for changes in the terraform directory', async () => {
        startLocalServer.mockResolvedValue(3000);
        startNgrokClient.mockResolvedValue('http://localhost:4040');
        applyTerraform.mockResolvedValue();

        await sut.runDev();

        expect(process.exit).not.toHaveBeenCalled();
        expect(chokidar.watch).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
        expect(watcher.on).toHaveBeenCalledWith('all', expect.any(Function));
    });
});