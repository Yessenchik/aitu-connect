import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Box,
    Paper,
    List,
    ListItemButton,
    ListItemText,
    TextField,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    Avatar,
    ListItemAvatar,
    CircularProgress,
    Alert,
    Chip,
    Drawer,
    IconButton,
    useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Chat as ChatIcon, Send, Menu as MenuIcon, ArrowBack } from '@mui/icons-material'

const chatsWidth = 320

export default function MessagesPage() {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    const [conversations, setConversations] = useState([])
    const [currentConv, setCurrentConv] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [ws, setWs] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [showNewChat, setShowNewChat] = useState(false)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [wsConnected, setWsConnected] = useState(false)

    // mobile drawer for chat list
    const [listOpen, setListOpen] = useState(false)

    const messagesEndRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)

    useEffect(() => {
        loadCurrentUser()
    }, [])

    useEffect(() => {
        if (currentUser) loadConversations()
    }, [currentUser])

    useEffect(() => {
        if (currentUser) connectWebSocket()

        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
            if (ws) ws.close()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const loadCurrentUser = async () => {
        try {
            const res = await fetch('/api/me', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setCurrentUser(data)
            }
        } catch (error) {
            console.error('Failed to load user:', error)
        }
    }

    const loadConversations = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/chat/conversations', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setConversations(data || [])
            }
        } catch (error) {
            console.error('Failed to load conversations:', error)
            setConversations([])
        } finally {
            setLoading(false)
        }
    }

    const loadMessages = async (convId) => {
        try {
            const res = await fetch(`/api/chat/messages?conversation_id=${convId}`, { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setMessages(data || [])
            }
        } catch (error) {
            console.error('Failed to load messages:', error)
            setMessages([])
        }
    }

    const selectConversation = useCallback(
        (conv) => {
            setCurrentConv(conv)
            loadMessages(conv.id)

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'join', conversation_id: conv.id }))
            }

            if (isMobile) setListOpen(false) // закрываем список на телефоне
        },
        [ws, isMobile]
    )

    const connectWebSocket = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const newWs = new WebSocket(`${protocol}//${window.location.host}/api/chat/ws`)

        newWs.onopen = () => {
            setWsConnected(true)
            if (currentConv) {
                newWs.send(JSON.stringify({ type: 'join', conversation_id: currentConv.id }))
            }
        }

        newWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'message') {
                    setMessages((prev) => [...prev, data])
                }
            } catch (error) {
                console.error('WebSocket message error:', error)
            }
        }

        newWs.onerror = () => {
            setWsConnected(false)
        }

        newWs.onclose = () => {
            setWsConnected(false)
            reconnectTimeoutRef.current = setTimeout(() => {
                connectWebSocket()
            }, 3000)
        }

        setWs(newWs)
    }, [currentConv])

    const sendMessage = () => {
        if (!newMessage.trim() || !currentConv || !ws || ws.readyState !== WebSocket.OPEN) return

        ws.send(
            JSON.stringify({
                type: 'message',
                conversation_id: currentConv.id,
                content: newMessage.trim(),
            })
        )

        setNewMessage('')
    }

    const openNewChat = async () => {
        try {
            const res = await fetch('/api/chat/users', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setUsers(data || [])
                setShowNewChat(true)
            }
        } catch (error) {
            console.error('Failed to load users:', error)
        }
    }

    const startChat = async (user) => {
        try {
            const res = await fetch(`/api/chat/conversation?other_user_id=${user.id}`, { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setShowNewChat(false)
                await loadConversations()
                const conv = {
                    id: data.conversation_id,
                    is_group: false,
                    other_user_first_name: user.first_name,
                    other_user_last_name: user.last_name,
                }
                selectConversation(conv)
            }
        } catch (error) {
            console.error('Failed to start chat:', error)
        }
    }

    const getConvName = (conv) => (conv.is_group ? conv.name : `${conv.other_user_first_name} ${conv.other_user_last_name}`)

    const getInitials = (firstName, lastName) => {
        return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '??'
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        )
    }

    // список чатов (общий для desktop + mobile drawer)
    const chatList = (
        <Box sx={{ width: chatsWidth, p: 2 }}>
            <Button fullWidth variant="contained" onClick={openNewChat} sx={{ mb: 2 }}>
                + New Chat
            </Button>

            {conversations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <ChatIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        No conversations yet
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Click "New Chat" to start
                    </Typography>
                </Box>
            ) : (
                <List>
                    {conversations.map((conv) => (
                        <ListItemButton
                            key={conv.id}
                            selected={currentConv?.id === conv.id}
                            onClick={() => selectConversation(conv)}
                        >
                            <ListItemText primary={getConvName(conv)} />
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Box>
    )

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                minWidth: 0,
                height: { xs: 'calc(100vh - 112px)', md: 'calc(100vh - 120px)' },
            }}
        >
            {/* DESKTOP: список слева всегда */}
            {!isMobile && (
                <Paper sx={{ width: chatsWidth, overflow: 'auto' }}>
                    {chatList}
                </Paper>
            )}

            {/* MOBILE: список в Drawer */}
            {isMobile && (
                <Drawer
                    anchor="left"
                    open={listOpen}
                    onClose={() => setListOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{ '& .MuiDrawer-paper': { width: chatsWidth } }}
                >
                    {chatList}
                </Drawer>
            )}

            {/* Окно чата */}
            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Header */}
                <Box
                    sx={{
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        {isMobile && (
                            <IconButton onClick={() => setListOpen(true)} aria-label="open chats" size="small">
                                <MenuIcon />
                            </IconButton>
                        )}

                        <Typography variant="h6" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentConv ? getConvName(currentConv) : 'Messages'}
                        </Typography>
                    </Box>

                    <Chip
                        label={wsConnected ? 'Connected' : 'Disconnected'}
                        color={wsConnected ? 'success' : 'error'}
                        size="small"
                    />
                </Box>

                {currentConv ? (
                    <>
                        {/* Messages */}
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {messages.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No messages yet. Start the conversation!
                                    </Typography>
                                </Box>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMine = msg.user_id === currentUser?.id
                                    return (
                                        <Box
                                            key={idx}
                                            sx={{
                                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                                maxWidth: { xs: '85%', sm: '70%' },
                                                bgcolor: isMine ? 'primary.main' : 'grey.200',
                                                color: isMine ? 'white' : 'black',
                                                p: 1.5,
                                                borderRadius: 2,
                                            }}
                                        >
                                            {!isMine && (
                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5, opacity: 0.8 }}>
                                                    {msg.author_first_name} {msg.author_last_name}
                                                </Typography>
                                            )}
                                            <Typography sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
                                        </Box>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </Box>

                        {!wsConnected && (
                            <Alert severity="warning" sx={{ m: 2 }}>
                                Connection lost. Reconnecting...
                            </Alert>
                        )}

                        {/* Input */}
                        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        sendMessage()
                                    }
                                }}
                                disabled={!wsConnected}
                            />
                            <Button
                                variant="contained"
                                onClick={sendMessage}
                                disabled={!wsConnected || !newMessage.trim()}
                                startIcon={<Send />}
                            >
                                Send
                            </Button>
                        </Box>
                    </>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2, p: 2 }}>
                        <ChatIcon sx={{ fontSize: 80, color: 'text.secondary' }} />
                        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                            Select a conversation to start chatting
                        </Typography>

                        {isMobile && (
                            <Button variant="contained" onClick={() => setListOpen(true)}>
                                Open chats
                            </Button>
                        )}
                    </Box>
                )}
            </Paper>

            <Dialog open={showNewChat} onClose={() => setShowNewChat(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Start New Chat</DialogTitle>
                <DialogContent>
                    {users.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            No users available
                        </Typography>
                    ) : (
                        <List>
                            {users.map((user) => (
                                <ListItemButton key={user.id} onClick={() => startChat(user)}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: '#e8f0ff', color: '#1d4ed8' }}>
                                            {getInitials(user.first_name, user.last_name)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={`${user.first_name} ${user.last_name}`} secondary={user.email} />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    )
}