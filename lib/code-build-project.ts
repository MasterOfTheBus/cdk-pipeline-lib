import { Construct } from "@aws-cdk/core";
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Action, CodeBuildAction } from "@aws-cdk/aws-codepipeline-actions";
import { Artifacts, Project, Source, FilterGroup, EventAction } from "@aws-cdk/aws-codebuild";
import { Bucket } from "@aws-cdk/aws-s3";
import { SourceDef } from "./source-def";

export interface CodeBuildConstructProps {
    sourceArtifact: Artifact;
    sourceInfo: SourceDef;
    deployBucket: Bucket;
}

export class CodeBuildProjectConstruct extends Construct {
    public readonly buildAction: Action;
    public readonly outputArtifact: Artifact;

    constructor(scope: Construct, id: string, props: CodeBuildConstructProps) {
        super(scope, id);

        // Define the CodeBuild Project
        const project = new Project(this, 'SourceBuildProject', {
            projectName: `Project-${props.sourceInfo.repo}`,
            source: Source.gitHub({
                owner: props.sourceInfo.repoOwner,
                repo: props.sourceInfo.repo,
                webhook: true,
                webhookFilters: [
                    FilterGroup
                      .inEventOf(EventAction.PUSH)
                      .andBranchIs('main')
                  ]
            }),
            artifacts: Artifacts.s3({
                // Use name from the buildspec
                bucket: props.deployBucket
            })
        })

        this.outputArtifact = new Artifact();
        this.buildAction = new CodeBuildAction({
            actionName: `Build-${props.sourceInfo.repo}`,
            project: project,
            input: props.sourceArtifact,
            outputs: [this.outputArtifact]
        });
    };
}