// smithy-typescript generated code
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";

import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteRegistrationFieldValueRequest, DeleteRegistrationFieldValueResult } from "../models/models_0";
import {
  PinpointSMSVoiceV2ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../PinpointSMSVoiceV2Client";
import {
  de_DeleteRegistrationFieldValueCommand,
  se_DeleteRegistrationFieldValueCommand,
} from "../protocols/Aws_json1_0";

/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteRegistrationFieldValueCommand}.
 */
export interface DeleteRegistrationFieldValueCommandInput extends DeleteRegistrationFieldValueRequest {}
/**
 * @public
 *
 * The output of {@link DeleteRegistrationFieldValueCommand}.
 */
export interface DeleteRegistrationFieldValueCommandOutput
  extends DeleteRegistrationFieldValueResult,
    __MetadataBearer {}

/**
 * <p>Delete the value in a registration form field.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { PinpointSMSVoiceV2Client, DeleteRegistrationFieldValueCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2"; // ES Modules import
 * // const { PinpointSMSVoiceV2Client, DeleteRegistrationFieldValueCommand } = require("@aws-sdk/client-pinpoint-sms-voice-v2"); // CommonJS import
 * const client = new PinpointSMSVoiceV2Client(config);
 * const input = { // DeleteRegistrationFieldValueRequest
 *   RegistrationId: "STRING_VALUE", // required
 *   FieldPath: "STRING_VALUE", // required
 * };
 * const command = new DeleteRegistrationFieldValueCommand(input);
 * const response = await client.send(command);
 * // { // DeleteRegistrationFieldValueResult
 * //   RegistrationArn: "STRING_VALUE", // required
 * //   RegistrationId: "STRING_VALUE", // required
 * //   VersionNumber: Number("long"), // required
 * //   FieldPath: "STRING_VALUE", // required
 * //   SelectChoices: [ // SelectChoiceList
 * //     "STRING_VALUE",
 * //   ],
 * //   TextValue: "STRING_VALUE",
 * //   RegistrationAttachmentId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeleteRegistrationFieldValueCommandInput - {@link DeleteRegistrationFieldValueCommandInput}
 * @returns {@link DeleteRegistrationFieldValueCommandOutput}
 * @see {@link DeleteRegistrationFieldValueCommandInput} for command's `input` shape.
 * @see {@link DeleteRegistrationFieldValueCommandOutput} for command's `response` shape.
 * @see {@link PinpointSMSVoiceV2ClientResolvedConfig | config} for PinpointSMSVoiceV2Client's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>The request was denied because you don't have sufficient permissions to access the
 *             resource.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>Your request has conflicting operations. This can occur if you're trying to perform
 *             more than one operation on the same resource at the same time or it could be that the
 *             requested action isn't valid for the current state or configuration of the
 *             resource.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>The API encountered an unexpected error and couldn't complete the request. You might
 *             be able to successfully issue the request again in the future.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>A requested resource couldn't be found.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>An error that occurred because too many requests were sent during a certain amount of
 *             time.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>A validation exception for a field.</p>
 *
 * @throws {@link PinpointSMSVoiceV2ServiceException}
 * <p>Base exception class for all service exceptions from PinpointSMSVoiceV2 service.</p>
 *
 * @public
 */
export class DeleteRegistrationFieldValueCommand extends $Command
  .classBuilder<
    DeleteRegistrationFieldValueCommandInput,
    DeleteRegistrationFieldValueCommandOutput,
    PinpointSMSVoiceV2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >()
  .ep(commonParams)
  .m(function (this: any, Command: any, cs: any, config: PinpointSMSVoiceV2ClientResolvedConfig, o: any) {
    return [
      getSerdePlugin(config, this.serialize, this.deserialize),
      getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("PinpointSMSVoiceV2", "DeleteRegistrationFieldValue", {})
  .n("PinpointSMSVoiceV2Client", "DeleteRegistrationFieldValueCommand")
  .f(void 0, void 0)
  .ser(se_DeleteRegistrationFieldValueCommand)
  .de(de_DeleteRegistrationFieldValueCommand)
  .build() {
  /** @internal type navigation helper, not in runtime. */
  protected declare static __types: {
    api: {
      input: DeleteRegistrationFieldValueRequest;
      output: DeleteRegistrationFieldValueResult;
    };
    sdk: {
      input: DeleteRegistrationFieldValueCommandInput;
      output: DeleteRegistrationFieldValueCommandOutput;
    };
  };
}