import com.sun.jna.Native;
import com.sun.jna.Pointer;
import com.sun.jna.platform.win32.WinNT;
import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.PointerByReference;
import com.sun.jna.win32.StdCallLibrary;

public class NtApiInterfaces {

    public interface NtdllQueryInterface extends StdCallLibrary {
        NtdllQueryInterface INSTANCE = Native.load("ntdll", NtdllQueryInterface.class);

        int NtQueryInformationProcess(
            WinNT.HANDLE ProcessHandle,
            int ProcessInformationClass,
            Pointer ProcessInformation,
            int ProcessInformationLength,
            int[] ReturnLength
        );
    }

    public interface NtdllMemoryInterface extends StdCallLibrary {
        NtdllMemoryInterface INSTANCE = Native.load("ntdll", NtdllMemoryInterface.class);

        int NtAllocateVirtualMemory(
            WinNT.HANDLE ProcessHandle,
            PointerByReference BaseAddress,
            Pointer ZeroBits,
            PointerByReference RegionSize,
            int AllocationType,
            int Protect
        );

        int NtWriteVirtualMemory(
            WinNT.HANDLE ProcessHandle,
            Pointer BaseAddress,
            byte[] Buffer,
            int NumberOfBytesToWrite,
            IntByReference NumberOfBytesWritten
        );

        int NtProtectVirtualMemory(
            WinNT.HANDLE ProcessHandle,
            PointerByReference BaseAddress,
            PointerByReference RegionSize,
            int NewProtect,
            IntByReference OldProtect
        );

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

    public interface DpapiLibrary extends com.sun.jna.Library {

        int CryptUnprotectData(Object[] args);

        int CryptProtectData(Object[] args);

        int LocalFree(Object[] args);
    }

    public interface BaseLibrary extends com.sun.jna.Library {

    }
}