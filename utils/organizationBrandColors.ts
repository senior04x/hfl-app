const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHexColor(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const color = value.trim();
    if (!HEX_COLOR.test(color)) return null;
    if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
    }
    return color.toUpperCase();
}

function readBrandColors(raw: unknown): string[] {
    let value = raw;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (HEX_COLOR.test(trimmed)) value = [trimmed];
        else {
            try { value = JSON.parse(trimmed); } catch { return []; }
        }
    }
    const candidates = Array.isArray(value)
        ? value
        : value && typeof value === 'object'
            ? Object.values(value as Record<string, unknown>)
            : [];
    return candidates.map(normalizeHexColor).filter((color): color is string => color !== null).slice(0, 2);
}

function darken(color: string, amount: number): string {
    const channels = color.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel, 16));
    return `#${channels.map(channel => Math.round(channel * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Brand hues, darkened for readable text and a restrained AMATORA-style surface. */
export function organizationBrandGradient(raw: unknown): [string, string] | null {
    const colors = readBrandColors(raw);
    if (!colors.length) return null;
    const primary = colors[0];
    const secondary = colors[1] || primary;
    return [darken(primary, 0.42), darken(secondary, 0.30)];
}

export function organizationBrandColorList(raw: unknown): string[] | undefined {
    const colors = readBrandColors(raw);
    return colors.length ? colors : undefined;
}
