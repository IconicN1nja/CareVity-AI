import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { askAI } from './functions/askAI/resource';
import { api } from './functions/api/resource';
import { aws_apigateway as apigateway, aws_dynamodb as dynamodb, RemovalPolicy } from 'aws-cdk-lib';

const backend = defineBackend({ auth, data, askAI, api });
const apiStack = backend.api.resources.lambda.stack;
const table = new dynamodb.Table(apiStack, 'CareVityTable', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});
table.grantReadWriteData(backend.api.resources.lambda);
backend.api.addEnvironment('CAREVITY_TABLE_NAME', table.tableName);
backend.api.addEnvironment('DEFAULT_TIMEZONE', 'Asia/Kolkata');

const authorizer = new apigateway.CognitoUserPoolsAuthorizer(apiStack, 'CareVityAuthorizer', {
  cognitoUserPools: [backend.auth.resources.userPool],
});
const gateway = new apigateway.LambdaRestApi(apiStack, 'CareVityApi', {
  handler: backend.api.resources.lambda,
  proxy: true,
  defaultMethodOptions: {
    authorizationType: apigateway.AuthorizationType.COGNITO,
    authorizer,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});
backend.addOutput({ custom: { apiUrl: gateway.url } });
