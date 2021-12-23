import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib/core';
import { CodeStarConnectionDef } from '../src/source-def';
import { CodePipelineConstruct } from '../src/code-pipeline'

test('Test Code Build Construct', () => {
  const repoOwner = 'test-owner';

  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const pipelineSource = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'pipeline-repo',
    repoOwner: repoOwner,
  });

  const source = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'source-repo',
    repoOwner: repoOwner,
  });

  new CodePipelineConstruct(stack, 'TestPipeline', {
      pipelineSource: pipelineSource,
      source: source
  })

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::CodeBuild::Project', 3);
//   const projectResources = template.findResources('AWS::CodeBuild::Project');
});
