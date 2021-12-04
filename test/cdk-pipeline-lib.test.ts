import { Capture, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { SourceDef, CodeStarConnectionDef } from '../lib/source-def';
import { MultiSourcePipeline } from '../lib/multi-source-artifact-pipeline';

test('Pipeline Single Source', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const codeStarArn = "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555";
    const repo = "test-repo";
    const repoOwner = "test-owner";
    const branch = "main";
    const source = new CodeStarConnectionDef({
        codeStarConnection: codeStarArn,
        repo: repo,
        repoOwner: repoOwner,
        branch: branch
    });

    // Define the bucket to store the artifacts
    const bucket = new Bucket(stack, 'PipelineBucket');

    new MultiSourcePipeline(stack, 'MultiSourcePipline', {
        sources: [source],
        deployBucket: bucket
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
        Stages: [sourceStageCapture, buildStageCapture]
    });

    // Check the values of the created actions
    const sourceStage = sourceStageCapture.asObject();
    const buildStage = buildStageCapture.asObject();

    // Source Actions
    checkSourceStageValues(sourceStage, source);
    
    // Build Actions
    checkBuildStageValues(buildStage, source, projectRef);
});

test('Pipeline Multiple Sources', () => {});

// TODO: Support other source types
const checkSourceStageValues = (sourceStage: any, sourceDef: CodeStarConnectionDef) => {
    expect(sourceStage.Name).toBe('Source');
    expect(sourceStage.Actions).toBeTruthy();
    expect(sourceStage.Actions.length).toEqual(1);
    
    const sourceAction = sourceStage.Actions[0];
    expect(sourceAction.ActionTypeId.Category).toEqual('Source');
    expect(sourceAction.ActionTypeId.Provider).toEqual('CodeStarSourceConnection');
    expect(sourceAction.Configuration.ConnectionArn).toEqual(sourceDef.codeStarConnection);
    expect(sourceAction.Configuration.FullRepositoryId).toEqual(`${sourceDef.repoOwner}/${sourceDef.repo}`);
    expect(sourceAction.Configuration.BranchName).toEqual(sourceDef.branch);
    expect(sourceAction.OutputArtifacts.length).toEqual(1);
    expect(sourceAction.OutputArtifacts[0].Name).toEqual(`source-${sourceDef.repo}`);
}

const checkBuildStageValues = (buildStage: any, sourceDef: SourceDef, projectRef: string) => {
    expect(buildStage.Name).toBe(`Build-${sourceDef.repo}`);
    expect(buildStage.Actions).toBeTruthy();
    expect(buildStage.Actions.length).toEqual(1);
    
    const buildAction = buildStage.Actions[0];
    expect(buildAction.ActionTypeId.Category).toEqual('Build');
    expect(buildAction.ActionTypeId.Provider).toEqual('CodeBuild');
    expect(buildAction.Configuration.ProjectName.Ref).toEqual(projectRef);
    expect(buildAction.InputArtifacts.length).toEqual(1);
    expect(buildAction.InputArtifacts[0].Name).toEqual(`source-${sourceDef.repo}`);
}
