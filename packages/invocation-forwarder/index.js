const https = require('https');

exports.handler = async (event, context) => {
    const endpoint = process.env.ENDPOINT_URL;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-source-dir': process.env.SOURCE_DIR
        }
    };

    return new Promise((resolve, reject) => {
        const invocation = JSON.stringify({
            event: event,
            context: context,
            env: process.env
        });
        const req = https.request(endpoint, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });

        req.on('error', (e) => {
            reject({
                statusCode: 500,
                body: `Error: ${e.message}`
            });
        });

        req.write(invocation);
        req.end();
    });
};