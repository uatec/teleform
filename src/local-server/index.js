const http = require('http');
const path = require('path');
// Function to temporarily set environment variables and call a function
function withEnvVars(tempEnv, fn) {
    // Save current environment variables
    const originalEnv = { ...process.env };
    
    // Set temporary environment variables
    Object.assign(process.env, tempEnv);
  
    try {
      // Call the function with the temporary environment variables
      return fn();
    } finally {
      // Restore original environment variables after function execution
      process.env = originalEnv;
    }
  }
  
const server = http.createServer(async (req, res) => {
    let body = '';

    req.on('data', (chunk) => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        const pathname = req.headers['x-source-dir'];
        console.log(pathname);
        
        const { event, context, env } = JSON.parse(body);
        console.log(event);
        console.log(context);
        console.log(env);
        // Construct the path to the handler module
        const handlerPath = path.join(process.cwd(), pathname, 'index.js');

        try {
            // Dynamically import the handler module
            delete require.cache[require.resolve(handlerPath)];
            const handlerModule = require(handlerPath);

            if (typeof handlerModule.handler !== 'function') {
                throw new Error('Handler function not found');
            }

            // Invoke the handler function
            const response = await withEnvVars(env, () => handlerModule.handler(event, context));

            // Set the response headers and status code
            res.writeHead(response.statusCode || 200, response.headers || { 'Content-Type': 'application/json' });

            // Send the response body
            res.end(JSON.stringify(response.body));
        } catch (error) {
            console.error(JSON.stringify(error));
            // Handle errors
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});