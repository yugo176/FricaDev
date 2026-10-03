import { describe, expect, it } from 'vitest';
import { detectImage } from '../src/lib/storage.js';

describe('detectImage', () => {
  it('reconnaît WebP, JPEG et PNG par leurs premiers octets', () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(8).fill(0)]);
    expect(detectImage(webp)?.mime).toBe('image/webp');
    expect(detectImage(jpeg)?.mime).toBe('image/jpeg');
    expect(detectImage(png)?.mime).toBe('image/png');
  });

  it('refuse le SVG, le HTML et les fichiers trop courts', () => {
    expect(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImage(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectImage(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
