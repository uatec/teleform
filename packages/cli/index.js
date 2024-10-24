#!/usr/bin/env node

const { Command } = require('commander');
const { runDetach, runDev } = require('./core');
const program = new Command();

program
.command('detach')
.action(runDetach);


program
  .command('dev')
  .description('Run the development server and expose it via ngrok')
  .action(async() => {
    process.on('SIGINT', this.handleExit);
    try {
      await new Core().runDev()
    } catch (error) {
      console.error(`Error starting services: ${error.message}`);
      await this.handleExit();
    }
  });

program.parse(process.argv);