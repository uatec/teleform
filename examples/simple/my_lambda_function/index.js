const os = require('os');

exports.handler = async (event) => {
    const hostname = os.hostname();
    const networkInterfaces = os.networkInterfaces();

    const response = {
        statusCode: 200,
        body: `Hello, host ${hostname}`,
    };
    return response;
};