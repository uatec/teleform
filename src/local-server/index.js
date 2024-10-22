const http = require('http');
const url = require('url');
const path = require('path');

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = req.headers['x-source-dir'];
    console.log(pathname);

    // Construct the path to the handler module
    const handlerPath = path.join(process.cwd(), pathname, 'index.js');
    console.log(JSON.stringify(req.headers));
    console.log(`Handler path: ${handlerPath}`);

    try {
        // Dynamically import the handler module
        const handlerModule = require(handlerPath);

        if (typeof handlerModule.handler !== 'function') {
            throw new Error('Handler function not found');
        }

        // Invoke the handler function
        const response = await handlerModule.handler(req);

        // Set the response headers and status code
        res.writeHead(response.statusCode || 200, response.headers || { 'Content-Type': 'application/json' });

        // Send the response body
        res.end(JSON.stringify(response.body));
    } catch (error) {
        // Handle errors
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});