import { describe, it, assert } from '@/test/harness';
import {
  LIVE_FILTER_MAX_WIDTH,
  computeLiveFilterDimensions,
  computeHistogramFromImageData,
} from '@/utils/liveHistogram';

describe('liveHistogram utilities for 320px downscaling and fast ImageData histograms', () => {
  it('caps width at 320px and scales height proportionally for landscape, portrait, and small streams', () => {
    assert.equal(LIVE_FILTER_MAX_WIDTH, 320);

    // 1920x1080 (16:9) -> 320x180
    const hd = computeLiveFilterDimensions(1920, 1080);
    assert.equal(hd.width, 320);
    assert.equal(hd.height, 180);

    // 1280x960 (4:3) -> 320x240
    const vga = computeLiveFilterDimensions(1280, 960);
    assert.equal(vga.width, 320);
    assert.equal(vga.height, 240);

    // Portrait 720x1280 (9:16) -> 320x569
    const portrait = computeLiveFilterDimensions(720, 1280);
    assert.equal(portrait.width, 320);
    assert.equal(portrait.height, 569);

    // Stream smaller than 320px wide -> preserved without upscaling
    const tiny = computeLiveFilterDimensions(160, 120);
    assert.equal(tiny.width, 160);
    assert.equal(tiny.height, 120);

    // Invalid / uninitialized 0x0 stream -> safe 320x180 fallback
    const zero = computeLiveFilterDimensions(0, 0);
    assert.equal(zero.width, 320);
    assert.equal(zero.height, 180);
  });

  it('computes 256-bin RGB + Grayscale histogram and luminance stats from RGBA ImageData', () => {
    // 2 pixels: pixel 0 = (R:0, G:0, B:0, A:255) -> gray 0
    //           pixel 1 = (R:255, G:255, B:255, A:255) -> gray 255
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const hist = computeHistogramFromImageData(rgba, 2, 1);

    assert.equal(hist.mode, 'rgb');
    assert.equal(hist.channels.length, 4);

    const red = hist.channels.find((c) => c.channel === 'red')!;
    const green = hist.channels.find((c) => c.channel === 'green')!;
    const blue = hist.channels.find((c) => c.channel === 'blue')!;
    const gray = hist.channels.find((c) => c.channel === 'gray')!;

    assert.equal(red.values.length, 256);
    assert.equal(red.values[0], 1);
    assert.equal(red.values[255], 1);
    assert.equal(green.values[0], 1);
    assert.equal(blue.values[255], 1);
    assert.equal(gray.values[0], 1);
    assert.equal(gray.values[255], 1);

    assert.equal(hist.stats.min, 0);
    assert.equal(hist.stats.max, 255);
    assert.equal(hist.stats.mean, 127.5);
    assert.equal(hist.stats.std_dev, 127.5);
  });

  it('handles empty ImageData buffer gracefully without NaN stats', () => {
    const empty = computeHistogramFromImageData(new Uint8ClampedArray(0), 0, 0);
    assert.equal(empty.stats.min, 0);
    assert.equal(empty.stats.max, 0);
    assert.equal(empty.stats.mean, 0);
    assert.equal(empty.stats.std_dev, 0);
  });
});
