const path = require('path');
const loadModule = require('./loadModule');


class RequestError extends Error {
}

const excludeList = [
  'AWS_LAMBDA_FUNCTION_VERSION',
  'AWS_EXECUTION_ENV',
  'AWS_DEFAULT_REGION',
  'ENDPOINT_URL',
  'AWS_LAMBDA_LOG_STREAM_NAME',
  'PWD',
  'TZ',
  'LAMBDA_TASK_ROOT',
  'LANG',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_LAMBDA_LOG_GROUP_NAME',
  'AWS_LAMBDA_RUNTIME_API',
  'AWS_LAMBDA_FUNCTION_MEMORY_SIZE',
  'LAMBDA_RUNTIME_DIR',
  '_AWS_XRAY_DAEMON_ADDRESS',
  'AWS_XRAY_DAEMON_ADDRESS',
  'SHLVL',
  'AWS_ACCESS_KEY_ID',
  'LD_LIBRARY_PATH',
  'NODE_PATH',
  'AWS_LAMBDA_FUNCTION_NAME',
  'PATH',
  'AWS_LAMBDA_INITIALIZATION_TYPE',
  'AWS_SESSION_TOKEN',
  'SOURCE_DIR',
  'AWS_XRAY_CONTEXT_MISSING',
  '_AWS_XRAY_DAEMON_PORT'
];

function formatEnvVars(env) {
  return Object.keys(env)
    .filter((key) => !excludeList.some((pattern) =>
      (typeof pattern === 'string' && key === pattern) ||
      (pattern instanceof RegExp && pattern.test(key))
    ))
    .map((key) => `${key}=${env[key]}`)
    .join(', ');
}

 function getEventSource(event) {
  if (event.httpMethod) {
    return `${event.httpMethod} ${event.path}`;
  }
  if (event.Records) {
    return event.Records[0].eventSource;
  }
  return 'Unknown';
}


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
      // TODO: pull this from the env-vars of the lambda itself.
      const sourceDirectory = req.headers['x-source-dir'];
      if (!sourceDirectory) throw new RequestError('"x-source-dir" header is mandatory.');

      let parsedJson = {};
      try {
        parsedJson = JSON.parse(body);
      } catch (error) {
        throw new RequestError("Invalid request body. Request body must be valid JSON.");
      }

      const { event, context, env } = parsedJson;
      if (env['_HANDLER'] === undefined) {
        throw new RequestError("_HANDLER environment variable is not set.");
      }
      const [handlerPath, functionName] = env['_HANDLER'].split('.');
      if (handlerPath === undefined || functionName === undefined) {
        throw new RequestError("Invalid _HANDLER environment variable.");
      }

      const localHandlerPath = path.join(sourceDirectory, handlerPath) + ".js";
      const absoluteHandlerPath = path.join(process.cwd(), localHandlerPath);


      const lambdaName = context.functionName;
      const eventSource = getEventSource(event);
      const envVars = formatEnvVars(env);
      console.log(`${lambdaName} (${localHandlerPath}) | Event: ${eventSource} | Env: ${envVars}`);

      // Construct the path to the handler module

      // Dynamically import the handler module
      const handlerModule = loadModule(absoluteHandlerPath);

      const handlerFunction = handlerModule[functionName];
      if (typeof handlerFunction !== 'function') {
        throw new RequestError(`Handler function '${functionName}' not found`);
      }


      // Invoke the handler function
      const response = await withEnvVars(env, () => handlerFunction(event, context));

      // Set the response headers and status code
      res.writeHead(response.statusCode || 200, response.headers || { 'Content-Type': 'application/json' });

      // Send the response body
      res.end(JSON.stringify(response.body));
    } catch (error) {
      console.error('Error:', JSON.stringify(error || 'Unknown error'));
      // Handle errors
      if ( error instanceof RequestError) {
        http(400, res, error.message);
      } else {
        http(500, res, error.message);
      }
    }
  });
}


function http(status, res, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

module.exports = { callback, withEnvVars, formatEnvVars, getEventSource };