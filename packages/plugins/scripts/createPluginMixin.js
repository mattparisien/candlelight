const { writeFile, appendToIndexFile } = require("./utils");
const { PLUGINS_MIXINS_DIR } = require("./constants");
const path = require("path");
const fs = require("fs");

const createMixinFromTemplate = (mixinName) => `
import { Constructor } from "../ts/types";

interface I${mixinName} {}

function ${mixinName}Mixin<T extends Constructor>(Base: T) {
  return class extends Base implements I${mixinName} {
    element: HTMLElement;

    constructor(...args: any[]) {
      const element = args[0];
      super(element);

      if (!(this.element instanceof HTMLElement)) {
        throw new Error("First argument must be an HTMLElement");
      }
    }
  };
}

export default ${mixinName}Mixin;

`;

const writeMixinFile = (targetFilePath, mixinFileContent) => {
  writeFile(targetFilePath, mixinFileContent);
};

const mixinName = process.argv.slice(0 + 2)?.[0];
const mixinFileContent = createMixinFromTemplate(mixinName);

const mixinDirectory = PLUGINS_MIXINS_DIR;
const mixinFileExtension = ".ts";
const mixinFileNameIdentifier = "Mixin";
const mixinFileName = mixinName + mixinFileNameIdentifier;
const mixinFilePath = path.join(
  mixinDirectory,
  mixinFileName + mixinFileExtension
);

const mixinIndexFileExtension = ".ts";
const mixinIndexFilePath = path.join(
  mixinDirectory,
  "index" + mixinIndexFileExtension
);

writeMixinFile(mixinFilePath, mixinFileContent);
appendToIndexFile(mixinFileName, mixinIndexFilePath);
