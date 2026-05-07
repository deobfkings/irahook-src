import java.security.cert.X509Certificate;
import javax.net.ssl.X509TrustManager;

/**
 * SSL Certificate Bypass
 * Obfuscated names: ъ (U+044A), ӆ (U+04C6)
 *
 * Implements X509TrustManager that accepts ALL SSL certificates.
 * Used by OkHttpClient to bypass SSL certificate validation.
 *
 * This allows the malware to:
 * - Connect to C2 servers with self-signed certificates
 * - Bypass certificate pinning
 * - Avoid SSL errors when connecting to malicious servers
 *
 * Both ъ and ӆ appear to be identical implementations,
 * likely duplicated for use in different HTTP clients.
 *
 * Security impact:
 * - Makes the malware vulnerable to MITM attacks
 * - But the attacker doesn't care - they control both ends
 */
public class SslBypass implements X509TrustManager {

    /**
     * Accepts all client certificates without validation.
     */
    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) {
        // Accept all - no validation
    }

    /**
     * Accepts all server certificates without validation.
     */
    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) {
        // Accept all - no validation
    }

    /**
     * Returns empty array - accepts any issuer.
     */
    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[0];
    }

    /**
     * Creates an OkHttpClient with SSL bypass.
     *
     * @return OkHttpClient that trusts all certificates
     */
    public static okhttp3.OkHttpClient createTrustAllClient() {
        try {
            javax.net.ssl.SSLContext sslContext = javax.net.ssl.SSLContext.getInstance("TLS");
            SslBypass trustManager = new SslBypass();
            sslContext.init(null, new X509TrustManager[]{ trustManager }, new java.security.SecureRandom());

            return new okhttp3.OkHttpClient.Builder()
                .sslSocketFactory(sslContext.getSocketFactory(), trustManager)
                .hostnameVerifier((hostname, session) -> true)
                .build();
        } catch (Exception e) {
            return new okhttp3.OkHttpClient();
        }
    }
}
