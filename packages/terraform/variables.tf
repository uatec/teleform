variable "lambda_name" {
  description = "The name of the Lambda function"
  type        = string
}

variable "lambda_handler" {
  description = "The function entrypoint in your code"
  type        = string
}

variable "lambda_runtime" {
  description = "The runtime environment for the Lambda function"
  type        = string
}

variable "lambda_role" {
  description = "The ARN of the IAM role that Lambda assumes when it executes your function"
  type        = string
}

variable "lambda_source_dir" {
  description = "The directory containing the Lambda function code"
  type        = string
}


locals {
  teleform     = data.external.env_vars.result["TELEFORM"] == "" ? var.teleform : data.external.env_vars.result["TELEFORM"]
  endpoint_url = data.external.env_vars.result["ENDPOINT_URL"] == "" ? var.endpoint_url : data.external.env_vars.result["ENDPOINT_URL"]
}

# Use the external data source to capture the TELEFORM and ENDPOINT_URL environment variables
data "external" "env_vars" {
  program = ["sh", "-c", "echo '{\"TELEFORM\":\"'$TELEFORM'\", \"ENDPOINT_URL\":\"'$ENDPOINT_URL'\"}'"]
}

output "teleform" {
    value = local.teleform
}

variable "teleform" {
  description = "Whether to enable debug mode"
  type        = bool
  default     = false
}

variable "endpoint_url" {
  description = "The directory containing the Lambda function code"
  type        = string
  default = ""
}
# variable "auth_header" {
#   description = "The directory containing the Lambda function code"
#   type        = string
#   default = ""
# }