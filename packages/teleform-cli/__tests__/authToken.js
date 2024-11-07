const { generateAuthToken } = require('../authToken');

describe('generateAuthToken', () => {
    test('should be a cryptographically generate number', () => {
        const result = generateAuthToken();
        expect(typeof result).toBe('string');
        expect(result).toHaveLength(64); // 32 bytes in hex format is 64 characters
    });
});