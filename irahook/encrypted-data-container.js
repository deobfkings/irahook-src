/**
 * Encrypted Data Container
 * Obfuscated name: һ (U+04BB)
 *
 * A simple container class that holds a name and encrypted byte array.
 * Used to pass encrypted data between components.
 *
 * Usage:
 * - Wraps stolen data before sending to webhook
 * - Holds encrypted file contents
 * - Stores encrypted configuration values
 *
 * The byte array is typically:
 * - AES-256-GCM encrypted browser credentials
 * - DES-encrypted string table entries
 * - Raw stolen file bytes
 */
public class EncryptedDataContainer {

    // Name/identifier for this data (e.g., "passwords", "cookies", "tokens")
    private final String name;

    // Encrypted or raw data bytes
    private final byte[] data;

    // Static encrypted key (used for some operations)
    private static final byte[] staticKey;

    /**
     * Creates a new data container.
     *
     * @param name Identifier for this data
     * @param data The data bytes (may be encrypted)
     */
    public EncryptedDataContainer(String name, byte[] data) {
        this.name = name;
        this.data = data;
    }

    /**
     * Gets the name/identifier.
     */
    public String getName() {
        return name;
    }

    /**
     * Gets the data bytes.
     */
    public byte[] getData() {
        return data;
    }

    /**
     * Gets the data as a UTF-8 string.
     */
    public String getDataAsString() {
        try {
            return new String(data, "UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Gets the data length.
     */
    public int getLength() {
        return data != null ? data.length : 0;
    }

    @Override
    public String toString() {
        return "EncryptedDataContainer{name='" + name + "', size=" + getLength() + "}";
    }

    static {
        staticKey = new byte[0]; // Initialized by Zelix runtime
    }
}
