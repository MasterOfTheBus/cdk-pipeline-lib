import { Construct } from 'constructs';
import { Action, Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { SourceDef } from "./source-def";
import { SourceActionFactory } from "./source-factory";
import { createBuildProject } from "./code-build-project";

export interface MultiSourcePipelineProps {
    sources: SourceDef[];
    deployBucket: Bucket;
    pipelineName?: string;
    crossAccount?: boolean;
}

export class MultiSourcePipeline extends Construct {
    public readonly pipeline: Pipeline;

    constructor(scope: Construct, id: string, props: MultiSourcePipelineProps) {
        super(scope, id);

        const multiSourcePipeline = new Pipeline(scope, 'Pipeline', {
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
            const buildConstruct = createBuildProject(scope, {
                sourceInfo: source,
                sourceArtifact: artifact,
                deployBucket: props.deployBucket
            });
            buildConstruct.buildActions.forEach((actionList: Action[], index: number) => {
                multiSourcePipeline.addStage({
                    stageName: `Build-${source.repo}-${index}`,
                    actions: actionList
                });
            });
        }

        this.pipeline = multiSourcePipeline;
    }
}
