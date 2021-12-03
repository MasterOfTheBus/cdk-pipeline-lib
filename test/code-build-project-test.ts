import { Template } from '@aws-cdk/assertions';
import * as cdk from '@aws-cdk/core';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Bucket } from "@aws-cdk/aws-s3";
import { CodeStarConnectionDef } from '../lib/source-def';
import { CodeBuildProjectConstruct } from '../lib/code-build-project'

test('Test Code Build Construct', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const source = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo",
        repoOwner: "test-owner"
    });

    const artifact = new Artifact();
    const bucket = new Bucket(stack, "Bucket");

    new CodeBuildProjectConstruct(stack, "CodeBuild", {
        sourceArtifact: artifact,
        sourceInfo: source,
        deployBucket: bucket
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::CodeBuild", {
        actionName: `Build-${source.repo}`
    });
});