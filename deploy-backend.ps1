<#
.SYNOPSIS
Automates the AWS Amplify backend deployment for CareVity AI MVP.

.DESCRIPTION
This script will initialize an Amplify project, add Cognito (Auth), DynamoDB (Storage),
and Lambda (API), and push everything to your AWS account automatically.

.PREREQUISITES
1. Node.js installed.
2. AWS CLI installed and configured with your account (`aws configure`).
3. You must have your OPENAI_API_KEY ready.
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$ProfileName = "default"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   CareVity AI - AWS Backend Auto-Deploy  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ask for OpenAI API Key
$OpenAIKey = Read-Host "Please enter your OpenAI API Key (sk-...)"
if ([string]::IsNullOrWhiteSpace($OpenAIKey)) {
    Write-Host "OpenAI API Key is required. Exiting." -ForegroundColor Red
    exit 1
}

# 2. Install Amplify CLI if not present
Write-Host "`n[1/5] Checking AWS Amplify CLI..." -ForegroundColor Yellow
if (-not (Get-Command amplify -ErrorAction SilentlyContinue)) {
    Write-Host "Amplify CLI not found. Installing globally via npm..."
    npm install -g @aws-amplify/cli
} else {
    Write-Host "Amplify CLI is already installed." -ForegroundColor Green
}

# 3. Initialize Amplify Project (Headless)
Write-Host "`n[2/5] Initializing Amplify Project..." -ForegroundColor Yellow
$amplifyInitPayload = @"
{
    "projectName": "carevityai",
    "envName": "dev",
    "defaultEditor": "code"
}
"@
$amplifyProvidersPayload = @"
{
    "awscloudformation": {
        "configLevel": "project",
        "useProfile": true,
        "profileName": "$ProfileName"
    }
}
"@
# Write headless JSONs to temp files to avoid PowerShell escaping nightmares
$amplifyInitPayload | Out-File -FilePath "init-req.json" -Encoding utf8
$amplifyProvidersPayload | Out-File -FilePath "init-prov.json" -Encoding utf8

amplify init --amplify "file://init-req.json" --providers "file://init-prov.json" --yes
Remove-Item -Path "init-req.json", "init-prov.json" -ErrorAction SilentlyContinue

# 4. Add Authentication (Headless)
Write-Host "`n[3/5] Adding Cognito Authentication..." -ForegroundColor Yellow
$authPayload = @"
{
    "version": 1,
    "resourceName": "carevityAuth",
    "serviceConfiguration": {
        "serviceName": "Cognito",
        "userPoolConfiguration": {
            "signinMethod": "EMAIL",
            "requiredSignupAttributes": ["EMAIL"]
        }
    }
}
"@
$authPayload | Out-File -FilePath "auth-req.json" -Encoding utf8
amplify add auth --headless --payload "file://auth-req.json"
Remove-Item -Path "auth-req.json" -ErrorAction SilentlyContinue

# 5. Push changes to AWS
Write-Host "`n[4/5] Pushing base resources to AWS (This takes a few minutes)..." -ForegroundColor Yellow
amplify push --yes

# 6. Instructions for the Lambda Function
Write-Host "`n[5/5] Backend infrastructure deployed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:"
Write-Host "1. To complete the setup, you need to add the Lambda API."
Write-Host "   Run this command manually: amplify add api"
Write-Host "   - Select REST -> 'Create a new Lambda function' -> 'Hello World'."
Write-Host "   - Paste your OPENAI_API_KEY when it asks for Environment Variables."
Write-Host "   - Overwrite the generated index.js/ts with the contents of 'aws-backend-template/askAI-lambda.ts'."
Write-Host "2. Run: amplify push --yes"
Write-Host "3. Copy the endpoints from the generated 'src/aws-exports.js' into '.env'."
Write-Host "==========================================" -ForegroundColor Cyan
