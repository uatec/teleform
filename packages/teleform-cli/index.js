#!/usr/bin/env node

const { Command } = require('commander');
const Core = require('./core');
const program = new Command();

program
.command('detach')
.action(() => new Core().runDetach());


program
  .command('dev')
  .description('Run the development server and expose it via ngrok')
  .action(async() => {
    const core = new Core();
    process.on('SIGINT', () => core.handleExit());
    try {
      await core.runDev()
    } catch (error) {
      console.error(`Error starting services: ${error.message}`);
      await core.handleExit();
    }
  });

program.parse(process.argv);