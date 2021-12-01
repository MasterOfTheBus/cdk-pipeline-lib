import { Template } from '@aws-cdk/assertions';
import * as cdk from '@aws-cdk/core';
import { CodeStarConnectionDef, MultiSourcePipeline } from '../lib';

test('SQS Queue Created', () => {
//   const app = new cdk.App();
//   const stack = new cdk.Stack(app, 'TestStack');
//   // WHEN
//   new CdkPipelineLib.CdkPipelineLib(stack, 'MyTestConstruct');
//   // THEN
//   const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});

test('Pipeline Single Source', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const source = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo",
        repoOwner: "test-owner"
    });

    new MultiSourcePipeline(stack, 'MultiSourcePipline', {
        sources: [source]
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CodePipeline', {});
});

test('Pipeline Multiple Sources', () => {});
