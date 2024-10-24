# Teleform.js

## Develop Locally. Deploy Globally. Debug Effortlessly.

**Teleform.js** is a Terraform-native tool designed to revolutionise the way you develop and debug AWS Lambda functions. By providing a transparent wrapper around the AWS Lambda resource in Terraform, Teleform.js enables you to run and debug Lambda functions directly on your local machine while interacting with live AWS infrastructure.

## Key Features

- **Transparent Proxy**: Intercept Lambda invocation requests and route them to your local environment with a simple Terraform flag.
- **Local Debugging**: Code and debug Lambda functions locally, without the need for constant redeployment.
- **Ngrok Integration**: Securely connect your AWS environment to your local machine using ngrok for real-time, cloud-connected debugging.
- **Terraform-Native**: Works seamlessly within your existing Terraform workflow without additional complexity or setup.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

To get started with Teleform.js, you'll need to add the tool to your existing Terraform configuration.

```bash
npm install teleform-js
```

Make sure ngrok is installed on your machine. You can install it with:

```sh
brew install ngrok
```

Or visit the official ngrok website for more installation options.

## Usage
### Step 1: Wrap Your Lambda in Teleform.js
Modify your existing Terraform AWS Lambda resource to use Teleform.js as a wrapper.

```hcl
resource "aws_lambda_function" "my_function" {
  source       = "teleform-js/lambda"
  name         = "my-lambda"
  handler      = "index.handler"
  runtime      = "nodejs14.x"
  role         = aws_iam_role.lambda_exec.arn
  environment {
    variables = {
      foo = "bar"
    }
  }

  # Enable Teleform.js local debugging
  debug_locally = true
}
```
### Step 2: Deploy Proxy to AWS
Run `terraform apply` as usual. If `debug_locally` is set to `true`, Teleform.js will deploy a proxy to AWS that forwards Lambda invocations to your local environment.

```sh
terraform apply
```
### Step 3: Start the Local Lambda Invocation Server
Once the proxy is deployed, run the local server to handle Lambda invocations:

```sh 
teleform start
```
This will launch an ngrok tunnel and set up a local server to handle requests forwarded from AWS.

### Step 4: Debug Locally
Now, any invocation of your Lambda function in AWS will be routed through ngrok to your local machine, allowing you to step through and debug your code in real time.

## How It Works
1. **Proxy Deployment**: Teleform.js deploys a proxy Lambda that intercepts invocation requests, forwarding them to your local machine via ngrok.
1. **Ngrok Tunnel**: Ngrok creates a secure tunnel between AWS and your local environment.
1. **Local Invocation**: The Lambda invocation is handled locally, where your function is executed from your file system for debugging.
## Configuration
You can control the behaviour of Teleform.js by setting flags in your Terraform Lambda resource:

- `debug_locally` (default: `false): Enables local debugging by deploying a proxy to AWS.
- `ngrok_auth_token` (optional): Your ngrok authentication token, which can be set to create persistent tunnels.
Example:

```hcl
resource "aws_lambda_function" "my_function" {
  source       = "teleform-js/lambda"
  debug_locally = true
  ngrok_auth_token = "your_ngrok_auth_token"
}
```
## Contributing
We welcome contributions to improve Teleform.js! If you find a bug or have a feature request, feel free to open an issue or submit a pull request.

### Steps to Contribute:
1. Fork this repository.
1. Create a new feature branch (git checkout -b feature/my-feature).
1. Make your changes.
1. Commit your changes (git commit -m "Add new feature").
1. Push to the branch (git push origin feature/my-feature).
1. Open a pull request.
## License
Teleform.js is licensed under the MIT License. See the LICENSE file for more information.


## Roadmap

### Phase 0 - something that works
- [x] intercepter terraform
- [x] invocation forwarder
- [x] local server
- [x] total set up script
- [x] wire up env vars
- [x] wire up other parameters
- [x] resolve path to function from terraform aws_lambda_function parameters, not from the function name
- [x] git commit
- [x] ngrok client
- [ ] CI/CD

### Phase 1 - Something that people can use

- [ ] align module API with aws_lambda_function
- [ ] secure public endpoint
- [ ] clean up processes (local server)
- [ ] client component discovery

### Phase 😕

- [ ] teleform devex - cache-bust the debug_lambda?
- [ ] enter vpc
- [ ] local-server error handling
