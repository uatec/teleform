const https = require('https');

exports.handler = async (event, context) => {
    const functionName = process.env.SOURCE_DIR;
    const endpoint = process.env.ENDPOINT_URL;
    const authHeader = process.env.AUTH_HEADER;

    const options = {
        method: 'POST',
        headers: {
            // 'Authorization': authHeader,
            'Content-Type': 'application/json',
            'X-source-dir': process.env.SOURCE_DIR
        }
    };

    return new Promise((resolve, reject) => {
        const url = `${endpoint}/${functionName}`;
        console.log(`Forwarding request to ${url}`);
        const req = https.request(url, options, (res) => {
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

        req.write(JSON.stringify(event));
        req.end();
    });
};