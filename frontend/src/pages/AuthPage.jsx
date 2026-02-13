import { useState } from 'react'
import { Box, Container, Paper, Tabs, Tab, TextField, Button, Typography, Alert } from '@mui/material'

export default function AuthPage({ onLogin }) {
    const [tab, setTab] = useState(0)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const [loginData, setLoginData] = useState({ email: '', password: '' })
    const [signupData, setSignupData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        bio: '',
        role: 'student',
    })

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (!/^\d{4,12}@astanait\.edu\.kz$/.test(loginData.email)) {
            setError('Email must be like 241415@astanait.edu.kz')
            setLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(loginData),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Login failed')
            }

            onLogin()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSignup = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (!/^\d{4,12}@astanait\.edu\.kz$/.test(signupData.email)) {
            setError('Email must be like 241415@astanait.edu.kz')
            setLoading(false)
            return
        }

        if (signupData.password.length < 8) {
            setError('Password must be at least 8 characters')
            setLoading(false)
            return
        }

        try {
            const signupRes = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(signupData),
            })

            const signupResult = await signupRes.json()

            if (!signupRes.ok) {
                throw new Error(signupResult.error || 'Signup failed')
            }

            // Auto login
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: signupData.email, password: signupData.password }),
            })

            if (!loginRes.ok) {
                throw new Error('Signup successful but login failed')
            }

            onLogin()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm">
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        AITU Connect
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Use your AITU email like <strong>241415@astanait.edu.kz</strong>
                    </Typography>

                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 3, mb: 3 }}>
                        <Tab label="Sign In" />
                        <Tab label="Sign Up" />
                    </Tabs>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {tab === 0 ? (
                        <form onSubmit={handleLogin}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={loginData.email}
                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                placeholder="241415@astanait.edu.kz"
                                required
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                type="password"
                                value={loginData.password}
                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                required
                                sx={{ mb: 2 }}
                            />
                            <Button fullWidth variant="contained" type="submit" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignup}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={signupData.email}
                                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                placeholder="241415@astanait.edu.kz"
                                required
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                type="password"
                                value={signupData.password}
                                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                                required
                                sx={{ mb: 2 }}
                            />
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <TextField
                                    fullWidth
                                    label="First Name"
                                    value={signupData.first_name}
                                    onChange={(e) => setSignupData({ ...signupData, first_name: e.target.value })}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    value={signupData.last_name}
                                    onChange={(e) => setSignupData({ ...signupData, last_name: e.target.value })}
                                    required
                                />
                            </Box>
                            <TextField
                                fullWidth
                                label="Bio (optional)"
                                multiline
                                rows={3}
                                value={signupData.bio}
                                onChange={(e) => setSignupData({ ...signupData, bio: e.target.value })}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                select
                                label="Role"
                                value={signupData.role}
                                onChange={(e) => setSignupData({ ...signupData, role: e.target.value })}
                                SelectProps={{ native: true }}
                                sx={{ mb: 2 }}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </TextField>
                            <Button fullWidth variant="contained" type="submit" disabled={loading}>
                                {loading ? 'Creating account...' : 'Create Account'}
                            </Button>
                        </form>
                    )}
                </Paper>
            </Container>
        </Box>
    )
}