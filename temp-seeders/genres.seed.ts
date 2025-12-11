import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const genresData = [
  {
    name: '스포츠 & 피트니스',
    description: '운동과 건강을 위한 다양한 활동들',
    image: '/images/catogery_images/Activity&Sports.png',
    meetings: [1, 2, 3, 4, 5]
  },
  {
    name: '예술 & 문화',
    description: '창작과 문화 활동을 즐기는 공간',
    image: '/images/catogery_images/Art&Culture.png',
    meetings: [6, 7, 8, 9, 10]
  },
  {
    name: '독서 & 학습',
    description: '지식과 성장을 위한 독서 모임',
    image: '/images/catogery_images/Book.png',
    meetings: [11, 12, 13, 14, 15]
  },
  {
    name: '요리 & 맛집',
    description: '맛있는 음식과 요리를 공유하는 모임',
    image: '/images/catogery_images/Cooking&Tasting.png',
    meetings: [16, 17, 18, 19, 20]
  },
  {
    name: '라이프스타일',
    description: '일상의 다양한 라이프스타일을 공유',
    image: '/images/catogery_images/lifestyle.png',
    meetings: [21, 22, 23, 24, 25]
  },
  {
    name: '동기부여 & 성장',
    description: '개인 성장과 동기부여를 위한 모임',
    image: '/images/catogery_images/Motivation.png',
    meetings: [26, 27, 28, 29, 30]
  },
  {
    name: '음악 & 공연',
    description: '음악과 공연을 즐기는 사람들의 모임',
    image: '/images/catogery_images/music.png',
    meetings: [31, 32, 33, 34, 35]
  },
  {
    name: '야외 & 피크닉',
    description: '자연과 함께하는 야외 활동',
    image: '/images/catogery_images/Outdoor&Picnic.png',
    meetings: [36, 37, 38, 39, 40]
  },
  {
    name: '도예 & 공예',
    description: '손으로 만드는 창작 활동',
    image: '/images/catogery_images/Potery.png',
    meetings: [41, 42, 43, 44, 45]
  },
  {
    name: '소셜 & 네트워킹',
    description: '새로운 사람들과의 만남과 교류',
    image: '/images/catogery_images/Social.png',
    meetings: [46, 47, 48, 49, 50]
  },
  {
    name: '여행 & 탐험',
    description: '새로운 곳을 탐험하고 여행하는 모임',
    image: '/images/sample_images/category_travel_adventure.jpg',
    meetings: [51, 52, 53, 54, 55]
  },
  {
    name: '비즈니스 & 네트워킹',
    description: '비즈니스와 커리어 발전을 위한 모임',
    image: '/images/sample_images/category_business_networking.jpg',
    meetings: [56, 57, 58, 59, 60]
  }
]

async function seedGenres() {
  try {
    console.log('🌱 Starting genres seeding...')

    // Clear existing genres
    await prisma.genre.deleteMany({})
    console.log('🗑️  Cleared existing genres')

    // Create new genres
    for (const genreData of genresData) {
      const genre = await prisma.genre.create({
        data: genreData
      })
      console.log(`✅ Created genre: ${genre.name}`)
    }

    console.log('🎉 Genres seeding completed successfully!')
    console.log(`📊 Total genres created: ${genresData.length}`)

  } catch (error) {
    console.error('❌ Error seeding genres:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeder
if (require.main === module) {
  seedGenres()
    .then(() => {
      console.log('✨ Seeding process completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error)
      process.exit(1)
    })
}

export default seedGenres
