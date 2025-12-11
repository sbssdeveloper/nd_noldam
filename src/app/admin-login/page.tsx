'use client'

// React Imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

// MUI Imports
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

// Next.js Imports
import Image from 'next/image'

// Config Imports
import { adminConfig, validateAdminCredentials, createAdminUser } from '@/apiConfigs/admin'

const AdminLoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const router = useRouter()
  const { navigate } = useNavigation()

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_auth_token='))
        ?.split('=')[1]

      const adminUserData = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_user_data='))
        ?.split('=')[1]

      if (adminToken && adminUserData) {
        try {
          const userData = JSON.parse(decodeURIComponent(adminUserData))
          setIsAuthenticated(true)
          navigate('/home')
        } catch (error) {
          // Invalid user data, clear cookies
          document.cookie = 'admin_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'admin_user_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
      }
    }

    checkAdminAuth()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validate admin credentials using config
      if (validateAdminCredentials(email, password)) {
        // Create admin user using config template
        const adminUser = createAdminUser(email)

        // Generate token using config
        const adminToken = adminConfig.token.generate()

        // Set admin cookies using config settings
        const maxAgeSeconds = Math.floor(adminConfig.session.maxAge / 1000)
        document.cookie = `${adminConfig.session.cookieName}=${adminToken}; path=/; max-age=${maxAgeSeconds}`
        document.cookie = `${adminConfig.session.userDataCookieName}=${encodeURIComponent(JSON.stringify(adminUser))}; path=/; max-age=${maxAgeSeconds}`

        // Set authentication state
        setIsAuthenticated(true)

        // Redirect to admin home
        navigate('/home')
      } else {
        setError('Invalid admin credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication
  if (isAuthenticated) {
    return (
      <Box className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className='min-h-screen flex items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardContent className='p-8'>
          {/* Logo */}
          <Box className='text-center mb-8'>
            <Image
              src='/images/custom/nd-logo.png'
              alt='ND Logo'
              width={120}
              height={40}
              className='h-8 w-auto mx-auto mb-4'
            />
            <Typography variant='h4' className='font-bold text-gray-900 mb-2'>
              Admin Login
            </Typography>
            <Typography variant='body2' className='text-gray-600'>
              Sign in to access the admin dashboard
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity='error' className='mb-4'>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className='space-y-4'>
            <TextField
              fullWidth
              label='Email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              variant='outlined'
            />

            <TextField
              fullWidth
              label='Password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              variant='outlined'
            />

            <Button
              type='submit'
              fullWidth
              variant='contained'
              size='large'
              disabled={isLoading}
              className='h-12 bg-gray-800 hover:bg-gray-700 text-white'
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>


        </CardContent>
      </Card>
    </Box>
  )
}

export default AdminLoginPage
