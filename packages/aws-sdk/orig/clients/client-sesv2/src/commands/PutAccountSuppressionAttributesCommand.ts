// smithy-typescript generated code
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";

import { commonParams } from "../endpoint/EndpointParameters";
import { PutAccountSuppressionAttributesRequest, PutAccountSuppressionAttributesResponse } from "../models/models_0";
import {
  de_PutAccountSuppressionAttributesCommand,
  se_PutAccountSuppressionAttributesCommand,
} from "../protocols/Aws_restJson1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";

/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutAccountSuppressionAttributesCommand}.
 */
export interface PutAccountSuppressionAttributesCommandInput extends PutAccountSuppressionAttributesRequest {}
/**
 * @public
 *
 * The output of {@link PutAccountSuppressionAttributesCommand}.
 */
export interface PutAccountSuppressionAttributesCommandOutput
  extends PutAccountSuppressionAttributesResponse,
    __MetadataBearer {}

/**
 * <p>Change the settings for the account-level suppression list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutAccountSuppressionAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutAccountSuppressionAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * const client = new SESv2Client(config);
 * const input = { // PutAccountSuppressionAttributesRequest
 *   SuppressedReasons: [ // SuppressionListReasons
 *     "BOUNCE" || "COMPLAINT",
 *   ],
 * };
 * const command = new PutAccountSuppressionAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutAccountSuppressionAttributesCommandInput - {@link PutAccountSuppressionAttributesCommandInput}
 * @returns {@link PutAccountSuppressionAttributesCommandOutput}
 * @see {@link PutAccountSuppressionAttributesCommandInput} for command's `input` shape.
 * @see {@link PutAccountSuppressionAttributesCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Too many requests have been made to the operation.</p>
 *
 * @throws {@link SESv2ServiceException}
 * <p>Base exception class for all service exceptions from SESv2 service.</p>
 *
 * @public
 */
export class PutAccountSuppressionAttributesCommand extends $Command
  .classBuilder<
    PutAccountSuppressionAttributesCommandInput,
    PutAccountSuppressionAttributesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >()
  .ep(commonParams)
  .m(function (this: any, Command: any, cs: any, config: SESv2ClientResolvedConfig, o: any) {
    return [
      getSerdePlugin(config, this.serialize, this.deserialize),
      getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("SimpleEmailService_v2", "PutAccountSuppressionAttributes", {})
  .n("SESv2Client", "PutAccountSuppressionAttributesCommand")
  .f(void 0, void 0)
  .ser(se_PutAccountSuppressionAttributesCommand)
  .de(de_PutAccountSuppressionAttributesCommand)
  .build() {
  /** @internal type navigation helper, not in runtime. */
  protected declare static __types: {
    api: {
      input: PutAccountSuppressionAttributesRequest;
      output: {};
    };
    sdk: {
      input: PutAccountSuppressionAttributesCommandInput;
      output: PutAccountSuppressionAttributesCommandOutput;
    };
  };
}