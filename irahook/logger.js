/**
 * Simple logger utility.
 * Obfuscated name: \u0497
 *
 * In the obfuscated code, logging calls are:
 *   \u0497.\u00ff(objectArray)  → info log
 *   \u0497.\u00fd(objectArray)  → error log
 *   \u0497.\u00fe(objectArray)  → debug log
 *   \u0497.\u00f8(objectArray)  → process execution log
 *
 * All output is suppressed in production (stdout redirected to /dev/null).
 * Only active when --ira flag is passed.
 */
public class Logger {

    private static boolean enabled = false;

    public static void setEnabled(boolean enabled) {
        Logger.enabled = enabled;
    }

    public static void info(String message) {
        if (enabled) System.out.println("[INFO] " + message);
    }

    public static void error(String message) {
        if (enabled) System.err.println("[ERROR] " + message);
    }

    public static void debug(String message) {
        if (enabled) System.out.println("[DEBUG] " + message);
    }
}
