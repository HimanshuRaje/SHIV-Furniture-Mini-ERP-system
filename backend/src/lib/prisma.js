const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 15000,  // wait up to 15s for a connection
    timeout:  30000, // allow up to 30s for a transaction
  },
});

module.exports = prisma;
