import { PrismaClient } from '@prisma/client'
import * as southKoreaCities from './south_korea_cities.json'

const prisma = new PrismaClient()

async function seedSouthKoreaCities() {
  try {
    console.log('Starting to seed South Korea cities...')

    // Clear existing data
    await prisma.city.deleteMany({})
    await prisma.province.deleteMany({})
    console.log('Cleared existing data')

    // First create provinces
    let totalProvinces = 0
    for (const provinceData of southKoreaCities) {
      await prisma.province.create({
        data: {
          id: provinceData.provinceId,
          name: provinceData.provinceName
        }
      })
      totalProvinces++
    }
    console.log(`Created ${totalProvinces} provinces`)

    // Then create cities
    let totalCities = 0
    for (const provinceData of southKoreaCities) {
      console.log(`Seeding cities for ${provinceData.provinceName}`)

      for (const cityName of provinceData.cities) {
        await prisma.city.create({
          data: {
            name: cityName,
            provinceId: provinceData.provinceId
          }
        })
        totalCities++
      }
    }

    console.log(`Successfully seeded ${totalCities} cities for South Korea`)

  } catch (error) {
    console.error('Error seeding South Korea cities:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedSouthKoreaCities()
