const https = require('https');
const { handler } = require('../index');

jest.mock('https');

describe('Invocation forwarder', () => {
    test('should forward the invocation and return a successful response', async () => {
        const mockResponse = {
            statusCode: 200,
            on: jest.fn((event, callback) => {
                if (event === 'data') {
                    callback('response data');
                }
                if (event === 'end') {
                    callback();
                }
            })
        };

        const mockRequest = {
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };

        https.request.mockImplementation((_, options, callback) => {
            expect(options.headers["Authorization"]).toEqual("Bearer some-auth-token");
            callback(mockResponse);
            return mockRequest;
        });

        process.env.ENDPOINT_URL = 'https://example.com';
        process.env.SOURCE_DIR = 'source-dir';
        process.env.AUTH_TOKEN = 'some-auth-token';

        const event = { key: 'value' };
        const context = { functionName: 'testFunction' };

        const result = await handler(event, context);

        expect(result).toEqual({
            statusCode: 200,
            body: 'response data'
        });

        expect(mockRequest.write).toHaveBeenCalledWith(JSON.stringify({
            event: event,
            context: context,
            env: process.env
        }));
        expect(mockRequest.end).toHaveBeenCalled();
    });

    test('should pass the authorization token in the request headers', async () => {
        
    });

    test('should handle request errors', async () => {
        const mockRequest = {
            on: jest.fn((event, callback) => {
                if (event === 'error') {
                    callback(new Error('Request failed'));
                }
            }),
            write: jest.fn(),
            end: jest.fn()
        };

        https.request.mockImplementation(() => mockRequest);

        process.env.ENDPOINT_URL = 'https://example.com';
        process.env.SOURCE_DIR = 'source-dir';

        const event = { key: 'value' };
        const context = { functionName: 'testFunction' };

        await expect(handler(event, context)).rejects.toEqual({
            statusCode: 500,
            body: 'Error: Request failed'
        });

        expect(mockRequest.write).toHaveBeenCalledWith(JSON.stringify({
            event: event,
            context: context,
            env: process.env
        }));
        expect(mockRequest.end).toHaveBeenCalled();
    });
});