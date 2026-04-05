
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating test data for Phase 2...');
  
  // 1. Ensure a Mentor exists
  let mentor = await prisma.user.findFirst({ where: { userType: 'MENTOR' } });
  if (!mentor) {
    console.log('Creating Mentor...');
    mentor = await prisma.user.create({
      data: {
        email: 'mentor@ngurra.test',
        password: 'password123', // In a real seed this would be hashed
        userType: 'MENTOR',
        name: 'Uncle David',
        mentorProfile: {
           create: {
             title: 'Senior Cultural Advisor',
             company: 'Ngurra Consultants',
             yearsExperience: 20,
             bio: 'Experienced mentor in cultural safety.',
             expertise: ['Culture', 'Leadership'],
             industries: ['Community Services']
           }
        }
      }
    });
  }

  // 2. Ensure a Mentee exists
  let mentee = await prisma.user.findFirst({ where: { userType: 'MEMBER', email: 'mentee@ngurra.test' } });
  if (!mentee) {
      console.log('Creating Mentee...');
      mentee = await prisma.user.create({
          data: {
              email: 'mentee@ngurra.test',
              password: 'password123',
              userType: 'MEMBER',
              name: 'Sarah Johnson',
              memberProfile: {
                  create: {
                      mobNation: 'Wiradjuri',
                      bio: 'Looking for guidance.'
                  }
              }
          }
      });
  }

  // 3. Create a Mentor Session linked to Video Loop
  const session = await prisma.mentorSession.create({
      data: {
          mentorId: mentor.id,
          menteeId: mentee.id,
          scheduledAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
          duration: 60,
          status: 'CONFIRMED',
          topic: 'Phase 2 Video Test',
          // Optionally pre-create the VideoSession if your logic requires it, 
          // or let the API API do it on token request (which is what we implemented).
      }
  });

  console.log('\n✅ Test Data Created:');
  console.log(`Mentor Email: ${mentor.email}`);
  console.log(`Mentee Email: ${mentee.email}`);
  console.log(`Session ID: ${session.id}`);
  console.log(`\n👉 Test Video Call at: http://localhost:3000/mentor/sessions/${session.id}`);
  console.log(`👉 Test Pricing at:    http://localhost:3000/pricing`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
