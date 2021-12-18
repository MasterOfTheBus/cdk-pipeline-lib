import * as cdk from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { MultiSourcePipeline } from '../lib/pipeline';
import { SourceDef, CodeStarConnectionDef } from '../lib/source-def';

test('Pipeline Single Source', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const source = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'test-repo',
    repoOwner: 'test-owner',
    branch: 'main',
  });

  // Define the bucket to store the artifacts
  const bucket = new Bucket(stack, 'PipelineBucket');

  new MultiSourcePipeline(stack, 'MultiSourcePipline', {
    sources: [source],
    deployBucket: bucket,
  });

  const template = Template.fromStack(stack);

  const sourceStageCapture = new Capture();
  const buildStageCapture = new Capture();

  // Just check that the project is created, but don't need to test anything
  template.resourceCountIs('AWS::CodeBuild::Project', 1);
  const projectResources = template.findResources('AWS::CodeBuild::Project');
  const projectRef = Object.keys(projectResources)[0];

  template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: [sourceStageCapture, buildStageCapture],
  });

  // Check the values of the created actions
  const sourceStage = sourceStageCapture.asObject();
  const buildStage = buildStageCapture.asObject();

  // Source Actions
  checkSourceStageValues(sourceStage, [source]);

  // Build Actions
  checkBuildStageValues(buildStage, source, projectRef);
});

test('Pipeline Multiple Sources', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  // This source will spawn 2 build stages
  const source = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'test-repo',
    repoOwner: 'test-owner',
    branch: 'main',
    isCdkSource: true,
  });

  const source2 = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'test-repo-2',
    repoOwner: 'test-owner',
    branch: 'release',
  });

  const source3 = new CodeStarConnectionDef({
    codeStarConnection: 'arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555',
    repo: 'test-repo-3',
    repoOwner: 'test-owner',
  });

  // Define the bucket to store the artifacts
  const bucket = new Bucket(stack, 'PipelineBucket');

  new MultiSourcePipeline(stack, 'MultiSourcePipline', {
    sources: [source, source2, source3],
    deployBucket: bucket,
  });

  const template = Template.fromStack(stack);

  const sourceStageCapture = new Capture();
  // Both stages are for source 1
  const buildStageCapture = new Capture();
  const buildStage1Capture = new Capture();
  // Stages are for 2 and 3 respectively
  const build2StageCapture = new Capture();
  const build3StageCapture = new Capture();

  // Just check that the project is created, but don't need to test anything
  // 4 projects because the cdk project created 2 pipeline projects
  template.resourceCountIs('AWS::CodeBuild::Project', 4);
  const projectResources = template.findResources('AWS::CodeBuild::Project');
  expect(Object.keys(projectResources).length).toEqual(4);
  const projectRef = Object.keys(projectResources)[0];
  // const project1Ref = Object.keys(projectResources)[1];
  const project2Ref = Object.keys(projectResources)[2];
  const project3Ref = Object.keys(projectResources)[3];

  template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    Stages: [sourceStageCapture, buildStageCapture, buildStage1Capture, build2StageCapture, build3StageCapture],
  });

  // There are 3 sources, so 1 source stage and 3 build stages
  const sourceStage = sourceStageCapture.asObject();
  const buildStage = buildStageCapture.asObject();
  const build1Stage = buildStage1Capture.asObject();
  const build2Stage = build2StageCapture.asObject();
  const build3Stage = build3StageCapture.asObject();

  // Source Actions
  checkSourceStageValues(sourceStage, [source, source2, source3]);

  // Build Actions
  checkBuildStageValues(buildStage, source, projectRef);
  checkBuildStageValues(build2Stage, source2, project2Ref);
  checkBuildStageValues(build3Stage, source3, project3Ref);

  // Checks for the cdk build stages
  checkLinkedBuildStageValues([buildStage, build1Stage]);
});

// TODO: Support other source types
const checkSourceStageValues = (sourceStage: any, sourceDefs: CodeStarConnectionDef[]) => {
  expect(sourceStage.Name).toBe('Source');
  expect(sourceStage.Actions).toBeTruthy();
  expect(sourceStage.Actions.length).toEqual(sourceDefs.length);

  for (let i = 0; i < sourceDefs.length; i++) {
    const sourceAction = sourceStage.Actions[i];
    const def = sourceDefs[i];
    expect(sourceAction.ActionTypeId.Category).toEqual('Source');
    expect(sourceAction.ActionTypeId.Provider).toEqual('CodeStarSourceConnection');
    expect(sourceAction.Configuration.ConnectionArn).toEqual(def.codeStarConnection);
    expect(sourceAction.Configuration.FullRepositoryId).toEqual(`${def.repoOwner}/${def.repo}`);
    expect(sourceAction.Configuration.BranchName).toEqual(def.branch ? def.branch : 'master');
    expect(sourceAction.OutputArtifacts.length).toEqual(1);
    expect(sourceAction.OutputArtifacts[0].Name).toEqual(`source-${def.repo}`);
  }
};

const checkBuildStageValues = (buildStage: any, sourceDef: SourceDef, projectRef: string, index?: number) => {
  expect(buildStage.Name).toBe(`Build-${sourceDef.repo}-${index ? index : 0}`);
  expect(buildStage.Actions).toBeTruthy();
  expect(buildStage.Actions.length).toEqual(1);

  const buildAction = buildStage.Actions[0];
  expect(buildAction.ActionTypeId.Category).toEqual('Build');
  expect(buildAction.ActionTypeId.Provider).toEqual('CodeBuild');
  expect(buildAction.Configuration.ProjectName.Ref).toEqual(projectRef);
  expect(buildAction.InputArtifacts.length).toEqual(1);
  expect(buildAction.InputArtifacts[0].Name).toEqual(`source-${sourceDef.repo}`);
};

const checkLinkedBuildStageValues = (buildStages: any[]) => {
  let previousOutputArtifactName: string;
  buildStages.forEach((stage: any, index: number) => {
    expect(stage.Actions).toBeTruthy();
    expect(stage.Actions.length).toEqual(1);

    const action = stage.Actions[0];
    expect(action.ActionTypeId.Category).toEqual('Build');
    expect(action.ActionTypeId.Provider).toEqual('CodeBuild');

    expect(action.InputArtifacts.length).toEqual(1);
    const inputArtifactName = action.InputArtifacts[0].Name;
    expect(inputArtifactName).toBeTruthy();

    if (index < buildStages.length - 1) {
      expect(action.OutputArtifacts.length).toEqual(1);
      const outputArtifactName = action.OutputArtifacts[0].Name;
      expect(outputArtifactName).toBeTruthy();
      if (index > 0) {
        expect(previousOutputArtifactName).toEqual(inputArtifactName);
      }
      previousOutputArtifactName = outputArtifactName;
    }
  });
};
