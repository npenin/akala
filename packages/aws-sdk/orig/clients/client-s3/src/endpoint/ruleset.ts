// @ts-nocheck
// generated code, do not edit
import { RuleSetObject } from "@smithy/types";

/* This file is compressed. Log this object
   or see "smithy.rules#endpointRuleSet"
   in codegen/sdk-codegen/aws-models/s3.json */

const ce="required",
cf="type",
cg="conditions",
ch="fn",
ci="argv",
cj="ref",
ck="assign",
cl="url",
cm="properties",
cn="backend",
co="authSchemes",
cp="disableDoubleEncoding",
cq="signingName",
cr="signingRegion",
cs="headers",
ct="signingRegionSet";
const a=false,
b=true,
c="isSet",
d="booleanEquals",
e="error",
f="aws.partition",
g="stringEquals",
h="getAttr",
i="name",
j="substring",
k="bucketSuffix",
l="parseURL",
m="{url#scheme}://{url#authority}/{uri_encoded_bucket}{url#path}",
n="endpoint",
o="tree",
p="aws.isVirtualHostableS3Bucket",
q="{url#scheme}://{Bucket}.{url#authority}{url#path}",
r="not",
s="{url#scheme}://{url#authority}{url#path}",
t="hardwareType",
u="regionPrefix",
v="bucketAliasSuffix",
w="outpostId",
x="isValidHostLabel",
y="sigv4a",
z="s3-outposts",
A="s3",
B="{url#scheme}://{url#authority}{url#normalizedPath}{Bucket}",
C="https://{Bucket}.s3-accelerate.{partitionResult#dnsSuffix}",
D="https://{Bucket}.s3.{partitionResult#dnsSuffix}",
E="aws.parseArn",
F="bucketArn",
G="arnType",
H="",
I="s3-object-lambda",
J="accesspoint",
K="accessPointName",
L="{url#scheme}://{accessPointName}-{bucketArn#accountId}.{url#authority}{url#path}",
M="mrapPartition",
N="outpostType",
O="arnPrefix",
P="{url#scheme}://{url#authority}{url#normalizedPath}{uri_encoded_bucket}",
Q="https://s3.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",
R="https://s3.{partitionResult#dnsSuffix}",
S={[ce]:false,[cf]:"String"},
T={[ce]:true,"default":false,[cf]:"Boolean"},
U={[ce]:false,[cf]:"Boolean"},
V={[ch]:d,[ci]:[{[cj]:"Accelerate"},true]},
W={[ch]:d,[ci]:[{[cj]:"UseFIPS"},true]},
X={[ch]:d,[ci]:[{[cj]:"UseDualStack"},true]},
Y={[ch]:c,[ci]:[{[cj]:"Endpoint"}]},
Z={[ch]:f,[ci]:[{[cj]:"Region"}],[ck]:"partitionResult"},
aa={[ch]:g,[ci]:[{[ch]:h,[ci]:[{[cj]:"partitionResult"},i]},"aws-cn"]},
ab={[ch]:c,[ci]:[{[cj]:"Bucket"}]},
ac={[cj]:"Bucket"},
ad={[ch]:l,[ci]:[{[cj]:"Endpoint"}],[ck]:"url"},
ae={[ch]:d,[ci]:[{[ch]:h,[ci]:[{[cj]:"url"},"isIp"]},true]},
af={[cj]:"url"},
ag={[ch]:"uriEncode",[ci]:[ac],[ck]:"uri_encoded_bucket"},
ah={[cn]:"S3Express",[co]:[{[cp]:true,[i]:"sigv4",[cq]:"s3express",[cr]:"{Region}"}]},
ai={},
aj={[ch]:p,[ci]:[ac,false]},
ak={[e]:"S3Express bucket name is not a valid virtual hostable name.",[cf]:e},
al={[cn]:"S3Express",[co]:[{[cp]:true,[i]:"sigv4-s3express",[cq]:"s3express",[cr]:"{Region}"}]},
am={[ch]:c,[ci]:[{[cj]:"UseS3ExpressControlEndpoint"}]},
an={[ch]:d,[ci]:[{[cj]:"UseS3ExpressControlEndpoint"},true]},
ao={[ch]:r,[ci]:[Y]},
ap={[e]:"Unrecognized S3Express bucket name format.",[cf]:e},
aq={[ch]:r,[ci]:[ab]},
ar={[cj]:t},
as={[cg]:[ao],[e]:"Expected a endpoint to be specified but no endpoint was found",[cf]:e},
at={[co]:[{[cp]:true,[i]:y,[cq]:z,[ct]:["*"]},{[cp]:true,[i]:"sigv4",[cq]:z,[cr]:"{Region}"}]},
au={[ch]:d,[ci]:[{[cj]:"ForcePathStyle"},false]},
av={[cj]:"ForcePathStyle"},
aw={[ch]:d,[ci]:[{[cj]:"Accelerate"},false]},
ax={[ch]:g,[ci]:[{[cj]:"Region"},"aws-global"]},
ay={[co]:[{[cp]:true,[i]:"sigv4",[cq]:A,[cr]:"us-east-1"}]},
az={[ch]:r,[ci]:[ax]},
aA={[ch]:d,[ci]:[{[cj]:"UseGlobalEndpoint"},true]},
aB={[cl]:"https://{Bucket}.s3-fips.dualstack.{Region}.{partitionResult#dnsSuffix}",[cm]:{[co]:[{[cp]:true,[i]:"sigv4",[cq]:A,[cr]:"{Region}"}]},[cs]:{}},
aC={[co]:[{[cp]:true,[i]:"sigv4",[cq]:A,[cr]:"{Region}"}]},
aD={[ch]:d,[ci]:[{[cj]:"UseGlobalEndpoint"},false]},
aE={[ch]:d,[ci]:[{[cj]:"UseDualStack"},false]},
aF={[cl]:"https://{Bucket}.s3-fips.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
aG={[ch]:d,[ci]:[{[cj]:"UseFIPS"},false]},
aH={[cl]:"https://{Bucket}.s3-accelerate.dualstack.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
aI={[cl]:"https://{Bucket}.s3.dualstack.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
aJ={[ch]:d,[ci]:[{[ch]:h,[ci]:[af,"isIp"]},false]},
aK={[cl]:B,[cm]:aC,[cs]:{}},
aL={[cl]:q,[cm]:aC,[cs]:{}},
aM={[n]:aL,[cf]:n},
aN={[cl]:C,[cm]:aC,[cs]:{}},
aO={[cl]:"https://{Bucket}.s3.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
aP={[e]:"Invalid region: region was not a valid DNS name.",[cf]:e},
aQ={[cj]:F},
aR={[cj]:G},
aS={[ch]:h,[ci]:[aQ,"service"]},
aT={[cj]:K},
aU={[cg]:[X],[e]:"S3 Object Lambda does not support Dual-stack",[cf]:e},
aV={[cg]:[V],[e]:"S3 Object Lambda does not support S3 Accelerate",[cf]:e},
aW={[cg]:[{[ch]:c,[ci]:[{[cj]:"DisableAccessPoints"}]},{[ch]:d,[ci]:[{[cj]:"DisableAccessPoints"},true]}],[e]:"Access points are not supported for this operation",[cf]:e},
aX={[cg]:[{[ch]:c,[ci]:[{[cj]:"UseArnRegion"}]},{[ch]:d,[ci]:[{[cj]:"UseArnRegion"},false]},{[ch]:r,[ci]:[{[ch]:g,[ci]:[{[ch]:h,[ci]:[aQ,"region"]},"{Region}"]}]}],[e]:"Invalid configuration: region from ARN `{bucketArn#region}` does not match client region `{Region}` and UseArnRegion is `false`",[cf]:e},
aY={[ch]:h,[ci]:[{[cj]:"bucketPartition"},i]},
aZ={[ch]:h,[ci]:[aQ,"accountId"]},
ba={[co]:[{[cp]:true,[i]:"sigv4",[cq]:I,[cr]:"{bucketArn#region}"}]},
bb={[e]:"Invalid ARN: The access point name may only contain a-z, A-Z, 0-9 and `-`. Found: `{accessPointName}`",[cf]:e},
bc={[e]:"Invalid ARN: The account id may only contain a-z, A-Z, 0-9 and `-`. Found: `{bucketArn#accountId}`",[cf]:e},
bd={[e]:"Invalid region in ARN: `{bucketArn#region}` (invalid DNS name)",[cf]:e},
be={[e]:"Client was configured for partition `{partitionResult#name}` but ARN (`{Bucket}`) has `{bucketPartition#name}`",[cf]:e},
bf={[e]:"Invalid ARN: The ARN may only contain a single resource component after `accesspoint`.",[cf]:e},
bg={[e]:"Invalid ARN: Expected a resource of the format `accesspoint:<accesspoint name>` but no name was provided",[cf]:e},
bh={[co]:[{[cp]:true,[i]:"sigv4",[cq]:A,[cr]:"{bucketArn#region}"}]},
bi={[co]:[{[cp]:true,[i]:y,[cq]:z,[ct]:["*"]},{[cp]:true,[i]:"sigv4",[cq]:z,[cr]:"{bucketArn#region}"}]},
bj={[ch]:E,[ci]:[ac]},
bk={[cl]:"https://s3-fips.dualstack.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:aC,[cs]:{}},
bl={[cl]:"https://s3-fips.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:aC,[cs]:{}},
bm={[cl]:"https://s3.dualstack.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:aC,[cs]:{}},
bn={[cl]:P,[cm]:aC,[cs]:{}},
bo={[cl]:"https://s3.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:aC,[cs]:{}},
bp={[cj]:"UseObjectLambdaEndpoint"},
bq={[co]:[{[cp]:true,[i]:"sigv4",[cq]:I,[cr]:"{Region}"}]},
br={[cl]:"https://s3-fips.dualstack.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
bs={[cl]:"https://s3-fips.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
bt={[cl]:"https://s3.dualstack.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
bu={[cl]:s,[cm]:aC,[cs]:{}},
bv={[cl]:"https://s3.{Region}.{partitionResult#dnsSuffix}",[cm]:aC,[cs]:{}},
bw=[{[cj]:"Region"}],
bx=[{[cj]:"Endpoint"}],
by=[ac],
bz=[X],
bA=[V],
bB=[Y,ad],
bC=[{[ch]:c,[ci]:[{[cj]:"DisableS3ExpressSessionAuth"}]},{[ch]:d,[ci]:[{[cj]:"DisableS3ExpressSessionAuth"},true]}],
bD=[ae],
bE=[ag],
bF=[aj],
bG=[W],
bH=[{[ch]:j,[ci]:[ac,6,14,true],[ck]:"s3expressAvailabilityZoneId"},{[ch]:j,[ci]:[ac,14,16,true],[ck]:"s3expressAvailabilityZoneDelim"},{[ch]:g,[ci]:[{[cj]:"s3expressAvailabilityZoneDelim"},"--"]}],
bI=[{[cg]:[W],[n]:{[cl]:"https://{Bucket}.s3express-fips-{s3expressAvailabilityZoneId}.{Region}.amazonaws.com",[cm]:ah,[cs]:{}},[cf]:n},{[n]:{[cl]:"https://{Bucket}.s3express-{s3expressAvailabilityZoneId}.{Region}.amazonaws.com",[cm]:ah,[cs]:{}},[cf]:n}],
bJ=[{[ch]:j,[ci]:[ac,6,15,true],[ck]:"s3expressAvailabilityZoneId"},{[ch]:j,[ci]:[ac,15,17,true],[ck]:"s3expressAvailabilityZoneDelim"},{[ch]:g,[ci]:[{[cj]:"s3expressAvailabilityZoneDelim"},"--"]}],
bK=[{[cg]:[W],[n]:{[cl]:"https://{Bucket}.s3express-fips-{s3expressAvailabilityZoneId}.{Region}.amazonaws.com",[cm]:al,[cs]:{}},[cf]:n},{[n]:{[cl]:"https://{Bucket}.s3express-{s3expressAvailabilityZoneId}.{Region}.amazonaws.com",[cm]:al,[cs]:{}},[cf]:n}],
bL=[ab],
bM=[{[ch]:x,[ci]:[{[cj]:w},false]}],
bN=[{[ch]:g,[ci]:[{[cj]:u},"beta"]}],
bO=["*"],
bP=[Z],
bQ=[{[ch]:x,[ci]:[{[cj]:"Region"},false]}],
bR=[{[ch]:g,[ci]:[{[cj]:"Region"},"us-east-1"]}],
bS=[{[ch]:g,[ci]:[aR,J]}],
bT=[{[ch]:h,[ci]:[aQ,"resourceId[1]"],[ck]:K},{[ch]:r,[ci]:[{[ch]:g,[ci]:[aT,H]}]}],
bU=[aQ,"resourceId[1]"],
bV=[{[ch]:r,[ci]:[{[ch]:g,[ci]:[{[ch]:h,[ci]:[aQ,"region"]},H]}]}],
bW=[{[ch]:r,[ci]:[{[ch]:c,[ci]:[{[ch]:h,[ci]:[aQ,"resourceId[2]"]}]}]}],
bX=[aQ,"resourceId[2]"],
bY=[{[ch]:f,[ci]:[{[ch]:h,[ci]:[aQ,"region"]}],[ck]:"bucketPartition"}],
bZ=[{[ch]:g,[ci]:[aY,{[ch]:h,[ci]:[{[cj]:"partitionResult"},i]}]}],
ca=[{[ch]:x,[ci]:[{[ch]:h,[ci]:[aQ,"region"]},true]}],
cb=[{[ch]:x,[ci]:[aZ,false]}],
cc=[{[ch]:x,[ci]:[aT,false]}],
cd=[{[ch]:x,[ci]:[{[cj]:"Region"},true]}];
const _data={version:"1.0",parameters:{Bucket:S,Region:S,UseFIPS:T,UseDualStack:T,Endpoint:S,ForcePathStyle:T,Accelerate:T,UseGlobalEndpoint:T,UseObjectLambdaEndpoint:U,Key:S,Prefix:S,CopySource:S,DisableAccessPoints:U,DisableMultiRegionAccessPoints:T,UseArnRegion:U,UseS3ExpressControlEndpoint:U,DisableS3ExpressSessionAuth:U},rules:[{[cg]:[{[ch]:c,[ci]:bw}],rules:[{[cg]:[V,W],error:"Accelerate cannot be used with FIPS",[cf]:e},{[cg]:[X,Y],error:"Cannot set dual-stack in combination with a custom endpoint.",[cf]:e},{[cg]:[Y,W],error:"A custom endpoint cannot be combined with FIPS",[cf]:e},{[cg]:[Y,V],error:"A custom endpoint cannot be combined with S3 Accelerate",[cf]:e},{[cg]:[W,Z,aa],error:"Partition does not support FIPS",[cf]:e},{[cg]:[ab,{[ch]:j,[ci]:[ac,0,6,b],[ck]:k},{[ch]:g,[ci]:[{[cj]:k},"--x-s3"]}],rules:[{[cg]:bz,error:"S3Express does not support Dual-stack.",[cf]:e},{[cg]:bA,error:"S3Express does not support S3 Accelerate.",[cf]:e},{[cg]:bB,rules:[{[cg]:bC,rules:[{[cg]:bD,rules:[{[cg]:bE,rules:[{endpoint:{[cl]:m,[cm]:ah,[cs]:ai},[cf]:n}],[cf]:o}],[cf]:o},{[cg]:bF,rules:[{endpoint:{[cl]:q,[cm]:ah,[cs]:ai},[cf]:n}],[cf]:o},ak],[cf]:o},{[cg]:bD,rules:[{[cg]:bE,rules:[{endpoint:{[cl]:m,[cm]:al,[cs]:ai},[cf]:n}],[cf]:o}],[cf]:o},{[cg]:bF,rules:[{endpoint:{[cl]:q,[cm]:al,[cs]:ai},[cf]:n}],[cf]:o},ak],[cf]:o},{[cg]:[am,an],rules:[{[cg]:[ag,ao],rules:[{[cg]:bG,endpoint:{[cl]:"https://s3express-control-fips.{Region}.amazonaws.com/{uri_encoded_bucket}",[cm]:ah,[cs]:ai},[cf]:n},{endpoint:{[cl]:"https://s3express-control.{Region}.amazonaws.com/{uri_encoded_bucket}",[cm]:ah,[cs]:ai},[cf]:n}],[cf]:o}],[cf]:o},{[cg]:bF,rules:[{[cg]:bC,rules:[{[cg]:bH,rules:bI,[cf]:o},{[cg]:bJ,rules:bI,[cf]:o},ap],[cf]:o},{[cg]:bH,rules:bK,[cf]:o},{[cg]:bJ,rules:bK,[cf]:o},ap],[cf]:o},ak],[cf]:o},{[cg]:[aq,am,an],rules:[{[cg]:bB,endpoint:{[cl]:s,[cm]:ah,[cs]:ai},[cf]:n},{[cg]:bG,endpoint:{[cl]:"https://s3express-control-fips.{Region}.amazonaws.com",[cm]:ah,[cs]:ai},[cf]:n},{endpoint:{[cl]:"https://s3express-control.{Region}.amazonaws.com",[cm]:ah,[cs]:ai},[cf]:n}],[cf]:o},{[cg]:[ab,{[ch]:j,[ci]:[ac,49,50,b],[ck]:t},{[ch]:j,[ci]:[ac,8,12,b],[ck]:u},{[ch]:j,[ci]:[ac,0,7,b],[ck]:v},{[ch]:j,[ci]:[ac,32,49,b],[ck]:w},{[ch]:f,[ci]:bw,[ck]:"regionPartition"},{[ch]:g,[ci]:[{[cj]:v},"--op-s3"]}],rules:[{[cg]:bM,rules:[{[cg]:[{[ch]:g,[ci]:[ar,"e"]}],rules:[{[cg]:bN,rules:[as,{[cg]:bB,endpoint:{[cl]:"https://{Bucket}.ec2.{url#authority}",[cm]:at,[cs]:ai},[cf]:n}],[cf]:o},{endpoint:{[cl]:"https://{Bucket}.ec2.s3-outposts.{Region}.{regionPartition#dnsSuffix}",[cm]:at,[cs]:ai},[cf]:n}],[cf]:o},{[cg]:[{[ch]:g,[ci]:[ar,"o"]}],rules:[{[cg]:bN,rules:[as,{[cg]:bB,endpoint:{[cl]:"https://{Bucket}.op-{outpostId}.{url#authority}",[cm]:at,[cs]:ai},[cf]:n}],[cf]:o},{endpoint:{[cl]:"https://{Bucket}.op-{outpostId}.s3-outposts.{Region}.{regionPartition#dnsSuffix}",[cm]:at,[cs]:ai},[cf]:n}],[cf]:o},{error:"Unrecognized hardware type: \"Expected hardware type o or e but got {hardwareType}\"",[cf]:e}],[cf]:o},{error:"Invalid ARN: The outpost Id must only contain a-z, A-Z, 0-9 and `-`.",[cf]:e}],[cf]:o},{[cg]:bL,rules:[{[cg]:[Y,{[ch]:r,[ci]:[{[ch]:c,[ci]:[{[ch]:l,[ci]:bx}]}]}],error:"Custom endpoint `{Endpoint}` was not a valid URI",[cf]:e},{[cg]:[au,aj],rules:[{[cg]:bP,rules:[{[cg]:bQ,rules:[{[cg]:[V,aa],error:"S3 Accelerate cannot be used in this region",[cf]:e},{[cg]:[X,W,aw,ao,ax],endpoint:{[cl]:"https://{Bucket}.s3-fips.dualstack.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[X,W,aw,ao,az,aA],rules:[{endpoint:aB,[cf]:n}],[cf]:o},{[cg]:[X,W,aw,ao,az,aD],endpoint:aB,[cf]:n},{[cg]:[aE,W,aw,ao,ax],endpoint:{[cl]:"https://{Bucket}.s3-fips.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,W,aw,ao,az,aA],rules:[{endpoint:aF,[cf]:n}],[cf]:o},{[cg]:[aE,W,aw,ao,az,aD],endpoint:aF,[cf]:n},{[cg]:[X,aG,V,ao,ax],endpoint:{[cl]:"https://{Bucket}.s3-accelerate.dualstack.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[X,aG,V,ao,az,aA],rules:[{endpoint:aH,[cf]:n}],[cf]:o},{[cg]:[X,aG,V,ao,az,aD],endpoint:aH,[cf]:n},{[cg]:[X,aG,aw,ao,ax],endpoint:{[cl]:"https://{Bucket}.s3.dualstack.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[X,aG,aw,ao,az,aA],rules:[{endpoint:aI,[cf]:n}],[cf]:o},{[cg]:[X,aG,aw,ao,az,aD],endpoint:aI,[cf]:n},{[cg]:[aE,aG,aw,Y,ad,ae,ax],endpoint:{[cl]:B,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,aG,aw,Y,ad,aJ,ax],endpoint:{[cl]:q,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,aG,aw,Y,ad,ae,az,aA],rules:[{[cg]:bR,endpoint:aK,[cf]:n},{endpoint:aK,[cf]:n}],[cf]:o},{[cg]:[aE,aG,aw,Y,ad,aJ,az,aA],rules:[{[cg]:bR,endpoint:aL,[cf]:n},aM],[cf]:o},{[cg]:[aE,aG,aw,Y,ad,ae,az,aD],endpoint:aK,[cf]:n},{[cg]:[aE,aG,aw,Y,ad,aJ,az,aD],endpoint:aL,[cf]:n},{[cg]:[aE,aG,V,ao,ax],endpoint:{[cl]:C,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,aG,V,ao,az,aA],rules:[{[cg]:bR,endpoint:aN,[cf]:n},{endpoint:aN,[cf]:n}],[cf]:o},{[cg]:[aE,aG,V,ao,az,aD],endpoint:aN,[cf]:n},{[cg]:[aE,aG,aw,ao,ax],endpoint:{[cl]:D,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,aG,aw,ao,az,aA],rules:[{[cg]:bR,endpoint:{[cl]:D,[cm]:aC,[cs]:ai},[cf]:n},{endpoint:aO,[cf]:n}],[cf]:o},{[cg]:[aE,aG,aw,ao,az,aD],endpoint:aO,[cf]:n}],[cf]:o},aP],[cf]:o}],[cf]:o},{[cg]:[Y,ad,{[ch]:g,[ci]:[{[ch]:h,[ci]:[af,"scheme"]},"http"]},{[ch]:p,[ci]:[ac,b]},au,aG,aE,aw],rules:[{[cg]:bP,rules:[{[cg]:bQ,rules:[aM],[cf]:o},aP],[cf]:o}],[cf]:o},{[cg]:[au,{[ch]:E,[ci]:by,[ck]:F}],rules:[{[cg]:[{[ch]:h,[ci]:[aQ,"resourceId[0]"],[ck]:G},{[ch]:r,[ci]:[{[ch]:g,[ci]:[aR,H]}]}],rules:[{[cg]:[{[ch]:g,[ci]:[aS,I]}],rules:[{[cg]:bS,rules:[{[cg]:bT,rules:[aU,aV,{[cg]:bV,rules:[aW,{[cg]:bW,rules:[aX,{[cg]:bY,rules:[{[cg]:bP,rules:[{[cg]:bZ,rules:[{[cg]:ca,rules:[{[cg]:[{[ch]:g,[ci]:[aZ,H]}],error:"Invalid ARN: Missing account id",[cf]:e},{[cg]:cb,rules:[{[cg]:cc,rules:[{[cg]:bB,endpoint:{[cl]:L,[cm]:ba,[cs]:ai},[cf]:n},{[cg]:bG,endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.s3-object-lambda-fips.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:ba,[cs]:ai},[cf]:n},{endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.s3-object-lambda.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:ba,[cs]:ai},[cf]:n}],[cf]:o},bb],[cf]:o},bc],[cf]:o},bd],[cf]:o},be],[cf]:o}],[cf]:o}],[cf]:o},bf],[cf]:o},{error:"Invalid ARN: bucket ARN is missing a region",[cf]:e}],[cf]:o},bg],[cf]:o},{error:"Invalid ARN: Object Lambda ARNs only support `accesspoint` arn types, but found: `{arnType}`",[cf]:e}],[cf]:o},{[cg]:bS,rules:[{[cg]:bT,rules:[{[cg]:bV,rules:[{[cg]:bS,rules:[{[cg]:bV,rules:[aW,{[cg]:bW,rules:[aX,{[cg]:bY,rules:[{[cg]:bP,rules:[{[cg]:[{[ch]:g,[ci]:[aY,"{partitionResult#name}"]}],rules:[{[cg]:ca,rules:[{[cg]:[{[ch]:g,[ci]:[aS,A]}],rules:[{[cg]:cb,rules:[{[cg]:cc,rules:[{[cg]:bA,error:"Access Points do not support S3 Accelerate",[cf]:e},{[cg]:[W,X],endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.s3-accesspoint-fips.dualstack.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:bh,[cs]:ai},[cf]:n},{[cg]:[W,aE],endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.s3-accesspoint-fips.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:bh,[cs]:ai},[cf]:n},{[cg]:[aG,X],endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.s3-accesspoint.dualstack.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:bh,[cs]:ai},[cf]:n},{[cg]:[aG,aE,Y,ad],endpoint:{[cl]:L,[cm]:bh,[cs]:ai},[cf]:n},{[cg]:[aG,aE],endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.s3-accesspoint.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:bh,[cs]:ai},[cf]:n}],[cf]:o},bb],[cf]:o},bc],[cf]:o},{error:"Invalid ARN: The ARN was not for the S3 service, found: {bucketArn#service}",[cf]:e}],[cf]:o},bd],[cf]:o},be],[cf]:o}],[cf]:o}],[cf]:o},bf],[cf]:o}],[cf]:o}],[cf]:o},{[cg]:[{[ch]:x,[ci]:[aT,b]}],rules:[{[cg]:bz,error:"S3 MRAP does not support dual-stack",[cf]:e},{[cg]:bG,error:"S3 MRAP does not support FIPS",[cf]:e},{[cg]:bA,error:"S3 MRAP does not support S3 Accelerate",[cf]:e},{[cg]:[{[ch]:d,[ci]:[{[cj]:"DisableMultiRegionAccessPoints"},b]}],error:"Invalid configuration: Multi-Region Access Point ARNs are disabled.",[cf]:e},{[cg]:[{[ch]:f,[ci]:bw,[ck]:M}],rules:[{[cg]:[{[ch]:g,[ci]:[{[ch]:h,[ci]:[{[cj]:M},i]},{[ch]:h,[ci]:[aQ,"partition"]}]}],rules:[{endpoint:{[cl]:"https://{accessPointName}.accesspoint.s3-global.{mrapPartition#dnsSuffix}",[cm]:{[co]:[{[cp]:b,name:y,[cq]:A,[ct]:bO}]},[cs]:ai},[cf]:n}],[cf]:o},{error:"Client was configured for partition `{mrapPartition#name}` but bucket referred to partition `{bucketArn#partition}`",[cf]:e}],[cf]:o}],[cf]:o},{error:"Invalid Access Point Name",[cf]:e}],[cf]:o},bg],[cf]:o},{[cg]:[{[ch]:g,[ci]:[aS,z]}],rules:[{[cg]:bz,error:"S3 Outposts does not support Dual-stack",[cf]:e},{[cg]:bG,error:"S3 Outposts does not support FIPS",[cf]:e},{[cg]:bA,error:"S3 Outposts does not support S3 Accelerate",[cf]:e},{[cg]:[{[ch]:c,[ci]:[{[ch]:h,[ci]:[aQ,"resourceId[4]"]}]}],error:"Invalid Arn: Outpost Access Point ARN contains sub resources",[cf]:e},{[cg]:[{[ch]:h,[ci]:bU,[ck]:w}],rules:[{[cg]:bM,rules:[aX,{[cg]:bY,rules:[{[cg]:bP,rules:[{[cg]:bZ,rules:[{[cg]:ca,rules:[{[cg]:cb,rules:[{[cg]:[{[ch]:h,[ci]:bX,[ck]:N}],rules:[{[cg]:[{[ch]:h,[ci]:[aQ,"resourceId[3]"],[ck]:K}],rules:[{[cg]:[{[ch]:g,[ci]:[{[cj]:N},J]}],rules:[{[cg]:bB,endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.{outpostId}.{url#authority}",[cm]:bi,[cs]:ai},[cf]:n},{endpoint:{[cl]:"https://{accessPointName}-{bucketArn#accountId}.{outpostId}.s3-outposts.{bucketArn#region}.{bucketPartition#dnsSuffix}",[cm]:bi,[cs]:ai},[cf]:n}],[cf]:o},{error:"Expected an outpost type `accesspoint`, found {outpostType}",[cf]:e}],[cf]:o},{error:"Invalid ARN: expected an access point name",[cf]:e}],[cf]:o},{error:"Invalid ARN: Expected a 4-component resource",[cf]:e}],[cf]:o},bc],[cf]:o},bd],[cf]:o},be],[cf]:o}],[cf]:o}],[cf]:o},{error:"Invalid ARN: The outpost Id may only contain a-z, A-Z, 0-9 and `-`. Found: `{outpostId}`",[cf]:e}],[cf]:o},{error:"Invalid ARN: The Outpost Id was not set",[cf]:e}],[cf]:o},{error:"Invalid ARN: Unrecognized format: {Bucket} (type: {arnType})",[cf]:e}],[cf]:o},{error:"Invalid ARN: No ARN type specified",[cf]:e}],[cf]:o},{[cg]:[{[ch]:j,[ci]:[ac,0,4,a],[ck]:O},{[ch]:g,[ci]:[{[cj]:O},"arn:"]},{[ch]:r,[ci]:[{[ch]:c,[ci]:[bj]}]}],error:"Invalid ARN: `{Bucket}` was not a valid ARN",[cf]:e},{[cg]:[{[ch]:d,[ci]:[av,b]},bj],error:"Path-style addressing cannot be used with ARN buckets",[cf]:e},{[cg]:bE,rules:[{[cg]:bP,rules:[{[cg]:[aw],rules:[{[cg]:[X,ao,W,ax],endpoint:{[cl]:"https://s3-fips.dualstack.us-east-1.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[X,ao,W,az,aA],rules:[{endpoint:bk,[cf]:n}],[cf]:o},{[cg]:[X,ao,W,az,aD],endpoint:bk,[cf]:n},{[cg]:[aE,ao,W,ax],endpoint:{[cl]:"https://s3-fips.us-east-1.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,ao,W,az,aA],rules:[{endpoint:bl,[cf]:n}],[cf]:o},{[cg]:[aE,ao,W,az,aD],endpoint:bl,[cf]:n},{[cg]:[X,ao,aG,ax],endpoint:{[cl]:"https://s3.dualstack.us-east-1.{partitionResult#dnsSuffix}/{uri_encoded_bucket}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[X,ao,aG,az,aA],rules:[{endpoint:bm,[cf]:n}],[cf]:o},{[cg]:[X,ao,aG,az,aD],endpoint:bm,[cf]:n},{[cg]:[aE,Y,ad,aG,ax],endpoint:{[cl]:P,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,Y,ad,aG,az,aA],rules:[{[cg]:bR,endpoint:bn,[cf]:n},{endpoint:bn,[cf]:n}],[cf]:o},{[cg]:[aE,Y,ad,aG,az,aD],endpoint:bn,[cf]:n},{[cg]:[aE,ao,aG,ax],endpoint:{[cl]:Q,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aE,ao,aG,az,aA],rules:[{[cg]:bR,endpoint:{[cl]:Q,[cm]:aC,[cs]:ai},[cf]:n},{endpoint:bo,[cf]:n}],[cf]:o},{[cg]:[aE,ao,aG,az,aD],endpoint:bo,[cf]:n}],[cf]:o},{error:"Path-style addressing cannot be used with S3 Accelerate",[cf]:e}],[cf]:o}],[cf]:o}],[cf]:o},{[cg]:[{[ch]:c,[ci]:[bp]},{[ch]:d,[ci]:[bp,b]}],rules:[{[cg]:bP,rules:[{[cg]:cd,rules:[aU,aV,{[cg]:bB,endpoint:{[cl]:s,[cm]:bq,[cs]:ai},[cf]:n},{[cg]:bG,endpoint:{[cl]:"https://s3-object-lambda-fips.{Region}.{partitionResult#dnsSuffix}",[cm]:bq,[cs]:ai},[cf]:n},{endpoint:{[cl]:"https://s3-object-lambda.{Region}.{partitionResult#dnsSuffix}",[cm]:bq,[cs]:ai},[cf]:n}],[cf]:o},aP],[cf]:o}],[cf]:o},{[cg]:[aq],rules:[{[cg]:bP,rules:[{[cg]:cd,rules:[{[cg]:[W,X,ao,ax],endpoint:{[cl]:"https://s3-fips.dualstack.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[W,X,ao,az,aA],rules:[{endpoint:br,[cf]:n}],[cf]:o},{[cg]:[W,X,ao,az,aD],endpoint:br,[cf]:n},{[cg]:[W,aE,ao,ax],endpoint:{[cl]:"https://s3-fips.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[W,aE,ao,az,aA],rules:[{endpoint:bs,[cf]:n}],[cf]:o},{[cg]:[W,aE,ao,az,aD],endpoint:bs,[cf]:n},{[cg]:[aG,X,ao,ax],endpoint:{[cl]:"https://s3.dualstack.us-east-1.{partitionResult#dnsSuffix}",[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aG,X,ao,az,aA],rules:[{endpoint:bt,[cf]:n}],[cf]:o},{[cg]:[aG,X,ao,az,aD],endpoint:bt,[cf]:n},{[cg]:[aG,aE,Y,ad,ax],endpoint:{[cl]:s,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aG,aE,Y,ad,az,aA],rules:[{[cg]:bR,endpoint:bu,[cf]:n},{endpoint:bu,[cf]:n}],[cf]:o},{[cg]:[aG,aE,Y,ad,az,aD],endpoint:bu,[cf]:n},{[cg]:[aG,aE,ao,ax],endpoint:{[cl]:R,[cm]:ay,[cs]:ai},[cf]:n},{[cg]:[aG,aE,ao,az,aA],rules:[{[cg]:bR,endpoint:{[cl]:R,[cm]:aC,[cs]:ai},[cf]:n},{endpoint:bv,[cf]:n}],[cf]:o},{[cg]:[aG,aE,ao,az,aD],endpoint:bv,[cf]:n}],[cf]:o},aP],[cf]:o}],[cf]:o}],[cf]:o},{error:"A region must be set when sending requests to S3.",[cf]:e}]};
export const ruleSet: RuleSetObject = _data;