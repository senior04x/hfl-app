const transferIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A link selects a transfer; it never carries credentials or a decision. */
export function parseTransferAppLink(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 160) return null;
    const match = /^hflsoccerapp:\/\/transfers\/([^/?#]+)\/?$/i.exec(value);
    return match && transferIdPattern.test(match[1]) ? match[1].toLowerCase() : null;
}
