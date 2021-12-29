import { Template } from 'aws-cdk-lib/assertions';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Function, Runtime, S3Code } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib/core';

import { Construct } from 'constructs';
import { CodePipelineConstruct } from '../src/code-pipeline';
import { CodeStarConnectionDef } from '../src/source-def';

// === Setup the classes for helping with testing ===

class MyLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, bucketArn: string, key: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = Bucket.fromBucketArn(this, 'artifactBucket', bucketArn);

    new Function(this, 'LambdaFunction', {
      runtime: Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: new S3Code(bucket, key),
    });
  }
}

class MyPipelineAppStage extends cdk.Stage {

  constructor(scope: Construct, id: string, bucketArn: string, key: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new MyLambdaStack(this, 'LambdaStack', bucketArn, key);
  }
}

class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketArn = 'arn:aws:s3:::sng-test-bucket';

    const pipelineSource = new CodeStarConnectionDef({
      codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
      repo: 'pipeline-repo',
      repoOwner: 'test-owner',
    });

    const source = new CodeStarConnectionDef({
      codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
      repo: 'source-repo',
      repoOwner: 'test-owner',
    });

    const sourceOutputArtifact = new Artifact();
    const pipelineConstruct = new CodePipelineConstruct(this, 'TestPipeline', {
      pipelineSource: pipelineSource,
      source: source,
      artifactBucketArn: bucketArn,
      outputArtifact: sourceOutputArtifact,
    });

    // The output artifact key?
    pipelineConstruct.pipeline.addStage(
      new MyPipelineAppStage(this, 'test', bucketArn, sourceOutputArtifact.objectKey, {
        env: { account: '025257542471', region: 'us-east-1' },
      }),
    );
  }
}

// === The Actual Tests ===

test('Test Code Pipeline Construct', () => {
  const app = new cdk.App();

  const stack = new MyPipelineStack(app, 'TestPipelineStack', {
    env: { account: '025257542471', region: 'us-east-1' },
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::CodeBuild::Project', 3);
  const projectResources = template.findResources('AWS::CodeBuild::Project');

  const sourceExpected = {
    Location: 'https://github.com/test-owner/source-repo.git',
    ReportBuildStatus: true,
    Type: 'GITHUB',
  };

  const artifactsExpected = {
    Location: 'sng-test-bucket',
    NamespaceType: 'NONE',
    OverrideArtifactName: true,
    Packaging: 'ZIP',
    Path: 'source-repo',
    Type: 'S3',
  };

  const containsExpectedSource = Object.values(projectResources).some(value => {
    return value.Properties
      && value.Properties.Source
      && value.Properties.Source.Location === sourceExpected.Location
      && value.Properties.Source.ReportBuildStatus === sourceExpected.ReportBuildStatus
      && value.Properties.Source.Type === sourceExpected.Type;
  });
  expect(containsExpectedSource).toBeTruthy();

  const containsExpectedArtifact = Object.values(projectResources).some(value => {
    return value.Properties
      && value.Properties.Artifacts
      && value.Properties.Artifacts.NamespaceType === artifactsExpected.NamespaceType
      && value.Properties.Artifacts.OverrideArtifactName === artifactsExpected.OverrideArtifactName
      && value.Properties.Artifacts.Packaging === artifactsExpected.Packaging
      && value.Properties.Artifacts.Type === artifactsExpected.Type
      && value.Properties.Artifacts.Location === artifactsExpected.Location
      && value.Properties.Artifacts.Path === artifactsExpected.Path;
  });
  expect(containsExpectedArtifact).toBeTruthy();
});
