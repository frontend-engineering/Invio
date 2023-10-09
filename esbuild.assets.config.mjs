import dotenv from "dotenv/config";
import esbuild from "esbuild";
import process from "process";
import builtins from 'builtin-modules'
import cssModulesPlugin from "esbuild-css-modules-plugin"


esbuild
  .build({
    entryPoints: [
      'assets/src/obsidian-styles.txt.js',
      'assets/src/plugin-styles.txt.js',
      'assets/src/webpage.txt.js',
      'assets/src/webpage.util.txt.js',
    ],
    plugins: [cssModulesPlugin({
      force: true,
      emitDeclarationFile: true,
      localsConvention: 'camelCaseOnly',
      namedExports: true,
      inject: false
    })],
    format: "iife",
    outdir: 'assets',
    minify: true,
    bundle: true, 
    keepNames: true, // 保留函数和变量的原始名称
    globalName: 'UtilsGlobal' // 设置全局变量的名称
  })

