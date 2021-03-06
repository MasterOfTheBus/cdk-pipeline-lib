import { Template } from 'aws-cdk-lib/assertions';
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

interface PipelineStackProps {
  artifactKey?: string;
}

class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, ctorProps: PipelineStackProps, props?: cdk.StackProps) {
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
      branch: 'release',
    });

    const pipelineConstruct = new CodePipelineConstruct(this, 'TestPipeline', {
      pipelineSource: pipelineSource,
      source: source,
      artifactBucketArn: bucketArn,
      artifactKey: ctorProps.artifactKey ? ctorProps.artifactKey : undefined,
      githubEmail: 'user@github.com',
      githubUser: 'githubuser',
    });

    pipelineConstruct.pipeline.addStage(
      new MyPipelineAppStage(this, 'test', bucketArn, 'artifact.zip', {
        env: { account: '025257542471', region: 'us-east-1' },
      }),
    );
  }
}

// === The Actual Tests ===

test('Test Code Pipeline Construct', () => {
  const app = new cdk.App();

  const stack = new MyPipelineStack(app, 'TestPipelineStack',
    {
      artifactKey: 'key.zip',
    },
    {
      env: { account: '025257542471', region: 'us-east-1' },
    },
  );

  const template = Template.fromStack(stack);

  // ===== Check the CodeBuild Project Configurations =====
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

  const sourceProject = Object.values(projectResources).find(value => {
    return value.Properties
      && value.Properties.Source
      && value.Properties.Source.Location === sourceExpected.Location;
  });
  if (!sourceProject) {
    expect(sourceProject).toBeTruthy();
  } else {
    expect(sourceProject.Properties.Source).toBeTruthy();
    const sourceProjectConfig = sourceProject.Properties.Source;
    expect(sourceProjectConfig.ReportBuildStatus).toEqual(sourceExpected.ReportBuildStatus);
    expect(sourceProjectConfig.Type).toEqual(sourceExpected.Type);
  }

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

  // TODO: Probably not going to be the only project to require env variables; need a better test
  const synthProject = Object.values(projectResources).find(value => {
    return value.Properties && value.Properties.Environment && value.Properties.Environment.EnvironmentVariables;
  });

  if (!synthProject) {
    // Kind of redundant but it seems like the Typescript checks are complaining about the below line getting the env variables
    expect(synthProject).toBeTruthy();
  } else {
    const synthEnvVars = synthProject.Properties.Environment.EnvironmentVariables;
    expect(synthEnvVars.length).toEqual(3);

    const tokenEnv = synthEnvVars.find((value: any) => value.Name === 'GITHUB_TOKEN');
    expect(tokenEnv).toBeTruthy();
    expect(tokenEnv.Type).toEqual('SECRETS_MANAGER');
    expect(tokenEnv.Value).toEqual('github-token');

    const userEnv = synthEnvVars.find((value: any) => value.Name === 'GITHUB_USER');
    expect(userEnv).toBeTruthy();
    expect(userEnv.Type).toEqual('PLAINTEXT');
    expect(userEnv.Value).toEqual('githubuser');

    const emailEnv = synthEnvVars.find((value: any) => value.Name === 'USER_EMAIL');
    expect(emailEnv).toBeTruthy();
    expect(emailEnv.Type).toEqual('PLAINTEXT');
    expect(emailEnv.Value).toEqual('user@github.com');
  }

  // ===== Get the Pipeline and check the stage configuration =====
  template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  const pipelineResources = template.findResources('AWS::CodePipeline::Pipeline');
  expect(Object.values(pipelineResources).length).toEqual(1);
  const pipeline = Object.values(pipelineResources)[0];
  expect(pipeline).toBeTruthy();
  expect(pipeline.Properties.Stages).toBeTruthy();

  const stages = pipeline.Properties.Stages;

  const sourceBuildStage = stages.find((stage: any) => stage.Name === 'SourceBuild');
  expect(sourceBuildStage).toBeTruthy();
  expect(sourceBuildStage.Actions.length).toEqual(2); // Two actions because of pipeline source and other source
  expect(sourceBuildStage.Actions[0].ActionTypeId.Provider).toEqual('CodeBuild');
  expect(sourceBuildStage.Actions[0].ActionTypeId.Category).toEqual('Build');
  expect(sourceBuildStage.Actions[1].ActionTypeId.Provider).toEqual('S3');
  expect(sourceBuildStage.Actions[1].ActionTypeId.Category).toEqual('Deploy');
  expect(sourceBuildStage.Actions[1].Configuration.ObjectKey).toEqual('source-repo/key.zip');
  expect(sourceBuildStage.Actions[1].Configuration.BucketName).toEqual('sng-test-bucket');

  const appStage = stages.find((stage: any) => stage.Name === 'test'); // stage was named test
  expect(appStage).toBeTruthy();

  const sourceStage = stages.find((stage: any) => stage.Name === 'Source');
  expect(sourceStage).toBeTruthy();
  expect(sourceStage.Actions.length).toEqual(2); // Two actions because of pipeline source and other source
  // The main input will be 0, additional will be later in array
  expect(sourceStage.Actions[0].Configuration.ConnectionArn).toEqual('arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555');
  expect(sourceStage.Actions[0].Configuration.FullRepositoryId).toEqual('test-owner/pipeline-repo');

  expect(sourceStage.Actions[1].Configuration.ConnectionArn).toEqual('arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555');
  expect(sourceStage.Actions[1].Configuration.BranchName).toEqual('release');
});


test('Test Code Pipeline Construct No Artifact Specified', () => {
  const app = new cdk.App();

  const stack = new MyPipelineStack(app, 'TestPipelineStack', {}, {
    env: { account: '025257542471', region: 'us-east-1' },
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  const pipelineResources = template.findResources('AWS::CodePipeline::Pipeline');
  expect(Object.values(pipelineResources).length).toEqual(1);
  const pipeline = Object.values(pipelineResources)[0];
  const stages = pipeline.Properties.Stages;
  const sourceBuildStage = stages.find((stage: any) => stage.Name === 'SourceBuild');
  expect(sourceBuildStage).toBeTruthy();
  expect(sourceBuildStage.Actions[1].Configuration.ObjectKey).toEqual('source-repo/artifact.zip');
  expect(sourceBuildStage.Actions[1].Configuration.BucketName).toEqual('sng-test-bucket');
});
