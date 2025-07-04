exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { message } = JSON.parse(event.body);
        
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
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                response: data.choices[0].message.content 
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error' 
            })
        };
    }
};
