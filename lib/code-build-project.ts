import { Construct } from 'constructs';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Action, CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Artifacts, BuildSpec, Project, PipelineProject, Source, FilterGroup, EventAction } from "aws-cdk-lib/aws-codebuild";
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

export class CdkBuildProjectConstruct extends AbstractBuildProjectConstruct {
    constructor(scope: Construct, id: string, props: BuildSourceConstructProps) {
        super(scope, id);

        // Create Separate Pipeline Projects: One for building, one for deploying
        const synthProject = new PipelineProject(this, `CDK-Synth-Project-${props.sourceInfo.repo}`, {
            projectName: `Project-Synth-${props.sourceInfo.repo}`,
            buildSpec: BuildSpec.fromObject({
                version: '0.2'
            })
        });
        const synthOutput = new Artifact();

        const deployProject = new PipelineProject(this, `CDK-Deploy-Project-${props.sourceInfo.repo}`, {
            projectName: `Project-Deploy-${props.sourceInfo.repo}`,
            buildSpec: BuildSpec.fromObject({
                version: '0.2'
            })
        });

        // Create a CodeBuild Action for each project
        const synthAction = new CodeBuildAction({
            actionName: `Synth-${props.sourceInfo.repo}`,
            project: synthProject,
            input: props.sourceArtifact,
            outputs: [synthOutput]
        });

        const deployAction = new CodeBuildAction({
            actionName: `Deploy-${props.sourceInfo.repo}`,
            project: deployProject,
            input: synthOutput
            // Outputs for this step?
        });

        this.buildActions = [synthAction, deployAction];
    }
}
