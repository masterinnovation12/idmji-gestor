const fs = require('fs');
try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    if (match) {
        fs.writeFileSync('temp_key.txt', match[1].trim());
        console.log('Key extracted to temp_key.txt');
    } else {
        console.log('Key not found in .env.local');
    }
} catch (e) {
    console.error('Error:', e.message);
}
