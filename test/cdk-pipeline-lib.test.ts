import { Capture, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { SourceDef, CodeStarConnectionDef } from '../lib/source-def';
import { MultiSourcePipeline } from '../lib/pipeline';

test('Pipeline Single Source', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const source = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo",
        repoOwner: "test-owner",
        branch: "main"
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
    checkSourceStageValues(sourceStage, [source]);
    
    // Build Actions
    checkBuildStageValues(buildStage, source, projectRef);
});

test('Pipeline Multiple Sources', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const source = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo",
        repoOwner: "test-owner",
        branch: "main"
    });

    const source2 = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo-2",
        repoOwner: "test-owner",
        branch: "release"
    });

    // Define the bucket to store the artifacts
    const bucket = new Bucket(stack, 'PipelineBucket');

    new MultiSourcePipeline(stack, 'MultiSourcePipline', {
        sources: [source, source2],
        deployBucket: bucket
    });

    const template = Template.fromStack(stack);

    const sourceStageCapture = new Capture();
    const buildStageCapture = new Capture();
    const build2StageCapture = new Capture();

    // Just check that the project is created, but don't need to test anything
    template.resourceCountIs('AWS::CodeBuild::Project', 2);
    const projectResources = template.findResources('AWS::CodeBuild::Project');
    const projectRef = Object.keys(projectResources)[0];
    const project2Ref = Object.keys(projectResources)[1];

    template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: [sourceStageCapture, buildStageCapture, build2StageCapture]
    });

    // There are 2 sources, so 1 source stage and 2 build stages
    const sourceStage = sourceStageCapture.asObject();
    const buildStage = buildStageCapture.asObject();
    const build2Stage = build2StageCapture.asObject();

    // Source Actions
    checkSourceStageValues(sourceStage, [source, source2]);
    
    // Build Actions
    checkBuildStageValues(buildStage, source, projectRef);
    checkBuildStageValues(build2Stage, source2, project2Ref);
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
        expect(sourceAction.Configuration.BranchName).toEqual(def.branch);
        expect(sourceAction.OutputArtifacts.length).toEqual(1);
        expect(sourceAction.OutputArtifacts[0].Name).toEqual(`source-${def.repo}`);
    }
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
