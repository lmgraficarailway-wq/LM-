const db = require('./server/database/db');
db.run("UPDATE users SET password = '$2b$10$i/5ALVSwS5ZZWPt31YxCAeeXvkwUweyZzc2lZUA33Mi/j1b6g9nCe' WHERE username='cliente_arena'", [], (err) => {
    if (err) console.error(err);
    console.log("Password updated to 123456 for cliente_arena");
});
// also let's make ARENA client a CORE client just for easier test
db.run("UPDATE clients SET origin = 'CORE' WHERE id=7", [], (err) => {
    console.log("ARENA client updated to CORE origin");
});
