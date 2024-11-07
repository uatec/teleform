const http = require('http');
const path = require('path');
const { callback, withEnvVars, formatEnvVars, getEventSource } = require('../core');
const loadModule = require('../loadModule');

jest.mock('http');
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));
jest.mock('../loadModule', () => jest.fn());

describe('getEventSource', () => {
    it('should return the event source', () => {
        expect(getEventSource({ httpMethod: 'GET', path: '/test' })).toBe('GET /test');
        expect(getEventSource({ Records: [{ eventSource: 'test' }] })).toBe('test');
        expect(getEventSource({})).toBe('Unknown');
    });
})

describe('formatEnvVars', () => {
    it('should format environment variables', () => {
        const env = { TEST_VAR: 'abc' };
        expect(formatEnvVars(env)).toBe('TEST_VAR=abc');
    });
});

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

    let handlerSpy = jest.fn();

    beforeEach(() => {
        req = new http.IncomingMessage();
        res = new http.ServerResponse(req);

        req.headers = { 
            'x-source-dir': 'test-dir',
            'authorization': 'Bearer test_token'
        };
        process.env.AUTH_TOKEN = 'test_token';
        req.on = jest.fn(async (event, handler) => {
            if (event === 'data') {
                await handler(JSON.stringify({ event: 'testEvent', context: 'testContext', env: { '_HANDLER': 'index.handler', TEST_VAR: 'test_value' } }));
            }
            if (event === 'end') {
                await handler();
            }
        });

        res.writeHead = jest.fn();
        res.end = jest.fn();

        loadModule.mockImplementation(() => { return { handler: handlerSpy }; });
    });

    it('should handle a valid request and return the expected response', async () => {
        handlerSpy.mockReturnValue({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: { message: 'success' } });

        await callback(req, res);

        expect(handlerSpy).toBeDefined();
        expect(handlerSpy).toHaveBeenCalledWith('testEvent', 'testContext');
        expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: 'success' }));
    });

    it('should handle errors when the handler function is not found', async () => {
        loadModule.mockImplementation(() => { throw new Error('Handler module not found'); });

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Handler module not found' }));
    });

    it('should throw an error when the handler module does not contain the specified function', async () => {
        loadModule.mockImplementation(() => { return { not_the_handler: 'invalidFunction' }; });

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Handler function \'handler\' not found' }));
    });

    it('should handle errors when the handler function throws an error', async () => {

        handlerSpy.mockImplementation(() => { throw new Error('Handler error'); });

        await callback(req, res);

        expect(handlerSpy).toHaveBeenCalledWith('testEvent', 'testContext');
        expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Handler error' }));
    });

    it('should handle invalid JSON in request body', async () => {
        req.on = jest.fn((event, handler) => {
            if (event === 'data') {
                handler('xxx');
            }
            if (event === 'end') {
                handler();
            }
        });

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid request body. Request body must be valid JSON.' }));
    });

    it('x-source-dir header is mandatory', async () => {
        req.headers = {};

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: '"x-source-dir" header is mandatory.' }));
    });       
    
    it('authorization header is mandatory', async () => {
        delete req.headers.authorization;

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: '"Authorization" header is mandatory.' }));
    });   

    it('authorization header is enforced', async () => {
        req.headers = { 
            ...req.headers,
            'authorization': 'Bearer wrong_token'
        };

        await callback(req, res);

        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid authorization token.' }));
        expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    });   

    it('authorization must be Bearer auth', async () => {
        req.headers = { 
            ...req.headers,
            'authorization': 'not-bearer wrong_token'
        };

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid authorization token.' }));
    });   
    
    it('_HANDLER env var is mandatory', async () => {

        req.on = jest.fn(async (event, handler) => {
            if (event === 'data') {
                await handler(JSON.stringify({ event: 'testEvent', context: 'testContext', env: { 'NOT_HANDLER': 'index.handler', TEST_VAR: 'test_value' } }));
            }
            if (event === 'end') {
                await handler();
            }
        });

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: '_HANDLER environment variable is not set.' }));
    });

    it('_HANDLER env var must be in two part . separated format', async () => {

        req.on = jest.fn(async (event, handler) => {
            if (event === 'data') {
                await handler(JSON.stringify({ event: 'testEvent', context: 'testContext', env: { '_HANDLER': 'indexNOTADOThandler', TEST_VAR: 'test_value' } }));
            }
            if (event === 'end') {
                await handler();
            }
        });

        await callback(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
        expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid _HANDLER environment variable.' }));
    });
});