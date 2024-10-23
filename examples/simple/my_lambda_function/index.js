const os = require('os');

exports.handler = async (event) => {
    const hostname = os.hostname();

    const response = {
        statusCode: 200,
        body: `Hello, host ${hostname}. 2 Body: ${JSON.stringify(event.body)}`,
    };
    return response;
};