const path = require('path');
const loadModule = require('./loadModule');

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

function callback(req, res) {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const pathname = req.headers['x-source-dir'];
      if ( !pathname ) return http(400, res, '"x-source-dir" header is mandatory.');

      let parsedJson = {};
      try {
        parsedJson = JSON.parse(body);
      } catch (error) {
        return http(400, res, "Invalid request body. Request body must be valid JSON.");
      }
      const { event, context, env } = parsedJson;
      console.log('event', event);
      console.log('context', context);
      console.log('env', env);
      // Construct the path to the handler module
      const handlerPath = path.join(process.cwd(), pathname, 'index.js');
      console.log('handlerPath: ' + handlerPath);
      // Dynamically import the handler module
      const handlerModule = loadModule(handlerPath);

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
      console.error('Error:', JSON.stringify(error));
      // Handle errors
      http(500, res, error.message);
    }
  });
}


function http(status, res, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

module.exports = { callback, withEnvVars };