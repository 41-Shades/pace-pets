import js from "@eslint/js";
import globals from "globals";

const restrictedSyntax = [
  {
    selector: "CallExpression[callee.name='eval']",
    message: "Dynamic code execution is not allowed in extension source.",
  },
  {
    selector: "NewExpression[callee.name='Function']",
    message: "Dynamic code execution is not allowed in extension source.",
  },
  {
    selector: "MemberExpression[object.name='document'][property.name='write']",
    message: "Do not write HTML through document.write.",
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: "Do not inject HTML strings into the dashboard DOM.",
  },
  {
    selector: "AssignmentExpression[left.property.name='innerHTML']",
    message: "Build DOM nodes explicitly instead of assigning innerHTML.",
  },
  {
    selector:
      "MemberExpression[object.object.name='chrome'][object.property.name='storage'][property.name='sync']",
    message: "Extension state must stay local; do not use chrome.storage.sync.",
  },
  {
    selector: "MemberExpression[property.name='sessionStorage']",
    message: "Use the documented local storage surfaces only.",
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: "Do not use environment variables for product behavior.",
  },
  {
    selector:
      "MemberExpression[object.type='MetaProperty'][property.name='env']",
    message: "Do not use environment variables for product behavior.",
  },
];

export default [
  {
    ignores: [
      ".git/",
      "node_modules/",
      "collector/extension/vendor/",
      "data/usage.json",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    rules: {
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", 4],
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["error", 5],
      "no-restricted-syntax": ["error", ...restrictedSyntax],
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        CodexIntegrationConfig: "readonly",
        CodexExtensionStorage: "readonly",
        CodexExtensionRuntime: "readonly",
        CodexProductMetadata: "readonly",
        CodexRefreshStatus: "readonly",
        CodexThemeAssets: "readonly",
        CodexUsageIntegrationAdapters: "readonly",
        CodexUsageHistory: "readonly",
        CodexUsageValues: "readonly",
        CodexWeeklyUsage: "readonly",
        CodexUsageWindows: "readonly",
        GM_xmlhttpRequest: "readonly",
        importScripts: "readonly",
        PacePetsBackgroundBadgePreviewSchedule: "readonly",
        PacePetsBackgroundContextMenu: "readonly",
        PacePetsBackgroundLogic: "readonly",
        PacePetsBackgroundUsageSource: "readonly",
        PacePetsDeveloperOptions: "readonly",
        PacePetsLogic: "readonly",
        PacePetsPreviewControl: "readonly",
        PacePetsRefreshControl: "readonly",
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["eslint.config.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
];
