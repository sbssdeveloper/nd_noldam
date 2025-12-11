'use client'

import { useCustomRouter } from '@/hooks/useCustomRouter'
import { useNavigation } from '@/contexts/NavigationContext'
import { Button, Box, Typography } from '@mui/material'

// Example component showing how to use custom routing
export default function CustomRouterExample() {
  const router = useCustomRouter()
  const { navigate } = useNavigation()

  return (
    <Box className="p-4 space-y-4">
      <Typography variant="h6">Custom Router Example</Typography>

      <Box className="space-x-2">
        <Button
          variant="contained"
          onClick={() => navigate('/home')}
        >
          Go to Home (custom route)
        </Button>

        <Button
          variant="contained"
          onClick={() => navigate('/chat')}
        >
          Go to Chat (custom route)
        </Button>

        <Button
          variant="contained"
          onClick={() => navigate('/feed')}
        >
          Go to Feed (custom route)
        </Button>

        <Button
          variant="contained"
          onClick={() => navigate('/admin/home')}
        >
          Go to Admin Home (custom route)
        </Button>
      </Box>
    </Box>
  )
}
