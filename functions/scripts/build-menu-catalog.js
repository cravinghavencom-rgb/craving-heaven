const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");
const source = path.join(projectRoot, "menu.js");
const destination = path.resolve(__dirname, "../menu-catalog.js");
const rewardsSource = path.join(projectRoot, "rewards-config.js");
const rewardsDestination = path.resolve(__dirname, "../rewards-config.js");

if (!fs.existsSync(source)) {
  throw new Error(`Menu catalog was not found: ${source}`);
}

fs.copyFileSync(source, destination);
if (!fs.existsSync(rewardsSource)) throw new Error(`Rewards configuration was not found: ${rewardsSource}`);
fs.copyFileSync(rewardsSource, rewardsDestination);
console.log("Copied the website menu and rewards configuration into the Cloud Functions bundle.");
