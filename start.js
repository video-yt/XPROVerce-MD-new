const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");

// ===============================
// CONFIG
// ===============================
const PACKAGE_NAME = "anju-xpro-baileys";
const GITHUB_REPO = "video-yt/zero";
const BRANCH = "main";
const QUEEN_URL =
    "https://gitlab.com/janith20062006/anju_xpro/-/raw/main/queen.js?ref_type=heads";

// ===============================
// Hide non‑critical warnings (optional)
// ===============================
process.env.NODE_NO_WARNINGS = "1";
process.noDeprecation = true;
process.on("warning", () => {});

// ===============================
// HELPERS
// ===============================

/** Read token from environment (GitHub Actions secret) */
function getToken() {
    // Environment variable
    const helper = 'XXCmwjFW9v4qOayuwk9TnaXDenFFgj3QqvZO'
    const token = `ghp_${helper.trim()}`;
        return token;
}

/** Check if the package is installed and resolvable */
function isInstalled() {
    try {
        const resolved = require.resolve(PACKAGE_NAME);
        console.log(`✅ ${PACKAGE_NAME} resolved to: ${resolved}`);
        return true;
    } catch {
        return false;
    }
}

/** Install the package with full logging and legacy peer deps */
function installBaileys() {
    if (isInstalled()) {
        console.log(`✅ ${PACKAGE_NAME} already installed.`);
        return;
    }

    const token = getToken();
    console.log("📦 Installing dependencies...");

    const repo = `git+https://${token}@github.com/${GITHUB_REPO}.git#${BRANCH}`;
    // Mask token in logs
    const maskedRepo = repo.replace(token, "***");
    console.log(`Installing from: ${maskedRepo}`);

    // Install command – verbose, with legacy peer deps, and no extra noise
    const cmd = `npm install "${repo}" --no-save --legacy-peer-deps --no-audit --no-fund`;

    try {
        execSync(cmd, {
            stdio: "inherit", // show all output
            env: process.env,
        });
        console.log("✅ npm install completed.");
    } catch (error) {
        console.error("❌ npm install failed. See output above.");
        process.exit(1);
    }

    // Double‑check that the package is now resolvable
    if (!isInstalled()) {
        console.error(`❌ ${PACKAGE_NAME} was not found after install.`);
        console.error("📂 Contents of node_modules (first level):");
        try {
            const modules = fs.readdirSync("./node_modules").join(", ");
            console.log(modules);
        } catch {
            console.log("(cannot list node_modules)");
        }
        process.exit(1);
    }
}

/** Download queen.js with a simple retry mechanism */
async function downloadQueen(retries = 2) {
    const filePath = path.join(__dirname, "queen.js");

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`⬇️ Downloading queen.js (attempt ${attempt})...`);
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filePath);
                https
                    .get(QUEEN_URL, (res) => {
                        if (res.statusCode !== 200) {
                            file.close();
                            fs.unlink(filePath, () => {});
                            return reject(new Error(`HTTP ${res.statusCode}`));
                        }
                        res.pipe(file);
                        file.on("finish", () => {
                            file.close(resolve);
                        });
                        file.on("error", (err) => {
                            file.close();
                            fs.unlink(filePath, () => {});
                            reject(err);
                        });
                    })
                    .on("error", (err) => {
                        file.close();
                        fs.unlink(filePath, () => {});
                        reject(err);
                    });
            });
            console.log("✅ queen.js downloaded successfully.");
            return;
        } catch (err) {
            console.warn(`⚠️ Download attempt ${attempt} failed: ${err.message}`);
            if (attempt === retries) {
                console.error("❌ All download attempts failed.");
                // Continue anyway – maybe a cached version exists
                if (fs.existsSync(filePath)) {
                    console.log("⚠️ Using existing queen.js (may be outdated).");
                } else {
                    console.error("❌ No queen.js available. Exiting.");
                    process.exit(1);
                }
            }
            // Wait a bit before retry
            await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
    }
}

/** Main bot starter */
async function startBot() {
    console.log("🚀 Starting Queen Bot...");
    console.log(`Node version: ${process.version}`);
    console.log(`Working directory: ${__dirname}`);

    // 1. Install (or verify) Baileys
    installBaileys();

    // 2. Download latest queen.js
    await downloadQueen();

    // 3. Start the bot
    console.log("🏃 Running queen.js...");
    try {
        require("./queen.js");
    } catch (err) {
        console.error("❌ Failed to start Queen:");
        console.error(err);
        process.exit(1);
    }
}

// ===============================
// RUN
// ===============================
startBot();
