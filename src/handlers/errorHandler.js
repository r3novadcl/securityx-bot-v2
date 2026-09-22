const logger = require('../utils/logger');

module.exports = (client) => {
  process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection/Catch');
    console.log(reason, p);
  });

  process.on('uncaughtException', (err, origin) => {
    logger.error('Uncaught Exception/Catch');
    console.log(err, origin);
  });

  process.on('uncaughtExceptionMonitor', (err, origin) => {
    logger.error('Uncaught Exception/Catch (MONITOR)');
    console.log(err, origin);
  });

  client.on('error', (err) => {
    logger.error('Discord Client Error');
    console.log(err);
  });
};
