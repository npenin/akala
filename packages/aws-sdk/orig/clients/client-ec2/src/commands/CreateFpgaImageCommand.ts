// smithy-typescript generated code
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";

import { EC2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../EC2Client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateFpgaImageRequest, CreateFpgaImageResult } from "../models/models_1";
import { de_CreateFpgaImageCommand, se_CreateFpgaImageCommand } from "../protocols/Aws_ec2";

/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateFpgaImageCommand}.
 */
export interface CreateFpgaImageCommandInput extends CreateFpgaImageRequest {}
/**
 * @public
 *
 * The output of {@link CreateFpgaImageCommand}.
 */
export interface CreateFpgaImageCommandOutput extends CreateFpgaImageResult, __MetadataBearer {}

/**
 * <p>Creates an Amazon FPGA Image (AFI) from the specified design checkpoint (DCP).</p>
 *          <p>The create operation is asynchronous. To verify that the AFI is ready for use,
 *          check the output logs.</p>
 *          <p>An AFI contains the FPGA bitstream that is ready to download to an FPGA.
 *          You can securely deploy an AFI on multiple FPGA-accelerated instances.
 *          For more information, see the <a href="https://github.com/aws/aws-fpga/">Amazon Web Services FPGA Hardware Development Kit</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { EC2Client, CreateFpgaImageCommand } from "@aws-sdk/client-ec2"; // ES Modules import
 * // const { EC2Client, CreateFpgaImageCommand } = require("@aws-sdk/client-ec2"); // CommonJS import
 * const client = new EC2Client(config);
 * const input = { // CreateFpgaImageRequest
 *   DryRun: true || false,
 *   InputStorageLocation: { // StorageLocation
 *     Bucket: "STRING_VALUE",
 *     Key: "STRING_VALUE",
 *   },
 *   LogsStorageLocation: {
 *     Bucket: "STRING_VALUE",
 *     Key: "STRING_VALUE",
 *   },
 *   Description: "STRING_VALUE",
 *   Name: "STRING_VALUE",
 *   ClientToken: "STRING_VALUE",
 *   TagSpecifications: [ // TagSpecificationList
 *     { // TagSpecification
 *       ResourceType: "capacity-reservation" || "client-vpn-endpoint" || "customer-gateway" || "carrier-gateway" || "coip-pool" || "dedicated-host" || "dhcp-options" || "egress-only-internet-gateway" || "elastic-ip" || "elastic-gpu" || "export-image-task" || "export-instance-task" || "fleet" || "fpga-image" || "host-reservation" || "image" || "import-image-task" || "import-snapshot-task" || "instance" || "instance-event-window" || "internet-gateway" || "ipam" || "ipam-pool" || "ipam-scope" || "ipv4pool-ec2" || "ipv6pool-ec2" || "key-pair" || "launch-template" || "local-gateway" || "local-gateway-route-table" || "local-gateway-virtual-interface" || "local-gateway-virtual-interface-group" || "local-gateway-route-table-vpc-association" || "local-gateway-route-table-virtual-interface-group-association" || "natgateway" || "network-acl" || "network-interface" || "network-insights-analysis" || "network-insights-path" || "network-insights-access-scope" || "network-insights-access-scope-analysis" || "placement-group" || "prefix-list" || "replace-root-volume-task" || "reserved-instances" || "route-table" || "security-group" || "security-group-rule" || "snapshot" || "spot-fleet-request" || "spot-instances-request" || "subnet" || "subnet-cidr-reservation" || "traffic-mirror-filter" || "traffic-mirror-session" || "traffic-mirror-target" || "transit-gateway" || "transit-gateway-attachment" || "transit-gateway-connect-peer" || "transit-gateway-multicast-domain" || "transit-gateway-policy-table" || "transit-gateway-route-table" || "transit-gateway-route-table-announcement" || "volume" || "vpc" || "vpc-endpoint" || "vpc-endpoint-connection" || "vpc-endpoint-service" || "vpc-endpoint-service-permission" || "vpc-peering-connection" || "vpn-connection" || "vpn-gateway" || "vpc-flow-log" || "capacity-reservation-fleet" || "traffic-mirror-filter-rule" || "vpc-endpoint-connection-device-type" || "verified-access-instance" || "verified-access-group" || "verified-access-endpoint" || "verified-access-policy" || "verified-access-trust-provider" || "vpn-connection-device-type" || "vpc-block-public-access-exclusion" || "ipam-resource-discovery" || "ipam-resource-discovery-association" || "instance-connect-endpoint" || "ipam-external-resource-verification-token",
 *       Tags: [ // TagList
 *         { // Tag
 *           Key: "STRING_VALUE",
 *           Value: "STRING_VALUE",
 *         },
 *       ],
 *     },
 *   ],
 * };
 * const command = new CreateFpgaImageCommand(input);
 * const response = await client.send(command);
 * // { // CreateFpgaImageResult
 * //   FpgaImageId: "STRING_VALUE",
 * //   FpgaImageGlobalId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateFpgaImageCommandInput - {@link CreateFpgaImageCommandInput}
 * @returns {@link CreateFpgaImageCommandOutput}
 * @see {@link CreateFpgaImageCommandInput} for command's `input` shape.
 * @see {@link CreateFpgaImageCommandOutput} for command's `response` shape.
 * @see {@link EC2ClientResolvedConfig | config} for EC2Client's `config` shape.
 *
 * @throws {@link EC2ServiceException}
 * <p>Base exception class for all service exceptions from EC2 service.</p>
 *
 * @public
 */
export class CreateFpgaImageCommand extends $Command
  .classBuilder<
    CreateFpgaImageCommandInput,
    CreateFpgaImageCommandOutput,
    EC2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >()
  .ep(commonParams)
  .m(function (this: any, Command: any, cs: any, config: EC2ClientResolvedConfig, o: any) {
    return [
      getSerdePlugin(config, this.serialize, this.deserialize),
      getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("AmazonEC2", "CreateFpgaImage", {})
  .n("EC2Client", "CreateFpgaImageCommand")
  .f(void 0, void 0)
  .ser(se_CreateFpgaImageCommand)
  .de(de_CreateFpgaImageCommand)
  .build() {
  /** @internal type navigation helper, not in runtime. */
  protected declare static __types: {
    api: {
      input: CreateFpgaImageRequest;
      output: CreateFpgaImageResult;
    };
    sdk: {
      input: CreateFpgaImageCommandInput;
      output: CreateFpgaImageCommandOutput;
    };
  };
}