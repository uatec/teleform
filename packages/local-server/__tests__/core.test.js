const http = require('http');
const path = require('path');
const { callback, withEnvVars } = require('../core');
const loadModule = require('../loadModule');

jest.mock('http');
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));
jest.mock('../loadModule', () => jest.fn());


describe('withEnvVars', () => {
    it('should temporarily set environment variables and restore them after execution', () => {
        const tempEnv = { TEST_VAR: 'test_value' };
        const originalEnv = { ...process.env };

        const result = withEnvVars(tempEnv, () => {
            expect(process.env.TEST_VAR).toBe('test_value');
            return 'result';
        });

        expect(result).toBe('result');
        expect(process.env).toEqual(originalEnv);
    });
});

describe('callback', () => {
    let req, res;

    beforeEach(() => {
        req = new http.IncomingMessage();
        res = new http.ServerResponse(req);

        req.headers = { 'x-source-dir': 'test-dir' };
        req.on = jest.fn(async (event, handler) => {
            if (event === 'data') {
                await handler(JSON.stringify({ event: 'testEvent', context: 'testContext', env: { TEST_VAR: 'test_value' } }));
            }
            if (event === 'end') {
                await handler();
            }
        });

        res.writeHead = jest.fn();
        res.end = jest.fn();
    });

    it('should handle a valid request and return the expected response', async () => {
        jest.setTimeout(500);

        let handlerSpy = jest.fn();
        handlerSpy.mockReturnValue({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: { message: 'success' } });
        loadModule.mockImplementation(() => { return { handler: handlerSpy}; });

        await callback(req, res);

        expect(handlerSpy).toBeDefined();
        expect(handlerSpy).toHaveBeenCalledWith('testEvent', 'testContext');
        expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: 'success' }));

    }, 500);

    //     it('should handle errors when the handler function is not found', async () => {
    //         jest.isolateModules(() => {
    //             jest.mock('/test-dir/index.js', () => ({}), { virtual: true });

    //         path.join.mockReturnValue('/test-dir/index.js');

    //         await callback(req, res);

    //         expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    //         expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Handler function not found' }));
    //         });
    //     });

    //     it('should handle errors when the handler function throws an error', async () => {
    //         jest.isolateModules(() => {
    //             jest.mock('/test-dir/index.js', () => ({
    //             handler: jest.fn().mockRejectedValue(new Error('Handler error')),
    //             }), { virtual: true });

    //         path.join.mockReturnValue('/test-dir/index.js');

    //         await callback(req, res);

    //         expect(handlerModule.handler).toHaveBeenCalledWith('testEvent', 'testContext');
    //         expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    //         expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Handler error' }));
    //         });
    //     });

    //     it('should handle invalid JSON in request body', async () => {
    //         req.on = jest.fn((event, handler) => {
    //             if (event === 'data') {
    //                 handler('invalid JSON');
    //             }
    //             if (event === 'end') {
    //                 handler();
    //             }
    //         });

    //         await callback(req, res);

    //         expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    //         expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Unexpected token i in JSON at position 0' }));
    //     });

    //     it('should handle missing x-source-dir header', async () => {
    //         req.headers = {};

    //         await callback(req, res);

    //         expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    //         expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Cannot read properties of undefined (reading \'split\')' }));
    //     });
});