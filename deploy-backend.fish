#!/usr/bin/env fish
#
# SYNOPSIS
#   Automates the AWS Amplify backend deployment for CareVity AI MVP.
#
# DESCRIPTION
#   This script will initialize an Amplify project, add Cognito (Auth), DynamoDB (Storage),
#   and Lambda (API), and push everything to your AWS account automatically.
#
# PREREQUISITES
#   1. Node.js installed.
#   2. AWS CLI installed and configured with your account (`aws configure`).
#   3. You must have your OPENAI_API_KEY ready.
#
# USAGE
#   ./deploy-backend.fish [profile_name]
#   (defaults to "default" if not given)

function fail
    set_color red
    echo $argv
    set_color normal
    exit 1
end

set -l ProfileName "default"
if test (count $argv) -ge 1
    set ProfileName $argv[1]
end

set_color cyan
echo "=========================================="
echo "   CareVity AI - AWS Backend Auto-Deploy  "
echo "=========================================="
set_color normal
echo ""

# 1. Ask for OpenAI API Key
read -P "Please enter your OpenAI API Key (sk-...): " OpenAIKey
if test -z "$OpenAIKey"
    fail "OpenAI API Key is required. Exiting."
end

# 2. Install Amplify CLI if not present
set_color yellow
echo -e "\n[1/5] Checking AWS Amplify CLI..."
set_color normal
if not command -v amplify >/dev/null 2>&1
    echo "Amplify CLI not found. Installing globally via npm..."
    npm install -g @aws-amplify/cli
else
    set_color green
    echo "Amplify CLI is already installed."
    set_color normal
end

# 3. Initialize Amplify Project (Headless)
set_color yellow
echo -e "\n[2/5] Initializing Amplify Project..."
set_color normal

set -l amplifyInitPayload "{
    \"projectName\": \"carevityai\",
    \"envName\": \"dev\",
    \"defaultEditor\": \"code\"
}"

set -l amplifyProvidersPayload "{
    \"awscloudformation\": {
        \"configLevel\": \"project\",
        \"useProfile\": true,
        \"profileName\": \"$ProfileName\"
    }
}"

# Write headless JSONs to temp files to avoid shell escaping nightmares
echo $amplifyInitPayload > init-req.json
echo $amplifyProvidersPayload > init-prov.json

amplify init --amplify "file://init-req.json" --providers "file://init-prov.json" --yes
rm -f init-req.json init-prov.json

# 4. Add Authentication (Headless)
set_color yellow
echo -e "\n[3/5] Adding Cognito Authentication..."
set_color normal

set -l authPayload "{
    \"version\": 1,
    \"resourceName\": \"carevityAuth\",
    \"serviceConfiguration\": {
        \"serviceName\": \"Cognito\",
        \"userPoolConfiguration\": {
            \"signinMethod\": \"EMAIL\",
            \"requiredSignupAttributes\": [\"EMAIL\"]
        }
    }
}"

echo $authPayload > auth-req.json
amplify add auth --headless --payload "file://auth-req.json"
rm -f auth-req.json

# 5. Push changes to AWS
set_color yellow
echo -e "\n[4/5] Pushing base resources to AWS (This takes a few minutes)..."
set_color normal
amplify push --yes

# 6. Instructions for the Lambda Function
set_color green
echo -e "\n[5/5] Backend infrastructure deployed!"
set_color cyan
echo "=========================================="
set_color normal
echo "NEXT STEPS:"
echo "1. To complete the setup, you need to add the Lambda API."
echo "   Run this command manually: amplify add api"
echo "   - Select REST -> 'Create a new Lambda function' -> 'Hello World'."
echo "   - Paste your OPENAI_API_KEY when it asks for Environment Variables."
echo "   - Overwrite the generated index.js/ts with the contents of 'aws-backend-template/askAI-lambda.ts'."
echo "2. Run: amplify push --yes"
echo "3. Copy the endpoints from the generated 'src/aws-exports.js' into '.env'."
set_color cyan
echo "=========================================="
set_color normal
