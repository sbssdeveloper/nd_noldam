import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProfiles() {
  console.log('Seeding Profiles...');
  console.log('Starting profile update...');

  const profiles = [
    {
      userId: 1,
      fullName: 'John Doe',
      dob: new Date('1990-05-15'),
      email: 'john.doe@example.com',
      nationality: 'local',
      gender: 'Male',
      description: 'Passionate about technology and outdoor activities. Love meeting new people and exploring new places.',
      province: 'California',
      city: 'Los Angeles',
      terms: true,
      ageVerified: true,
      agreePersonal: true,
      agreeThirdParty: true,
      verifiedAt: new Date('2024-01-01'),
      publicVisibility: true,
    },
    {
      userId: 2,
      fullName: 'Jane Smith',
      dob: new Date('1988-12-03'),
      email: 'jane.smith@example.com',
      nationality: 'local',
      gender: 'Female',
      description: 'Tech professional with a love for art and culture. Always up for a good conversation over coffee.',
      province: 'New York',
      city: 'New York City',
      terms: true,
      ageVerified: true,
      agreePersonal: true,
      agreeThirdParty: true,
      verifiedAt: new Date('2024-01-01'),
      publicVisibility: true,
    },
    {
      userId: 3,
      fullName: 'Mike Wilson',
      dob: new Date('1992-08-22'),
      email: 'mike.wilson@example.com',
      nationality: 'foreign',
      gender: 'Male',
      description: 'Fitness enthusiast and outdoor adventure seeker. Love hiking, running, and trying new sports.',
      province: 'Texas',
      city: 'Austin',
      terms: true,
      ageVerified: true,
      agreePersonal: true,
      agreeThirdParty: true,
      verifiedAt: new Date('2024-01-01'),
      publicVisibility: true,
    },
    {
      userId: 4,
      fullName: 'Sarah Jones',
      dob: new Date('1985-03-10'),
      email: 'sarah.jones@example.com',
      nationality: 'American',
      gender: 'Female',
      description: 'Artist and cultural events organizer. Passionate about bringing people together through art and music.',
      province: 'Florida',
      city: 'Miami',
      terms: true,
      ageVerified: true,
      publicVisibility: true,
    },
    {
      userId: 5,
      fullName: 'Alex Brown',
      dob: new Date('1987-11-18'),
      email: 'alex.brown@example.com',
      nationality: 'American',
      gender: 'Male',
      description: 'Entrepreneur and business consultant. Always looking for networking opportunities and new business ventures.',
      province: 'Illinois',
      city: 'Chicago',
      terms: true,
      ageVerified: true,
      publicVisibility: true,
    },
  ];

  for (const profile of profiles) {
    console.log(`Updating profile for user ${profile.userId}...`);
    await prisma.profile.upsert({
      where: { userId: profile.userId },
      update: profile,
      create: profile,
    });
  }

  console.log('Profiles seeded successfully!');
}
