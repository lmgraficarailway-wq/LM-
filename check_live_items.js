const https = require('https');

https.get('https://lm-passo-api-61970172348.southamerica-east1.run.app/api/catalogue', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Total items:', json.data ? json.data.length : 'undefined');
            if (!json.data) {
                console.log('JSON keys:', Object.keys(json));
                return;
            }
            json.data.forEach((item, idx) => {
                if (!item) {
                    console.log(`Index ${idx} is null/undefined`);
                    return;
                }
                const t_type = typeof item.title;
                const d_type = typeof item.description;
                const img_type = typeof item.image_url;
                const is_arr = Array.isArray(item.images);
                console.log(`Item #${item.id}: title_type=${t_type}, title_val=${JSON.stringify(item.title)}, desc_type=${d_type}, img_type=${img_type}, images_arr=${is_arr}`);
            });
        } catch(e) {
            console.error('Failed to parse response:', e.message);
        }
    });
}).on('error', err => {
    console.error('Fetch error:', err.message);
});
