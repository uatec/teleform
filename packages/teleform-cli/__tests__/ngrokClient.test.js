const { startNgrokClient, stopNgrokClient } = require('../ngrokClient');
const ngrok = require('ngrok');

jest.mock('ngrok');

describe('ngrokClient', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should start ngrok client successfully', async () => {
        const localPort = 8080;
        const mockUrl = 'http://mocked-ngrok-url';
        ngrok.connect.mockResolvedValue(mockUrl);

        const result = await startNgrokClient(localPort);

        expect(result).toBe(mockUrl);
        expect(ngrok.connect).toHaveBeenCalledWith(localPort);
        expect(ngrok.connect).toHaveBeenCalledTimes(1);
    });

    test('should handle error when failing to start ngrok', async () => {
        const localPort = 8080;
        const errorMessage = 'Failed to start ngrok';
        ngrok.connect.mockRejectedValue(new Error(errorMessage));

        await expect(startNgrokClient(localPort)).rejects.toThrow(errorMessage);
        expect(ngrok.connect).toHaveBeenCalledWith(localPort);
        expect(ngrok.connect).toHaveBeenCalledTimes(1);
    });

    test('should stop ngrok client successfully', async () => {
        ngrok.disconnect.mockResolvedValue();
        ngrok.kill.mockResolvedValue();

        await stopNgrokClient();

        expect(ngrok.disconnect).toHaveBeenCalledTimes(1);
        expect(ngrok.kill).toHaveBeenCalledTimes(1);
    });

    test('should handle error when failing to disconnect ngrok', async () => {
        const errorMessage = 'Failed to disconnect';
        ngrok.disconnect.mockRejectedValue(new Error(errorMessage));
        ngrok.kill.mockResolvedValue();

        await stopNgrokClient();

        expect(ngrok.disconnect).toHaveBeenCalledTimes(1);
    });

    test('should handle error when failing to kill ngrok', async () => {
        const errorMessage = 'Failed to kill';
        ngrok.disconnect.mockResolvedValue();
        ngrok.kill.mockRejectedValue(new Error(errorMessage));

        await stopNgrokClient();

        expect(ngrok.disconnect).toHaveBeenCalledTimes(1);
        expect(ngrok.kill).toHaveBeenCalledTimes(1);
    });
});