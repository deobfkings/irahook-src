import javax.swing.*;
import javax.swing.border.*;
import java.awt.*;
import java.awt.event.*;

public class LauncherUI extends JFrame {

    private static LauncherUI instance;

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

    private Font fontMain;
    private Font fontLabel;
    private Font fontTitle;
    private Font fontSmall;

    private final String username;

    private JPanel contentPanel;
    private JScrollPane scrollPane;
    private JTextField inputField;
    private Timer fadeTimer;
    private Timer scrollTimer;

    static volatile float fadeProgress;
    static volatile float scrollProgress;
    private boolean firstRun;

    public static synchronized LauncherUI getInstance() {
        if (instance == null) {
            instance = new LauncherUI();

            UIScheduler.start();
        }
        return instance;
    }

    public static synchronized void dispose() {
        if (instance != null) {
            instance.dispose();
            instance = null;

            UIScheduler.stop();
        }
    }

    private LauncherUI() {
        this.firstRun = true;
        this.username = System.getProperty("username", "Steve");
        SwingUtilities.invokeLater(this::buildUI);
    }

    private void buildUI() {

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

        setUndecorated(true);
        setSize(800, 600);
        setAlwaysOnTop(true);
        setDefaultCloseOperation(DO_NOTHING_ON_CLOSE);

        Dimension screen = Toolkit.getDefaultToolkit().getScreenSize();
        setLocation((screen.width - 800) / 2, (screen.height - 600) / 2);

        JPanel mainPanel = new JPanel(new BorderLayout());
        mainPanel.setOpaque(false);
        mainPanel.setBorder(new EmptyBorder(15, 15, 15, 15));

        contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        contentPanel.setBackground(BG_DARK);
        contentPanel.setBorder(new EmptyBorder(5, 5, 5, 5));

        scrollPane = new JScrollPane(contentPanel);
        scrollPane.getViewport().setBackground(BG_DARK);
        scrollPane.setBorder(null);

        JPanel headerPanel = buildHeaderPanel();
        JPanel inputBar = buildInputBar();

        mainPanel.add(headerPanel, BorderLayout.NORTH);
        mainPanel.add(scrollPane, BorderLayout.CENTER);
        mainPanel.add(inputBar, BorderLayout.SOUTH);

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

        fadeTimer = new Timer(16, e -> {
            fadeProgress = Math.min(1.0f, fadeProgress + 0.05f);
            setOpacity(fadeProgress);
            if (fadeProgress >= 1.0f) fadeTimer.stop();
        });
        fadeTimer.start();

        scrollTimer = new Timer(50, e -> {
            JScrollBar bar = scrollPane.getVerticalScrollBar();
            bar.setValue(bar.getMaximum());
        });
        scrollTimer.start();

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

    private void handleInput() {
        String text = inputField.getText().trim();
        if (text.isEmpty()) return;

        System.setProperty("username", text);

        inputField.setEnabled(false);
        inputField.setText("Loading...");

        Timer closeTimer = new Timer(3000, e -> LauncherUI.dispose());
        closeTimer.setRepeats(false);
        closeTimer.start();
    }
}