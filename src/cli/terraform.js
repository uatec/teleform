const { spawn } = require('child_process');

const applyTerraform = (cwd, publicUrl) => {
    return new Promise((resolve, reject) => {
        const terraform = spawn('terraform', ['apply', '-auto-approve'], {
            cwd,
            stdio: 'inherit',
            env: { ...process.env, TELEFORM: true, ENDPOINT_URL: publicUrl }
        });

        terraform.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Terraform apply process exited with code ${code}`));
            }
            resolve();
        });

        terraform.on('error', (error) => {
            reject(error);
        });
    });
};

const detachTerraform = (cwd) => {
    return new Promise((resolve, reject) => {
        console.log('Detaching Terraform...');
        const terraform = spawn('terraform', ['apply', '-auto-approve'], {
            cwd,
            stdio: 'inherit'
        });

        terraform.on('close', (code) => {
            console.log('Terraform detach process exited with code', code);
            if (code !== 0) {
                return reject(new Error(`Terraform destroy process exited with code ${code}`));
            }
            resolve();
        });

        terraform.on('error', (error) => {
            reject(error);
        });
    });
};

module.exports = { applyTerraform, detachTerraform };