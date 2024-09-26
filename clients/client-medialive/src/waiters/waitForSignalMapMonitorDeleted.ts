// smithy-typescript generated code
import { checkExceptions, createWaiter, WaiterConfiguration, WaiterResult, WaiterState } from "@smithy/util-waiter";

import { GetSignalMapCommand, GetSignalMapCommandInput } from "../commands/GetSignalMapCommand";
import { MediaLiveClient } from "../MediaLiveClient";

const checkState = async (client: MediaLiveClient, input: GetSignalMapCommandInput): Promise<WaiterResult> => {
  let reason;
  try {
    const result: any = await client.send(new GetSignalMapCommand(input));
    reason = result;
    try {
      const returnComparator = () => {
        return result.MonitorDeployment.Status;
      };
      if (returnComparator() === "DELETE_COMPLETE") {
        return { state: WaiterState.SUCCESS, reason };
      }
    } catch (e) {}
    try {
      const returnComparator = () => {
        return result.MonitorDeployment.Status;
      };
      if (returnComparator() === "DELETE_IN_PROGRESS") {
        return { state: WaiterState.RETRY, reason };
      }
    } catch (e) {}
    try {
      const returnComparator = () => {
        return result.MonitorDeployment.Status;
      };
      if (returnComparator() === "DELETE_FAILED") {
        return { state: WaiterState.FAILURE, reason };
      }
    } catch (e) {}
  } catch (exception) {
    reason = exception;
  }
  return { state: WaiterState.RETRY, reason };
};
/**
 * Wait until a signal map's monitor has been deleted
 *  @deprecated Use waitUntilSignalMapMonitorDeleted instead. waitForSignalMapMonitorDeleted does not throw error in non-success cases.
 */
export const waitForSignalMapMonitorDeleted = async (
  params: WaiterConfiguration<MediaLiveClient>,
  input: GetSignalMapCommandInput
): Promise<WaiterResult> => {
  const serviceDefaults = { minDelay: 5, maxDelay: 120 };
  return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
/**
 * Wait until a signal map's monitor has been deleted
 *  @param params - Waiter configuration options.
 *  @param input - The input to GetSignalMapCommand for polling.
 */
export const waitUntilSignalMapMonitorDeleted = async (
  params: WaiterConfiguration<MediaLiveClient>,
  input: GetSignalMapCommandInput
): Promise<WaiterResult> => {
  const serviceDefaults = { minDelay: 5, maxDelay: 120 };
  const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
  return checkExceptions(result);
};
