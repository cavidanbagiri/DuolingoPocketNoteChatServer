// test-db.js
const db = require('./models');

async function testConnection() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync models (don't use force: true in production!)
    // await db.sequelize.sync({ alter: true });
    // console.log('All models were synchronized successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

testConnection();