import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class ZipBuilder implements Closeable {

    private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    private final ZipOutputStream zip = new ZipOutputStream(buffer);

    private static String webhookToken;

    public synchronized void addText(String entryName, String content) {
        if (webhookToken == null) return;
        if (content == null || content.isEmpty()) return;
        addBytes(entryName, content.getBytes(StandardCharsets.UTF_8));
    }

    public synchronized void addBytes(String entryName, byte[] data) {
        if (webhookToken == null) return;
        if (data == null || data.length == 0) return;
        try {
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write(data);
            zip.closeEntry();
        } catch (Exception ignored) {}
    }

    public void setComment(String comment) {
        try {
            if (comment != null) zip.setComment(comment);
        } catch (Exception ignored) {}
    }

    public byte[] toBytes() {
        try { zip.finish(); } catch (Exception ignored) {}
        return buffer.toByteArray();
    }

    @Override
    public void close() {
        try { zip.close(); } catch (Exception ignored) {}
    }

    public static void setWebhookToken(String token) {
        webhookToken = token;
    }

    public static String getWebhookToken() {
        return webhookToken;
    }

    static {

        if (getWebhookToken() != null) {
            setWebhookToken("LfEIE");
        }
    }
}