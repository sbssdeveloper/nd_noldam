'use client'

import React from 'react'
import { Backdrop, CircularProgress } from '@mui/material'

interface PageLoaderProps {
    open?: boolean
}

const PageLoader: React.FC<PageLoaderProps> = ({
    open = true
}) => {
    return (
        <Backdrop
            open={open}
            sx={{
                color: '#fff',
                zIndex: (theme) => theme.zIndex.drawer + 9999,
                backgroundColor: 'rgba(243, 244, 246, 0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            }}
        >
            <CircularProgress color="inherit" size={50} />
        </Backdrop>
    )
}

export default PageLoader

