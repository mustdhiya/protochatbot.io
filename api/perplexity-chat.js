export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "sonar-pro",
                messages: [{ role: "user", content: message }],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        return res.status(200).json({ 
            response: data.choices[0].message.content 
        });
    } catch (error) {
        return res.status(500).json({ 
            error: 'Internal server error' 
        });
    }
}
