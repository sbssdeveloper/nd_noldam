'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'

export default function NextAuthLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({
      callbackUrl: '/login',
      redirect: true
    })
  }

  return (
    <Button
      variant="outlined"
      color="error"
      onClick={handleLogout}
      size="small"
    >
      Logout
    </Button>
  )
}
