import fs from "fs";
import path from "path";
import { google } from "googleapis";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CREDS_DIR = process.env.GDRIVE_CREDS_DIR;
const REDIRECT_URI = "http://localhost:3000";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("\n?? Open this URL in your browser to authorize access:");
console.log(authUrl);
console.log("\nAfter you allow access, copy the code from the URL and paste it here.\n");

process.stdout.write("Code: ");
process.stdin.on("data", async (data) => {
  const code = data.toString().trim();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Ensure the credentials directory exists
  if (!CREDS_DIR) {
    console.error("❌ Error: GDRIVE_CREDS_DIR environment variable is not set");
    process.exit(1);
  }

  // Check if parent directory exists and is actually a directory
  const parentDir = path.dirname(CREDS_DIR);
  if (fs.existsSync(parentDir)) {
    try {
      const parentStats = fs.statSync(parentDir);
      if (!parentStats.isDirectory()) {
        console.error(`❌ Error: Parent path exists but is not a directory: ${parentDir}`);
        console.error(`   Please check your GDRIVE_CREDS_DIR environment variable.`);
        console.error(`   Current value: ${CREDS_DIR}`);
        process.exit(1);
      }
    } catch (parentError) {
      console.error(`❌ Error checking parent directory: ${parentError.message}`);
      process.exit(1);
    }
  }

  try {
    // Check if CREDS_DIR exists
    if (fs.existsSync(CREDS_DIR)) {
      let stats;
      try {
        stats = fs.statSync(CREDS_DIR);
      } catch (statError) {
        // If stat fails, it might be a special file or permission issue
        console.error(`❌ Error checking ${CREDS_DIR}: ${statError.message}`);
        process.exit(1);
      }
      
      if (stats.isFile()) {
        // If it's a file, backup it and create directory
        const backupPath = `${CREDS_DIR}.backup.${Date.now()}`;
        console.error(`⚠️  Warning: ${CREDS_DIR} exists as a file.`);
        console.error(`   Backing it up to ${backupPath} and creating directory...`);
        try {
          fs.renameSync(CREDS_DIR, backupPath);
          console.error(`✅ Backed up file to ${backupPath}`);
        } catch (renameError) {
          console.error(`❌ Failed to backup file: ${renameError.message}`);
          console.error(`   Please manually remove ${CREDS_DIR} and try again.`);
          process.exit(1);
        }
      } else if (stats.isDirectory()) {
        // Already a directory, nothing to do
        console.error(`✅ Credentials directory already exists: ${CREDS_DIR}`);
      } else {
        // It's something else (symlink, etc.)
        console.error(`❌ ${CREDS_DIR} exists but is not a regular file or directory.`);
        process.exit(1);
      }
    }
    
    // Create directory if it doesn't exist (or was just a file that we renamed)
    if (!fs.existsSync(CREDS_DIR)) {
      try {
        fs.mkdirSync(CREDS_DIR, { recursive: true });
        console.error(`✅ Created credentials directory: ${CREDS_DIR}`);
      } catch (mkdirError) {
        if (mkdirError.code === 'ENOTDIR') {
          console.error(`❌ Cannot create directory: ${CREDS_DIR} exists but is not a directory.`);
          console.error(`   Please remove it manually and try again.`);
        } else {
          console.error(`❌ Failed to create directory: ${mkdirError.message}`);
        }
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Unexpected error setting up credentials directory: ${error.message}`);
    console.error(`   Path: ${CREDS_DIR}`);
    process.exit(1);
  }

  const credsPath = path.join(CREDS_DIR, ".gdrive-server-credentials.json");
  fs.writeFileSync(credsPath, JSON.stringify(tokens, null, 2));
  console.log(`✅ Tokens saved to ${credsPath}`);
  process.exit(0);
});
