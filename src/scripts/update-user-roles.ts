import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateUserRoles() {
  try {
    console.log('Starting user role update...')

    // Update users with empty/null roles to 'user'
    const updateEmptyRoles = await prisma.$executeRaw`
      UPDATE "users" 
      SET "role" = 'user' 
      WHERE "role" IS NULL 
         OR "role" = '' 
         OR COALESCE(TRIM("role"), '') = ''
         OR "role" = '유저'
    `
    console.log(`Updated ${updateEmptyRoles} users with empty/null roles to 'user'`)

    // Convert Korean '관리자' to 'manager'
    const updateKoreanManager = await prisma.$executeRaw`
      UPDATE "users" 
      SET "role" = 'manager' 
      WHERE "role" = '관리자'
    `
    console.log(`Updated ${updateKoreanManager} users from '관리자' to 'manager'`)

    // Verify the update
    const usersWithEmptyRole = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "users"
      WHERE "role" IS NULL 
         OR "role" = '' 
         OR COALESCE(TRIM("role"), '') = ''
         OR "role" = '유저'
         OR "role" = '관리자'
    `
    const remainingCount = Number(usersWithEmptyRole[0]?.count || 0)
    
    if (remainingCount > 0) {
      console.log(`Warning: ${remainingCount} users still have empty or Korean roles`)
    } else {
      console.log('✅ All users have been updated with English role keys!')
    }

    // Show summary
    const roleSummary = await prisma.$queryRaw<Array<{ role: string; count: bigint }>>`
      SELECT "role", COUNT(*) as count
      FROM "users"
      GROUP BY "role"
      ORDER BY count DESC
    `
    console.log('\nRole distribution:')
    roleSummary.forEach((row) => {
      console.log(`  ${row.role}: ${row.count} users`)
    })

  } catch (error) {
    console.error('Error updating user roles:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateUserRoles()

