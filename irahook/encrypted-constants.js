/**
 * ============================================================
 * Encrypted Numeric Constants
 * Deobfuscated from classes: g, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z
 * ============================================================
 *
 * Each of these classes stores exactly ONE long value, encrypted with DES/CBC.
 * The value is decrypted at class load time using a class-specific key derived
 * from the Zelix runtime (ac.a(seed1, seed2, Class)).
 *
 * Pattern in each class:
 *   static {
 *     ClassName.a = ac.a(seed1, seed2, ClassName.class).a(xorKey);
 *     // a = DES key seed
 *     // \u00ff = DES-decrypted long value (the actual constant)
 *     ClassName.\u00ff = ClassName.a("char", index, xorValue ^ var11);
 *   }
 *
 * The constants are used throughout the code as obfuscated numeric values
 * for things like: string table indices, timeout values, scheduler intervals,
 * array sizes, etc.
 *
 * DECRYPTION APPROACH:
 * To recover the actual values, you would need to:
 *  1. Run the JAR with the JRE provided (app_extracted/resources/jre/bin/java.exe)
 *  2. Add a Java agent that intercepts static field writes
 *  3. Or use a debugger to inspect the values after class loading
 *
 * KNOWN USAGE CONTEXTS (from class a and f):
 *
 * In class a (DiscordTokenStealer):
 *   a.b("z", index, xorValue)  → scheduler interval in minutes (likely 1)
 *   a.a("c", index, xorValue)  → array size (likely 7 for cmd array)
 *   a.a("c", index, xorValue)  → array index (likely 6)
 *   a.a("c", index, xorValue)  → array index (likely 7)
 *
 * In class f (TokenScriptBuilder):
 *   f.b("x", 23843, xorValue)  → HTTP connect timeout (likely 10 seconds)
 *   f.b("x", 12849, xorValue)  → HTTP read timeout (likely 10 seconds)
 *   f.b("x", 25295, xorValue)  → Nitro age threshold 1 (years, likely 5)
 *   f.b("x", 32532, xorValue)  → Nitro age threshold 2 (likely 4)
 *   f.b("x", 28823, xorValue)  → Nitro age threshold 3 (likely 3)
 *   f.b("x", 13376, xorValue)  → Nitro age threshold 4 (likely 2)
 *   f.b("x", 24388, xorValue)  → Nitro age threshold 5 (likely 1)
 *   f.b("x", 11613, xorValue)  → Nitro billing amount threshold 1
 *   f.b("x", 12868, xorValue)  → Nitro billing amount threshold 2
 *   f.b("x", 20799, xorValue)  → Server count threshold 1 (likely 100)
 *   f.b("x", 5934,  xorValue)  → Server count threshold 2 (likely 50)
 *   f.b("x", 12849, xorValue)  → Server count threshold 3 (likely 25)
 *   f.b("x", 31049, xorValue)  → Server count threshold 4 (likely 10)
 *   f.b("x", 23445, xorValue)  → Server count threshold 5 (likely 5)
 *   f.b("x", 18490, xorValue)  → Server count threshold 6 (likely 2)
 *   f.b("x", 3787,  xorValue)  → Server count threshold 7 (likely 1)
 *
 * CLASS SEEDS (from static initializers):
 *   g:  ac.a(7130139456672994298L,  -7109676502121023734L, g.class)
 *   i:  ac.a(7307615840336343361L,   2663464538490433048L, i.class)
 *   j:  ac.a(206635519891795511L,    7242275559629134032L, j.class)
 *   k:  ac.a(-8908118668013270049L, -5177263804043365286L, k.class)
 *   l:  ac.a(7881347632230290012L,  -3845307553089297435L, l.class)
 *   m:  ac.a(-9189282619697205627L,  4203895438428207933L, m.class)
 *   n:  ac.a(1054368710237135403L,   2940183997379448705L, n.class)
 *   o:  ac.a(264126795604853950L,   -4145615636119511654L, o.class)
 *   p:  ac.a(-6013545430741831811L,  2942925750080966845L, p.class)
 *   q:  ac.a(-7436322693151150592L, -4004761314598464660L, q.class)
 *   r:  ac.a(-7883069953074697603L,  3981542776265752366L, r.class)
 *   s:  ac.a(-7671614052186935310L,  8083589613239922578L, s.class)
 *   t:  ac.a(-8839091991508670426L, -8460860718572011507L, t.class)
 *   u:  ac.a(8186412378647130794L,   2525141978807142269L, u.class)
 *   v:  ac.a(-8850156275960181900L, -5422115094841561288L, v.class)
 *   w:  ac.a(-9190939186673896667L,  -417191256804260221L, w.class)
 *   x:  ac.a(3429640962828834784L,  -4565722583064510657L, x.class)
 *   y:  ac.a(1024366511343893703L,  -7947260370372828675L, y.class)
 *   z:  ac.a(2119432803208360237L,   4435004144945434422L, z.class)
 */
public class EncryptedConstants {
    // This class is documentation only — the actual values are runtime-decrypted
    private EncryptedConstants() {}

    // Approximate decoded values based on usage context analysis:
    public static final long HTTP_TIMEOUT_SECONDS    = 10L;
    public static final long SCHEDULER_INTERVAL_MIN  = 1L;
    public static final long CMD_ARRAY_SIZE           = 7L;
    public static final long NITRO_AGE_VERY_OLD_YEARS = 5L;
    public static final long NITRO_AGE_OLD_YEARS      = 4L;
    public static final long NITRO_AGE_MEDIUM_YEARS   = 3L;
    public static final long NITRO_AGE_NEW_YEARS      = 2L;
    public static final long NITRO_AGE_VERY_NEW_YEARS = 1L;
    public static final long SERVER_COUNT_WHALE       = 100L;
    public static final long SERVER_COUNT_LARGE       = 50L;
    public static final long SERVER_COUNT_MEDIUM      = 25L;
    public static final long SERVER_COUNT_SMALL       = 10L;
    public static final long SERVER_COUNT_TINY        = 5L;
    public static final long SERVER_COUNT_MICRO       = 2L;
    public static final long SERVER_COUNT_SOLO        = 1L;
}
