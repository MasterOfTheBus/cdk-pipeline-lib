export interface SourceDefProps {
    repo: string;
    repoOwner: string;
    branch?: string;
    isCdkSource?: boolean
}

export abstract class SourceDef {
    public readonly repo: string;
    public readonly repoOwner: string;
    public readonly branch?: string;
    public readonly isCdkSource?: boolean;

    constructor(props: SourceDefProps) {
        this.repo = props.repo;
        this.repoOwner = props.repoOwner;
        this.branch = props.branch;
        this.isCdkSource = props.isCdkSource;
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
