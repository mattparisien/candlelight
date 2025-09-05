import { PluginConfiguration } from "../ts/types";

export const COMPANY_NAME = "CandleLight";
export const COMPANY_NAME_UPPER = COMPANY_NAME.toUpperCase();
export const COMPANY_NAME_LOWER = COMPANY_NAME.toLocaleLowerCase();

export const PLUGIN_SELECTOR_MAPPING = new Map();
PLUGIN_SELECTOR_MAPPING.set("MagneticButton", ".sqs-button-block");

export const PLUGIN_MODULE_MAPPING = {
  MagneticButton: () => import("../../MagneticButton/model"),
};
