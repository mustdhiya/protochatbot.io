// server.js - Backend Proxy untuk Mengatasi CORS
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'PT. Teknologi Maju Indonesia API Proxy'
    });
});

// Company data endpoint
app.get('/api/company', (req, res) => {
    const companyData = {
        profile: {
            name: "PT. Teknologi Maju Indonesia",
            description: "Perusahaan teknologi terdepan yang mengembangkan solusi inovatif untuk transformasi digital Indonesia.",
            vision: "Menjadi perusahaan teknologi terkemuka di Asia Tenggara yang memberikan solusi terbaik untuk masa depan digital.",
            mission: "Mengembangkan teknologi yang memudahkan kehidupan masyarakat dan mendorong pertumbuhan ekonomi digital Indonesia.",
            established: "2015",
            employees: "500+",
            location: "Jakarta, Indonesia"
        },
        jobs: [
            {
                title: "Senior Frontend Developer",
                department: "Engineering",
                type: "Full-time",
                location: "Jakarta/Remote",
                requirements: ["React.js/Vue.js", "JavaScript ES6+", "3+ tahun pengalaman"],
                salary_range: "15-25 juta"
            },
            {
                title: "Data Scientist",
                department: "Data & Analytics",
                type: "Full-time",
                location: "Jakarta",
                requirements: ["Python/R", "Machine Learning", "SQL", "2+ tahun pengalaman"],
                salary_range: "18-30 juta"
            },
            {
                title: "Product Manager",
                department: "Product",
                type: "Full-time",
                location: "Jakarta",
                requirements: ["Product Management", "Agile/Scrum", "5+ tahun pengalaman"],
                salary_range: "20-35 juta"
            },
            {
                title: "DevOps Engineer",
                department: "Engineering",
                type: "Full-time",
                location: "Jakarta/Remote",
                requirements: ["Docker/Kubernetes", "AWS/GCP", "CI/CD", "3+ tahun pengalaman"],
                salary_range: "16-28 juta"
            }
        ]
    };

    res.json(companyData);
});

// Rate limiting untuk API calls
const rateLimitMap = new Map();

const rateLimit = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30; // max 30 requests per minute

    if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    } else {
        const clientData = rateLimitMap.get(clientIP);
        
        if (now > clientData.resetTime) {
            // Reset window
            clientData.count = 1;
            clientData.resetTime = now + windowMs;
        } else {
            clientData.count++;
        }

        if (clientData.count > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                fallback: true
            });
        }
    }

    next();
};

// Perplexity API proxy endpoint
app.post('/api/chat', rateLimit, async (req, res) => {
    try {
        console.log('Received chat request:', req.body);

        // Validate request
        if (!req.body.messages || !Array.isArray(req.body.messages)) {
            return res.status(400).json({
                error: 'Invalid request format',
                fallback: true
            });
        }

        // Check if API key is available
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (!apiKey) {
            console.error('PERPLEXITY_API_KEY not found in environment variables');
            return res.status(500).json({
                error: 'API configuration error',
                fallback: true,
                message: 'Maaf, layanan AI sedang dalam pemeliharaan. Silakan coba lagi nanti.'
            });
        }

        // Import fetch dynamically (for Node.js compatibility)
        const fetch = (await import('node-fetch')).default;

        // Make request to Perplexity API
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'PTTeknologiMaju-Proxy/1.0'
            },
            body: JSON.stringify({
                model: req.body.model || "sonar-pro",
                messages: req.body.messages,
                max_tokens: Math.min(req.body.max_tokens || 800, 1000),
                temperature: req.body.temperature || 0.7,
                top_p: req.body.top_p || 0.9,
                return_citations: req.body.return_citations !== false,
                return_images: false,
                return_related_questions: false,
                search_recency_filter: "month",
                stream: false,
                presence_penalty: 0,
                frequency_penalty: 1
            }),
            timeout: 30000 // 30 second timeout
        });

        console.log('Perplexity API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Perplexity API error:', response.status, errorText);
            
            // Return fallback response for client-side handling
            return res.status(200).json({
                error: `API Error: ${response.status}`,
                fallback: true,
                message: 'Maaf, sistem AI sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.'
            });
        }

        const data = await response.json();
        console.log('Perplexity API success');

        // Forward the response
        res.json(data);

    } catch (error) {
        console.error('Server error in /api/chat:', error);

        // Don't expose internal errors to client
        res.status(200).json({
            error: 'Internal server error',
            fallback: true,
            message: 'Maaf, terjadi kesalahan pada server. Tim teknis kami sedang menangani masalah ini.'
        });
    }
});

// Fallback response endpoint
app.post('/api/fallback', (req, res) => {
    const userMessage = req.body.message || '';
    const message = userMessage.toLowerCase();

    let response = '';

    if (message.includes('halo') || message.includes('hello')) {
        response = 'Halo! Selamat datang di PT. Teknologi Maju Indonesia. Saya siap membantu Anda dengan informasi perusahaan dan lowongan kerja.';
    } else if (message.includes('lowongan') || message.includes('kerja')) {
        response = 'Kami memiliki 4 posisi tersedia: Senior Frontend Developer (15-25 juta), Data Scientist (18-30 juta), Product Manager (20-35 juta), dan DevOps Engineer (16-28 juta). Posisi mana yang ingin Anda ketahui?';
    } else if (message.includes('perusahaan')) {
        response = 'PT. Teknologi Maju Indonesia didirikan pada 2015 dengan 500+ karyawan di Jakarta. Kami fokus pada solusi teknologi untuk transformasi digital Indonesia.';
    } else {
        response = 'Terima kasih atas pertanyaan Anda. Untuk informasi lebih lanjut, silakan hubungi HR kami di hr@teknologimaju.co.id';
    }

    res.json({
        choices: [{
            message: {
                content: response
            }
        }],
        fallback: true
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        fallback: true
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'The requested endpoint does not exist'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🏢 Company data: http://localhost:${PORT}/api/company`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
    
    // Check environment
    if (process.env.PERPLEXITY_API_KEY) {
        console.log('✅ PERPLEXITY_API_KEY found');
    } else {
        console.log('⚠️ PERPLEXITY_API_KEY not found - fallback mode only');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
