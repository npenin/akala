// smithy-typescript generated code
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";

import { commonParams } from "../endpoint/EndpointParameters";
import { ActivityTaskStatus, RecordActivityTaskHeartbeatInput } from "../models/models_0";
import { de_RecordActivityTaskHeartbeatCommand, se_RecordActivityTaskHeartbeatCommand } from "../protocols/Aws_json1_0";
import { ServiceInputTypes, ServiceOutputTypes, SWFClientResolvedConfig } from "../SWFClient";

/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RecordActivityTaskHeartbeatCommand}.
 */
export interface RecordActivityTaskHeartbeatCommandInput extends RecordActivityTaskHeartbeatInput {}
/**
 * @public
 *
 * The output of {@link RecordActivityTaskHeartbeatCommand}.
 */
export interface RecordActivityTaskHeartbeatCommandOutput extends ActivityTaskStatus, __MetadataBearer {}

/**
 * <p>Used by activity workers to report to the service that the <a>ActivityTask</a> represented by the specified <code>taskToken</code> is still making progress. The worker
 *       can also specify details of the progress, for example percent complete, using the
 *         <code>details</code> parameter. This action can also be used by the worker as a mechanism to
 *       check if cancellation is being requested for the activity task. If a cancellation is being
 *       attempted for the specified task, then the boolean <code>cancelRequested</code> flag returned
 *       by the service is set to <code>true</code>.</p>
 *          <p>This action resets the <code>taskHeartbeatTimeout</code> clock. The
 *         <code>taskHeartbeatTimeout</code> is specified in <a>RegisterActivityType</a>.</p>
 *          <p>This action doesn't in itself create an event in the workflow execution history.
 *       However, if the task times out, the workflow execution history contains a
 *         <code>ActivityTaskTimedOut</code> event that contains the information from the last
 *       heartbeat generated by the activity worker.</p>
 *          <note>
 *             <p>The <code>taskStartToCloseTimeout</code> of an activity type is the maximum duration
 *         of an activity task, regardless of the number of <a>RecordActivityTaskHeartbeat</a> requests received. The <code>taskStartToCloseTimeout</code> is also specified in <a>RegisterActivityType</a>.</p>
 *          </note>
 *          <note>
 *             <p>This operation is only useful for long-lived activities to report liveliness of the
 *         task and to determine if a cancellation is being attempted.</p>
 *          </note>
 *          <important>
 *             <p>If the <code>cancelRequested</code> flag returns <code>true</code>, a cancellation is
 *         being attempted. If the worker can cancel the activity, it should respond with <a>RespondActivityTaskCanceled</a>. Otherwise, it should ignore the cancellation
 *         request.</p>
 *          </important>
 *          <p>
 *             <b>Access Control</b>
 *          </p>
 *          <p>You can use IAM policies to control this action's access to Amazon SWF resources as
 *       follows:</p>
 *          <ul>
 *             <li>
 *                <p>Use a <code>Resource</code> element with the domain name to limit the action to
 *           only specified domains.</p>
 *             </li>
 *             <li>
 *                <p>Use an <code>Action</code> element to allow or deny permission to call this
 *           action.</p>
 *             </li>
 *             <li>
 *                <p>You cannot use an IAM policy to constrain this action's parameters.</p>
 *             </li>
 *          </ul>
 *          <p>If the caller doesn't have sufficient permissions to invoke the action, or the
 *       parameter values fall outside the specified constraints, the action fails. The associated
 *       event attribute's <code>cause</code> parameter is set to <code>OPERATION_NOT_PERMITTED</code>.
 *       For details and example IAM policies, see <a href="https://docs.aws.amazon.com/amazonswf/latest/developerguide/swf-dev-iam.html">Using IAM to Manage Access to Amazon SWF
 *         Workflows</a> in the <i>Amazon SWF Developer Guide</i>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SWFClient, RecordActivityTaskHeartbeatCommand } from "@aws-sdk/client-swf"; // ES Modules import
 * // const { SWFClient, RecordActivityTaskHeartbeatCommand } = require("@aws-sdk/client-swf"); // CommonJS import
 * const client = new SWFClient(config);
 * const input = { // RecordActivityTaskHeartbeatInput
 *   taskToken: "STRING_VALUE", // required
 *   details: "STRING_VALUE",
 * };
 * const command = new RecordActivityTaskHeartbeatCommand(input);
 * const response = await client.send(command);
 * // { // ActivityTaskStatus
 * //   cancelRequested: true || false, // required
 * // };
 *
 * ```
 *
 * @param RecordActivityTaskHeartbeatCommandInput - {@link RecordActivityTaskHeartbeatCommandInput}
 * @returns {@link RecordActivityTaskHeartbeatCommandOutput}
 * @see {@link RecordActivityTaskHeartbeatCommandInput} for command's `input` shape.
 * @see {@link RecordActivityTaskHeartbeatCommandOutput} for command's `response` shape.
 * @see {@link SWFClientResolvedConfig | config} for SWFClient's `config` shape.
 *
 * @throws {@link OperationNotPermittedFault} (client fault)
 *  <p>Returned when the caller doesn't have sufficient permissions to invoke the action.</p>
 *
 * @throws {@link UnknownResourceFault} (client fault)
 *  <p>Returned when the named resource cannot be found with in the scope of this operation (region or domain). This could happen if the named resource was never created or is no longer available for this operation.</p>
 *
 * @throws {@link SWFServiceException}
 * <p>Base exception class for all service exceptions from SWF service.</p>
 *
 * @public
 */
export class RecordActivityTaskHeartbeatCommand extends $Command
  .classBuilder<
    RecordActivityTaskHeartbeatCommandInput,
    RecordActivityTaskHeartbeatCommandOutput,
    SWFClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >()
  .ep(commonParams)
  .m(function (this: any, Command: any, cs: any, config: SWFClientResolvedConfig, o: any) {
    return [
      getSerdePlugin(config, this.serialize, this.deserialize),
      getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("SimpleWorkflowService", "RecordActivityTaskHeartbeat", {})
  .n("SWFClient", "RecordActivityTaskHeartbeatCommand")
  .f(void 0, void 0)
  .ser(se_RecordActivityTaskHeartbeatCommand)
  .de(de_RecordActivityTaskHeartbeatCommand)
  .build() {
  /** @internal type navigation helper, not in runtime. */
  protected declare static __types: {
    api: {
      input: RecordActivityTaskHeartbeatInput;
      output: ActivityTaskStatus;
    };
    sdk: {
      input: RecordActivityTaskHeartbeatCommandInput;
      output: RecordActivityTaskHeartbeatCommandOutput;
    };
  };
}