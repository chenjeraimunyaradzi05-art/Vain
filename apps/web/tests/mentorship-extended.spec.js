const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Enhanced Mentorship Features
 */
test.describe('Mentorship Features', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let memberToken = null;
    let mentorToken = null;
    
    test.beforeEach(async ({ request }) => {
        // Login as member
        const memberLogin = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'member@example.com', password: 'password123' } 
        });
        expect(memberLogin.ok()).toBeTruthy();
        const memberJson = await memberLogin.json();
        memberToken = memberJson.token;
        
        // Login as mentor
        const mentorLogin = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'mentor@example.com', password: 'password123' } 
        });
        expect(mentorLogin.ok()).toBeTruthy();
        const mentorJson = await mentorLogin.json();
        mentorToken = mentorJson.token;
    });
    
    test('member can browse available mentors', async ({ page }) => {
        await page.route(`${apiBase}/mentorship/available`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    mentors: [
                        { 
                            id: '1', 
                            name: 'Test Mentor', 
                            expertise: 'Career coaching, Resume writing',
                            bio: 'Experienced mentor with 10+ years helping job seekers',
                            availableSlots: 5
                        },
                        { 
                            id: '2', 
                            name: 'Cultural Mentor', 
                            expertise: 'Cultural guidance, Community connections',
                            bio: 'Elder providing cultural mentorship',
                            availableSlots: 3
                        },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [memberToken]);
        
        await page.goto(`${webBase}/mentorship/browse`);
        
        await page.waitForSelector('text=Test Mentor', { timeout: 10000 });
        // Use data-testid to find mentor expertise specifically, avoiding dropdown option collision
        await page.waitForSelector('[data-testid="mentor-expertise"]', { timeout: 5000 });
        await page.waitForSelector('text=Cultural Mentor', { timeout: 5000 });
    });
    
    test('mentor can view availability calendar', async ({ page }) => {
        await page.route(`${apiBase}/mentorship/availability`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    slots: [
                        { id: '1', startTime: '2025-01-20T09:00:00Z', endTime: '2025-01-20T10:00:00Z', isBooked: false },
                        { id: '2', startTime: '2025-01-20T10:00:00Z', endTime: '2025-01-20T11:00:00Z', isBooked: true },
                        { id: '3', startTime: '2025-01-21T14:00:00Z', endTime: '2025-01-21T15:00:00Z', isBooked: false },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [mentorToken]);
        
        await page.goto(`${webBase}/mentor/availability`);
        
        await page.waitForSelector('text=Availability', { timeout: 10000 });
    });
    
    test('member can view session history', async ({ page }) => {
        await page.route(`${apiBase}/mentorship/sessions`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    sessions: [
                        { 
                            id: '1', 
                            mentorName: 'Test Mentor',
                            date: '2025-01-15T10:00:00Z',
                            status: 'completed',
                            topic: 'Resume Review',
                            hasFeedback: true
                        },
                        { 
                            id: '2', 
                            mentorName: 'Test Mentor',
                            date: '2025-01-22T10:00:00Z',
                            status: 'scheduled',
                            topic: 'Interview Prep',
                            hasFeedback: false
                        },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [memberToken]);
        
        await page.goto(`${webBase}/mentorship/sessions`);
        
        await page.waitForSelector('text=Resume Review', { timeout: 10000 });
        await page.waitForSelector('text=Interview Prep', { timeout: 5000 });
    });
    
    test('member can submit session feedback', async ({ page }) => {
        let feedbackSubmitted = false;
        
        await page.route(`${apiBase}/mentorship/sessions/1`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    session: { 
                        id: '1', 
                        mentorName: 'Test Mentor',
                        date: '2025-01-15T10:00:00Z',
                        status: 'completed',
                        topic: 'Resume Review',
                    },
                }),
            });
        });
        
        await page.route(`${apiBase}/mentorship/sessions/1/feedback`, async (route) => {
            if (route.request().method() === 'POST') {
                feedbackSubmitted = true;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true }),
                });
            } else {
                await route.continue();
            }
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [memberToken]);
        
        await page.goto(`${webBase}/mentorship/sessions/1/feedback`);
        
        // Fill feedback form
        await page.waitForSelector('text=Feedback', { timeout: 10000 });
    });
    
    test('mentor can view earnings', async ({ page }) => {
        await page.route(`${apiBase}/mentorship/earnings`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalEarnings: 1250.00,
                    pendingPayout: 350.00,
                    completedSessions: 25,
                    earnings: [
                        { id: '1', amount: 50, sessionDate: '2025-01-15', status: 'paid' },
                        { id: '2', amount: 50, sessionDate: '2025-01-14', status: 'paid' },
                        { id: '3', amount: 50, sessionDate: '2025-01-13', status: 'pending' },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [mentorToken]);
        
        await page.goto(`${webBase}/mentor/earnings`);
        
        await page.waitForSelector('text=$1,250', { timeout: 10000 });
        await page.waitForSelector('text=Pending', { timeout: 5000 });
    });
});

/**
 * E2E Tests for Group Mentorship Circles
 */
test.describe('Mentorship Circles', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    
    test.beforeEach(async ({ request }) => {
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'member@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
    });
    
    test('displays available circles', async ({ page }) => {
        await page.route(`${apiBase}/mentorship/circles`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    circles: [
                        { 
                            id: '1', 
                            name: 'Career Transition Support',
                            description: 'Weekly group sessions for those changing careers',
                            mentorName: 'Test Mentor',
                            memberCount: 8,
                            maxMembers: 12,
                            nextSession: '2025-01-22T10:00:00Z'
                        },
                        { 
                            id: '2', 
                            name: 'Youth Employment Circle',
                            description: 'Supporting young people entering the workforce',
                            mentorName: 'Cultural Mentor',
                            memberCount: 15,
                            maxMembers: 20,
                            nextSession: '2025-01-23T14:00:00Z'
                        },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/mentorship/circles`);
        
        await page.waitForSelector('text=Career Transition Support', { timeout: 10000 });
        await page.waitForSelector('text=Youth Employment Circle', { timeout: 5000 });
        await page.waitForSelector('text=8/12 members', { timeout: 5000 });
    });
    
    test('can join a circle', async ({ page }) => {
        let joinCalled = false;
        
        await page.route(`${apiBase}/mentorship/circles`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    circles: [
                        { id: '1', name: 'Test Circle', memberCount: 5, maxMembers: 10, isMember: false },
                    ],
                }),
            });
        });
        
        await page.route(`${apiBase}/mentorship/circles/1/join`, async (route) => {
            if (route.request().method() === 'POST') {
                joinCalled = true;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, message: 'Joined circle' }),
                });
            }
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/mentorship/circles`);
        
        await page.waitForSelector('text=Test Circle', { timeout: 10000 });
    });
});

/**
 * E2E Tests for Course Enrolment
 */
test.describe('Course Enrolment', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    
    test.beforeEach(async ({ request }) => {
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'member@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
    });
    
    test('displays external courses', async ({ page }) => {
        await page.route(`${apiBase}/courses/external/search*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    courses: [
                        { 
                            id: '1', 
                            name: 'Certificate III in Construction',
                            provider: 'TAFE NSW',
                            qualification: 'Certificate III',
                            durationWeeks: 52,
                            price: 2500
                        },
                        { 
                            id: '2', 
                            name: 'White Card',
                            provider: 'TAFE NSW',
                            qualification: 'Statement of Attainment',
                            durationWeeks: 1,
                            price: 120
                        },
                    ],
                    total: 2,
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/courses`);
        
        await page.waitForSelector('text=Certificate III in Construction', { timeout: 10000 });
        await page.waitForSelector('text=White Card', { timeout: 5000 });
        await page.waitForSelector('text=$2,500', { timeout: 5000 });
    });
    
    test('shows course recommendations for job', async ({ page }) => {
        // Mock the job endpoint first (page fetches job before courses)
        await page.route(`${apiBase}/jobs/test-job`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    job: { 
                        id: 'test-job', 
                        title: 'Construction Worker',
                        company: 'BuildCo',
                        requirements: ['White Card required', 'Construction Safety']
                    }
                }),
            });
        });
        
        await page.route(`${apiBase}/courses/recommendations/job/*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    courses: [
                        { 
                            id: '1', 
                            title: 'White Card',
                            name: 'White Card',
                            provider: 'TAFE NSW',
                            relevanceScore: 95,
                            relevance: 95,
                            matchedSkills: ['Construction Safety'],
                            price: 120
                        },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/jobs/test-job/recommended-courses`);
        
        await page.waitForSelector('text=White Card', { timeout: 10000 });
        await page.waitForSelector('text=95%', { timeout: 5000 });
    });
    
    test('displays user enrolments', async ({ page }) => {
        await page.route(`${apiBase}/course-payments/my-enrolments`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    enrolments: [
                        { 
                            id: '1', 
                            courseId: 'c1',
                            status: 'completed',
                            paidAt: '2025-01-10T00:00:00Z',
                            course: {
                                name: 'White Card',
                                provider: 'TAFE NSW',
                            }
                        },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/member/courses`);
        
        await page.waitForSelector('text=White Card', { timeout: 10000 });
        await page.waitForSelector('text=TAFE NSW', { timeout: 5000 });
    });
});
