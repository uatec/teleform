const { spawn } = require('child_process');
const winston = require('winston');

// Set up winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.printf(({ message, service }) => {
        return `[${service} ] ${message}`;
    }),
    transports: [
        new winston.transports.Console()
    ]
});

const logOutput = (data) => {
    data.toString().split('\n').forEach(line => {
        if (line) {
            logger.info(line, { service: '🛠️' });
        }
    });
};

let invocationCount = 0;
let running = false;
async function applyTerraform(cwd, publicUrl, authToken) {
    if (running) {
        logger.info('Terraform apply already in progress. Skipping.', { service: '🛠️' });
        invocationCount++;
        return;
    }
    running = true;
    invocationCount = 0;
    try {
        await innerApplyTerraform(cwd, publicUrl, authToken);
    } finally {
        running = false;
    }
}


function innerApplyTerraform(cwd, publicUrl, authToken) {
    return new Promise((resolve, reject) => {
        if (cwd === undefined) return reject(new Error('cwd is required'));
        if (publicUrl === undefined) return reject(new Error('publicUrl is required'));
        if (authToken === undefined) return reject(new Error('authToken is required'));

        const terraform = spawn('terraform', ['apply', '-auto-approve'], {
            cwd,
            env: { ...process.env, TELEFORM: true, ENDPOINT_URL: publicUrl, AUTH_TOKEN: authToken },
            detached: true
        });

        terraform.stdout.on('data', logOutput);
        terraform.stderr.on('data', logOutput);

        terraform.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Terraform apply process exited with code ${code}`));
            }
            logger.info('Terraform apply completed successfully.', { service: '🛠️' });
            resolve();
        });

        terraform.on('error', (error) => {
            reject(error);
        });
    });
};

function detachTerraform(cwd) {
    return new Promise((resolve, reject) => {
        const terraform = spawn('terraform', ['apply', '-auto-approve'], {
            cwd
        });

        terraform.stdout.on('data', logOutput);
        terraform.stderr.on('data', logOutput);

        terraform.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Terraform dettach process exited with code ${code}`));
            }
            logger.info('Terraform dettach completed successfully.', { service: '🛠️' });
            resolve();
        });

        terraform.on('error', (error) => {
            reject(error);
        });
    });
};

module.exports = { applyTerraform, detachTerraform };