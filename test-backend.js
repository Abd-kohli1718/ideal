

async function testBackend() {
  console.log("--- Testing Backend Fixes ---");
  
  // 1. Test Auth Rate Limit (Max 10 per minute)
  console.log("\\n1. Testing Auth Rate Limit (max 10/min)...");
  let authSuccessCount = 0;
  let authLimitCaught = false;
  for (let i = 0; i < 12; i++) {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    if (res.status === 429) {
      authLimitCaught = true;
      break;
    } else {
      authSuccessCount++;
    }
  }
  console.log(`Auth Limit Test: ${authLimitCaught ? 'PASSED (Caught at request ' + (authSuccessCount + 1) + ')' : 'FAILED'}`);

  // 2. Test Body Size Limit (1MB)
  console.log("\\n2. Testing Body Size Limit (1MB)...");
  const largeBody = { email: 'test@example.com', password: 'password123', padding: 'a'.repeat(2 * 1024 * 1024) }; // 2MB
  const resLarge = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(largeBody)
  });
  console.log(`Body Size Limit Test: ${resLarge.status === 413 ? 'PASSED (413 Payload Too Large)' : 'FAILED (' + resLarge.status + ')'}`);

}

testBackend().catch(console.error);
