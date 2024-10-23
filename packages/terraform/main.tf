

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = var.lambda_source_dir
  output_path = "${var.lambda_source_dir}/lambda.zip"
  count = local.teleform ? 0 : 1
}
data "archive_file" "debug_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../invocation-forwarder"
  output_path = "debug_lambda2.zip"
  count       = local.teleform ? 1 : 0
}


resource "aws_lambda_function" "this" {
  function_name = var.lambda_name
  handler       = var.lambda_handler
  runtime       = var.lambda_runtime
  role          = var.lambda_role
   
#   filename = "${var.lambda_source_dir}/lambda.zip"
  filename      = local.teleform ? data.archive_file.debug_lambda_zip[0].output_path : data.archive_file.lambda_zip[0].output_path
  source_code_hash = filebase64sha256(local.teleform ? data.archive_file.debug_lambda_zip[0].output_path : data.archive_file.lambda_zip[0].output_path)

  environment {
    variables = {
        SOURCE_DIR = var.lambda_source_dir
        ENDPOINT_URL = local.endpoint_url
        # AUTH_HEADER = var.auth_header
    }
  }

#   lifecycle {
#     ignore_changes = [filename]
#   }
}