import java.util.ArrayList;
import java.util.Vector;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ============================================================
 * Zelix KlassMaster Obfuscation Runtime
 * Deobfuscated from classes: aa (interface), ab, ac
 * ============================================================
 *
 * These classes form the core of Zelix KlassMaster's runtime obfuscation system.
 * They provide:
 *  1. Class-based DES key derivation (each class gets a unique key)
 *  2. String decryption infrastructure
 *  3. Numeric constant decryption (used by classes g-z, i-z, p-z)
 *
 * HOW IT WORKS:
 *  - Each obfuscated class (g, h, i, j, ... z, aa, ab) calls:
 *      ac.a(long seed1, long seed2, Class clazz).a(long xorKey)
 *    to get a DES key derived from the class's identity
 *
 *  - The returned key is used to decrypt:
 *    a) Numeric constants (stored as DES-encrypted longs)
 *    b) String table entries (stored as DES-encrypted byte arrays)
 *
 *  - ab is a "node" in a linked list of class registrations
 *  - ac is the actual key provider that does the DES computation
 *  - aa is the interface both implement
 *
 * NUMERIC CONSTANT CLASSES (g, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z):
 *  Each stores exactly ONE encrypted long value in static field \u00ff.
 *  The value is decrypted at class load time using DES with a class-specific key.
 *  These values are used as obfuscated numeric constants throughout the code.
 *
 *  Known decoded values (from usage context):
 *   g.\u00ff  → used as string table index offset
 *   i.\u00ff  → used as HTTP timeout value (seconds)
 *   j.\u00ff  → used as scheduler interval
 *   k.\u00ff  → used as string table index
 *   l.\u00ff  → used as string table index
 *   m.\u00ff  → used as string table index
 *   n.\u00ff  → used as string table index
 *   o.\u00ff  → used as string table index
 *   p.\u00ff  → used as string table index
 *   q.\u00ff  → used as string table index
 *   r.\u00ff  → used as string table index
 *   s.\u00ff  → used as string table index
 *   t.\u00ff  → used as string table index
 *   u.\u00ff  → used as string table index
 *   v.\u00ff  → used as string table index
 *   w.\u00ff  → used as string table index
 *   x.\u00ff  → used as string table index
 *   y.\u00ff  → used as string table index
 *   z.\u00ff  → used as string table index
 */

// ============================================================
// Interface: aa (ZelixNode)
// ============================================================
interface ZelixNode {
    void addChild(ZelixNode child);
    int[] getTable();
    long computeKey(long seed);
    void setKey(long key);
    boolean compareTo(ZelixNode other);
}

// ============================================================
// Class: ab (ZelixNodeImpl)
// The "root" node that manages class registrations.
// Maintains a ConcurrentHashMap of class→parent mappings.
// ============================================================
class ZelixNodeImpl implements ZelixNode {
    private static boolean initialized;
    private static ZelixNodeImpl root;

    // ConcurrentHashMap: maps child node → parent node
    private ConcurrentHashMap<ZelixNode, ZelixNode> parentMap = new ConcurrentHashMap<>();
    private ZelixNode nextChild;
    private int[] table;  // 64-element int array used as hash table
    private long key;

    public ZelixNodeImpl() {
        // Initialize the 64-element table with obfuscated values
        // These values are used as a hash table for class lookup
        this.table = new int[64];
        // Values set in constructor (obfuscated, used for class identity hashing)
        // ... (64 int values)

        // Register with the runtime
        ZelixRuntime.register(this);
    }

    /**
     * Registers a class node with the runtime.
     * Called when a new class is loaded.
     */
    static void setInitialized(boolean value) {
        initialized = value;
    }

    /**
     * Links two nodes together (parent-child relationship).
     * Used to build the class hierarchy for key derivation.
     */
    static ZelixNode link(ZelixNode node1, ZelixNode node2) {
        return root.linkInternal(node1, node2);
    }

    private ZelixNode linkInternal(ZelixNode node1, ZelixNode node2) {
        ZelixNode existing = (ZelixNode) parentMap.get(node1);
        if (existing == null) existing = this;
        parentMap.put(node2, node1);
        return existing;
    }

    @Override
    public void addChild(ZelixNode child) {
        if (this != child) {
            if (nextChild == null) nextChild = child;
            else nextChild.addChild(child);
        }
    }

    @Override
    public long computeKey(long seed) {
        ZelixNode node = ZelixRuntime.getNode(seed);
        long result = node.computeKey(seed);
        int[] nodeTable = node.getTable();
        System.arraycopy(this.table, 0, nodeTable, 0, 64);
        if (nextChild != null) nextChild.computeKey(seed);
        return result;
    }

    @Override
    public int[] getTable() {
        return ZelixRuntime.globalTable;
    }

    @Override
    public boolean compareTo(ZelixNode other) {
        if (this == other) return true;
        if (other instanceof ZelixNodeImpl) {
            return System.identityHashCode(this) - System.identityHashCode(other) <= 0;
        }
        return false;
    }

    @Override
    public void setKey(long key) {
        this.key = key;
    }

    static { root = new ZelixNodeImpl(); }
}

// ============================================================
// Class: ac (ZelixRuntime)
// The actual runtime that provides DES keys for each class.
// ============================================================
class ZelixRuntime implements ZelixNode {
    private long seed;
    private int[] table;
    private ZelixNode child;
    private long derivedKey;
    private long[] keySchedule;

    private static long[] globalKeySchedule;
    static int[] globalTable;
    private static ArrayList<ZelixNode> nodeList = new ArrayList<>();
    private static Vector<Object> classRegistry = new Vector<>();
    private static int nodeCount;
    private static Object sharedObject;
    private static int tableSize;
    private static int tableModulo;
    private static int nodeIndex;

    /**
     * Main entry point called by each obfuscated class at static init time.
     *
     * Usage in obfuscated code:
     *   SomeClass.a = ac.a(seed1, seed2, SomeClass.class).a(xorKey);
     *
     * @param seed1   First seed (class-specific long constant)
     * @param seed2   Second seed (class-specific long constant)
     * @param clazz   The class being initialized (used for identity)
     * @return        A ZelixNode whose .a(xorKey) method returns the DES key
     */
    public static ZelixNode a(long seed1, long seed2, Object clazz) {
        ZelixNodeImpl.setInitialized(seed1 > 0L);
        ZelixNode node1 = getOrCreate(seed1);
        ZelixNode node2 = getOrCreate(seed2);
        ZelixNode result = ZelixNodeImpl.link(node1, node2);
        if (clazz != null) classRegistry.add(clazz);
        return result;
    }

    /**
     * Gets or creates a ZelixRuntime node for the given seed.
     * Used as a cache to avoid recreating nodes.
     */
    static ZelixNode getNode(long seed) {
        int index = (int) computeIndex(seed, tableSize, 63, globalTable, globalKeySchedule);
        if (index < nodeCount) {
            return nodeList.get(index);
        }
        if (nodeList.size() % tableModulo == 0) {
            globalTable = globalTable.clone();
        }
        ZelixRuntime node = new ZelixRuntime(seed);
        nodeList.add(node);
        return node;
    }

    private static ZelixNode getOrCreate(long seed) {
        return new ZelixRuntime(seed);
    }

    static void register(ZelixNodeImpl node) {
        nodeCount = nodeList.size();
        resetTable();
        node.activate();
    }

    static void unregister(ZelixNodeImpl node) {
        resetTable();
        // Reset global table to new values
        globalTable = new int[64];
        // ... (64 int values set here)
        node.deactivate();
    }

    private ZelixRuntime(long seed) {
        this.seed = seed;
        this.table = globalTable;
        this.keySchedule = globalKeySchedule;
    }

    /**
     * Computes the DES-derived key for this node.
     * This is the core key derivation function.
     *
     * @param xorKey  XOR key to combine with the derived key
     * @return        The final key value
     */
    @Override
    public long computeKey(long xorKey) {
        long tableIndex = this.computeIndex(8, 55);
        this.seed = this.seed ^ (xorKey ^ this.derivedKey);
        if (this.child != null) this.child.computeKey(xorKey);
        return tableIndex;
    }

    @Override
    public void setKey(long key) {
        this.derivedKey = key;
    }

    @Override
    public void addChild(ZelixNode child) {
        if (this != child) {
            if (this.child == null) this.child = child;
            else this.child.addChild(child);
        }
    }

    @Override
    public int[] getTable() {
        return this.table;
    }

    @Override
    public boolean compareTo(ZelixNode other) {
        if (this == other) return true;
        if (other instanceof ZelixRuntime) {
            return this.computeIndex(56, 63) - ((ZelixRuntime) other).computeIndex(56, 63) <= 0L;
        }
        return true;
    }

    @Override
    public int hashCode() {
        return (int) this.computeIndex(8);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj instanceof ZelixRuntime) {
            return this.computeIndex(56) == ((ZelixRuntime) obj).computeIndex(56);
        }
        return false;
    }

    // Internal index computation methods (used for hash table lookups)
    private long computeIndex(int a, int b) { return 0; /* DES-based computation */ }
    private long computeIndex(int a) { return 0; }
    private static long computeIndex(long seed, int a, int b, int[] table, long[] schedule) { return 0; }
    private static void resetTable() {}
}
