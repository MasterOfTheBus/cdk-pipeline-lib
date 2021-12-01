import { Artifact } from "@aws-cdk/aws-codepipeline";
import { CodeStarConnectionsSourceAction } from "@aws-cdk/aws-codepipeline-actions";

export interface SourceDefProps {
    repo: string;
    repoOwner: string;
}

export abstract class SourceDef {
    public readonly repo: string;
    public readonly repoOwner: string;

    constructor(props: SourceDefProps) {
        this.repo = props.repo;
        this.repoOwner = props.repoOwner;
    }
}

export interface CodeStarConnectionDefProps {
    codeStarConnection: string;
    repo: string;
    repoOwner: string;
}

export class CodeStarConnectionDef extends SourceDef {
    public readonly codeStarConnection: string;

    constructor(props: CodeStarConnectionDefProps) {
        super({repo: props.repo, repoOwner: props.repoOwner});
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
                connectionArn: props.sourceDef.codeStarConnection
            });
        } else {
            throw TypeError('Invalid SourceDef type');
        }
    }
}