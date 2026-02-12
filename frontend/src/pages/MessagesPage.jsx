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
} from '@mui/material'
import { Chat as ChatIcon, Send } from '@mui/icons-material'

export default function MessagesPage() {
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
    const messagesEndRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)

    // Load current user
    useEffect(() => {
        loadCurrentUser()
    }, [])

    // Load conversations
    useEffect(() => {
        if (currentUser) {
            loadConversations()
        }
    }, [currentUser])

    // Connect WebSocket
    useEffect(() => {
        if (currentUser) {
            connectWebSocket()
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (ws) {
                ws.close()
            }
        }
    }, [currentUser])

    // Auto-scroll to bottom
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

    const selectConversation = useCallback((conv) => {
        setCurrentConv(conv)
        loadMessages(conv.id)

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'join', conversation_id: conv.id }))
        }
    }, [ws])

    const connectWebSocket = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const newWs = new WebSocket(`${protocol}//${window.location.host}/api/chat/ws`)

        newWs.onopen = () => {
            console.log('WebSocket connected')
            setWsConnected(true)

            // Rejoin current conversation if exists
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

        newWs.onerror = (error) => {
            console.error('WebSocket error:', error)
            setWsConnected(false)
        }

        newWs.onclose = () => {
            console.log('WebSocket disconnected')
            setWsConnected(false)

            // Reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('Attempting to reconnect...')
                connectWebSocket()
            }, 3000)
        }

        setWs(newWs)
    }, [currentConv])

    const sendMessage = () => {
        if (!newMessage.trim() || !currentConv || !ws || ws.readyState !== WebSocket.OPEN) {
            return
        }

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

    const getConvName = (conv) => {
        return conv.is_group ? conv.name : `${conv.other_user_first_name} ${conv.other_user_last_name}`
    }

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

    return (
        <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 120px)' }}>
            <Paper sx={{ width: 300, overflow: 'auto', p: 2 }}>
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
            </Paper>

            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {currentConv ? (
                    <>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">{getConvName(currentConv)}</Typography>
                            <Chip
                                label={wsConnected ? "Connected" : "Disconnected"}
                                color={wsConnected ? "success" : "error"}
                                size="small"
                            />
                        </Box>

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
                                                maxWidth: '70%',
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
                                            <Typography>{msg.content}</Typography>
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

                        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => {
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                        <ChatIcon sx={{ fontSize: 80, color: 'text.secondary' }} />
                        <Typography color="text.secondary">Select a conversation to start chatting</Typography>
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
                                    <ListItemText
                                        primary={`${user.first_name} ${user.last_name}`}
                                        secondary={user.email}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    )
}