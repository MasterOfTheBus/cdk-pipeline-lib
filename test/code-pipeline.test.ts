import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib/core';
import { CodePipelineConstruct } from '../src/code-pipeline';
import { CodeStarConnectionDef } from '../src/source-def';

test('Test Code Build Construct', () => {
  const repoOwner = 'test-owner';

  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const artifactBucket = new Bucket(stack, 'ArtifactBucket');

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
    source: source,
    artifactBucket: artifactBucket,
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::CodeBuild::Project', 3);
  const projectResources = template.findResources('AWS::CodeBuild::Project');

  const sourceExpected = {
    Location: `https://github.com/test-owner/${source.repo}.git`,
    ReportBuildStatus: true,
    Type: 'GITHUB',
  };

  const artifactsExpected = {
    NamespaceType: 'BUILD_ID',
    OverrideArtifactName: true,
    Packaging: 'ZIP',
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
      && value.Properties.Artifacts.Type === artifactsExpected.Type;
  });
  expect(containsExpectedArtifact).toBeTruthy();
});
