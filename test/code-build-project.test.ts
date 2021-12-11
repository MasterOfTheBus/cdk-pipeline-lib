import { Capture, Template } from 'aws-cdk-lib/assertions';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib/core';
import { CdkBuildProjectConstruct, CodeBuildProjectConstruct } from '../lib/code-build-project';
import { CodeStarConnectionDef } from '../lib/source-def';

test('Test Code Build Construct', () => {
  const repo = 'test-repo';
  const repoOwner = 'test-owner';

  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const source = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: repo,
    repoOwner: repoOwner,
  });

  const artifact = new Artifact();
  const bucket = new Bucket(stack, 'Bucket');

  new CodeBuildProjectConstruct(stack, 'CodeBuild', {
    sourceArtifact: artifact,
    sourceInfo: source,
    deployBucket: bucket,
  });

  const template = Template.fromStack(stack);

  const projectCapture = new Capture();

  template.resourceCountIs('AWS::CodeBuild::Project', 1);
  template.hasResource('AWS::CodeBuild::Project', projectCapture);

  const project = projectCapture.asObject();

  expect(project.Properties.Source).toBeTruthy();
  expect(project.Properties.Source.Type).toEqual('GITHUB');
  expect(project.Properties.Source.Location).toEqual(`https://github.com/${repoOwner}/${repo}.git`);

  expect(project.Properties.Artifacts).toBeTruthy();
  expect(project.Properties.Artifacts.Type).toEqual('S3');
  expect(project.Properties.Artifacts.Packaging).toEqual('ZIP');
  expect(project.Properties.Artifacts.Location).toBeTruthy();

  const expectedTriggerFilter = [
    [
      { Pattern: 'PUSH', Type: 'EVENT' },
      { Pattern: 'refs/heads/main', Type: 'HEAD_REF' },
    ],
  ];
  expect(project.Properties.Triggers.FilterGroups).toStrictEqual(expectedTriggerFilter);
});

test('Test CdkBuildProjectConstruct', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const source = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'test-repo',
    repoOwner: 'test-owner',
    isCdkSource: true
  });

  const artifact = new Artifact();

  new CdkBuildProjectConstruct(stack, 'CdkSynthDeploy', {
    sourceArtifact: artifact,
    sourceInfo: source
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::CodeBuild::Project', 2);
  const projects = template.findResources('AWS::CodeBuild::Project');

  const synthProject = Object.values(projects).find(value => 
    value.Properties.Name === `Project-Synth-${source.repo}`
  );
  const deployProject = Object.values(projects).find(value => 
    value.Properties.Name === `Project-Deploy-${source.repo}`
  );
  checkProjectProperties(synthProject);
  checkProjectProperties(deployProject);
});

describe('Test create Construct helper method', () => {
  test('creates CDKBuildProject', () => {});

  test('creates CodeBuildProjectConstruct', () => {});

  test('Not supported', () => {});
});

const checkProjectProperties = (project: any) => {
  expect(project).toBeTruthy();
  expect(project.Properties.Source).toBeTruthy();
  expect(project.Properties.Source.Type).toEqual('CODEPIPELINE');
  // TODO: Test the build spec

  expect(project.Properties.Artifacts).toBeTruthy();
  expect(project.Properties.Artifacts.Type).toEqual('CODEPIPELINE');
}