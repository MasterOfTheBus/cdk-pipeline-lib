import { Capture, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib/core';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CodeStarConnectionDef } from '../lib/source-def';
import { CodeBuildProjectConstruct } from '../lib/code-build-project'

test('Test Code Build Construct', () => {
    const repo = "test-repo";
    const repoOwner = "test-owner";

    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    const source = new CodeStarConnectionDef({
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: repo,
        repoOwner: repoOwner
    });

    const artifact = new Artifact();
    const bucket = new Bucket(stack, "Bucket");

    new CodeBuildProjectConstruct(stack, "CodeBuild", {
        sourceArtifact: artifact,
        sourceInfo: source,
        deployBucket: bucket
    });

    const template = Template.fromStack(stack);

    const projectCapture = new Capture();

    template.resourceCountIs("AWS::CodeBuild::Project", 1);
    template.hasResource("AWS::CodeBuild::Project", projectCapture);

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
            { Pattern: 'refs/heads/main', Type: 'HEAD_REF' }
        ]
    ];
    expect(project.Properties.Triggers.FilterGroups).toStrictEqual(expectedTriggerFilter);
});
