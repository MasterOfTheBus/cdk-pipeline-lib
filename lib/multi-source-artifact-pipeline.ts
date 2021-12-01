import { Construct } from "@aws-cdk/core";
import { Action, Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { Bucket } from "@aws-cdk/aws-s3";
import { SourceActionFactory, SourceDef } from "./source-def";
import { CodeBuildProjectConstruct } from "./code-build-project";

export interface MultiSourcePipelineProps {
    sources: [SourceDef];
    pipelineName?: string;
    crossAccount?: boolean;
}

export class MultiSourcePipeline extends Construct {
    public readonly pipeline: Pipeline;

    constructor(scope: Construct, id: string, props: MultiSourcePipelineProps) {
        super(scope, id);

        this.pipeline = new Pipeline(this, 'Pipeline', {
            pipelineName: props.pipelineName || 'MyPipeline',
            crossAccountKeys: props.crossAccount || false
        });

        // Define the bucket to store the artifacts
        const bucket = new Bucket(this, 'PipelineBucket');

        // Define the sources
        const sourceArtifactMapping = new Map();
        const sourceActions = Array<Action>();
        props.sources.forEach(source => {
            const sourceArtifact = new Artifact(`source-${source.repo}`);
            sourceArtifactMapping.set(source, sourceArtifact);
            sourceActions.push(SourceActionFactory.createSourceAction({
                sourceDef: source,
                sourceArtifact: sourceArtifact
            }))
        });
        this.pipeline.addStage({
            stageName: 'Source',
            actions: sourceActions
        });

        // Define the build stages
        sourceArtifactMapping.forEach((source, artifact) => {
            const codeBuild = new CodeBuildProjectConstruct(this, `CodeBuild-${source.repo}`, {
                sourceInfo: source,
                sourceArtifact: artifact,
                deployBucket: bucket
            });
            this.pipeline.addStage({
                stageName: `Build-${source.repo}`,
                actions: [codeBuild.buildAction]
            })
        });
    }
}