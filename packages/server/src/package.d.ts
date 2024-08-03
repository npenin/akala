/**
 * A person who has been involved in creating or maintaining this package
 */
export interface Person
{
  "name": string;
  "url"?: string;
  "email"?: string;
  [k: string]: unknown;
}
export type ScriptsPublishAfter = string;
export type ScriptsInstallAfter = string;
export type ScriptsUninstallBefore = string;
export type ScriptsVersionBefore = string;
export type ScriptsTest = string;
export type ScriptsStop = string;
export type ScriptsStart = string;
export type ScriptsRestart = string;
/**
 * Dependencies are specified with a simple hash of package name to version range. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or git URL.
 */
export interface Dependency
{
  [k: string]: string;
}
export interface CoreProperties
{
  /**
   * The name of the package.
   */
  "name"?: string;
  /**
   * Version must be parseable by node-semver, which is bundled with npm as a dependency.
   */
  "version"?: string;
  /**
   * This helps people discover your package, as it's listed in 'npm search'.
   */
  "description"?: string;
  /**
   * This helps people discover your package as it's listed in 'npm search'.
   */
  "keywords"?: string[];
  /**
   * The url to the project homepage.
   */
  "homepage"?: string;
  /**
   * The url to your project's issue tracker and / or the email address to which issues should be reported. These are helpful for people who encounter issues with your package.
   */
  "bugs"?: {
    /**
     * The url to your project's issue tracker.
     */
    "url"?: string;
    /**
     * The email address to which issues should be reported.
     */
    "email"?: string;
    [k: string]: unknown;
  };
  /**
   * You should specify a license for your package so that people know how they are permitted to use it, and any restrictions you're placing on it.
   */
  "license"?: string;
  /**
   * You should specify a license for your package so that people know how they are permitted to use it, and any restrictions you're placing on it.
   */
  "licenses"?: {
    "type"?: string;
    "url"?: string;
    [k: string]: unknown;
  }[];
  /**
   * A person who has been involved in creating or maintaining this package
   */
  "author"?: Person;
  /**
   * A list of people who contributed to this package.
   */
  "contributors"?: Person[];
  /**
   * A list of people who maintains this package.
   */
  "maintainers"?: Person[];
  /**
   * The 'files' field is an array of files to include in your project. If you name a folder in the array, then it will also include the files inside that folder.
   */
  "files"?: string[];
  /**
   * The main field is a module ID that is the primary entry point to your program.
   */
  "main"?: string;
  "bin"?: {
    [k: string]: string;
  };
  /**
   * Specify either a single file or an array of filenames to put in place for the man program to find.
   */
  "man"?: unknown[] | string;
  "directories"?: {
    /**
     * If you specify a 'bin' directory, then all the files in that folder will be used as the 'bin' hash.
     */
    "bin"?: string;
    /**
     * Put markdown files in here. Eventually, these will be displayed nicely, maybe, someday.
     */
    "doc"?: string;
    /**
     * Put example scripts in here. Someday, it might be exposed in some clever way.
     */
    "example"?: string;
    /**
     * Tell people where the bulk of your library is. Nothing special is done with the lib folder in any way, but it's useful meta info.
     */
    "lib"?: string;
    /**
     * A folder that is full of man pages. Sugar to generate a 'man' array by walking the folder.
     */
    "man"?: string;
    "test"?: string;
    [k: string]: unknown;
  };
  /**
   * Specify the place where your code lives. This is helpful for people who want to contribute.
   */
  "repository"?: {
    "type"?: string;
    "url"?: string;
    [k: string]: unknown;
  };
  /**
   * The 'scripts' member is an object hash of script commands that are run at various times in the lifecycle of your package. The key is the lifecycle event, and the value is the command to run at that point.
   */
  "scripts"?: {
    /**
     * Run BEFORE the package is published (Also run on local npm install without any arguments)
     */
    "prepublish"?: string;
    /**
     * Run AFTER the package is published
     */
    "publish"?: ScriptsPublishAfter;
    /**
     * Run AFTER the package is published
     */
    "postpublish"?: ScriptsPublishAfter;
    /**
     * Run BEFORE the package is installed
     */
    "preinstall"?: string;
    /**
     * Run AFTER the package is installed
     */
    "install"?: ScriptsInstallAfter;
    /**
     * Run AFTER the package is installed
     */
    "postinstall"?: ScriptsInstallAfter;
    /**
     * Run BEFORE the package is uninstalled
     */
    "preuninstall"?: ScriptsUninstallBefore;
    /**
     * Run BEFORE the package is uninstalled
     */
    "uninstall"?: ScriptsUninstallBefore;
    /**
     * Run AFTER the package is uninstalled
     */
    "postuninstall"?: string;
    /**
     * Run BEFORE bump the package version
     */
    "preversion"?: ScriptsVersionBefore;
    /**
     * Run BEFORE bump the package version
     */
    "version"?: ScriptsVersionBefore;
    /**
     * Run AFTER bump the package version
     */
    "postversion"?: string;
    /**
     * Run by the 'npm test' command
     */
    "pretest"?: ScriptsTest;
    /**
     * Run by the 'npm test' command
     */
    "test"?: ScriptsTest;
    /**
     * Run by the 'npm test' command
     */
    "posttest"?: ScriptsTest;
    /**
     * Run by the 'npm stop' command
     */
    "prestop"?: ScriptsStop;
    /**
     * Run by the 'npm stop' command
     */
    "stop"?: ScriptsStop;
    /**
     * Run by the 'npm stop' command
     */
    "poststop"?: ScriptsStop;
    /**
     * Run by the 'npm start' command
     */
    "prestart"?: ScriptsStart;
    /**
     * Run by the 'npm start' command
     */
    "start"?: ScriptsStart;
    /**
     * Run by the 'npm start' command
     */
    "poststart"?: ScriptsStart;
    /**
     * Run by the 'npm restart' command. Note: 'npm restart' will run the stop and start scripts if no restart script is provided.
     */
    "prerestart"?: ScriptsRestart;
    /**
     * Run by the 'npm restart' command. Note: 'npm restart' will run the stop and start scripts if no restart script is provided.
     */
    "restart"?: ScriptsRestart;
    /**
     * Run by the 'npm restart' command. Note: 'npm restart' will run the stop and start scripts if no restart script is provided.
     */
    "postrestart"?: ScriptsRestart;
    [k: string]: string;
  };
  /**
   * A 'config' hash can be used to set configuration parameters used in package scripts that persist across upgrades.
   */
  "config"?: unknown;
  /**
   * Dependencies are specified with a simple hash of package name to version range. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or git URL.
   */
  "dependencies"?: Dependency;
  /**
   * Dependencies are specified with a simple hash of package name to version range. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or git URL.
   */
  "devDependencies"?: Dependency;
  /**
   * Dependencies are specified with a simple hash of package name to version range. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or git URL.
   */
  "optionalDependencies"?: Dependency;
  /**
   * Dependencies are specified with a simple hash of package name to version range. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or git URL.
   */
  "peerDependencies"?: Dependency;
  "engines"?: {
    [k: string]: string;
  };
  "engineStrict"?: boolean;
  /**
   * You can specify which operating systems your module will run on
   */
  "os"?: string[];
  /**
   * If your code only runs on certain cpu architectures, you can specify which ones.
   */
  "cpu"?: string[];
  /**
   * If your package is primarily a command-line application that should be installed globally, then set this value to true to provide a warning if it is installed locally.
   */
  "preferGlobal"?: boolean;
  /**
   * If set to true, then npm will refuse to publish it.
   */
  "private"?: boolean;
  "publishConfig"?: unknown;
  "dist"?: {
    "shasum"?: string;
    "tarball"?: string;
    [k: string]: unknown;
  };
  "readme"?: string;
  [k: string]: unknown;
}
export interface JspmDefinition
{
  "jspm"?: CoreProperties;
  [k: string]: unknown;
}
export type BundledDependency = string[];
export type JsonSchemaForNpmPackageJsonFiles = CoreProperties & JspmDefinition & {
  /**
   * Array of package names that will be bundled when publishing the package.
   */
  "bundleDependencies"?: BundledDependency;
  [k: string]: unknown;
} | {
  /**
   * Array of package names that will be bundled when publishing the package.
   */
  "bundledDependencies"?: BundledDependency;
  [k: string]: unknown;
};