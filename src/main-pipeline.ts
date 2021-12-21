import { Stack, StackProps } from 'aws-cdk-lib/core';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { CodeStarConnectionDef } from './source-def';

interface PipelineStackProps {
     // TODO: Better source definitions?
    pipelineSource: CodeStarConnectionDef;
    sources: CodeStarConnectionDef[];
    stackProps?: StackProps;
}

class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props.stackProps);

        const sourceDef = props.pipelineSource;
        const pipeline = new CodePipeline(this, 'Pipeline', {
            synth: new ShellStep('Synth', {
                // Use a connection created using the AWS console to authenticate to GitHub
                // Other sources are available.
                input: CodePipelineSource.connection(
                    `${sourceDef.repoOwner}/${sourceDef.repo}`,
                    sourceDef.branch ? sourceDef.branch : 'main',
                    { connectionArn: sourceDef.codeStarConnection }
                ),
                commands: [
                    'npm ci',
                    'npm run build',
                    'npx cdk synth',
                ],
            }),
        });


    }
}  