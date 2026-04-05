module.exports = {
  extends: ["@gimbi/eslint-config"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      rules: {
        "no-undef": "off",
        "no-unused-vars": "off",
      },
    },
  ],
};
