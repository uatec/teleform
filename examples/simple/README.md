```sh
# Ensure AWS credentials are configured for deployment
aws configure

# Initialise terraform and do an (optional) first time deployement.
cd terraform
terraform init
terraform apply --auto-approve
terraform output curl_command

# Invoke that curl command to test the endpoint in dev mode
curl -H 'x-api-key: xxxx' https://xxxx/dev/myresource
# Observe the response contains the IP address of the lambda host.
cd ..

# Install node modules and begin a development session with teleform 
cd my_lambda_function
npm install
npm run dev

# Re-issue the request to the same endpoint
curl -H 'x-api-key: xxxx' https://xxxx/dev/myresource
# Observe the response now contains the hostname of your local machine

# Exit teleform using Ctrl+C, waiting until teleform has completely exited

# Re-issue the request one last time
curl -H 'x-api-key: xxxx' https://xxxx/dev/myresource
# Observe the response now contains the IP address of an AWS lambda instance again

```