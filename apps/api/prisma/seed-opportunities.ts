/**
 * Seed script for Opportunities (Jobs)
 * 
 * This script creates sample job listings for testing and development
 */

import { PrismaClient, JobType, JobStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedOpportunities() {
  console.log('🌱 Seeding opportunities...');

  try {
    // Create sample employers
    const employers = [
      {
        email: 'techcorp@example.com',
        password: await bcrypt.hash('Password123!', 10),
        userType: 'COMPANY',
        firstName: 'TechCorp',
        lastName: 'Australia',
        companyProfile: {
          create: {
            companyName: 'TechCorp Australia',
            industry: 'Technology',
            description: 'Leading technology company specializing in software development',
            website: 'https://techcorp.example.com',
            location: 'Sydney, NSW',
            size: '201-1000',
            rapStatus: 'ELEVATE',
            indigenousOwned: false,
            logo: 'https://example.com/techcorp-logo.png'
          }
        }
      },
      {
        email: 'healthplus@example.com',
        password: await bcrypt.hash('Password123!', 10),
        userType: 'COMPANY',
        firstName: 'HealthPlus',
        lastName: 'Services',
        companyProfile: {
          create: {
            companyName: 'HealthPlus Services',
            industry: 'Healthcare',
            description: 'Community healthcare provider serving regional areas',
            website: 'https://healthplus.example.com',
            location: 'Melbourne, VIC',
            size: '51-200',
            rapStatus: 'STRETCH',
            indigenousOwned: true,
            logo: 'https://example.com/healthplus-logo.png'
          }
        }
      },
      {
        email: 'govtdept@example.com',
        password: await bcrypt.hash('Password123!', 10),
        userType: 'GOVERNMENT',
        firstName: 'Department',
        lastName: 'of Innovation',
        companyProfile: {
          create: {
            companyName: 'Department of Innovation',
            industry: 'Government',
            description: 'Federal government department focused on digital transformation',
            website: 'https://innovation.gov.au',
            location: 'Canberra, ACT',
            size: '1000+',
            rapStatus: 'ELEVATE',
            indigenousOwned: false,
            logo: 'https://example.com/govt-logo.png'
          }
        }
      }
    ];

    const createdEmployers = [];
    for (const employer of employers) {
      const existing = await prisma.user.findUnique({
        where: { email: employer.email }
      });

      if (!existing) {
        const created = await prisma.user.create({
          data: employer,
          include: { companyProfile: true }
        });
        createdEmployers.push(created);
        console.log(`✅ Created employer: ${employer.email}`);
      } else {
        createdEmployers.push(existing);
        console.log(`ℹ️  Employer already exists: ${employer.email}`);
      }
    }

    // Create sample skills
    const skills = [
      { name: 'JavaScript', category: 'Programming' },
      { name: 'TypeScript', category: 'Programming' },
      { name: 'React', category: 'Frontend' },
      { name: 'Node.js', category: 'Backend' },
      { name: 'Python', category: 'Programming' },
      { name: 'AWS', category: 'Cloud' },
      { name: 'Docker', category: 'DevOps' },
      { name: 'Project Management', category: 'Management' },
      { name: 'Communication', category: 'Soft Skills' },
      { name: 'Leadership', category: 'Management' },
      { name: 'Healthcare', category: 'Industry' },
      { name: 'Nursing', category: 'Healthcare' },
      { name: 'Administration', category: 'Office' },
      { name: 'Policy Development', category: 'Government' },
      { name: 'Data Analysis', category: 'Analytics' }
    ];

    const createdSkills = [];
    for (const skill of skills) {
      const existing = await prisma.skill.findUnique({
        where: { name: skill.name }
      });

      if (!existing) {
        const created = await prisma.skill.create({
          data: skill
        });
        createdSkills.push(created);
      } else {
        createdSkills.push(existing);
      }
    }

    console.log(`✅ Skills ready: ${createdSkills.length} skills`);

    // Create sample jobs
    const jobs = [
      {
        title: 'Full Stack Developer',
        description: 'We are looking for an experienced Full Stack Developer to join our growing team. You will work on cutting-edge web applications using modern technologies.',
        location: 'Sydney, NSW',
        employmentType: JobType.FULL_TIME,
        salaryMin: 90000,
        salaryMax: 130000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[0].id,
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS']
      },
      {
        title: 'Junior Frontend Developer',
        description: 'Great opportunity for a junior developer to grow their skills in a supportive environment. Training and mentorship provided.',
        location: 'Sydney, NSW',
        employmentType: JobType.FULL_TIME,
        salaryMin: 60000,
        salaryMax: 80000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[0].id,
        skills: ['JavaScript', 'React', 'CSS', 'HTML']
      },
      {
        title: 'DevOps Engineer',
        description: 'Join our infrastructure team to help build and maintain our cloud infrastructure. Experience with AWS and Docker required.',
        location: 'Melbourne, VIC',
        employmentType: JobType.FULL_TIME,
        salaryMin: 100000,
        salaryMax: 140000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[0].id,
        skills: ['AWS', 'Docker', 'Python', 'Linux']
      },
      {
        title: 'Registered Nurse',
        description: 'Looking for compassionate registered nurses to join our community healthcare team. Multiple positions available across regional Victoria.',
        location: 'Regional Victoria',
        employmentType: JobType.FULL_TIME,
        salaryMin: 70000,
        salaryMax: 95000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[1].id,
        skills: ['Nursing', 'Healthcare', 'Communication']
      },
      {
        title: 'Healthcare Administrator',
        description: 'Administrative role supporting our healthcare operations. Experience in healthcare administration preferred.',
        location: 'Melbourne, VIC',
        employmentType: JobType.FULL_TIME,
        salaryMin: 55000,
        salaryMax: 75000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[1].id,
        skills: ['Administration', 'Communication', 'Healthcare']
      },
      {
        title: 'Policy Analyst',
        description: 'Government department seeking policy analysts to work on digital transformation initiatives. Strong analytical skills required.',
        location: 'Canberra, ACT',
        employmentType: JobType.FULL_TIME,
        salaryMin: 80000,
        salaryMax: 110000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[2].id,
        skills: ['Policy Development', 'Data Analysis', 'Communication']
      },
      {
        title: 'Data Scientist',
        description: 'Join our data analytics team to work on government data projects. Experience with Python and data analysis tools required.',
        location: 'Canberra, ACT',
        employmentType: JobType.CONTRACT,
        salaryMin: 95000,
        salaryMax: 125000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[2].id,
        skills: ['Python', 'Data Analysis', 'AWS']
      },
      {
        title: 'Project Manager',
        description: 'Experienced project manager needed for government digital projects. PMP certification preferred.',
        location: 'Canberra, ACT',
        employmentType: JobType.FULL_TIME,
        salaryMin: 100000,
        salaryMax: 130000,
        status: JobStatus.ACTIVE,
        userId: createdEmployers[2].id,
        skills: ['Project Management', 'Leadership', 'Communication']
      }
    ];

    const createdJobs = [];
    for (const jobData of jobs) {
      const { skills: jobSkills, ...jobFields } = jobData;

      const existing = await prisma.job.findFirst({
        where: {
          title: jobFields.title,
          userId: jobFields.userId
        }
      });

      if (!existing) {
        const created = await prisma.job.create({
          data: jobFields
        });

        // Add skills to the job
        for (const skillName of jobSkills) {
          const skill = createdSkills.find(s => s.name === skillName);
          if (skill) {
            await prisma.jobSkill.create({
              data: {
                jobId: created.id,
                skillId: skill.id
              }
            });
          }
        }

        createdJobs.push(created);
        console.log(`✅ Created job: ${jobData.title}`);
      } else {
        createdJobs.push(existing);
        console.log(`ℹ️  Job already exists: ${jobData.title}`);
      }
    }

    console.log(`✅ Created ${createdJobs.length} jobs`);

    // Create sample users for testing
    const testUsers = [
      {
        email: 'jobseeker1@example.com',
        password: await bcrypt.hash('Password123!', 10),
        userType: 'MEMBER',
        firstName: 'John',
        lastName: 'Doe'
      },
      {
        email: 'jobseeker2@example.com',
        password: await bcrypt.hash('Password123!', 10),
        userType: 'MEMBER',
        firstName: 'Jane',
        lastName: 'Smith'
      }
    ];

    for (const user of testUsers) {
      const existing = await prisma.user.findUnique({
        where: { email: user.email }
      });

      if (!existing) {
        await prisma.user.create({
          data: user
        });
        console.log(`✅ Created test user: ${user.email}`);
      } else {
        console.log(`ℹ️  Test user already exists: ${user.email}`);
      }
    }

    console.log('🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Employers: ${createdEmployers.length}`);
    console.log(`- Jobs: ${createdJobs.length}`);
    console.log(`- Skills: ${createdSkills.length}`);
    console.log(`- Test Users: 2`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedOpportunities();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
