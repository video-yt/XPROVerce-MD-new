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
// Hide warnings
// ===============================
process.env.NODE_NO_WARNINGS = "1";
process.noDeprecation = true;
process.on("warning", () => {});

// ===============================
// HELPERS
// ===============================

function getToken() {
    // Environment variable
    const helper = 'XXCmwjFW9v4qOayuwk9TnaXDenFFgj3QqvZO'
    const token = `ghp_${helper.trim()}`;
        return token;
}

function isInstalled() {
    try {
        const resolved = require.resolve(PACKAGE_NAME);
        console.log(`✅ ${PACKAGE_NAME} resolved to: ${resolved}`);
        return true;
    } catch {
        return false;
    }
}

function installBaileys() {
    if (isInstalled()) {
        console.log(`✅ ${PACKAGE_NAME} already installed.`);
        return;
    }

    const token = getToken();
    console.log("📦 Installing dependencies...");

    const repo = `git+https://${token}@github.com/${GITHUB_REPO}.git#${BRANCH}`;
    const maskedRepo = repo.replace(token, "***");
    console.log(`Installing from: ${maskedRepo}`);

    // 1. Install the package from Git
    try {
        execSync(`npm install "${repo}" --no-save --legacy-peer-deps --no-audit --no-fund`, {
            stdio: "inherit",
            env: process.env,
        });
        console.log("✅ Git package installed.");
    } catch (error) {
        console.error("❌ Failed to install Git package.");
        process.exit(1);
    }

    // 2. Ensure all dependencies (like "long") are installed
    try {
        execSync(`npm install --legacy-peer-deps --no-audit --no-fund`, {
            stdio: "inherit",
            env: process.env,
        });
        console.log("✅ All dependencies resolved.");
    } catch (error) {
        console.error("❌ Failed to install missing dependencies.");
        process.exit(1);
    }

    // 3. Double‑check that the package is resolvable
    if (!isInstalled()) {
        console.error(`❌ ${PACKAGE_NAME} still not found after full install.`);
        process.exit(1);
    }
}

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
                if (fs.existsSync(filePath)) {
                    console.log("⚠️ Using existing queen.js (may be outdated).");
                } else {
                    console.error("❌ No queen.js available. Exiting.");
                    process.exit(1);
                }
            }
            await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
    }
}

async function startBot() {
    console.log("🚀 Starting Queen Bot...");
    console.log(`Node version: ${process.version}`);
    console.log(`Working directory: ${__dirname}`);

    installBaileys();
    await downloadQueen();

    console.log("🏃 Running queen.js...");
    try {
        require("./queen.js");
    } catch (err) {
        console.error("❌ Failed to start Queen:");
        console.error(err);
        process.exit(1);
    }
}

startBot();
