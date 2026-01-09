// test-models.js
const db = require('./models');

async function testAllModels() {
  try {
    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Test each model
    console.log('\n📊 Available models:');
    Object.keys(db).forEach(modelName => {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        console.log(`  - ${modelName}`);
      }
    });
    
    // Test a simple query on each model
    console.log('\n🧪 Testing model queries:');
    
    // Test User model
    try {
      const users = await db.User.findAll({ limit: 1 });
      console.log(`✅ User model: Found ${users.length} users`);
    } catch (error) {
      console.log(`❌ User model error: ${error.message}`);
    }
    
    // Test if tables exist
    console.log('\n🔍 Checking table existence:');
    const tables = ['users', 'user_profiles', 'conversations', 'messages'];
    
    for (const table of tables) {
      try {
        const result = await db.sequelize.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`);
        const exists = result[0][0].exists;
        console.log(`  ${table}: ${exists ? '✅' : '❌'} ${exists ? 'Exists' : 'Missing'}`);
      } catch (error) {
        console.log(`  ${table}: ❌ Error - ${error.message}`);
      }
    }
    
    console.log('\n🎉 All tests completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAllModels();