const { transformSync } = require("esbuild");

module.exports = {
  process(source, sourcePath) {
    const result = transformSync(source, {
      format: "cjs",
      loader: sourcePath.endsWith(".tsx") ? "tsx" : "ts",
      sourcefile: sourcePath,
      target: "node20",
    });

    return { code: result.code };
  },
};
