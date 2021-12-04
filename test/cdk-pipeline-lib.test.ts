import { Capture, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodeStarConnectionDef } from '../lib/source-def';
import { MultiSourcePipeline } from '../lib/multi-source-artifact-pipeline';

test('Pipeline Single Source', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const source = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo",
        repoOwner: "test-owner"
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

    template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: [sourceStageCapture, buildStageCapture]
    });

    const sourceStage = sourceStageCapture.asObject();
    const buildStage = buildStageCapture.asObject();

    expect(sourceStage.Name).toBe('Source');
});

test('Pipeline Multiple Sources', () => {});
