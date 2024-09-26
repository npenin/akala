// smithy-typescript generated code
import { createAggregatedClient } from "@smithy/smithy-client";
import { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";

import { BedrockAgentRuntimeClient, BedrockAgentRuntimeClientConfig } from "./BedrockAgentRuntimeClient";
import {
  DeleteAgentMemoryCommand,
  DeleteAgentMemoryCommandInput,
  DeleteAgentMemoryCommandOutput,
} from "./commands/DeleteAgentMemoryCommand";
import {
  GetAgentMemoryCommand,
  GetAgentMemoryCommandInput,
  GetAgentMemoryCommandOutput,
} from "./commands/GetAgentMemoryCommand";
import { InvokeAgentCommand, InvokeAgentCommandInput, InvokeAgentCommandOutput } from "./commands/InvokeAgentCommand";
import { InvokeFlowCommand, InvokeFlowCommandInput, InvokeFlowCommandOutput } from "./commands/InvokeFlowCommand";
import {
  RetrieveAndGenerateCommand,
  RetrieveAndGenerateCommandInput,
  RetrieveAndGenerateCommandOutput,
} from "./commands/RetrieveAndGenerateCommand";
import { RetrieveCommand, RetrieveCommandInput, RetrieveCommandOutput } from "./commands/RetrieveCommand";

const commands = {
  DeleteAgentMemoryCommand,
  GetAgentMemoryCommand,
  InvokeAgentCommand,
  InvokeFlowCommand,
  RetrieveCommand,
  RetrieveAndGenerateCommand,
};

export interface BedrockAgentRuntime {
  /**
   * @see {@link DeleteAgentMemoryCommand}
   */
  deleteAgentMemory(
    args: DeleteAgentMemoryCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<DeleteAgentMemoryCommandOutput>;
  deleteAgentMemory(
    args: DeleteAgentMemoryCommandInput,
    cb: (err: any, data?: DeleteAgentMemoryCommandOutput) => void
  ): void;
  deleteAgentMemory(
    args: DeleteAgentMemoryCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: DeleteAgentMemoryCommandOutput) => void
  ): void;

  /**
   * @see {@link GetAgentMemoryCommand}
   */
  getAgentMemory(
    args: GetAgentMemoryCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<GetAgentMemoryCommandOutput>;
  getAgentMemory(args: GetAgentMemoryCommandInput, cb: (err: any, data?: GetAgentMemoryCommandOutput) => void): void;
  getAgentMemory(
    args: GetAgentMemoryCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: GetAgentMemoryCommandOutput) => void
  ): void;

  /**
   * @see {@link InvokeAgentCommand}
   */
  invokeAgent(args: InvokeAgentCommandInput, options?: __HttpHandlerOptions): Promise<InvokeAgentCommandOutput>;
  invokeAgent(args: InvokeAgentCommandInput, cb: (err: any, data?: InvokeAgentCommandOutput) => void): void;
  invokeAgent(
    args: InvokeAgentCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: InvokeAgentCommandOutput) => void
  ): void;

  /**
   * @see {@link InvokeFlowCommand}
   */
  invokeFlow(args: InvokeFlowCommandInput, options?: __HttpHandlerOptions): Promise<InvokeFlowCommandOutput>;
  invokeFlow(args: InvokeFlowCommandInput, cb: (err: any, data?: InvokeFlowCommandOutput) => void): void;
  invokeFlow(
    args: InvokeFlowCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: InvokeFlowCommandOutput) => void
  ): void;

  /**
   * @see {@link RetrieveCommand}
   */
  retrieve(args: RetrieveCommandInput, options?: __HttpHandlerOptions): Promise<RetrieveCommandOutput>;
  retrieve(args: RetrieveCommandInput, cb: (err: any, data?: RetrieveCommandOutput) => void): void;
  retrieve(
    args: RetrieveCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: RetrieveCommandOutput) => void
  ): void;

  /**
   * @see {@link RetrieveAndGenerateCommand}
   */
  retrieveAndGenerate(
    args: RetrieveAndGenerateCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<RetrieveAndGenerateCommandOutput>;
  retrieveAndGenerate(
    args: RetrieveAndGenerateCommandInput,
    cb: (err: any, data?: RetrieveAndGenerateCommandOutput) => void
  ): void;
  retrieveAndGenerate(
    args: RetrieveAndGenerateCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: RetrieveAndGenerateCommandOutput) => void
  ): void;
}

/**
 * <p>Contains APIs related to model invocation and querying of knowledge bases.</p>
 * @public
 */
export class BedrockAgentRuntime extends BedrockAgentRuntimeClient implements BedrockAgentRuntime {}
createAggregatedClient(commands, BedrockAgentRuntime);
