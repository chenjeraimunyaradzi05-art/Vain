
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    const userCount = await prisma.user.count();
    console.log(`Users: ${userCount}`);
    
    const jobCount = await prisma.job.count();
    console.log(`Jobs: ${jobCount}`);
    
    const companyCount = await prisma.companyProfile.count();
    console.log(`Companies: ${companyCount}`);

    if (jobCount > 0) {
        const job = await prisma.job.findFirst({
            include: { user: { include: { companyProfile: true } } }
        });
        console.log('Sample Job (DB):', JSON.stringify(job, null, 2));
    }

    console.log('\nChecking API...');
    try {
        const response = await fetch('http://localhost:3001/jobs');
        if (response.ok) {
            const data = await response.json();
            console.log(`API /jobs status: ${response.status}`);
            console.log(`API /jobs count: ${data.data ? data.data.length : 'N/A'}`);
            if (data.data && data.data.length > 0) {
                 console.log('Sample Job (API):', JSON.stringify(data.data[0], null, 2));
            }
        } else {
            console.log(`API /jobs failed with status: ${response.status}`);
        }
    } catch (err) {
        console.error('API fetch failed:', err.message);
    }

  } catch (e) {
    console.error('Error connecting to database:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
