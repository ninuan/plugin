#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);

function usage() {
  console.log(`Usage: node tools/convert-quanx-icons.mjs [input-dir] [options]

Defaults:
  input-dir         mini/inbox
  output dir        mini/Alpha
  icon json         mini/icon.json
  size              144
  fuzz              38

Options:
  --out <dir>       Output directory for converted PNG files
  --json <file>     Quantumult X icon JSON to update
  --base-url <url>  Base raw URL for generated icon entries
  --size <px>       Square canvas size
  --fuzz <percent>  White-background flood fill tolerance
  --no-bg           Do not remove edge-connected white background
  --drop-white      Remove all near-white pixels, useful for white app tiles
  --no-trim         Do not trim transparent padding before centering
  --no-json         Convert only, do not update icon JSON
  --help            Show this help
`);
}

function parseArgs(argv) {
  const options = {
    inputDir: "mini/inbox",
    outDir: "mini/Alpha",
    jsonFile: "mini/icon.json",
    baseUrl: null,
    size: 144,
    fuzz: 38,
    removeBg: true,
    dropWhite: false,
    trim: true,
    updateJson: true,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--no-bg") {
      options.removeBg = false;
      continue;
    }
    if (arg === "--drop-white") {
      options.dropWhite = true;
      continue;
    }
    if (arg === "--no-trim") {
      options.trim = false;
      continue;
    }
    if (arg === "--no-json") {
      options.updateJson = false;
      continue;
    }
    if (["--out", "--json", "--base-url", "--size", "--fuzz"].includes(arg)) {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}`);
      i += 1;
      if (arg === "--out") options.outDir = value;
      if (arg === "--json") options.jsonFile = value;
      if (arg === "--base-url") options.baseUrl = value.replace(/\/+$/, "");
      if (arg === "--size") options.size = Number.parseInt(value, 10);
      if (arg === "--fuzz") options.fuzz = Number.parseFloat(value);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }

  if (positional.length > 1) throw new Error("Only one input directory can be provided");
  if (positional[0]) options.inputDir = positional[0];
  if (!Number.isInteger(options.size) || options.size <= 0) throw new Error("--size must be a positive integer");
  if (!Number.isFinite(options.fuzz) || options.fuzz < 0) throw new Error("--fuzz must be a non-negative number");
  return options;
}

function ensureMagick() {
  const result = spawnSync("magick", ["-version"], { stdio: "ignore" });
  if (result.status !== 0) {
    throw new Error("ImageMagick is required. Install it with: brew install imagemagick");
  }
}

function gitValue(args, fallback) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function defaultBaseUrl(outDir) {
  const remote = gitValue(["remote", "get-url", "origin"], "https://github.com/ninuan/plugin.git");
  const branch = gitValue(["branch", "--show-current"], "main") || "main";
  const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  const owner = match?.[1] ?? "ninuan";
  const repo = match?.[2] ?? "plugin";
  const relativeOut = path.relative(process.cwd(), path.resolve(outDir)).split(path.sep).map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${relativeOut}`;
}

function iconFiles(inputDir) {
  return readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function outputName(inputName) {
  const parsed = path.parse(inputName);
  const safeBase = parsed.name.trim().replace(/\s+/g, "_").replace(/[/:\\]/g, "_");
  return `${safeBase || "icon"}.png`;
}

function imageSize(inputPath) {
  const output = execFileSync("magick", ["identify", "-format", "%w %h", inputPath], { encoding: "utf8" }).trim();
  const [width, height] = output.split(/\s+/).map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Could not read image size for ${inputPath}`);
  }
  return { width, height };
}

function edgeFloodfillDraw(width, height) {
  const maxX = width - 1;
  const maxY = height - 1;
  const midX = Math.floor(maxX / 2);
  const midY = Math.floor(maxY / 2);
  return [
    [midX, 0],
    [midX, maxY],
    [0, midY],
    [maxX, midY],
    [0, 0],
    [maxX, 0],
    [0, maxY],
    [maxX, maxY],
  ]
    .map(([x, y]) => `color ${x},${y} floodfill`)
    .join(" ");
}

function convertIcon(inputPath, outputPath, options) {
  const args = [inputPath, "-auto-orient", "-alpha", "set"];

  if (options.removeBg) {
    const { width, height } = imageSize(inputPath);
    args.push("-fuzz", `${options.fuzz}%`, "-fill", "none", "-draw", edgeFloodfillDraw(width, height));
  }

  if (options.dropWhite) {
    args.push("-fuzz", `${options.fuzz}%`, "-transparent", "white");
  }

  if (options.trim) {
    args.push("-trim", "+repage");
  }

  args.push(
    "-resize",
    `${options.size}x${options.size}`,
    "-background",
    "none",
    "-gravity",
    "center",
    "-extent",
    `${options.size}x${options.size}`,
    "-strip",
    "-colorspace",
    "sRGB",
    "-interlace",
    "PNG",
    `PNG32:${outputPath}`,
  );

  const result = spawnSync("magick", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Failed to convert ${inputPath}\n${result.stderr || result.stdout}`);
  }
}

function identify(file) {
  return execFileSync(
    "magick",
    ["identify", "-format", "%wx%h %[channels] interlace=%[interlace] colorspace=%[colorspace]", file],
    { encoding: "utf8" },
  ).trim();
}

function updateIconJson(jsonFile, converted, baseUrl) {
  const data = existsSync(jsonFile)
    ? JSON.parse(readFileSync(jsonFile, "utf8"))
    : { name: "Icons", description: "Personal icons for Quantumult X.", icons: [] };

  if (!Array.isArray(data.icons)) data.icons = [];

  for (const icon of converted) {
    const encodedName = icon.name.split("/").map(encodeURIComponent).join("/");
    const entry = {
      name: icon.name,
      url: `${baseUrl}/${encodedName}`,
    };
    const existing = data.icons.findIndex((item) => item.name === icon.name || item.name === path.parse(icon.name).name);
    if (existing >= 0) data.icons[existing] = entry;
    else data.icons.push(entry);
  }

  const json = JSON.stringify(data, null, 4).replace(/\//g, "\\/");
  writeFileSync(jsonFile, `${json}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureMagick();

  const inputDir = path.resolve(options.inputDir);
  const outDir = path.resolve(options.outDir);
  const jsonFile = path.resolve(options.jsonFile);

  if (!existsSync(inputDir)) mkdirSync(inputDir, { recursive: true });
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const files = iconFiles(inputDir);
  if (files.length === 0) {
    console.log(`No images found in ${path.relative(process.cwd(), inputDir) || inputDir}`);
    return;
  }

  const converted = [];
  for (const file of files) {
    const name = outputName(file);
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outDir, name);
    convertIcon(inputPath, outputPath, options);
    converted.push({ name, outputPath });
    console.log(`${file} -> ${path.relative(process.cwd(), outputPath)} (${identify(outputPath)})`);
  }

  if (options.updateJson) {
    const baseUrl = options.baseUrl ?? defaultBaseUrl(outDir);
    updateIconJson(jsonFile, converted, baseUrl);
    console.log(`Updated ${path.relative(process.cwd(), jsonFile)} with ${converted.length} icon(s).`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
