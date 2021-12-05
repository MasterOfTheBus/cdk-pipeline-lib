import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeStarConnectionsSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { CodeStarConnectionDef, SourceDef } from './source-def';

export interface CreateSourceActionProps {
    sourceDef: SourceDef;
    sourceArtifact: Artifact;
}

export class SourceActionFactory {
    static createSourceAction(props: CreateSourceActionProps) {
        if (props.sourceDef instanceof CodeStarConnectionDef) {
            return new CodeStarConnectionsSourceAction({
                actionName: `Source-${props.sourceDef.repo}`,
                owner: props.sourceDef.repoOwner,
                repo: props.sourceDef.repo,
                output: props.sourceArtifact,
                connectionArn: props.sourceDef.codeStarConnection,
                branch: props.sourceDef.branch
            });
        } else {
            throw TypeError('Invalid SourceDef type');
        }
    }
}