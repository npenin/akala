// smithy-typescript generated code
import {
  getHostHeaderPlugin,
  HostHeaderInputConfig,
  HostHeaderResolvedConfig,
  resolveHostHeaderConfig,
} from "@aws-sdk/middleware-host-header";
import { getLoggerPlugin } from "@aws-sdk/middleware-logger";
import { getRecursionDetectionPlugin } from "@aws-sdk/middleware-recursion-detection";
import {
  getUserAgentPlugin,
  resolveUserAgentConfig,
  UserAgentInputConfig,
  UserAgentResolvedConfig,
} from "@aws-sdk/middleware-user-agent";
import { RegionInputConfig, RegionResolvedConfig, resolveRegionConfig } from "@smithy/config-resolver";
import {
  DefaultIdentityProviderConfig,
  getHttpAuthSchemeEndpointRuleSetPlugin,
  getHttpSigningPlugin,
} from "@smithy/core";
import { getContentLengthPlugin } from "@smithy/middleware-content-length";
import { EndpointInputConfig, EndpointResolvedConfig, resolveEndpointConfig } from "@smithy/middleware-endpoint";
import { getRetryPlugin, resolveRetryConfig, RetryInputConfig, RetryResolvedConfig } from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import {
  Client as __Client,
  DefaultsMode as __DefaultsMode,
  SmithyConfiguration as __SmithyConfiguration,
  SmithyResolvedConfiguration as __SmithyResolvedConfiguration,
} from "@smithy/smithy-client";
import {
  AwsCredentialIdentityProvider,
  BodyLengthCalculator as __BodyLengthCalculator,
  CheckOptionalClientConfig as __CheckOptionalClientConfig,
  ChecksumConstructor as __ChecksumConstructor,
  Decoder as __Decoder,
  Encoder as __Encoder,
  EndpointV2 as __EndpointV2,
  HashConstructor as __HashConstructor,
  HttpHandlerOptions as __HttpHandlerOptions,
  Logger as __Logger,
  Provider as __Provider,
  Provider,
  StreamCollector as __StreamCollector,
  UrlParser as __UrlParser,
  UserAgent as __UserAgent,
} from "@smithy/types";

import {
  defaultAmplifyUIBuilderHttpAuthSchemeParametersProvider,
  HttpAuthSchemeInputConfig,
  HttpAuthSchemeResolvedConfig,
  resolveHttpAuthSchemeConfig,
} from "./auth/httpAuthSchemeProvider";
import { CreateComponentCommandInput, CreateComponentCommandOutput } from "./commands/CreateComponentCommand";
import { CreateFormCommandInput, CreateFormCommandOutput } from "./commands/CreateFormCommand";
import { CreateThemeCommandInput, CreateThemeCommandOutput } from "./commands/CreateThemeCommand";
import { DeleteComponentCommandInput, DeleteComponentCommandOutput } from "./commands/DeleteComponentCommand";
import { DeleteFormCommandInput, DeleteFormCommandOutput } from "./commands/DeleteFormCommand";
import { DeleteThemeCommandInput, DeleteThemeCommandOutput } from "./commands/DeleteThemeCommand";
import {
  ExchangeCodeForTokenCommandInput,
  ExchangeCodeForTokenCommandOutput,
} from "./commands/ExchangeCodeForTokenCommand";
import { ExportComponentsCommandInput, ExportComponentsCommandOutput } from "./commands/ExportComponentsCommand";
import { ExportFormsCommandInput, ExportFormsCommandOutput } from "./commands/ExportFormsCommand";
import { ExportThemesCommandInput, ExportThemesCommandOutput } from "./commands/ExportThemesCommand";
import { GetCodegenJobCommandInput, GetCodegenJobCommandOutput } from "./commands/GetCodegenJobCommand";
import { GetComponentCommandInput, GetComponentCommandOutput } from "./commands/GetComponentCommand";
import { GetFormCommandInput, GetFormCommandOutput } from "./commands/GetFormCommand";
import { GetMetadataCommandInput, GetMetadataCommandOutput } from "./commands/GetMetadataCommand";
import { GetThemeCommandInput, GetThemeCommandOutput } from "./commands/GetThemeCommand";
import { ListCodegenJobsCommandInput, ListCodegenJobsCommandOutput } from "./commands/ListCodegenJobsCommand";
import { ListComponentsCommandInput, ListComponentsCommandOutput } from "./commands/ListComponentsCommand";
import { ListFormsCommandInput, ListFormsCommandOutput } from "./commands/ListFormsCommand";
import {
  ListTagsForResourceCommandInput,
  ListTagsForResourceCommandOutput,
} from "./commands/ListTagsForResourceCommand";
import { ListThemesCommandInput, ListThemesCommandOutput } from "./commands/ListThemesCommand";
import { PutMetadataFlagCommandInput, PutMetadataFlagCommandOutput } from "./commands/PutMetadataFlagCommand";
import { RefreshTokenCommandInput, RefreshTokenCommandOutput } from "./commands/RefreshTokenCommand";
import { StartCodegenJobCommandInput, StartCodegenJobCommandOutput } from "./commands/StartCodegenJobCommand";
import { TagResourceCommandInput, TagResourceCommandOutput } from "./commands/TagResourceCommand";
import { UntagResourceCommandInput, UntagResourceCommandOutput } from "./commands/UntagResourceCommand";
import { UpdateComponentCommandInput, UpdateComponentCommandOutput } from "./commands/UpdateComponentCommand";
import { UpdateFormCommandInput, UpdateFormCommandOutput } from "./commands/UpdateFormCommand";
import { UpdateThemeCommandInput, UpdateThemeCommandOutput } from "./commands/UpdateThemeCommand";
import {
  ClientInputEndpointParameters,
  ClientResolvedEndpointParameters,
  EndpointParameters,
  resolveClientEndpointParameters,
} from "./endpoint/EndpointParameters";
import { getRuntimeConfig as __getRuntimeConfig } from "./runtimeConfig";
import { resolveRuntimeExtensions, RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";

export { __Client };

/**
 * @public
 */
export type ServiceInputTypes =
  | CreateComponentCommandInput
  | CreateFormCommandInput
  | CreateThemeCommandInput
  | DeleteComponentCommandInput
  | DeleteFormCommandInput
  | DeleteThemeCommandInput
  | ExchangeCodeForTokenCommandInput
  | ExportComponentsCommandInput
  | ExportFormsCommandInput
  | ExportThemesCommandInput
  | GetCodegenJobCommandInput
  | GetComponentCommandInput
  | GetFormCommandInput
  | GetMetadataCommandInput
  | GetThemeCommandInput
  | ListCodegenJobsCommandInput
  | ListComponentsCommandInput
  | ListFormsCommandInput
  | ListTagsForResourceCommandInput
  | ListThemesCommandInput
  | PutMetadataFlagCommandInput
  | RefreshTokenCommandInput
  | StartCodegenJobCommandInput
  | TagResourceCommandInput
  | UntagResourceCommandInput
  | UpdateComponentCommandInput
  | UpdateFormCommandInput
  | UpdateThemeCommandInput;

/**
 * @public
 */
export type ServiceOutputTypes =
  | CreateComponentCommandOutput
  | CreateFormCommandOutput
  | CreateThemeCommandOutput
  | DeleteComponentCommandOutput
  | DeleteFormCommandOutput
  | DeleteThemeCommandOutput
  | ExchangeCodeForTokenCommandOutput
  | ExportComponentsCommandOutput
  | ExportFormsCommandOutput
  | ExportThemesCommandOutput
  | GetCodegenJobCommandOutput
  | GetComponentCommandOutput
  | GetFormCommandOutput
  | GetMetadataCommandOutput
  | GetThemeCommandOutput
  | ListCodegenJobsCommandOutput
  | ListComponentsCommandOutput
  | ListFormsCommandOutput
  | ListTagsForResourceCommandOutput
  | ListThemesCommandOutput
  | PutMetadataFlagCommandOutput
  | RefreshTokenCommandOutput
  | StartCodegenJobCommandOutput
  | TagResourceCommandOutput
  | UntagResourceCommandOutput
  | UpdateComponentCommandOutput
  | UpdateFormCommandOutput
  | UpdateThemeCommandOutput;

/**
 * @public
 */
export interface ClientDefaults extends Partial<__SmithyConfiguration<__HttpHandlerOptions>> {
  /**
   * The HTTP handler to use or its constructor options. Fetch in browser and Https in Nodejs.
   */
  requestHandler?: __HttpHandlerUserInput;

  /**
   * A constructor for a class implementing the {@link @smithy/types#ChecksumConstructor} interface
   * that computes the SHA-256 HMAC or checksum of a string or binary buffer.
   * @internal
   */
  sha256?: __ChecksumConstructor | __HashConstructor;

  /**
   * The function that will be used to convert strings into HTTP endpoints.
   * @internal
   */
  urlParser?: __UrlParser;

  /**
   * A function that can calculate the length of a request body.
   * @internal
   */
  bodyLengthChecker?: __BodyLengthCalculator;

  /**
   * A function that converts a stream into an array of bytes.
   * @internal
   */
  streamCollector?: __StreamCollector;

  /**
   * The function that will be used to convert a base64-encoded string to a byte array.
   * @internal
   */
  base64Decoder?: __Decoder;

  /**
   * The function that will be used to convert binary data to a base64-encoded string.
   * @internal
   */
  base64Encoder?: __Encoder;

  /**
   * The function that will be used to convert a UTF8-encoded string to a byte array.
   * @internal
   */
  utf8Decoder?: __Decoder;

  /**
   * The function that will be used to convert binary data to a UTF-8 encoded string.
   * @internal
   */
  utf8Encoder?: __Encoder;

  /**
   * The runtime environment.
   * @internal
   */
  runtime?: string;

  /**
   * Disable dynamically changing the endpoint of the client based on the hostPrefix
   * trait of an operation.
   */
  disableHostPrefix?: boolean;

  /**
   * Unique service identifier.
   * @internal
   */
  serviceId?: string;

  /**
   * Enables IPv6/IPv4 dualstack endpoint.
   */
  useDualstackEndpoint?: boolean | __Provider<boolean>;

  /**
   * Enables FIPS compatible endpoints.
   */
  useFipsEndpoint?: boolean | __Provider<boolean>;

  /**
   * The AWS region to which this client will send requests
   */
  region?: string | __Provider<string>;

  /**
   * The provider populating default tracking information to be sent with `user-agent`, `x-amz-user-agent` header
   * @internal
   */
  defaultUserAgentProvider?: Provider<__UserAgent>;

  /**
   * Default credentials provider; Not available in browser runtime.
   * @deprecated
   * @internal
   */
  credentialDefaultProvider?: (input: any) => AwsCredentialIdentityProvider;

  /**
   * Value for how many times a request will be made at most in case of retry.
   */
  maxAttempts?: number | __Provider<number>;

  /**
   * Specifies which retry algorithm to use.
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-util-retry/Enum/RETRY_MODES/
   *
   */
  retryMode?: string | __Provider<string>;

  /**
   * Optional logger for logging debug/info/warn/error.
   */
  logger?: __Logger;

  /**
   * Optional extensions
   */
  extensions?: RuntimeExtension[];

  /**
   * The {@link @smithy/smithy-client#DefaultsMode} that will be used to determine how certain default configuration options are resolved in the SDK.
   */
  defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
}

/**
 * @public
 */
export type AmplifyUIBuilderClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> &
  ClientDefaults &
  UserAgentInputConfig &
  RetryInputConfig &
  RegionInputConfig &
  HostHeaderInputConfig &
  EndpointInputConfig<EndpointParameters> &
  HttpAuthSchemeInputConfig &
  ClientInputEndpointParameters;
/**
 * @public
 *
 *  The configuration interface of AmplifyUIBuilderClient class constructor that set the region, credentials and other options.
 */
export interface AmplifyUIBuilderClientConfig extends AmplifyUIBuilderClientConfigType {}

/**
 * @public
 */
export type AmplifyUIBuilderClientResolvedConfigType = __SmithyResolvedConfiguration<__HttpHandlerOptions> &
  Required<ClientDefaults> &
  RuntimeExtensionsConfig &
  UserAgentResolvedConfig &
  RetryResolvedConfig &
  RegionResolvedConfig &
  HostHeaderResolvedConfig &
  EndpointResolvedConfig<EndpointParameters> &
  HttpAuthSchemeResolvedConfig &
  ClientResolvedEndpointParameters;
/**
 * @public
 *
 *  The resolved configuration interface of AmplifyUIBuilderClient class. This is resolved and normalized from the {@link AmplifyUIBuilderClientConfig | constructor configuration interface}.
 */
export interface AmplifyUIBuilderClientResolvedConfig extends AmplifyUIBuilderClientResolvedConfigType {}

/**
 * <p>The Amplify UI Builder API provides a programmatic interface for creating
 *       and configuring user interface (UI) component libraries and themes for use in your Amplify applications. You can then connect these UI components to an application's
 *       backend Amazon Web Services resources.</p>
 *          <p>You can also use the Amplify Studio visual designer to create UI components
 *       and model data for an app. For more information, see <a href="https://docs.amplify.aws/console/adminui/intro">Introduction</a> in the
 *       <i>Amplify Docs</i>.</p>
 *          <p>The Amplify Framework is a comprehensive set of SDKs, libraries, tools, and
 *       documentation for client app development. For more information, see the <a href="https://docs.amplify.aws/">Amplify Framework</a>. For more information about
 *       deploying an Amplify application to Amazon Web Services, see the <a href="https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html">Amplify User Guide</a>.</p>
 * @public
 */
export class AmplifyUIBuilderClient extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes,
  AmplifyUIBuilderClientResolvedConfig
> {
  /**
   * The resolved configuration of AmplifyUIBuilderClient class. This is resolved and normalized from the {@link AmplifyUIBuilderClientConfig | constructor configuration interface}.
   */
  readonly config: AmplifyUIBuilderClientResolvedConfig;

  constructor(...[configuration]: __CheckOptionalClientConfig<AmplifyUIBuilderClientConfig>) {
    const _config_0 = __getRuntimeConfig(configuration || {});
    const _config_1 = resolveClientEndpointParameters(_config_0);
    const _config_2 = resolveUserAgentConfig(_config_1);
    const _config_3 = resolveRetryConfig(_config_2);
    const _config_4 = resolveRegionConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveEndpointConfig(_config_5);
    const _config_7 = resolveHttpAuthSchemeConfig(_config_6);
    const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
    super(_config_8);
    this.config = _config_8;
    this.middlewareStack.use(getUserAgentPlugin(this.config));
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(
      getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
        httpAuthSchemeParametersProvider: defaultAmplifyUIBuilderHttpAuthSchemeParametersProvider,
        identityProviderConfigProvider: async (config: AmplifyUIBuilderClientResolvedConfig) =>
          new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials,
          }),
      })
    );
    this.middlewareStack.use(getHttpSigningPlugin(this.config));
  }

  /**
   * Destroy underlying resources, like sockets. It's usually not necessary to do this.
   * However in Node.js, it's best to explicitly shut down the client's agent when it is no longer needed.
   * Otherwise, sockets might stay open for quite a long time before the server terminates them.
   */
  destroy(): void {
    super.destroy();
  }
}