import { useState, useEffect } from 'react'
import {
    Box,
    Paper,
    TextField,
    Button,
    Card,
    CardHeader,
    CardContent,
    CardActions,
    Avatar,
    IconButton,
    Typography,
    Collapse,
    List,
    ListItem,
    ListItemText,
    Divider,
    CircularProgress,
    Alert,
} from '@mui/material'
import { Favorite, FavoriteBorder, Comment as CommentIcon, PostAdd } from '@mui/icons-material'

export default function PostsPage() {
    const [posts, setPosts] = useState([])
    const [newPost, setNewPost] = useState('')
    const [expandedComments, setExpandedComments] = useState({})
    const [comments, setComments] = useState({})
    const [commentInput, setCommentInput] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        loadPosts()
    }, [])

    const loadPosts = async () => {
        try {
            setLoading(true)
            setError('')
            const res = await fetch('/api/posts/feed?limit=20', { credentials: 'include' })

            if (!res.ok) {
                throw new Error('Failed to load posts')
            }

            const data = await res.json()
            setPosts(data || [])
        } catch (err) {
            console.error('Load posts error:', err)
            setError('Failed to load posts. Please try again.')
            setPosts([])
        } finally {
            setLoading(false)
        }
    }

    const createPost = async () => {
        if (!newPost.trim()) {
            setError('Post content cannot be empty')
            return
        }

        try {
            setCreating(true)
            setError('')

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: newPost }),
            })

            if (!res.ok) {
                throw new Error('Failed to create post')
            }

            setNewPost('')
            await loadPosts()
        } catch (err) {
            console.error('Create post error:', err)
            setError('Failed to create post. Please try again.')
        } finally {
            setCreating(false)
        }
    }

    const toggleLike = async (postId) => {
        try {
            const res = await fetch(`/api/posts/like?post_id=${postId}`, {
                method: 'POST',
                credentials: 'include',
            })

            if (res.ok) {
                await loadPosts()
            }
        } catch (err) {
            console.error('Toggle like error:', err)
        }
    }

    const toggleComments = async (postId) => {
        if (expandedComments[postId]) {
            setExpandedComments({ ...expandedComments, [postId]: false })
            return
        }

        try {
            const res = await fetch(`/api/posts/comments?post_id=${postId}`, { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setComments({ ...comments, [postId]: data || [] })
                setExpandedComments({ ...expandedComments, [postId]: true })
            }
        } catch (err) {
            console.error('Load comments error:', err)
        }
    }

    const addComment = async (postId) => {
        const content = commentInput[postId]
        if (!content?.trim()) return

        try {
            const res = await fetch('/api/posts/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId, content }),
            })

            if (res.ok) {
                setCommentInput({ ...commentInput, [postId]: '' })
                setExpandedComments({ ...expandedComments, [postId]: false })
                await loadPosts()
            }
        } catch (err) {
            console.error('Add comment error:', err)
        }
    }

    const getInitials = (firstName, lastName) => {
        return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '??'
    }

    const timeAgo = (dateStr) => {
        const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
        if (seconds < 60) return 'just now'
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days}d ago`
        return new Date(dateStr).toLocaleDateString()
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Create Post
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="What's on your mind?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    sx={{ mb: 2 }}
                    disabled={creating}
                />
                <Button
                    variant="contained"
                    onClick={createPost}
                    disabled={creating || !newPost.trim()}
                    startIcon={creating ? <CircularProgress size={20} /> : <PostAdd />}
                >
                    {creating ? 'Posting...' : 'Post'}
                </Button>
            </Paper>

            {posts.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <PostAdd sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No posts yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Be the first to share something with the community!
                    </Typography>
                </Paper>
            ) : (
                posts.map((post) => (
                    <Card key={post.id} sx={{ mb: 2 }}>
                        <CardHeader
                            avatar={
                                <Avatar sx={{ bgcolor: '#e8f0ff', color: '#1d4ed8' }}>
                                    {getInitials(post.author_first_name, post.author_last_name)}
                                </Avatar>
                            }
                            title={`${post.author_first_name} ${post.author_last_name}`}
                            subheader={timeAgo(post.created_at)}
                        />
                        <CardContent>
                            <Typography>{post.content}</Typography>
                        </CardContent>
                        <CardActions disableSpacing>
                            <IconButton onClick={() => toggleLike(post.id)}>
                                {post.is_liked_by_me ? <Favorite color="error" /> : <FavoriteBorder />}
                            </IconButton>
                            <Typography variant="body2" color="text.secondary">
                                {post.likes_count}
                            </Typography>

                            <IconButton onClick={() => toggleComments(post.id)} sx={{ ml: 2 }}>
                                <CommentIcon />
                            </IconButton>
                            <Typography variant="body2" color="text.secondary">
                                {post.comments_count}
                            </Typography>
                        </CardActions>

                        <Collapse in={expandedComments[post.id]} timeout="auto" unmountOnExit>
                            <Divider />
                            <Box sx={{ p: 2 }}>
                                {(comments[post.id] || []).length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                        No comments yet. Be the first to comment!
                                    </Typography>
                                ) : (
                                    <List dense>
                                        {(comments[post.id] || []).map((comment) => (
                                            <ListItem key={comment.id} alignItems="flex-start" sx={{ pl: 0 }}>
                                                <ListItemText
                                                    primary={<strong>{`${comment.author_first_name} ${comment.author_last_name}`}</strong>}
                                                    secondary={comment.content}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Write a comment..."
                                        value={commentInput[post.id] || ''}
                                        onChange={(e) => setCommentInput({ ...commentInput, [post.id]: e.target.value })}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                addComment(post.id)
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => addComment(post.id)}
                                        disabled={!commentInput[post.id]?.trim()}
                                    >
                                        Post
                                    </Button>
                                </Box>
                            </Box>
                        </Collapse>
                    </Card>
                ))
            )}
        </Box>
    )
}