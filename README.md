# CareVity AI MVP

This is the central hub for the CareVity AI application. This repository contains the complete frontend UI, the AI health-coach integration logic, and an AWS Cloud Backend template ready for deployment.

---

# Current Status

## ✅ Completed Features
1. **Modern Healthcare UI**: Dashboard layout, assessment flow, navigation architecture.
2. **Core Task System**: Daily constants, rotating challenges, gamification logic.
3. **AWS Backend Architecture (Template Prepared)**:
   - Amazon Cognito Authentication
   - DynamoDB Database for user scores
   - AWS Lambda Serverless API (askAI)
   - *Automated Deployment Script (`deploy-backend.ps1`) provided for the founder.*
4. **AI Health Coach Logic (Integrated)**:
   - **Personalized Onboarding & BMI**: AI evaluates BMI and provides targeted feedback.
   - **Nutrition Parsing**: Identifies unhealthy foods (e.g., Samosas) and triggers point deductions.
   - **Fitness Guidance**: Context-aware mobility routines.
   - **Task Benefits**: Speaks biological improvements upon task completion.
   - **Medical Safety Guardrails**: AI strictly refuses clinical medical diagnosis.
5. **Voice Response**: Integrated with Expo-Speech to talk out loud.



---

# Next Steps for the Founder

The immediate next milestone is to deploy the completed AWS backend so the app can communicate with the live AI coach and database. 

**Follow these steps to deploy:**

1. **Review the Deployment Guide**: Open [FOUNDER_AWS_SETUP.md](./FOUNDER_AWS_SETUP.md) for full instructions.
2. **Prepare your AWS Account**: Ensure your account is active and billing is configured. Create an IAM User and save the Access Keys.
3. **Deploy the Infrastructure**:
   - Open PowerShell in the root directory.
   - Run the automated script: `.\deploy-backend.ps1`
   - Paste your **OpenAI API Key** when prompted.
4. **Connect the App**: Update the `.env` file using the template in `.env.example` with the deployed AWS endpoints.
5. **Launch the App**: Run `npm start` and experience the live CareVity AI.
# CareVity-AI
