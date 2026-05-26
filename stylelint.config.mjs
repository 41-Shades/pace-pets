export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["node_modules/**"],
  rules: {
    "color-hex-length": "long",
    "declaration-no-important": true,
    "declaration-property-value-no-unknown": true,
    "no-unknown-animations": true,
    "no-unknown-custom-properties": true,
  },
};
