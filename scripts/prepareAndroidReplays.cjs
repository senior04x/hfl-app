// Maintenance only. Existing originals and database rows are never changed.
// Supply a JSON array of public replay URLs and AMATORA_MEDIA_KEY via environment.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const HOST = 'xzzyhfyazwohdqqbjiiy.supabase.co';
const PREFIX = '/storage/v1/object/public/replays/';

function videoInfo(buffer) {
    for (let index = buffer.indexOf('avc1'); index >= 0; index = buffer.indexOf('avc1', index + 4)) {
        if (index < 4 || index + 32 >= buffer.length) continue;
        const length = buffer.readUInt32BE(index - 4);
        if (length < 78 || length > buffer.length - index + 4) continue;
        const config = buffer.indexOf('avcC', index + 4);
        if (config < 0 || config > index + length || config + 8 >= buffer.length) continue;
        return { width: buffer.readUInt16BE(index + 28), height: buffer.readUInt16BE(index + 30), profile: buffer[config + 5], level: buffer[config + 7] };
    }
    return null;
}
async function request(url, options = {}) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
}
function encode(binary, input, output) {
    return new Promise((resolve, reject) => {
        const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-map', '0:v:0', '-map', '0:a?', '-vf', 'scale=min(1920\\,iw):min(1080\\,ih):force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30', '-c:v', 'libopenh264', '-profile:v', 'main', '-b:v', '2500k', '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', output];
        const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        let error = '';
        child.stderr.on('data', value => { error = (error + value).slice(-1500); });
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Encode failed (${code}): ${error}`)));
    });
}
async function main() {
    const apply = process.argv.includes('--apply');
    const urls = JSON.parse(await fs.readFile(process.argv[2], 'utf8')).map(value => typeof value === 'string' ? value : value.replay_video_url);
    if (apply && !process.env.AMATORA_MEDIA_KEY) throw new Error('AMATORA_MEDIA_KEY is required');
    const binary = process.env.AMATORA_FFMPEG;
    if (apply && !binary) throw new Error('AMATORA_FFMPEG is required');
    const queue = [...new Set(urls)].filter(uri => {
        try { const url = new URL(uri); return url.protocol === 'https:' && url.hostname === HOST && url.pathname.startsWith(PREFIX) && /\.mp4$/i.test(url.pathname) && !/\.android\.mp4$/i.test(url.pathname); } catch { return false; }
    });
    const report = { checked: 0, ready: 0, compatible: 0, converted: 0, unknown: 0, failed: 0 };
    let cursor = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
        while (cursor < queue.length) {
            const uri = queue[cursor++];
            const candidate = uri.replace(/\.mp4$/i, '.android.mp4');
            let folder;
            try {
                const existing = await fetch(candidate, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
                if (existing.ok && Number(existing.headers.get('content-length')) > 0) { report.ready++; continue; }
                const metadata = await request(uri, { headers: { Range: 'bytes=-262144' } });
                const info = videoInfo(Buffer.from(await metadata.arrayBuffer()));
                if (!info) { report.unknown++; continue; }
                if (info.width <= 1920 && info.height <= 1080 && info.profile <= 100 && info.level <= 42) { report.compatible++; continue; }
                if (!apply) { console.log(JSON.stringify({ uri, ...info })); continue; }
                folder = await fs.mkdtemp(path.join(os.tmpdir(), 'amatora-replay-encode-'));
                const input = path.join(folder, 'input.mp4'), output = path.join(folder, 'output.mp4');
                const source = await request(uri);
                await fs.writeFile(input, Buffer.from(await source.arrayBuffer()));
                await encode(binary, input, output);
                const result = await fs.readFile(output);
                const convertedInfo = videoInfo(result);
                if (!convertedInfo || convertedInfo.width > 1920 || convertedInfo.height > 1080 || convertedInfo.profile > 100 || convertedInfo.level > 42) throw new Error('Output format validation failed');
                const storagePath = new URL(candidate).pathname.replace(PREFIX, '');
                await request(`https://${HOST}/storage/v1/object/replays/${storagePath}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.AMATORA_MEDIA_KEY}`, apikey: process.env.AMATORA_MEDIA_KEY, 'Content-Type': 'video/mp4', 'Cache-Control': '3600', 'x-upsert': 'false' }, body: result });
                report.converted++;
            } catch (error) { report.failed++; console.error(JSON.stringify({ uri, error: error.message.replace(process.env.AMATORA_MEDIA_KEY || 'NO_KEY', '[redacted]') })); }
            finally {
                if (folder) { await fs.unlink(path.join(folder, 'input.mp4')).catch(() => {}); await fs.unlink(path.join(folder, 'output.mp4')).catch(() => {}); await fs.rmdir(folder).catch(() => {}); }
                report.checked++;
                if (report.checked % 20 === 0) console.log(JSON.stringify(report));
            }
        }
    }));
    console.log(JSON.stringify(report));
    if (report.failed) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { videoInfo };
