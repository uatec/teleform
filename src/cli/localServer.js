const { spawn } = require('child_process');

let server;

const startLocalServer = () => {
    return new Promise((resolve, reject) => {
        server = spawn('node', [`${__dirname}/../local-server/index.js`], { stdio: ['pipe', 'pipe', 'pipe'] });

        if (!server) {
            console.error('Failed to start the server.');
            return reject(new Error('Failed to start the server.'));
        }

        // Step 2: Retrieve the port the server is listening on
        server.stdout.on('data', (data) => {
            console.log('Server output:', data.toString());
            const output = data.toString();
            const match = output.match(/listening on port (\d+)/);
            if (match) {
                const port = match[1];
                console.log(`Server is listening on port ${port}`);
                resolve(port);
            }
        });

        server.on('error', (error) => {
            console.error(`Server error: ${error.message}`);
            reject(error);
        });

        server.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Server exited with code ${code}`));
            }
        });
    });
};

const stopLocalServer = () => {
    if (server) {
        server.kill();
    }
};

module.exports = { startLocalServer, stopLocalServer };