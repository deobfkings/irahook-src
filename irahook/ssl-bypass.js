import java.security.cert.X509Certificate;
import javax.net.ssl.X509TrustManager;

public class SslBypass implements X509TrustManager {

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) {

    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) {

    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[0];
    }

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