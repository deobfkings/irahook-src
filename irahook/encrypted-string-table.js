/**
 * Encrypted String Table
 * Obfuscated name: ԣ (U+0523)
 *
 * Contains the large static string array used by the malware.
 * All strings are DES/CBC encrypted and decrypted at runtime.
 *
 * This class holds the `public static final String[] ÿ` array
 * which is the primary string table for the entire malware.
 *
 * The array contains (after decryption):
 * - Discord API endpoints
 * - File paths (APPDATA, LOCALAPPDATA, etc.)
 * - Browser paths (Chrome, Brave, Edge, etc.)
 * - Process names (discord.exe, chrome.exe, etc.)
 * - Registry keys
 * - HTTP headers
 * - Error messages
 * - Webhook URL fragments
 * - Encryption keys/seeds
 * - JavaScript injection code fragments
 *
 * Decryption:
 * - Each string is DES/CBC/NoPadding encrypted
 * - Key derived from class hash via ac.a() method
 * - Decrypted lazily on first access
 * - Cached after first decryption
 *
 * String count: ~400+ entries
 *
 * Key string indices (from analysis of other classes):
 * Index 0:   "UTF-8"
 * Index 5:   "AES"
 * Index 17:  [AES key seed - hardcoded string]
 * Index 22:  "[" (bracket for log formatting)
 * Index 23:  "Error"
 * Index 24:  "ms"
 * Index 30:  "Fast"
 * Index 32:  "user.name"
 * Index 33:  "[WARN]"
 * Index 34:  "\\"
 * Index 35:  "Tokens: "
 * Index 36:  " | "
 * Index 38:  " "
 * Index 42:  "]"
 * Index 44:  "SHA-256"
 * Index 45:  "os.name"
 * Index 46:  "Medium"
 * Index 48:  "[INFO]"
 * Index 50:  "VMware"
 * Index 53:  "Slow"
 * Index 55:  "Exception: "
 * Index 57:  " - "
 * Index 58:  "\n"
 * Index 83:  "VirtualBox"
 * Index 93:  "Hyper-V"
 * Index 97:  "QEMU"
 * Index 109: "Parallels"
 * Index 119: "Xen"
 * Index 143: "VMware Tools"
 * Index 149: "VBoxService"
 * Index 153: "prl_tools"
 * Index 156: "xenservice"
 * Index 180: "qemu-ga"
 * Index 191: "wireshark"
 * Index 216: "procmon"
 * Index 223: "ollydbg"
 * Index 252: "x64dbg"
 * Index 253: "ida"
 * Index 259: "fiddler"
 * Index 260: "charles"
 * Index 264: "httpdebugger"
 * Index 275: "vmtoolsd"
 * Index 313: "vboxtray"
 * Index 314: "vboxservice"
 * Index 335: "prl_cc"
 * Index 338: "xenservice"
 * Index 362: "qemu-ga"
 * Index 378: "wireshark"
 * Index 413: "procmon64"
 */
public class EncryptedStringTable {

    /**
     * The main string table.
     * All entries are DES-encrypted at compile time.
     * Decrypted lazily at runtime via the Zelix obfuscation runtime.
     *
     * NOTE: The actual encrypted values are stored in the obfuscated
     * ԣ.java file. This clean version documents the structure.
     */
    public static final String[] strings;

    /**
     * Gets a string from the table by index.
     * Decrypts on first access.
     *
     * @param index String table index
     * @return Decrypted string value
     */
    public static String get(int index) {
        if (strings == null || index >= strings.length) return "";
        return strings[index] != null ? strings[index] : "";
    }

    static {
        // Initialized by Zelix runtime (ac.a() key derivation)
        // All ~400 strings are decrypted here at class load time
        strings = new String[0]; // placeholder - actual array has ~400 entries
    }
}
