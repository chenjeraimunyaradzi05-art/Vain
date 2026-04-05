"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
    if (!user) {
        console.error('No seeded member user found. Run `npm run seed` first.');
        process.exit(2);
    }
    const files = await prisma.uploadedFile.findMany({ where: { userId: user.id } });
    if (!files || files.length === 0) {
        console.error('No uploadedFile rows found for seeded member.');
        process.exit(3);
    }
    console.log('Seed verification succeeded. Member:', user.email, 'files:', files.length);
    files.forEach((f) => console.log('-', f.filename, f.key, f.url));
    // verify company user too
    const company = await prisma.user.findUnique({ where: { email: 'company@example.com' } });
    if (!company) {
        console.error('No seeded company user found.');
        process.exit(4);
    }
    const companyProfile = await prisma.companyProfile.findUnique({ where: { userId: company.id } });
    if (!companyProfile) {
        console.error('No company profile found for seeded company user.');
        process.exit(5);
    }
    console.log('Company seeded ok:', company.email, 'companyName:', companyProfile.companyName);
    // verify jobs exist for company
    const jobs = await prisma.job.findMany({ where: { userId: company.id } });
    if (!jobs || jobs.length === 0) {
        console.error('No jobs found for seeded company');
        process.exit(6);
    }
    console.log('Jobs for company:', jobs.length, jobs.map(j => ({ id: j.id, title: j.title })));
    // verify that a member applied
    const applications = await prisma.jobApplication.findMany({ where: { jobId: jobs[0].id } });
    if (!applications || applications.length === 0) {
        console.error('No applications found for seeded job');
        process.exit(7);
    }
    console.log('Applications for job:', applications.length, applications.map(a => ({ id: a.id, userId: a.userId })));
    // verify mentor was seeded
    const mentor = await prisma.user.findUnique({ where: { email: 'mentor@example.com' } });
    if (!mentor) {
        console.error('No seeded mentor user found.');
        process.exit(8);
    }
    const mProf = await prisma.mentorProfile.findUnique({ where: { userId: mentor.id } });
    if (!mProf) {
        console.error('No mentor profile for seeded mentor');
        process.exit(9);
    }
    console.log('Mentor seeded ok:', mentor.email, 'expertise:', mProf.expertise);
    // verify tafe/institution seeded
    const tafe = await prisma.user.findUnique({ where: { email: 'tafe@example.com' } });
    if (!tafe) {
        console.error('No seeded tafe user found.');
        process.exit(10);
    }
    const inst = await prisma.institutionProfile.findUnique({ where: { userId: tafe.id } });
    if (!inst) {
        console.error('No institution profile for seeded tafe');
        process.exit(11);
    }
    console.log('TAFE seeded ok:', tafe.email, 'institution:', inst.institutionName);
    // verify AiResource entries
    const res1 = await prisma.aiResource.findUnique({ where: { key: 'course-wellness-basic' } });
    if (!res1) {
        console.error('No aiResource course-wellness-basic');
        process.exit(12);
    }
    console.log('AiResource seeded ok:', res1.title);
}
main()
    .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('verify failed', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
