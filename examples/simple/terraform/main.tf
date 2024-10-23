provider "aws" {
  region = "eu-west-1"
}

# variable "teleform" {
#   type    = bool
#   default = false
# }

# variable "proxy_endpoint" {
#   type    = string
#   default = ""
# }

resource "aws_iam_role" "lambda_role" {
  name = "lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

module "lambda_function" {
  source         = "../../../src/terraform"
  lambda_name    = "my_lambda_function"
  lambda_handler = "index.handler"
  lambda_runtime = "nodejs20.x"
  lambda_role    = aws_iam_role.lambda_role.arn
  lambda_source_dir = "../my_lambda_function"
#   debug_mode     = false

#   endpoint_url = var.proxy_endpoint
#   auth_header  = "Bearer 123"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function.lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.my_api.execution_arn}/*/*"
}

resource "aws_api_gateway_rest_api" "my_api" {
  name        = "MyAPI"
  description = "My API Gateway"
}

resource "aws_api_gateway_resource" "my_resource" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  parent_id   = aws_api_gateway_rest_api.my_api.root_resource_id
  path_part   = "myresource"
}

resource "aws_api_gateway_method" "my_method" {
  rest_api_id   = aws_api_gateway_rest_api.my_api.id
  resource_id   = aws_api_gateway_resource.my_resource.id
  http_method   = "ANY"
  authorization = "NONE"
}

output "invoke_arn" {
  value = module.lambda_function.invoke_arn
}

resource "aws_api_gateway_integration" "my_integration" {
  rest_api_id             = aws_api_gateway_rest_api.my_api.id
  resource_id             = aws_api_gateway_resource.my_resource.id
  http_method             = aws_api_gateway_method.my_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = module.lambda_function.invoke_arn
}

resource "aws_api_gateway_deployment" "my_deployment" {
  depends_on  = [aws_api_gateway_method.my_method, aws_api_gateway_integration.my_integration]
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  triggers = {
    redeployment = sha1(join(",", [
      aws_api_gateway_method.my_method.id,
      aws_api_gateway_resource.my_resource.id
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "my_stage" {
  stage_name    = "dev"
  rest_api_id   = aws_api_gateway_rest_api.my_api.id
  deployment_id = aws_api_gateway_deployment.my_deployment.id
}

resource "aws_api_gateway_usage_plan" "my_usage_plan" {
  name = "MyUsagePlan"
}

resource "aws_api_gateway_usage_plan_key" "my_usage_plan_key" {
  key_id        = aws_api_gateway_api_key.api_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.my_usage_plan.id
}

resource "aws_api_gateway_api_key" "api_key" {
  name        = "my_api_key"
  description = "API key for accessing the API Gateway"
  enabled     = true
}

output "api_gateway_api_key" {
  value     = aws_api_gateway_api_key.api_key.value
  sensitive = true
}

output "api_gateway_url" {
  value = "${aws_api_gateway_deployment.my_deployment.invoke_url}/myresource"
}

output "curl_command" {
  value     = "curl -H 'x-api-key: ${aws_api_gateway_api_key.api_key.value}' ${aws_api_gateway_deployment.my_deployment.invoke_url}/myresource"
  sensitive = true
}

output "teleform" {
  value = module.lambda_function.teleform
}