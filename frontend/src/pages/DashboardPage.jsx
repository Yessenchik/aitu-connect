import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Button } from '@mui/material'
import { Article, Chat, Person, Logout } from '@mui/icons-material'
import PostsPage from './PostsPage'
import MessagesPage from './MessagesPage'
import ProfilePage from './ProfilePage'

const drawerWidth = 260

export default function DashboardPage({ onLogout }) {
    const navigate = useNavigate()
    const location = useLocation()
    const [selected, setSelected] = useState('posts')

    // Update selected based on current route
    useEffect(() => {
        const path = location.pathname.split('/')[2] || 'posts'
        setSelected(path)
    }, [location])

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            onLogout()
            navigate('/auth')
        } catch (error) {
            console.error('Logout failed:', error)
            // Still logout on frontend
            onLogout()
            navigate('/auth')
        }
    }

    const menuItems = [
        { id: 'posts', label: 'Posts', icon: <Article />, path: '/dashboard/posts' },
        { id: 'messages', label: 'Messages', icon: <Chat />, path: '/dashboard/messages' },
        { id: 'profile', label: 'Profile', icon: <Person />, path: '/dashboard/profile' },
    ]

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        AITU Connect
                    </Typography>
                    <Button color="inherit" startIcon={<Logout />} onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', mt: 2 }}>
                    <List>
                        {menuItems.map((item) => (
                            <ListItemButton
                                key={item.id}
                                selected={selected === item.id}
                                onClick={() => {
                                    setSelected(item.id)
                                    navigate(item.path)
                                }}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Routes>
                    <Route path="posts" element={<PostsPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="/" element={<PostsPage />} />
                    <Route path="*" element={<PostsPage />} />
                </Routes>
            </Box>
        </Box>
    )
}