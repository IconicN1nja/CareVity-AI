import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { askAI } from './functions/askAI/resource';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/gen2/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  askAI,
});

const askAIApiStack = backend.createStack('AskAIApiStack');

const askAIApi = new apigateway.LambdaRestApi(askAIApiStack, 'AskAIApi', {
  handler: backend.askAI.resources.lambda,
  proxy: false,
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});

const askAIResource = askAIApi.root.addResource('askAI');
askAIResource.addMethod(
  'POST',
  new apigateway.LambdaIntegration(backend.askAI.resources.lambda, { proxy: true })
);

backend.addOutput({
  custom: {
    askAIUrl: `${askAIApi.url}askAI`,
  },
});