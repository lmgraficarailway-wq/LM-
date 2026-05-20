const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    if (req.url === '/database.sqlite') {
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename=database.sqlite'
        });
        fs.createReadStream('database_backup.sqlite').pipe(res);
    } else if (req.url === '/restore.sh') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        fs.createReadStream('restore.sh').pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(8080, () => {
    console.log('Serving backup.zip on port 8080');
});
