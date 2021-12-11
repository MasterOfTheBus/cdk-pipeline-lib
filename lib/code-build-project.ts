import { Construct } from 'constructs';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Action, CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Artifacts, BuildSpec, Project, PipelineProject, Source, FilterGroup, EventAction } from "aws-cdk-lib/aws-codebuild";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CodeStarConnectionDef, SourceDef } from "./source-def";

export interface BuildSourceConstructProps {
    sourceArtifact: Artifact;
    sourceInfo: SourceDef;
    deployBucket?: Bucket;
}

export abstract class AbstractBuildProjectConstruct extends Construct {
    public buildActions: Action[];
    public outputArtifact: Artifact;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.buildActions = [];
        this.outputArtifact = new Artifact();
    }
}

export class CodeBuildProjectConstruct extends AbstractBuildProjectConstruct {
    constructor(scope: Construct, id: string, props: BuildSourceConstructProps) {
        super(scope, id);

        // Define the CodeBuild Project
        const project = new Project(scope, 'SourceBuildProject', {
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
            artifacts: props.deployBucket ? 
                Artifacts.s3({
                    // Use name from the buildspec
                    bucket: props.deployBucket
                }) :
                undefined
        });

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

// TODO: So should this be done differently for regular CDK change?
// Create a ChangeSet prepare and Change set execute?
export class CdkBuildProjectConstruct extends AbstractBuildProjectConstruct {
    constructor(scope: Construct, id: string, props: BuildSourceConstructProps) {
        super(scope, id);

        // Create Separate Pipeline Projects: One for building, one for deploying
        const synthProject = new PipelineProject(scope, `CDK-Synth-Project-${props.sourceInfo.repo}`, {
            projectName: `Project-Synth-${props.sourceInfo.repo}`,
            buildSpec: BuildSpec.fromObject({
                version: '0.2'
                // TODO
            })
        });
        const synthOutput = new Artifact();

        const deployProject = new PipelineProject(scope, `CDK-Deploy-Project-${props.sourceInfo.repo}`, {
            projectName: `Project-Deploy-${props.sourceInfo.repo}`,
            buildSpec: BuildSpec.fromObject({
                version: '0.2'
                // TODO
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

export const createBuildProject = (scope: Construct, props: BuildSourceConstructProps) => {
    if (props.sourceInfo.isCdkSource) {
        return new CdkBuildProjectConstruct(scope, 'Cdk-Construct', props);
    } else if (props.sourceInfo instanceof CodeStarConnectionDef) {
        return new CodeBuildProjectConstruct(scope, `CodeBuild-${props.sourceInfo.repo}`, props);   
    } else {
        // TODO: What would it look like to support this?
        throw TypeError('Invalid SourceDef type');
    }
}
