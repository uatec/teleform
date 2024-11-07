const crypto = require('crypto');

function generateAuthToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateAuthToken };