import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from '@/utils/prisma'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'development-secret-key-change-in-production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        phoneNumber: { label: 'Phone Number', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          return null
        }

        try {
          // Find user by phone number
          const user = await prisma.user.findUnique({
            where: {
              phoneNumber: credentials.phoneNumber
            }
          })

          if (!user) {
            return null
          }

          // Simple password check for demo
          const isValid = credentials.password === 'demo123'

          if (!isValid) {
            return null
          }

          const userData = {
            id: user.id.toString(),
            phoneNumber: user.phoneNumber,
            nickname: user.nickname,
            profileImage: user.profileImage,
            city: user.city,
            province: user.province,
            categories: (user as any).categories || [],
            status: user.status
          }
          
          return userData
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user
      }
      return token
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = token.user as any
      }
      return session
    }
  }
}
