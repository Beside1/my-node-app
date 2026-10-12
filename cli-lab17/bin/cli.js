#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

process.on('uncaughtException', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  } else {
    console.error('✖ Ошибка:', err.message);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('✖ Необработанная ошибка:', reason);
  process.exit(1);
});

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17 (архитектура)')
  .version('1.0.0');


require('../commands/init')(program);
require('../commands/build')(program);
require('../commands/test')(program);
require('../commands/deploy')(program);

program.parse(process.argv);
