// smithy-typescript generated code
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";

import { commonParams } from "../endpoint/EndpointParameters";
import { GetDomainDeliverabilityCampaignRequest, GetDomainDeliverabilityCampaignResponse } from "../models/models_0";
import { PinpointEmailClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../PinpointEmailClient";
import {
  de_GetDomainDeliverabilityCampaignCommand,
  se_GetDomainDeliverabilityCampaignCommand,
} from "../protocols/Aws_restJson1";

/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDomainDeliverabilityCampaignCommand}.
 */
export interface GetDomainDeliverabilityCampaignCommandInput extends GetDomainDeliverabilityCampaignRequest {}
/**
 * @public
 *
 * The output of {@link GetDomainDeliverabilityCampaignCommand}.
 */
export interface GetDomainDeliverabilityCampaignCommandOutput
  extends GetDomainDeliverabilityCampaignResponse,
    __MetadataBearer {}

/**
 * <p>Retrieve all the deliverability data for a specific campaign. This data is available
 *             for a campaign only if the campaign sent email by using a domain that the
 *             Deliverability dashboard is enabled for (<code>PutDeliverabilityDashboardOption</code>
 *             operation).</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { PinpointEmailClient, GetDomainDeliverabilityCampaignCommand } from "@aws-sdk/client-pinpoint-email"; // ES Modules import
 * // const { PinpointEmailClient, GetDomainDeliverabilityCampaignCommand } = require("@aws-sdk/client-pinpoint-email"); // CommonJS import
 * const client = new PinpointEmailClient(config);
 * const input = { // GetDomainDeliverabilityCampaignRequest
 *   CampaignId: "STRING_VALUE", // required
 * };
 * const command = new GetDomainDeliverabilityCampaignCommand(input);
 * const response = await client.send(command);
 * // { // GetDomainDeliverabilityCampaignResponse
 * //   DomainDeliverabilityCampaign: { // DomainDeliverabilityCampaign
 * //     CampaignId: "STRING_VALUE",
 * //     ImageUrl: "STRING_VALUE",
 * //     Subject: "STRING_VALUE",
 * //     FromAddress: "STRING_VALUE",
 * //     SendingIps: [ // IpList
 * //       "STRING_VALUE",
 * //     ],
 * //     FirstSeenDateTime: new Date("TIMESTAMP"),
 * //     LastSeenDateTime: new Date("TIMESTAMP"),
 * //     InboxCount: Number("long"),
 * //     SpamCount: Number("long"),
 * //     ReadRate: Number("double"),
 * //     DeleteRate: Number("double"),
 * //     ReadDeleteRate: Number("double"),
 * //     ProjectedVolume: Number("long"),
 * //     Esps: [ // Esps
 * //       "STRING_VALUE",
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param GetDomainDeliverabilityCampaignCommandInput - {@link GetDomainDeliverabilityCampaignCommandInput}
 * @returns {@link GetDomainDeliverabilityCampaignCommandOutput}
 * @see {@link GetDomainDeliverabilityCampaignCommandInput} for command's `input` shape.
 * @see {@link GetDomainDeliverabilityCampaignCommandOutput} for command's `response` shape.
 * @see {@link PinpointEmailClientResolvedConfig | config} for PinpointEmailClient's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link NotFoundException} (client fault)
 *  <p>The resource you attempted to access doesn't exist.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Too many requests have been made to the operation.</p>
 *
 * @throws {@link PinpointEmailServiceException}
 * <p>Base exception class for all service exceptions from PinpointEmail service.</p>
 *
 * @public
 */
export class GetDomainDeliverabilityCampaignCommand extends $Command
  .classBuilder<
    GetDomainDeliverabilityCampaignCommandInput,
    GetDomainDeliverabilityCampaignCommandOutput,
    PinpointEmailClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >()
  .ep(commonParams)
  .m(function (this: any, Command: any, cs: any, config: PinpointEmailClientResolvedConfig, o: any) {
    return [
      getSerdePlugin(config, this.serialize, this.deserialize),
      getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("AmazonPinpointEmailService", "GetDomainDeliverabilityCampaign", {})
  .n("PinpointEmailClient", "GetDomainDeliverabilityCampaignCommand")
  .f(void 0, void 0)
  .ser(se_GetDomainDeliverabilityCampaignCommand)
  .de(de_GetDomainDeliverabilityCampaignCommand)
  .build() {
  /** @internal type navigation helper, not in runtime. */
  protected declare static __types: {
    api: {
      input: GetDomainDeliverabilityCampaignRequest;
      output: GetDomainDeliverabilityCampaignResponse;
    };
    sdk: {
      input: GetDomainDeliverabilityCampaignCommandInput;
      output: GetDomainDeliverabilityCampaignCommandOutput;
    };
  };
}