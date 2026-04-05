"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();

// ==========================================
// Realistic Australian Indigenous Data Seed
// ==========================================
// This seed file populates the database with realistic test data
// representing diverse Indigenous Australian communities and pathways.

const FIRST_NAMES = ['Jarrah', 'Mia', 'Kalani', 'Bindi', 'Tyson', 'Sharna', 'Ricky', 'Aaliyah', 'Kobe', 'Keisha'];
const LAST_NAMES = ['Williams', 'Johnson', 'Brown', 'Jones', 'Davis', 'Walker', 'Thomas', 'Miller', 'Wilson', 'Anderson'];
const MOB_NATIONS = ['Noongar', 'Wiradjuri', 'Yolngu', 'Kamilaroi', 'Murri', 'Koori', 'Palawa', 'Nunga', 'Bundjalung', 'Warlpiri'];
const CAREER_INTERESTS = ['Construction', 'Community Services', 'Healthcare', 'Mining', 'Hospitality', 'Retail', 'Administration', 'Education', 'Arts & Culture', 'Transport & Logistics'];
const LOCATIONS = ['Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA', 'Darwin, NT', 'Cairns, QLD', 'Alice Springs, NT', 'Broome, WA', 'Dubbo, NSW'];

async function main() {
    console.log('🌏 Seeding Ngurra Pathways database...');
    console.log('========================================\n');
    
    const pw = await bcryptjs_1.default.hash('password123', 10);
    // Create sample member user (idempotent)
    const member = await prisma.user.upsert({
        where: { email: 'member@example.com' },
        update: { password: pw },
        create: { email: 'member@example.com', password: pw, userType: 'MEMBER' },
    });
    const mprofile = await prisma.memberProfile.upsert({
        where: { userId: member.id },
        update: { phone: '0400123456', mobNation: 'Noongar', skillLevel: 'Intermediate', careerInterest: 'Carpentry' },
        create: { userId: member.id, phone: '0400123456', mobNation: 'Noongar', skillLevel: 'Intermediate', careerInterest: 'Carpentry', profileCompletionPercent: 75 },
    });
    // Create a sample uploaded resume URL for the member
    const resume = await prisma.uploadedFile.upsert({
        where: { key: `${member.id}_resume_example` },
        update: { filename: 'resume-sample.pdf', url: 'https://example.com/demo/resume.pdf', mimeType: 'application/pdf', size: 24000, category: 'RESUME' },
        create: { userId: member.id, filename: 'resume-sample.pdf', key: `${member.id}_resume_example`, url: 'https://example.com/demo/resume.pdf', mimeType: 'application/pdf', size: 24000, category: 'RESUME' },
    });
    console.log('Seed complete:', { member: member.email, profileId: mprofile.id });
    // Create sample company user
    const companyPw = pw; // reuse same hashed password
    const company = await prisma.user.upsert({
        where: { email: 'company@example.com' },
        update: { password: companyPw },
        create: { email: 'company@example.com', password: companyPw, userType: 'COMPANY' },
    });
    const cprofile = await prisma.companyProfile.upsert({
        where: { userId: company.id },
        update: { companyName: 'Ngurra Demo Co', abn: '123456789', industry: 'Construction', description: 'Demo company for seeding', website: 'https://example.com', phone: '07 5555 5555', hrEmail: 'hr@ngurra.example' },
        create: { userId: company.id, companyName: 'Ngurra Demo Co', abn: '123456789', industry: 'Construction', description: 'Demo company for seeding', website: 'https://example.com', phone: '07 5555 5555', hrEmail: 'hr@ngurra.example' },
    });
    console.log('Company seeded:', { company: company.email, companyProfileId: cprofile.id });

    // Create sample admin user (used by E2E tests)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: { password: pw },
        create: { email: 'admin@example.com', password: pw, userType: 'ADMIN' },
    });
    console.log('Admin seeded:', { admin: admin.email });
    // Create a sample job post for the company
    function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, ''); }
    const job = await prisma.job.upsert({
        where: { id: `seed-job-${company.id}` },
        update: { title: 'Construction Laborer', description: 'Entry level construction role on the Gold Coast site. Must be willing to learn.' },
        create: {
            id: `seed-job-${company.id}`,
            userId: company.id,
            title: 'Construction Laborer',
            description: 'Entry level construction role on the Gold Coast site. Must be willing to learn.',
            slug: slugify('Construction Laborer'),
            location: 'Gold Coast, QLD',
            employment: 'FULL_TIME',
            salaryLow: 60000,
            salaryHigh: 70000,
        },
    });
    console.log('Seeded job:', job.id, job.title);
    // Create a sample application from the member to the company's job
    const application = await prisma.jobApplication.upsert({
        where: { id: `seed-app-${member.id}-${job.id}` },
        update: { coverLetter: 'Looking forward to the role.' },
        create: { id: `seed-app-${member.id}-${job.id}`, jobId: job.id, userId: member.id, resumeId: resume.id, coverLetter: 'Looking forward to the role.' },
    });
    console.log('Seeded application:', application.id);
    // Add a sample message thread
    const msg = await prisma.applicationMessage.upsert({
        where: { id: `seed-msg-${member.id}-${application.id}` },
        update: { body: 'This is a seeded message from the member expressing interest.' },
        create: { id: `seed-msg-${member.id}-${application.id}`, applicationId: application.id, userId: member.id, body: 'This is a seeded message from the member expressing interest.' },
    });
    console.log('Seeded message:', msg.id);
    // Seed a Mentor user
    const mentorPw = pw;
    const mentor = await prisma.user.upsert({
        where: { email: 'mentor@example.com' },
        update: { password: mentorPw },
        create: { email: 'mentor@example.com', password: mentorPw, userType: 'MENTOR' }
    });
    await prisma.mentorProfile.upsert({
        where: { userId: mentor.id },
        update: { phone: '0400987654', expertise: 'Youth mentoring, Cultural mentoring', bio: 'Experienced mentor supporting pathways into work and training.' },
        create: { userId: mentor.id, phone: '0400987654', expertise: 'Youth mentoring, Cultural mentoring', bio: 'Experienced mentor supporting pathways into work and training.' }
    });
    console.log('Seeded mentor:', { email: mentor.email });
    // Seed a TAFE/Institution user
    const tafe = await prisma.user.upsert({
        where: { email: 'tafe@example.com' },
        update: { password: pw },
        create: { email: 'tafe@example.com', password: pw, userType: 'TAFE' },
    });
    await prisma.institutionProfile.upsert({
        where: { userId: tafe.id },
        update: { institutionName: 'Ngurra TAFE Campus', institutionType: 'TAFE', courses: 'Certificate III in Community Services; Short-course: Work readiness', phone: '07 6666 6666' },
        create: { userId: tafe.id, institutionName: 'Ngurra TAFE Campus', institutionType: 'TAFE', courses: 'Certificate III in Community Services; Short-course: Work readiness', phone: '07 6666 6666' }
    });
    console.log('Seeded tafe:', { email: tafe.email });
    // Create default email templates (idempotent)
    await prisma.emailTemplate.upsert({
        where: { key: 'application_submitted' },
        update: { subject: 'New application received', text: 'A new application arrived', html: '<p>A new application arrived</p>' },
        create: { key: 'application_submitted', subject: 'New application received', text: 'A new application arrived', html: '<p>A new application arrived</p>' },
    });
    await prisma.aiResource.upsert({
        where: { key: 'course-wellness-basic' },
        update: { title: 'Mental Wellbeing Basics', body: 'Short course introducing practical mental wellbeing techniques for community settings.', type: 'COURSE', tags: 'wellness,mental' },
        create: { key: 'course-wellness-basic', title: 'Mental Wellbeing Basics', body: 'Short course introducing practical mental wellbeing techniques for community settings.', type: 'COURSE', tags: 'wellness,mental' }
    });
    await prisma.aiResource.upsert({
        where: { key: 'course-fitness-1' },
        update: { title: 'Community Fitness — beginner', body: 'Low impact fitness course focused on community participation and gentle movement.', type: 'COURSE', tags: 'fitness' },
        create: { key: 'course-fitness-1', title: 'Community Fitness — beginner', body: 'Low impact fitness course focused on community participation and gentle movement.', type: 'COURSE', tags: 'fitness' }
    });
    await prisma.aiResource.upsert({
        where: { key: 'guide-suicide-resources' },
        update: { title: 'Safe Support: immediate resources', body: 'If you are in crisis, contact emergency services and your local community support lines. This guide lists local, culturally-safe support options.', type: 'GUIDE', tags: 'suicide,crisis,wellness' },
        create: { key: 'guide-suicide-resources', title: 'Safe Support: immediate resources', body: 'If you are in crisis, contact emergency services and your local community support lines. This guide lists local, culturally-safe support options.', type: 'GUIDE', tags: 'suicide,crisis,wellness' }
    });
    console.log('Seeded AiResource sample data');

    // Seed social feed posts so /feed has content in local dev
    try {
        console.log('Seeding social feed posts...');
        const seedPosts = [
            {
                id: 'seed-social-post-1',
                authorId: member.id,
                authorType: 'user',
                type: 'text',
                visibility: 'public',
                content: "From Country to career: sharing a small win today — I updated my resume and applied for my first role. If you're reading this, you can do it too.",
                mediaUrls: JSON.stringify(['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=800&fit=crop']),
                likeCount: 18,
                commentCount: 4,
                shareCount: 1,
                isActive: true,
                isSpam: false,
            },
            {
                id: 'seed-social-post-2',
                authorId: mentor.id,
                authorType: 'user',
                type: 'text',
                visibility: 'public',
                content: 'Mentor tip: write down 3 stories (challenge, action, result). Those become your interview answers. Keep it simple and true to you.',
                likeCount: 41,
                commentCount: 9,
                shareCount: 6,
                isActive: true,
                isSpam: false,
            },
            {
                id: 'seed-social-post-3',
                authorId: company.id,
                authorType: 'organization',
                orgId: cprofile.id,
                type: 'text',
                visibility: 'public',
                content: 'We are hiring for entry-level roles with on-the-job training. If you need help with an application, reach out — we can walk through it together.',
                likeCount: 27,
                commentCount: 7,
                shareCount: 3,
                isActive: true,
                isSpam: false,
            },
        ];

        for (const post of seedPosts) {
            await prisma.socialPost.upsert({
                where: { id: post.id },
                update: {
                    content: post.content,
                    mediaUrls: post.mediaUrls ?? null,
                    visibility: post.visibility,
                    likeCount: post.likeCount,
                    commentCount: post.commentCount,
                    shareCount: post.shareCount,
                    isActive: true,
                    isSpam: false,
                },
                create: post,
            });
        }
        console.log('Seeded social feed posts');
    } catch (e) {
        console.log('Skipping social feed posts (model not available):', e.message);
    }
    await prisma.emailTemplate.upsert({
        where: { key: 'application_received' },
        update: { subject: 'Application received', text: 'Your application was received', html: '<p>Your application was received</p>' },
        create: { key: 'application_received', subject: 'Application received', text: 'Your application was received', html: '<p>Your application was received</p>' },
    });
    await prisma.emailTemplate.upsert({
        where: { key: 'status_changed' },
        update: { subject: 'Application status change', text: 'Your application status changed', html: '<p>Your application status changed</p>' },
        create: { key: 'status_changed', subject: 'Application status change', text: 'Your application status changed', html: '<p>Your application status changed</p>' },
    });
    await prisma.emailTemplate.upsert({
        where: { key: 'interview_scheduled' },
        update: { subject: 'Interview scheduled', text: 'An interview has been scheduled', html: '<p>An interview has been scheduled</p>' },
        create: { key: 'interview_scheduled', subject: 'Interview scheduled', text: 'An interview has been scheduled', html: '<p>An interview has been scheduled</p>' },
    });
    
    // ===== NEW SEED DATA FOR EXTENDED FEATURES =====
    // These features may not exist in all schema versions (e.g., SQLite vs PostgreSQL)
    // Wrap each in try-catch to gracefully skip missing models
    
    // Seed Forum Categories
    try {
        console.log('Seeding forum categories...');
        const forumCategories = [
            { name: 'General Discussion', slug: 'general', description: 'Open discussions about work, training, and community', icon: '💬', color: 'blue', sortOrder: 1 },
            { name: 'Job Seeking Tips', slug: 'job-tips', description: 'Share and learn job hunting strategies', icon: '💼', color: 'green', sortOrder: 2 },
            { name: 'Training & Education', slug: 'training', description: 'Discuss courses, certifications, and learning paths', icon: '📚', color: 'amber', sortOrder: 3 },
            { name: 'Mentorship', slug: 'mentorship', description: 'Connect with mentors and share experiences', icon: '🤝', color: 'purple', sortOrder: 4 },
            { name: 'Success Stories', slug: 'success', description: 'Celebrate achievements and inspire others', icon: '🎉', color: 'pink', sortOrder: 5 },
            { name: 'Cultural Connections', slug: 'cultural', description: 'Share culture, stories, and community news', icon: '🌏', color: 'teal', sortOrder: 6 },
        ];
        
        for (const cat of forumCategories) {
            await prisma.forumCategory.upsert({
                where: { slug: cat.slug },
                update: { name: cat.name, description: cat.description, icon: cat.icon, color: cat.color, sortOrder: cat.sortOrder },
                create: cat,
            });
        }
        console.log('Seeded forum categories');
    } catch (e) {
        console.log('Skipping forum categories (model not available):', e.message);
    }
    
    // Seed Badge Definitions
    try {
        console.log('Seeding badge definitions...');
        const badges = [
            { id: 'badge-profile-complete', name: 'Profile Complete', description: 'Completed your full profile', imageUrl: '/badges/profile.svg', category: 'platform' },
            { id: 'badge-first-application', name: 'First Application', description: 'Submitted your first job application', imageUrl: '/badges/first-app.svg', category: 'milestone' },
            { id: 'badge-interview-ready', name: 'Interview Ready', description: 'Completed interview preparation module', imageUrl: '/badges/interview.svg', category: 'achievement' },
            { id: 'badge-community-helper', name: 'Community Helper', description: 'Helped 10+ community members in forums', imageUrl: '/badges/helper.svg', category: 'achievement' },
            { id: 'badge-white-card', name: 'White Card', description: 'Completed White Card certification', imageUrl: '/badges/whitecard.svg', category: 'verification' },
            { id: 'badge-first-aid', name: 'First Aid', description: 'Current First Aid certification', imageUrl: '/badges/firstaid.svg', category: 'verification' },
            { id: 'badge-mentor-champion', name: 'Mentor Champion', description: 'Completed 20+ mentoring sessions', imageUrl: '/badges/mentor.svg', category: 'achievement' },
        ];
        
        for (const badge of badges) {
            await prisma.badge.upsert({
                where: { id: badge.id },
                update: { name: badge.name, description: badge.description, imageUrl: badge.imageUrl, category: badge.category },
                create: badge,
            });
        }
        console.log('Seeded badge definitions');
    } catch (e) {
        console.log('Skipping badge definitions (model not available):', e.message);
    }
    
    // Seed Courses (TAFE/External Training)
    try {
        console.log('Seeding courses...');
        const courses = [
            { id: 'course-white-card', title: 'White Card (Construction Induction)', providerName: 'TAFE NSW', description: 'General Construction Induction training required for all construction workers.', category: 'Safety', duration: '1 day', priceInCents: 12000, isOnline: false, skills: 'OH&S,Construction Safety,White Card', url: 'https://tafe.nsw.edu.au/course-areas/building-and-construction/courses/general-construction-induction' },
            { id: 'course-first-aid', title: 'First Aid Certificate', providerName: 'St John Ambulance', description: 'HLTAID011 Provide First Aid certification.', category: 'Health & Safety', duration: '1-2 days', priceInCents: 15000, isOnline: false, skills: 'First Aid,CPR,Emergency Response', url: 'https://stjohn.org.au/first-aid-training' },
            { id: 'course-cert3-construction', title: 'Certificate III in Construction', providerName: 'TAFE NSW', description: 'CPC30220 - Foundation qualification for construction industry careers.', category: 'Trade', duration: '12 months', priceInCents: 250000, isOnline: false, skills: 'Carpentry,Construction,Trade Skills', url: 'https://tafe.nsw.edu.au' },
            { id: 'course-cert3-community', title: 'Certificate III in Community Services', providerName: 'TAFE QLD', description: 'CHC32015 - Entry-level qualification for community services sector.', category: 'Community Services', duration: '6 months', priceInCents: 180000, isOnline: true, skills: 'Community Support,Case Management,Communication', url: 'https://tafeqld.edu.au' },
            { id: 'course-forklift', title: 'Forklift License', providerName: 'Skill Set Training', description: 'High Risk Work License for forklift operation.', category: 'Trade', duration: '2 days', priceInCents: 45000, isOnline: false, skills: 'Forklift,Warehouse,Logistics', url: 'https://skillset.com.au' },
            { id: 'course-mental-health', title: 'Mental Health First Aid', providerName: 'Mental Health First Aid Australia', description: 'Learn to provide initial support to people experiencing mental health problems.', category: 'Health & Safety', duration: '2 days', priceInCents: 29500, isOnline: true, skills: 'Mental Health,First Aid,Community Support', url: 'https://mhfa.com.au' },
        ];
        
        for (const course of courses) {
            await prisma.course.upsert({
                where: { id: course.id },
                update: course,
                create: course,
            });
        }
        console.log('Seeded courses');
    } catch (e) {
        console.log('Skipping courses (model not available):', e.message);
    }
    
    // Seed Mentorship Circles
    try {
        console.log('Seeding mentorship circles...');
        const circles = [
            { id: 'circle-career-coaching', name: 'Career Coaching Circle', description: 'Weekly sessions on career planning, resume writing, and interview skills.', mentorId: mentor.id, topic: 'Career Development', maxMembers: 10 },
            { id: 'circle-tech-skills', name: 'Digital Skills Circle', description: 'Learn essential digital and computer skills for the modern workplace.', mentorId: mentor.id, topic: 'Technology', maxMembers: 8 },
            { id: 'circle-cultural', name: 'Cultural Leadership Circle', description: 'Develop cultural leadership skills and connect with community.', mentorId: mentor.id, topic: 'Cultural Leadership', maxMembers: 12 },
        ];
        
        for (const circle of circles) {
            await prisma.mentorshipCircle.upsert({
                where: { id: circle.id },
                update: circle,
                create: circle,
            });
        }
        console.log('Seeded mentorship circles');
    } catch (e) {
        console.log('Skipping mentorship circles (model not available):', e.message);
    }
    
    // Seed Impact Metrics
    try {
        console.log('Seeding impact metrics...');
        const metrics = [
            { id: 'metric-placements-2024q4', metric: 'PLACEMENTS', value: 127, period: 'QUARTERLY', recordedAt: new Date('2024-12-31') },
            { id: 'metric-retention-3m', metric: 'RETENTION_3M', value: 85, period: 'QUARTERLY', recordedAt: new Date('2024-12-31') },
            { id: 'metric-retention-6m', metric: 'RETENTION_6M', value: 78, period: 'QUARTERLY', recordedAt: new Date('2024-12-31') },
            { id: 'metric-training', metric: 'TRAINING_COMPLETIONS', value: 89, period: 'QUARTERLY', recordedAt: new Date('2024-12-31') },
        ];
        
        for (const m of metrics) {
            await prisma.impactMetric.upsert({
                where: { id: m.id },
                update: m,
                create: m,
            });
        }
        console.log('Seeded impact metrics');
    } catch (e) {
        console.log('Skipping impact metrics (model not available):', e.message);
    }
    
    // Seed Success Stories
    try {
        console.log('Seeding success stories...');
        const stories = [
            { id: 'story-1', memberId: mprofile.id, title: 'From Trainee to Team Leader', content: 'After completing the Certificate III program and getting matched with my mentor through Ngurra Pathways, I landed my first job in construction. Two years later, I am now a team leader!', isPublished: true, isFeatured: true },
            { id: 'story-2', memberId: mprofile.id, title: 'Finding My Path in Community Services', content: 'The mentorship program helped me discover my passion for helping others. I now work as a case worker supporting other First Nations families.', isPublished: true, isFeatured: false },
        ];
        
        for (const story of stories) {
            await prisma.successStory.upsert({
                where: { id: story.id },
                update: story,
                create: story,
            });
        }
        console.log('Seeded success stories');
    } catch (e) {
        console.log('Skipping success stories (model not available):', e.message);
    }
    
    // Seed Mentor Availability
    try {
        console.log('Seeding mentor availability...');
        const availability = [
            { id: 'avail-mon', mentorId: mentor.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
            { id: 'avail-wed', mentorId: mentor.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
            { id: 'avail-fri', mentorId: mentor.id, dayOfWeek: 5, startTime: '10:00', endTime: '14:00' },
        ];
        
        for (const avail of availability) {
            await prisma.mentorAvailability.upsert({
                where: { id: avail.id },
                update: avail,
                create: avail,
            });
        }
        console.log('Seeded mentor availability');
    } catch (e) {
        console.log('Skipping mentor availability (model not available):', e.message);
    }
    
    // Seed Sample Mentor Sessions
    try {
        console.log('Seeding mentor sessions...');
        const sessions = [
            { id: 'session-1', mentorId: mentor.id, menteeId: mprofile.id, scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), duration: 60, status: 'scheduled', notes: 'Initial career planning session' },
            { id: 'session-2', mentorId: mentor.id, menteeId: mprofile.id, scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), duration: 45, status: 'completed', feedback: 'Great session, very helpful advice on resume.', rating: 5 },
        ];
        
        for (const session of sessions) {
            await prisma.mentorSession.upsert({
                where: { id: session.id },
                update: session,
                create: session,
            });
        }
        console.log('Seeded mentor sessions');
    } catch (e) {
        console.log('Skipping mentor sessions (model not available):', e.message);
    }
    
    // Skip skills taxonomy (model doesn't exist)
    console.log('Skipping skills taxonomy (using skills field on courses instead)');
    
    // Skip partners (model doesn't exist)
    console.log('Skipping partners seeding (model not available)');
    
    console.log('===== Seed complete! =====');
}
main()
    .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('seed failed', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
