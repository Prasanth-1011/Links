require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || '14a4d6a028782339c4878041e7faa1c3bf087b40ca18bedd7a4ea8e8788c7e1f';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://User:User@links.vjupjjr.mongodb.net/?retryWrites=true&w=majority&appName=Links';
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Database connected successfully');
    }).catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

// User Schema
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', UserSchema);

// Link Schema
const LinkSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    links: [{
        id: Number,
        name: String,
        url: String
    }]
}, {
    timestamps: true
});

const Link = mongoose.model('Link', LinkSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user (no password hashing as requested)
        const user = new User({ email, password });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            email: user.email,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ LINK ROUTES ============

// Get all link collections
app.get('/api/links', authenticateToken, async (req, res) => {
    try {
        const links = await Link.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json(links);
    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create link collection
app.post('/api/links', authenticateToken, async (req, res) => {
    try {
        const { title, links } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const newLink = new Link({
            userId: req.user.userId,
            title,
            links: links || []
        });

        await newLink.save();
        res.status(201).json(newLink);
    } catch (error) {
        console.error('Create link collection error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete link collection
app.delete('/api/links/:id', authenticateToken, async (req, res) => {
    try {
        const link = await Link.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!link) {
            return res.status(404).json({ message: 'Link collection not found' });
        }

        await Link.deleteOne({ _id: req.params.id });
        res.json({ message: 'Link collection deleted successfully' });
    } catch (error) {
        console.error('Delete link collection error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add link to collection
app.post('/api/links/:id/link', authenticateToken, async (req, res) => {
    try {
        const { name, url } = req.body;

        if (!name || !url) {
            return res.status(400).json({ message: 'Name and URL are required' });
        }

        const link = await Link.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!link) {
            return res.status(404).json({ message: 'Link collection not found' });
        }

        // Generate new ID
        const newId = link.links.length > 0
            ? Math.max(...link.links.map(l => l.id)) + 1
            : 1;

        link.links.push({ id: newId, name, url });
        await link.save();

        res.json(link);
    } catch (error) {
        console.error('Add link error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update link
app.put('/api/links/:groupId/link/:linkId', authenticateToken, async (req, res) => {
    try {
        const { name, url } = req.body;

        if (!name || !url) {
            return res.status(400).json({ message: 'Name and URL are required' });
        }

        const link = await Link.findOne({
            _id: req.params.groupId,
            userId: req.user.userId
        });

        if (!link) {
            return res.status(404).json({ message: 'Link collection not found' });
        }

        const linkItem = link.links.find(l => l.id === parseInt(req.params.linkId));
        if (!linkItem) {
            return res.status(404).json({ message: 'Link not found' });
        }

        linkItem.name = name;
        linkItem.url = url;
        await link.save();

        res.json(link);
    } catch (error) {
        console.error('Update link error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete link
app.delete('/api/links/:groupId/link/:linkId', authenticateToken, async (req, res) => {
    try {
        const link = await Link.findOne({
            _id: req.params.groupId,
            userId: req.user.userId
        });

        if (!link) {
            return res.status(404).json({ message: 'Link collection not found' });
        }

        link.links = link.links.filter(l => l.id !== parseInt(req.params.linkId));
        await link.save();

        res.json(link);
    } catch (error) {
        console.error('Delete link error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'LinkVault API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`LinkVault Server running on port ${PORT}`);
    console.log(`Database: ${MONGODB_URI}`);
});

module.exports = app;