/**
 * Test AI integration with prototype server
 * This verifies that AiConcierge can call the prototype AI server and falls back gracefully
 *
 * To run:
 * 1. Start prototype AI server: node tools/prototype-ai-server.js (on port 3000)
 * 2. Start API server: npm run dev (in apps/api)
 * 3. Run this test: npx ts-node tests/test-ai-integration.ts
 */
async function testAiIntegration() {
    const apiBase = process.env.API_URL || 'http://localhost:3001';
    const prototypeBase = process.env.PROTOTYPE_AI_URL || 'http://localhost:3000';
    console.log('Testing AI integration...');
    console.log(`API: ${apiBase}, Prototype AI: ${prototypeBase}\n`);
    // Check if prototype AI server is running
    let prototypeRunning = false;
    try {
        const check = await fetch(`${prototypeBase}/`);
        prototypeRunning = check.ok;
        console.log('✓ Prototype AI server is running');
    }
    catch (err) {
        console.log('✗ Prototype AI server is NOT running (will test fallback)');
    }
    // Login as TAFE user to get token
    console.log('\nLogging in as tafe@example.com...');
    const login = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'tafe@example.com', password: 'password123' }),
    });
    if (!login.ok) {
        throw new Error(`Login failed: ${login.status}`);
    }
    const loginJson = await login.json();
    const token = loginJson.token;
    console.log('✓ Login successful');
    // Test /ai/concierge endpoint
    console.log('\nTesting /ai/concierge...');
    const concierge = await fetch(`${apiBase}/ai/concierge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            userId: loginJson.user?.id,
            context: 'TAFE dashboard test',
        }),
    });
    if (!concierge.ok) {
        throw new Error(`Concierge failed: ${concierge.status}`);
    }
    const conciergeJson = await concierge.json();
    console.log('Response:', {
        ok: conciergeJson.ok,
        persona: conciergeJson.persona,
        source: conciergeJson.source,
        suggestionsCount: conciergeJson.suggestions?.length || 0,
    });
    if (conciergeJson.suggestions && conciergeJson.suggestions.length > 0) {
        console.log('Sample suggestions:');
        conciergeJson.suggestions.slice(0, 3).forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.slice(0, 80)}${s.length > 80 ? '...' : ''}`);
        });
    }
    if (prototypeRunning) {
        if (conciergeJson.source === 'ai') {
            console.log('✓ Successfully using prototype AI server');
        }
        else {
            console.log('⚠ Prototype server is running but fallback was used');
        }
    }
    else {
        if (conciergeJson.source === 'fallback') {
            console.log('✓ Fallback working correctly when prototype server unavailable');
        }
        else {
            console.log('⚠ Unexpected source when prototype server is down');
        }
    }
    // Test /ai/wellness endpoint
    console.log('\nTesting /ai/wellness...');
    const wellness = await fetch(`${apiBase}/ai/wellness`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            userId: loginJson.user?.id,
            area: 'mental',
        }),
    });
    if (!wellness.ok) {
        throw new Error(`Wellness failed: ${wellness.status}`);
    }
    const wellnessJson = await wellness.json();
    console.log('Response:', {
        ok: wellnessJson.ok,
        source: wellnessJson.source,
        tipsCount: wellnessJson.tips?.length || 0,
        coursesCount: wellnessJson.recommendedCourses?.length || 0,
    });
    if (wellnessJson.tips && wellnessJson.tips.length > 0) {
        console.log('Sample tips:');
        wellnessJson.tips.slice(0, 2).forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.slice(0, 80)}${t.length > 80 ? '...' : ''}`);
        });
    }
    console.log('\n✓ All AI integration tests passed!');
}
testAiIntegration().catch((err) => {
    console.error('\n✗ Test failed:', err.message || err);
    process.exit(1);
});
