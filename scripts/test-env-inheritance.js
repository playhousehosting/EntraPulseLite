// Test environment variable inheritance with child_process.spawn
const { spawn } = require('child_process');

console.log('🧪 Testing Environment Variable Inheritance');
console.log('=' + '='.repeat(50));

// Set test environment variables
const testEnv = {
  ...process.env,
  TEST_VAR_1: 'value1',
  USE_CLIENT_TOKEN: 'true',
  DEBUG_TEST: 'environment-inheritance-test'
};

console.log('\n🔧 Parent process environment:');
console.log('USE_CLIENT_TOKEN:', process.env.USE_CLIENT_TOKEN);
console.log('TEST_VAR_1:', process.env.TEST_VAR_1);

console.log('\n🔧 Environment being passed to child:');
console.log('USE_CLIENT_TOKEN:', testEnv.USE_CLIENT_TOKEN);
console.log('TEST_VAR_1:', testEnv.TEST_VAR_1);
console.log('DEBUG_TEST:', testEnv.DEBUG_TEST);

console.log('\n📤 Starting child process with custom environment...');

// Start a simple node process that prints environment variables
const child = spawn('node', ['-e', `
  console.log('Child process environment:');
  console.log('USE_CLIENT_TOKEN:', process.env.USE_CLIENT_TOKEN);
  console.log('TEST_VAR_1:', process.env.TEST_VAR_1);
  console.log('DEBUG_TEST:', process.env.DEBUG_TEST);
  console.log('Total env vars:', Object.keys(process.env).length);
`], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: testEnv
});

child.stdout.on('data', (data) => {
  console.log('📨 Child stdout:', data.toString().trim());
});

child.stderr.on('data', (data) => {
  console.log('🔍 Child stderr:', data.toString().trim());
});

child.on('exit', (code) => {
  console.log(`\n✅ Child process exited with code ${code}`);
  
  if (code === 0) {
    console.log('✅ Environment variable inheritance test PASSED');
  } else {
    console.log('❌ Environment variable inheritance test FAILED');
  }
});

child.on('error', (error) => {
  console.log('❌ Child process error:', error.message);
});
