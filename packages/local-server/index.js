const http = require('http');
const path = require('path');
const { callback } = require('./core');

const server = http.createServer(callback);

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});