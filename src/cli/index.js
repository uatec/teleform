#!/usr/bin/env node

const { Command } = require('commander');
const { startLocalServer, stopLocalServer } = require('./localServer');
const { startNgrokClient, stopNgrokClient } = require('./ngrokClient');
const { applyTerraform, detachTerraform } = require('./terraform');
const chokidar = require('chokidar');

const program = new Command();

let isShuttingDown = false;
const cwd = `${process.cwd()}/../terraform`;

const handleExit = async () => {

    if (isShuttingDown) return;

    console.log(process.listeners('SIGINT').length);
    isShuttingDown = true;
    console.log('Exiting...');

    try {
        await detachTerraform(cwd);
        stopNgrokClient();
        stopLocalServer();
        process.exit(0);
    } catch (error) {
        console.error(`Error during shutdown: ${error.message}`);
        process.exit(1);
    }
};

program
.command('detach')
.action(async () => {
    await detachTerraform(cwd);
});

// Debounce function
let lastInvocation = 0;
function debounceAsync(func, wait) {

    return (...args) => {
        return new Promise((resolve, reject) => {
            if (Date.now() - lastInvocation > wait) {
                lastInvocation = Date.now();
                resolve(func(...args));
            }
        });
    };
}


program
  .command('dev')
  .description('Run the development server and expose it via ngrok')
  .action(async () => {
    try {
        process.on('SIGINT', handleExit);
        console.log('Starting services...');
        // Step 1: Run the local server
        const localPort = await startLocalServer();
        console.log(`Local server started on port ${localPort}`);

        // Step 2: Start ngrok client
        const publicUrl = await startNgrokClient(localPort);
        console.log(`ngrok tunnel started at: ${publicUrl}`);

        
        // Step 3: Apply Terraform
        console.log('Attaching teleform...');
        await applyTerraform(cwd, publicUrl);
        console.log('Terraform applied successfully.');
        // Step 4: Watch for changes in the terraform directory
        const watcher = async (event, path) => {
            console.log(`Detected change in ${path}, applying Terraform...`);
            applyTerraform(cwd, publicUrl);
            console.log('Terraform applied successfully.');
        };
        chokidar.watch(cwd, {
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
        }).on('all', debounceAsync(watcher, 1000));
    } catch (error) {
        console.error(`Error starting services: ${error.message}`);
    }
  });

program.parse(process.argv);