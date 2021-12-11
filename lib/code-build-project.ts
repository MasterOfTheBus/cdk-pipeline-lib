import { Construct } from 'constructs';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Action, CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Artifacts, Project, Source, FilterGroup, EventAction } from "aws-cdk-lib/aws-codebuild";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { SourceDef } from "./source-def";

export interface BuildSourceConstructProps {
    sourceArtifact: Artifact;
    sourceInfo: SourceDef;    
}

export interface CodeBuildProjectConstructProps extends BuildSourceConstructProps {
    deployBucket: Bucket;
}

export abstract class AbstractBuildProjectConstruct extends Construct {
    public buildActions: Action[];
    public outputArtifact: Artifact;

    constructor(scope: Construct, id: string) {
        super(scope, id);
    }
}

export class CodeBuildProjectConstruct extends AbstractBuildProjectConstruct {
    constructor(scope: Construct, id: string, props: CodeBuildProjectConstructProps) {
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
        this.buildActions = [
            new CodeBuildAction({
                actionName: `Build-${props.sourceInfo.repo}`,
                project: project,
                input: props.sourceArtifact,
                outputs: [this.outputArtifact]
            })
        ];
    };
}

export class CdkBuildProjectConstruct extends Construct {
    constructor(scope: Construct, id: string, props: BuildSourceConstructProps) {
        super(scope, id);
    }
}
