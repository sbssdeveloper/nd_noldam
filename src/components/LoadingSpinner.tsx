'use client';

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 40, 
  fullScreen = false 
}) => {
  const containerClass = fullScreen 
    ? 'min-h-screen bg-white flex items-center justify-center' 
    : 'flex items-center justify-center py-8';

  return (
    <Box className={containerClass}>
      <Box className="flex flex-col items-center gap-4">
        <CircularProgress size={size} />
        {message && (
          <Typography variant="body2" className="text-gray-600">
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LoadingSpinner;
