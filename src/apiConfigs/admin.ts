// Admin Configuration
export const adminConfig = {
  // Admin login credentials
  credentials: {
    email: process.env.ADMIN_EMAIL || 'admin@noldam.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  
  // Admin session settings
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    cookieName: 'admin_auth_token',
    userDataCookieName: 'admin_user_data'
  },
  
  // Admin user data template
  userTemplate: {
    id: 'admin-1',
    role: 'admin',
    level: 5
  },
  
  // Token settings
  token: {
    prefix: 'admin-token-',
    // In production, you might want to use a more secure token generation
    generate: () => `admin-token-${Date.now()}`
  }
}

// Helper function to validate admin credentials
export const validateAdminCredentials = (email: string, password: string): boolean => {
  return email === adminConfig.credentials.email && 
         password === adminConfig.credentials.password
}

// Helper function to create admin user data
export const createAdminUser = (email: string) => ({
  ...adminConfig.userTemplate,
  email,
  name: 'Admin User'
})

// Helper function to check if token is valid
export const isAdminTokenValid = (token: string): boolean => {
  if (!token.startsWith(adminConfig.token.prefix)) {
    return false
  }
  
  try {
    const timestamp = parseInt(token.replace(adminConfig.token.prefix, ''))
    const now = Date.now()
    return (now - timestamp) <= adminConfig.session.maxAge
  } catch (error) {
    return false
  }
}
