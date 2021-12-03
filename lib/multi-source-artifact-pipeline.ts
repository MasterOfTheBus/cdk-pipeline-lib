import { Construct } from "@aws-cdk/core";
import { Action, Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { Bucket } from "@aws-cdk/aws-s3";
import { SourceActionFactory, SourceDef } from "./source-def";
import { CodeBuildProjectConstruct } from "./code-build-project";

export interface MultiSourcePipelineProps {
    sources: [SourceDef];
    deployBucket: Bucket;
    pipelineName?: string;
    crossAccount?: boolean;
}

export class MultiSourcePipeline extends Construct {
    public readonly pipeline: Pipeline;

    constructor(scope: Construct, id: string, props: MultiSourcePipelineProps) {
        super(scope, id);

        const multiSourcePipeline = new Pipeline(this, 'Pipeline', {
            pipelineName: props.pipelineName || 'MyPipeline',
            crossAccountKeys: props.crossAccount || false
        });

        // Define the sources
        const sourceArtifactTupleArray = new Array<[SourceDef, Artifact]>();
        const sourceActions = Array<Action>();
        props.sources.forEach(source => {
            const sourceArtifact = new Artifact(`source-${source.repo}`);
            sourceArtifactTupleArray.push([source, sourceArtifact]);
            sourceActions.push(SourceActionFactory.createSourceAction({
                sourceDef: source,
                sourceArtifact: sourceArtifact
            }))
        });
        multiSourcePipeline.addStage({
            stageName: 'Source',
            actions: sourceActions
        });

        // Define the build stages
        for (const [source, artifact] of sourceArtifactTupleArray) {
            const codeBuild = new CodeBuildProjectConstruct(this, `CodeBuild-${source.repo}`, {
                sourceInfo: source,
                sourceArtifact: artifact,
                deployBucket: props.deployBucket
            });
            multiSourcePipeline.addStage({
                stageName: `Build-${source.repo}`,
                actions: [codeBuild.buildAction]
            });
        }

        this.pipeline = multiSourcePipeline;
    }
}