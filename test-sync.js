// Test script to verify sync service API endpoints
const fetch = require('node-fetch');

async function testApiEndpoint(endpoint, name) {
  try {
    console.log(`\n🧪 Testing ${name} endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`Error response: ${text.substring(0, 200)}`);
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log(`Non-JSON response: ${text.substring(0, 200)}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`Response structure:`, {
      hasSuccess: 'success' in data,
      hasData: 'data' in data,
      successValue: data.success,
      dataLength: data.data ? data.data.length : 'N/A'
    });
    
    if (data.success && data.data) {
      console.log(`✅ ${name} endpoint working correctly`);
      return true;
    } else {
      console.log(`❌ ${name} endpoint has invalid structure`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${name} endpoint failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting API endpoint tests...\n');
  
  const tests = [
    { endpoint: 'http://localhost:3000/api/players', name: 'Players' },
    { endpoint: 'http://localhost:3000/api/standings', name: 'Standings' },
    { endpoint: 'http://localhost:3000/api/teams', name: 'Teams' },
    { endpoint: 'http://localhost:3000/api/matches', name: 'Matches' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testApiEndpoint(test.endpoint, test.name);
    results.push({ name: test.name, success: result });
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All API endpoints are working correctly!');
  } else {
    console.log('⚠️ Some API endpoints need attention.');
  }
}

// Run the tests
runTests().catch(console.error);
