import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeStarConnectionsSourceAction } from "aws-cdk-lib/aws-codepipeline-actions";

export interface SourceDefProps {
    repo: string;
    repoOwner: string;
    branch?: string;
}

export abstract class SourceDef {
    public readonly repo: string;
    public readonly repoOwner: string;
    public readonly branch?: string;

    constructor(props: SourceDefProps) {
        this.repo = props.repo;
        this.repoOwner = props.repoOwner;
        this.branch = props.branch;
    }
}

export interface CodeStarConnectionDefProps extends SourceDefProps {
    codeStarConnection: string;
}

export class CodeStarConnectionDef extends SourceDef {
    public readonly codeStarConnection: string;

    constructor(props: CodeStarConnectionDefProps) {
        super(props);
        this.codeStarConnection = props.codeStarConnection;
    }
};

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