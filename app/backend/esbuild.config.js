import esbuild from "esbuild";

esbuild
  .build({
    entryPoints: ["./api.js"],
    bundle: true,
    platform: "node",
    outfile: "./dist/app-bundle.js",
  })
  .catch((e) => console.error(e));
