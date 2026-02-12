import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(null)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/me', { credentials: 'include' })
            setIsAuthenticated(res.ok)
        } catch (error) {
            console.error('Auth check failed:', error)
            setIsAuthenticated(false)
        }
    }

    // Loading state
    if (isAuthenticated === null) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}
            >
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Routes>
            <Route
                path="/auth"
                element={
                    isAuthenticated ? (
                        <Navigate to="/dashboard/posts" replace />
                    ) : (
                        <AuthPage onLogin={() => setIsAuthenticated(true)} />
                    )
                }
            />
            <Route
                path="/dashboard/*"
                element={
                    isAuthenticated ? (
                        <DashboardPage onLogout={() => setIsAuthenticated(false)} />
                    ) : (
                        <Navigate to="/auth" replace />
                    )
                }
            />
            <Route
                path="/"
                element={<Navigate to={isAuthenticated ? '/dashboard/posts' : '/auth'} replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App