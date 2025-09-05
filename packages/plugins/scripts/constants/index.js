const path = require("path");

const CURRENT_DIR         = __dirname;
const ROOT_DIR            = path.join(__dirname, "../../");
const SRC_DIR             = path.join(ROOT_DIR, "src/");
const PLUGINS_DIR         = path.join(SRC_DIR, "plugins/");
const PLUGINS_LIB_DIR     = path.join(SRC_DIR, "plugins/_lib/");
const PLUGINS_CONFIG_DIR  = path.join(PLUGINS_LIB_DIR, "config");
const PLUGINS_MIXINS_DIR  = path.join(PLUGINS_LIB_DIR, "mixins/");

const PLUGINS_CONFIG_FILE_NAME         = "plugins.json";
const PLUGINS_MODULE_MAPPING_FILE_NAME = "moduleMapping.ts";
const PLUGINS_CONFIG_FILE_PATH         = path.join(PLUGINS_CONFIG_DIR, PLUGINS_CONFIG_FILE_NAME);
const PLUGINS_MODULE_MAPPING_FILE_PATH = path.join(PLUGINS_CONFIG_DIR, PLUGINS_MODULE_MAPPING_FILE_NAME);


module.exports = {
  CURRENT_DIR,
  ROOT_DIR,
  SRC_DIR,
  PLUGINS_DIR,
  PLUGINS_MIXINS_DIR,
  PLUGINS_LIB_DIR,
  PLUGINS_MIXINS_DIR,
  PLUGINS_CONFIG_FILE_PATH,
  PLUGINS_MODULE_MAPPING_FILE_PATH
};
