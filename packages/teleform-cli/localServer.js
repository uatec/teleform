const { spawn } = require('child_process');
const winston = require('winston');

// Set up winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.printf(({ service, message }) => {
        return `[${service} ] ${message}`;
    }),
    transports: [
        new winston.transports.Console()
    ]
});

const service = '💻';

const logOutput = (data) => {
    data.toString().split('\n').forEach(line => {
        if (line) {
            logger.info(line, { service});
        }
    });
};

let server;

const startLocalServer = () => {
    return new Promise((resolve, reject) => {
        server = spawn('node', [`${__dirname}/../local-server/index.js`], { stdio: ['pipe', 'pipe', 'pipe'], detached: true });

        if (!server) {
            logger.error('Failed to start the server.', { service });
            return reject(new Error('Failed to start the server.'));
        }

        // Step 2: Retrieve the port the server is listening on
        server.stdout.on('data', (data) => {
            logOutput(data);
            const output = data.toString();
            const match = output.match(/listening on port (\d+)/);
            if (match) {
                const port = match[1];
                logger.info(`Server is listening on port ${port}`, { service });
                resolve(port);
            }
        });

        server.stderr.on('data', logOutput);

        server.on('error', (error) => {
            logger.error(`Server error: ${error.message}`, { service: '💻' });
            reject(error);
        });

        server.on('exit', (code, signal) => {
            if (code !== null) {
                logger.error(`Server exited with code ${code}`, { service: 'locl-server' });
            } else if (signal !== null) {
                logger.error(`Server was killed with signal ${signal}`, { service });
            } else {
                logger.error('Server exited for unknown reasons', { service });
            }
            reject(new Error(`Server exited with code ${code} or signal ${signal}`));
        });
    });
};

const stopLocalServer = () => {
    if (server) {
        server.kill();
    }
};

module.exports = { startLocalServer, stopLocalServer };