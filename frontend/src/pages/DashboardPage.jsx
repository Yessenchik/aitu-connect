import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Article, Chat, Person, Logout, Menu as MenuIcon } from '@mui/icons-material'
import PostsPage from './PostsPage'
import MessagesPage from './MessagesPage'
import ProfilePage from './ProfilePage'

const drawerWidth = 260

export default function DashboardPage({ onLogout }) {
    const navigate = useNavigate()
    const location = useLocation()

    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    const [selected, setSelected] = useState('posts')
    const [mobileOpen, setMobileOpen] = useState(false)

    // Update selected based on current route
    useEffect(() => {
        const path = location.pathname.split('/')[2] || 'posts'
        setSelected(path)
    }, [location])

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        } catch (error) {
            console.error('Logout failed:', error)
        } finally {
            onLogout()
            navigate('/auth')
        }
    }

    const menuItems = [
        { id: 'posts', label: 'Posts', icon: <Article />, path: '/dashboard/posts' },
        { id: 'messages', label: 'Messages', icon: <Chat />, path: '/dashboard/messages' },
        { id: 'profile', label: 'Profile', icon: <Person />, path: '/dashboard/profile' },
    ]

    const goTo = (item) => {
        setSelected(item.id)
        navigate(item.path)
        if (isMobile) setMobileOpen(false) // закрыть drawer на телефоне
    }

    const drawerContent = (
        <>
            <Toolbar />
            <Box sx={{ overflow: 'auto', mt: 2 }}>
                <List>
                    {menuItems.map((item) => (
                        <ListItemButton
                            key={item.id}
                            selected={selected === item.id}
                            onClick={() => goTo(item)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </>
    )

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
                <Toolbar>
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={() => setMobileOpen(true)}
                            sx={{ mr: 1 }}
                            aria-label="open sidebar"
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        AITU Connect
                    </Typography>

                    <Button color="inherit" startIcon={<Logout />} onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Mobile drawer */}
            {isMobile && (
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}

            {/* Desktop drawer */}
            {!isMobile && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    // чтобы на десктопе контент не залезал под drawer
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                }}
            >
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