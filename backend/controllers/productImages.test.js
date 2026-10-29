// Self-check for the image reconcile logic: node controllers/productImages.test.js
// Stubs cloudinary + the Product model so it runs without a network or database.
const assert = require('assert');
const Module = require('module');

let uploadCount = 0;

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'cloudinary') {
        return {
            v2: {
                uploader: {
                    upload: async () => {
                        uploadCount += 1;
                        return { public_id: `new_${uploadCount}`, secure_url: `https://cdn/new_${uploadCount}.jpg` };
                    },
                    destroy: async () => ({ result: 'ok' }),
                },
            },
        };
    }
    if (request === '../models/productModel') {
        const stub = function () { };
        stub.find = () => { };
        return stub;
    }
    return origLoad.apply(this, arguments);
};

const { _reconcileImages: reconcileImages, _featuredIndexOf: featuredIndexOf } = require('./productController');

Module._load = origLoad;

const existing = [
    { public_id: 'a1', url: 'https://cdn/a.jpg' },
    { public_id: 'b2', url: 'https://cdn/b.jpg' },
    { public_id: 'c3', url: 'https://cdn/c.jpg' },
];
const byUrl = () => new Map(existing.map((i) => [i.url, i]));

(async () => {
    // Keeping every image preserves its public_id — nothing is re-uploaded.
    uploadCount = 0;
    let out = await reconcileImages(existing.map((i) => i.url), byUrl(), 'products', 0);
    assert.deepStrictEqual(out.map((i) => i.public_id), ['a1', 'b2', 'c3']);
    assert.strictEqual(uploadCount, 0, 'existing URLs must not be re-uploaded');

    // The bug the client reported: save 3, add a 4th, then remove the 4th.
    // The omitted image must be gone from the result, not appended back.
    uploadCount = 0;
    out = await reconcileImages(
        ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg', 'data:image/jpeg;base64,xxx'],
        byUrl(), 'products', 0
    );
    assert.strictEqual(out.length, 4);
    assert.strictEqual(out[3].public_id, 'new_1');

    const afterRemoval = await reconcileImages(
        ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'],
        new Map([...existing, out[3]].map((i) => [i.url, i])), 'products', 0
    );
    assert.strictEqual(afterRemoval.length, 3, 'removed image must not survive the save');
    assert.ok(!afterRemoval.some((i) => i.url === out[3].url));

    // Removing a middle image keeps the rest in order.
    out = await reconcileImages(['https://cdn/a.jpg', 'https://cdn/c.jpg'], byUrl(), 'products', 0);
    assert.deepStrictEqual(out.map((i) => i.public_id), ['a1', 'c3']);

    // An unmatched URL is kept, never silently dropped — dropping it is what
    // emptied out every variant except the first.
    out = await reconcileImages(['https://cdn/unknown.jpg'], byUrl(), 'products/variants', 0);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].url, 'https://cdn/unknown.jpg');

    // Already-shaped objects (bulk inline editor) carry their own public_id.
    out = await reconcileImages([{ public_id: 'z9', url: 'https://cdn/z.jpg' }], new Map(), 'products', 0);
    assert.strictEqual(out[0].public_id, 'z9');

    // Exactly one image is featured, at the requested index.
    out = await reconcileImages(existing.map((i) => i.url), byUrl(), 'products', 2);
    assert.deepStrictEqual(out.map((i) => i.isFeatured), [false, false, true]);

    // An out-of-range or missing index falls back to the first image.
    for (const idx of [99, -1, undefined, null, '']) {
        out = await reconcileImages(existing.map((i) => i.url), byUrl(), 'products', idx);
        assert.deepStrictEqual(
            out.map((i) => i.isFeatured), [true, false, false],
            `index ${idx} should fall back to 0`
        );
    }

    // featuredIndexOf: explicit index wins; otherwise read isFeatured; else 0.
    assert.strictEqual(featuredIndexOf({ featuredImageIndex: 2, images: [] }), 2);
    assert.strictEqual(featuredIndexOf({ images: [{ url: 'x' }, { url: 'y', isFeatured: true }] }), 1);
    assert.strictEqual(featuredIndexOf({ images: [{ url: 'x' }] }), 0);
    assert.strictEqual(featuredIndexOf({}), 0);

    console.log('productImages: all checks passed');
})();
