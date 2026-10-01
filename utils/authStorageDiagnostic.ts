export function authStorageDiagnostic(error: unknown, stage: 'serialize' | 'write' = 'write'): string {
    if (stage === 'serialize') return 'AUTH-SERIALIZE';
    const message = error && typeof error === 'object' && 'message' in error
        ? String(error.message).toLowerCase() : '';
    if (/disk.*full|sqlite_full|no space|database or disk is full/.test(message)) return 'AUTH-DISK-FULL';
    if (/cursorwindow|row too big|too large|exceeds.*limit/.test(message)) return 'AUTH-SIZE-LIMIT';
    if (/native.*null|native.*not.*found|not.*linked|multiSet.*not.*function|cannot read.*multiset/i.test(message)) return 'AUTH-NATIVE-MODULE';
    if (/locked|sqlite_busy|sqlite_locked/.test(message)) return 'AUTH-DB-LOCKED';
    if (/corrupt|malformed/.test(message)) return 'AUTH-DB-CORRUPT';
    if (/readonly|read-only|permission denied/.test(message)) return 'AUTH-DB-PERMISSION';
    if (/database|sqlite/.test(message)) return 'AUTH-DB-WRITE';
    return 'AUTH-WRITE-UNKNOWN';
}

export class AuthStorageFailure extends Error {
    constructor(public readonly diagnosticCode: string) {
        super(diagnosticCode);
        this.name = 'AuthStorageFailure';
    }
}

export function safeAuthStorageCode(error: unknown): string {
    return error instanceof AuthStorageFailure ? error.diagnosticCode : 'AUTH-WRITE-UNKNOWN';
}
