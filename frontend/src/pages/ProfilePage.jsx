import { useState, useEffect } from 'react'
import { Box, Paper, Typography, Avatar, Link, Divider, CircularProgress, Chip } from '@mui/material'
import { Email, Person } from '@mui/icons-material'

export default function ProfilePage() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/me', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setUser(data)
            }
        } catch (error) {
            console.error('Failed to load profile:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (!user) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Person sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">Failed to load profile</Typography>
                </Paper>
            </Box>
        )
    }

    const getInitials = () => {
        return ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || '??'
    }

    const getRoleBadgeColor = (role) => {
        const colors = {
            student: 'primary',
            teacher: 'success',
            admin: 'error',
        }
        return colors[role] || 'default'
    }

    const teamsHref = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(user.email)}`
    const outlookHref = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(user.email)}`

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Profile
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#e8f0ff', color: '#1d4ed8', fontSize: 28, fontWeight: 700 }}>
                        {getInitials()}
                    </Avatar>

                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="h6">
                                {user.first_name} {user.last_name}
                            </Typography>
                            <Chip
                                label={user.role.toUpperCase()}
                                color={getRoleBadgeColor(user.role)}
                                size="small"
                            />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Email sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography color="text.secondary">
                                {user.email}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Link href={teamsHref} target="_blank" rel="noreferrer" underline="hover">
                                Open in Teams
                            </Link>
                            <Link href={outlookHref} target="_blank" rel="noreferrer" underline="hover">
                                Send Email
                            </Link>
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ROLE
                    </Typography>
                    <Typography variant="body1">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        BIO
                    </Typography>
                    <Typography variant="body1">
                        {user.bio ? (
                            user.bio
                        ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>No bio added yet</span>
                        )}
                    </Typography>
                </Box>
            </Paper>
        </Box>
    )
}