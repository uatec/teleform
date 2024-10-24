const { startLocalServer, stopLocalServer } = require('./localServer');
const { startNgrokClient, stopNgrokClient } = require('./ngrokClient');
const { applyTerraform, detachTerraform } = require('./terraform');
const chokidar = require('chokidar');


class Core {


    isShuttingDown = false;
    cwd = `${process.cwd()}/../terraform`;


    async handleExit() {

        if (this.isShuttingDown) return;

        this.isShuttingDown = true;
        console.log('Exiting...');

        try {
            console.log('Detaching Terraform...');
            await detachTerraform(this.cwd);
            console.log('Terraform detached.');
            stopNgrokClient();
            console.log('ngrok stopped.');
            stopLocalServer();
            console.log('Local server stopped.');
            process.exit(0);
        } catch (error) {
            console.error(`Error during shutdown: ${error.message}`);
            console.error('Stack:', error.stack);
            stopNgrokClient();
            stopLocalServer();
            process.exit(1);
        }
    };

    async runDetach() {
        await detachTerraform(this.cwd);
    }

    // Debounce function
    lastInvocation = 0;
    debounceAsync(func, wait) {

        return (...args) => {
            return new Promise((resolve, reject) => {
                if (Date.now() - this.lastInvocation > wait) {
                    this.lastInvocation = Date.now();
                    resolve(func(...args));
                }
            });
        };
    }


    async runDev() {
        console.log('Starting services...');
        // Step 1: Run the local server
        const localPort = await startLocalServer();
        console.log(`Local server started on port ${localPort}`);

        // Step 2: Start ngrok client
        const publicUrl = await startNgrokClient(localPort);
        console.log(`ngrok tunnel started at: ${publicUrl}`);


        // Step 3: Apply Terraform
        console.log('Attaching teleform...');
        await applyTerraform(this.cwd, publicUrl);
        console.log('Terraform applied successfully.');
        // Step 4: Watch for changes in the terraform directory
        const watchCallback = async (event, path) => {
            console.log(`Detected change in ${path}, applying Terraform...`);
            console.log(JSON.stringify({ event, path }));
            try {
                await applyTerraform(this.cwd, publicUrl);
            } catch (error) {
            }
        };
        const watcher = chokidar.watch(this.cwd, {
            ignored: [
                /\.terraform/,              // Ignore .terraform directory
                /terraform\.tfstate$/,      // Ignore terraform.tfstate
                /terraform\.tfstate\.backup$/, // Ignore terraform.tfstate.backup
                /terraform\.tfstate\.lock\.info$/, // Ignore .tfstate lock files
                /.*\.tfplan$/,              // Ignore .tfplan files
                /terraform\.log$/,          // Ignore terraform.log files
                /.*\.tfvars$/,              // Ignore .tfvars files (typically used for variable configuration)
                /.*\.tfvars\.json$/,        // Ignore .tfvars.json files
                /crash\.log$/,              // Ignore crash.log files (generated on Terraform crash)
                /.*\.backup$/,              // Ignore any files ending in .backup (e.g., state file backups)
                /.*\.zip$/,                 // Ignore any zipped files (sometimes used for Terraform bundles)
                /\.terraform-version$/,     // Ignore .terraform-version file (used by Terraform version managers)
                /\.terraformrc$/,           // Ignore .terraformrc configuration files (personal configuration)
            ]
        });
        watcher.on('all', this.debounceAsync(watchCallback, 1000));
    }
}

module.exports = Core;