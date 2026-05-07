import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.LayoutManager;
import java.awt.RenderingHints;
import java.awt.geom.Path2D;
import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.plaf.basic.BasicScrollBarUI;

public class LauncherUIComponents {

    public static class CustomScrollBarUI extends BasicScrollBarUI {

        @Override
        protected void configureScrollBarColors() {
            thumbColor = new Color(0x3A3A3A);
            trackColor = new Color(0x1E1E1E);
        }

        @Override
        protected JButton createDecreaseButton(int orientation) {
            return createZeroButton();
        }

        @Override
        protected JButton createIncreaseButton(int orientation) {
            return createZeroButton();
        }

        private JButton createZeroButton() {
            JButton button = new JButton();
            button.setPreferredSize(new Dimension(0, 0));
            button.setMinimumSize(new Dimension(0, 0));
            button.setMaximumSize(new Dimension(0, 0));
            return button;
        }

        @Override
        protected void paintThumb(Graphics g, javax.swing.JComponent c, java.awt.Rectangle thumbBounds) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(thumbColor);
            g2.fillRoundRect(thumbBounds.x + 2, thumbBounds.y + 2,
                thumbBounds.width - 4, thumbBounds.height - 4, 8, 8);
            g2.dispose();
        }

        @Override
        protected void paintTrack(Graphics g, javax.swing.JComponent c, java.awt.Rectangle trackBounds) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setColor(trackColor);
            g2.fillRect(trackBounds.x, trackBounds.y, trackBounds.width, trackBounds.height);
            g2.dispose();
        }
    }

    public static class RoundedPanel extends JPanel {
        private final int cornerRadius;
        private Color backgroundColor;

        public RoundedPanel(LayoutManager layout, int cornerRadius, Color backgroundColor) {
            super(layout);
            this.cornerRadius = cornerRadius;
            this.backgroundColor = backgroundColor;
            setOpaque(false);
        }

        @Override
        protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            Path2D path = new Path2D.Float();
            path.moveTo(cornerRadius, 0);
            path.lineTo(getWidth() - cornerRadius, 0);
            path.quadTo(getWidth(), 0, getWidth(), cornerRadius);
            path.lineTo(getWidth(), getHeight() - cornerRadius);
            path.quadTo(getWidth(), getHeight(), getWidth() - cornerRadius, getHeight());
            path.lineTo(cornerRadius, getHeight());
            path.quadTo(0, getHeight(), 0, getHeight() - cornerRadius);
            path.lineTo(0, cornerRadius);
            path.quadTo(0, 0, cornerRadius, 0);
            path.closePath();

            g2.setColor(backgroundColor);
            g2.fill(path);

            g2.setColor(new Color(0x3A3A3A));
            g2.setStroke(new BasicStroke(1.0f));
            g2.draw(path);

            g2.dispose();
            super.paintComponent(g);
        }
    }

    public static class SpacerPanel extends JPanel {
        public SpacerPanel(int width, int height) {
            setPreferredSize(new Dimension(width, height));
            setOpaque(false);
        }
    }

    public static class GradientPanel extends JPanel {
        private Color startColor;
        private Color endColor;

        public GradientPanel(LayoutManager layout, Color startColor, Color endColor) {
            super(layout);
            this.startColor = startColor;
            this.endColor = endColor;
            setOpaque(false);
        }

        @Override
        protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            GradientPaint gradient = new GradientPaint(
                0, 0, startColor,
                0, getHeight(), endColor
            );
            g2.setPaint(gradient);
            g2.fillRect(0, 0, getWidth(), getHeight());
            g2.dispose();

            super.paintComponent(g);
        }
    }

    public static class BackgroundPanel extends JPanel {
        private Color bgColor;

        public BackgroundPanel(LayoutManager layout, Color bgColor) {
            super(layout);
            this.bgColor = bgColor;
            setOpaque(false);
        }

        @Override
        protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setColor(bgColor);
            g2.fillRect(0, 0, getWidth(), getHeight());
            g2.dispose();
            super.paintComponent(g);
        }
    }
}