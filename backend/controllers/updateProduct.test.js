// Integration self-check for updateProduct: node controllers/updateProduct.test.js
// Drives the real handler with a stubbed Cloudinary and Product model, and
// asserts on the exact update payload written to Mongo plus every Cloudinary
// asset destroyed. Covers the three cases the client reported.
const assert = require('assert');
const Module = require('module');

let uploads = 0;
let destroyed = [];
let lastUpdate = null;
let currentDoc = null;

const origLoad = Module._load;
Module._load = function (request) {
    if (request === 'cloudinary') {
        return {
            v2: {
                uploader: {
                    upload: async () => {
                        uploads += 1;
                        return { public_id: `up_${uploads}`, secure_url: `https://cdn/up_${uploads}.jpg` };
                    },
                    destroy: async (publicId) => { destroyed.push(publicId); return { result: 'ok' }; },
                },
            },
        };
    }
    if (request === '../models/productModel') {
        const stub = function () { };
        stub.findById = async () => currentDoc;
        stub.findByIdAndUpdate = async (id, update) => { lastUpdate = update; return { _id: id, ...update }; };
        return stub;
    }
    return origLoad.apply(this, arguments);
};

const { updateProduct } = require('./productController');
Module._load = origLoad;

// Minimal express doubles. asyncErrorHandler does not return its promise, so
// settle on whichever the handler reaches first: res.json() or next(err).
const run = (body, doc) => new Promise((resolve, reject) => {
    uploads = 0;
    destroyed = [];
    lastUpdate = null;
    currentDoc = doc;

    const req = { params: { id: 'p1' }, body, user: { id: 'u1' } };
    const res = { status: () => res, json: () => resolve(lastUpdate) };
    updateProduct(req, res, (err) => reject(err || new Error('next() with no error')));
});

const docWith = (images, variants = []) => ({
    images,
    variants,
    brand: undefined,
    save: async () => { },
    markModified: () => { },
});

const IMG = (n) => ({ public_id: `pid_${n}`, url: `https://cdn/${n}.jpg` });

(async () => {
    // ── Bug 2, the exact reported sequence ──────────────────────────────────
    // 3 images saved, a 4th added and saved, then the 4th removed.
    let doc = docWith([IMG('a'), IMG('b'), IMG('c')]);
    let update = await run({
        images: ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg', 'data:image/jpeg;base64,zz'],
        featuredImageIndex: 0,
    }, doc);
    assert.strictEqual(update.images.length, 4, 'the 4th image should be added');
    assert.strictEqual(uploads, 1, 'only the new image is uploaded');
    assert.deepStrictEqual(destroyed, [], 'adding an image deletes nothing');

    doc = docWith([IMG('a'), IMG('b'), IMG('c'), { public_id: 'up_1', url: 'https://cdn/up_1.jpg' }]);
    update = await run({
        images: ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'],
        featuredImageIndex: 0,
    }, doc);
    assert.strictEqual(update.images.length, 3, 'removing the 4th image must now stick');
    assert.ok(!update.images.some((i) => i.public_id === 'up_1'));
    assert.deepStrictEqual(destroyed, ['up_1'], 'only the removed asset is destroyed');
    assert.strictEqual(uploads, 0);

    // Removing a middle image keeps order and destroys only that one.
    doc = docWith([IMG('a'), IMG('b'), IMG('c')]);
    update = await run({ images: ['https://cdn/a.jpg', 'https://cdn/c.jpg'], featuredImageIndex: 1 }, doc);
    assert.deepStrictEqual(update.images.map((i) => i.public_id), ['pid_a', 'pid_c']);
    assert.deepStrictEqual(update.images.map((i) => i.isFeatured), [false, true]);
    assert.deepStrictEqual(destroyed, ['pid_b']);

    // featuredImageIndex is never persisted as a field.
    assert.strictEqual('featuredImageIndex' in update, false);

    // ── Safety: a malformed/empty image list must not wipe the product ──────
    doc = docWith([IMG('a'), IMG('b')]);
    update = await run({ images: [], featuredImageIndex: 0 }, doc);
    assert.strictEqual('images' in update, false, 'empty list must leave stored images alone');
    assert.deepStrictEqual(destroyed, [], 'nothing may be destroyed on an empty list');

    // Editing a product without touching images deletes nothing.
    doc = docWith([IMG('a'), IMG('b')]);
    update = await run({ name: 'Renamed' }, doc);
    assert.strictEqual('images' in update, false);
    assert.deepStrictEqual(destroyed, []);

    // Re-featuring without sending the list still rewrites the flags.
    doc = docWith([IMG('a'), IMG('b')]);
    update = await run({ featuredImageIndex: 1 }, doc);
    assert.deepStrictEqual(update.images.map((i) => i.isFeatured), [false, true]);
    assert.deepStrictEqual(destroyed, []);

    // ── Bug 1a: variant images survive a save (blank SKUs) ──────────────────
    const variantsOnDoc = [
        { productId: '', color: 'Beige', size: '24x24', images: [IMG('v1a'), IMG('v1b')] },
        { productId: '', color: 'Grey', size: '24x24', images: [IMG('v2a')] },
        { productId: '', color: 'Black', size: '24x24', images: [IMG('v3a')] },
    ];
    doc = docWith([IMG('a')], variantsOnDoc);
    update = await run({
        variants: JSON.stringify([
            { productId: '', color: 'Beige', size: '24x24', images: ['https://cdn/v1a.jpg', 'https://cdn/v1b.jpg'], featuredImageIndex: 1 },
            { productId: '', color: 'Grey', size: '24x24', images: ['https://cdn/v2a.jpg'], featuredImageIndex: 0 },
            { productId: '', color: 'Black', size: '24x24', images: ['https://cdn/v3a.jpg'], featuredImageIndex: 0 },
        ]),
    }, doc);
    assert.deepStrictEqual(
        update.variants.map((v) => v.images.map((i) => i.public_id)),
        [['pid_v1a', 'pid_v1b'], ['pid_v2a'], ['pid_v3a']],
        'every variant must keep its own images, not just the first'
    );
    assert.deepStrictEqual(update.variants[0].images.map((i) => i.isFeatured), [false, true]);
    assert.deepStrictEqual(destroyed, [], 'an unchanged variant save deletes nothing');
    assert.strictEqual('featuredImageIndex' in update.variants[0], false);

    // Adding an 11th variant leaves the existing ten untouched.
    const ten = Array.from({ length: 10 }, (_, i) => ({
        productId: '', color: `C${i}`, size: '24x24', images: [IMG(`t${i}`)],
    }));
    doc = docWith([IMG('a')], ten);
    update = await run({
        variants: JSON.stringify([
            ...ten.map((v, i) => ({ ...v, images: [`https://cdn/t${i}.jpg`], featuredImageIndex: 0 })),
            { productId: '', color: 'New', size: '24x24', images: ['data:image/jpeg;base64,zz'], featuredImageIndex: 0 },
        ]),
    }, doc);
    assert.strictEqual(update.variants.length, 11);
    assert.deepStrictEqual(
        update.variants.slice(0, 10).map((v) => v.images[0].public_id),
        ten.map((_, i) => `pid_t${i}`),
        'the first ten variants keep their images when an 11th is added'
    );
    assert.deepStrictEqual(destroyed, []);

    // Removing one variant image destroys exactly that asset.
    doc = docWith([IMG('a')], variantsOnDoc);
    update = await run({
        variants: JSON.stringify([
            { productId: '', color: 'Beige', size: '24x24', images: ['https://cdn/v1a.jpg'], featuredImageIndex: 0 },
            { productId: '', color: 'Grey', size: '24x24', images: ['https://cdn/v2a.jpg'], featuredImageIndex: 0 },
            { productId: '', color: 'Black', size: '24x24', images: ['https://cdn/v3a.jpg'], featuredImageIndex: 0 },
        ]),
    }, doc);
    assert.deepStrictEqual(destroyed, ['pid_v1b']);

    // Deleting a whole variant frees its images too.
    doc = docWith([IMG('a')], variantsOnDoc);
    update = await run({
        variants: JSON.stringify([
            { productId: '', color: 'Beige', size: '24x24', images: ['https://cdn/v1a.jpg', 'https://cdn/v1b.jpg'], featuredImageIndex: 0 },
            { productId: '', color: 'Grey', size: '24x24', images: ['https://cdn/v2a.jpg'], featuredImageIndex: 0 },
        ]),
    }, doc);
    assert.strictEqual(update.variants.length, 2);
    assert.deepStrictEqual(destroyed, ['pid_v3a']);

    // ── The bulk CSV editor: variants as an array of already-shaped objects ──
    const shaped = [
        { _id: 'v1', productId: '', color: 'Beige', price: 100, images: [{ ...IMG('v1a'), isFeatured: false }, { ...IMG('v1b'), isFeatured: true }] },
        { _id: 'v2', productId: '', color: 'Grey', price: 200, images: [{ ...IMG('v2a'), isFeatured: true }] },
    ];
    doc = docWith([IMG('a')], shaped);
    update = await run({ variants: shaped.map((v) => ({ ...v, price: v.price + 1 })) }, doc);
    assert.deepStrictEqual(
        update.variants.map((v) => v.images.map((i) => i.public_id)),
        [['pid_v1a', 'pid_v1b'], ['pid_v2a']],
        'CSV-path variants keep their images'
    );
    assert.deepStrictEqual(
        update.variants[0].images.map((i) => i.isFeatured), [false, true],
        'isFeatured is read off the objects when no featuredImageIndex is sent'
    );
    assert.deepStrictEqual(destroyed, [], 'a price-only bulk edit must not delete any image');
    assert.strictEqual(uploads, 0);

    // A variant payload with no images key describes nothing — destroy nothing.
    doc = docWith([IMG('a')], shaped);
    update = await run({ variants: [{ _id: 'v1', color: 'Beige', price: 101 }] }, doc);
    assert.deepStrictEqual(destroyed, [], 'an images-less variant payload must not delete assets');

    // Variants untouched entirely.
    doc = docWith([IMG('a')], shaped);
    update = await run({ name: 'Renamed' }, doc);
    assert.strictEqual('variants' in update, false);
    assert.deepStrictEqual(destroyed, []);

    console.log('updateProduct: all checks passed');
})();
