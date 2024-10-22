#!/usr/bin/env node

const { Command } = require('commander');
const { spawn } = require('child_process');
const chokidar = require('chokidar');
const ngrok = require('ngrok');

const program = new Command();


const detachTerraform = async () => {
    console.log('Detaching Terraform');
    try {
      const cwd = `${process.cwd()}/../terraform`;
      await runTerraformApply('', cwd, false);
      console.log('Terraform detached');
    } catch (error) {
      console.error(`Error detaching Terraform: ${error.message}`);
    }
  };

program
.command('detach')
.action(async () => {
    await detachTerraform();
});

program
  .command('dev')
  .description('Run the development server and expose it via ngrok')
  .action(async () => {
    let isShuttingDown = false;
    let forceExit = false;

   

    const handleExit = async () => {
      if (isShuttingDown) {
        console.log('Force exiting...');
        process.exit(1);
      }

      isShuttingDown = true;
      console.log('Exiting...');
      
      try {
        await detachTerraform();
        process.exit(0);
      } catch (error) {
        console.error(`Error detaching Terraform: ${error.message}`);
        process.exit(1);
      }
    };


    try {
      // Step 1: Run the local server
      const server = spawn('node', [`${__dirname}/../local-server/index.js`], { stdio: ['pipe', 'pipe', 'pipe'] });

      if (!server) {
        console.error('Failed to start the server.');
      }

      // Step 2: Retrieve the port the server is listening on
      let port;
      server.stdout.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/listening on port (\d+)/);
        if (match) {
          port = match[1];
          console.log(`Server is listening on port ${port}`);

          // Step 3: Use ngrok to expose the port publicly
          (async function() {
            try {
              const url = await ngrok.connect(port);
              console.log(`ngrok URL: ${url}`);

              // Step 4: Run terraform apply with the ngrok URL
              const cwd = `${process.cwd()}/../terraform`;
              console.log(`Running terraform apply in ${cwd}`);
              try {
                await runTerraformApply(url, cwd, true);
              } catch (error) {
                console.error(`Error: ${error.message}`);
              }

              // Step 5: Watch for changes in the terraform directory
              chokidar.watch('examples/simple/terraform').on('all', (event, path) => {
                if ( path.contains('terraform.tfstate') || path.contains('terraform.tfstate.backup') || path.contains('.terraform') || path.contains('zip') ) {
                    return;
                }
                console.log(`File ${path} has changed, reapplying terraform...`);
                const terraform = spawn('terraform', ['apply', '--auto-approve'], { stdio: 'inherit', cwd: 'examples/simple/terraform' });

                terraform.on('close', (code) => {
                  if (code === 0) {
                    console.log('Terraform reapplied successfully');
                  } else {
                    console.error(`Terraform reapply failed with code ${code}`);
                  }
                });
              });
            } catch (ngrokError) {
              console.error(`ngrok error: ${ngrokError.message}`);
            }
          })();
        }
      });

      server.stderr.on('data', (data) => {
        console.error(`Server error: ${data.toString()}`);
      });

      server.on('close', (code) => {
        if (code > 0) {
          console.error(`Local server exited with code ${code}`);
        }
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  });

program.parse(process.argv);

async function runTerraformApply(url, cwd, attach) {
  return new Promise((resolve, reject) => {
    const terraform = spawn('terraform', 
        ['apply', '--auto-approve'], 
        { 
            stdio: 'inherit', 
            cwd: cwd,
            env: {
                ...process.env,
                // TF_LOG: 'TRACE',
                TELEFORM: attach,
                ENDPOINT_URL: url
            }
        });

    terraform.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Terraform apply failed with code ${code}`));
      }
    });
  });
}