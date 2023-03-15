const lambda = import('../../handler.js');

export default async function (...args: any[]) 
{
    return args;
}

//s3://dna-tmp/test-aws-lambda.zip