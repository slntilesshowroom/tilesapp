// Self-check for the product filter builder: node utils/searchFeatures.test.js
// Stubs the Category lookup so it runs without a database.
const assert = require('assert');
const Module = require('module');

const FAKE_IDS = { tiles: 'id-tiles', 'floor-tiles': 'id-floor' };

const origResolve = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === '../models/categoryModel') {
        return {
            find: (q) => ({
                select: () => ({
                    lean: async () => {
                        // slug lookup (category filter)
                        if (q.slug) return q.slug.$in.filter((s) => FAKE_IDS[s]).map((s) => ({ _id: FAKE_IDS[s] }));
                        // children lookup (descendant expansion)
                        if (q.parent) return String(q.parent.$in) === 'id-tiles' ? [{ _id: FAKE_IDS['floor-tiles'] }] : [];
                        // name/slug regex lookup (keyword search)
                        if (q.$or) {
                            const rx = q.$or[0].name;
                            return rx.test('tiles') ? [{ _id: FAKE_IDS.tiles }] : [];
                        }
                        return [];
                    },
                }),
            }),
        };
    }
    return origResolve(request, parent, isMain);
};

const { buildProductFilter, buildSort, escapeRegex, toArray } = require('./searchFeatures');

(async () => {
    // Empty query matches everything — no accidental filter.
    assert.deepStrictEqual(await buildProductFilter({}), {});

    // Keyword is escaped, so a regex metacharacter is matched literally and
    // cannot blow up the query or hang the server.
    const kw = await buildProductFilter({ keyword: 'a+b.c' });
    assert.strictEqual(kw.$or[0].name.source, 'a\\+b\\.c');
    assert.strictEqual(kw.$or[0].name.flags, 'i');
    assert.deepStrictEqual(
        kw.$or.map((c) => Object.keys(c)[0]),
        ['name', 'description', 'tags'],
        'keyword searches name, description and tags'
    );

    // A keyword matching a category name also returns that category's products
    // — searching "tiles" used to match via the categoryName field client-side.
    const kwCat = await buildProductFilter({ keyword: 'tiles' });
    assert.deepStrictEqual(
        kwCat.$or.map((c) => Object.keys(c)[0]),
        ['name', 'description', 'tags', 'category', 'subcategory']
    );

    // Keyword and category filter coexist: top-level $or and $and are ANDed,
    // so a keyword search inside a category does not widen to the whole catalog.
    const both = await buildProductFilter({ keyword: 'a', category: 'tiles' });
    assert.ok(both.$or && both.$and, 'keyword $or and category $and both present');

    // Category expands to its descendants so a parent click includes children.
    const cat = await buildProductFilter({ category: 'tiles' });
    const ids = cat.$and[0].$or[0].category.$in;
    assert.ok(ids.includes('id-tiles') && ids.includes('id-floor'), 'descendants included');

    // An unknown slug yields an empty id list — matches nothing, rather than
    // dropping the filter and showing the entire catalog.
    const bogus = await buildProductFilter({ category: 'does-not-exist' });
    assert.deepStrictEqual(bogus.$and[0].$or[0].category.$in, []);
    assert.strictEqual(bogus.$and[0].$or.length, 2, 'no extra branch can widen the match');

    // Guard for the sharpest edge here: Mongoose strictQuery silently REMOVES a
    // condition on a path the schema does not define, and a removed branch
    // inside $or makes the query match every document. So assert every path the
    // builder emits is a real Product field. A `brand.name` branch did exactly
    // this and turned `?category=tiles` into the whole 1571-product catalog.
    const SCHEMA_PATHS = new Set([
        'name', 'description', 'tags', 'category', 'subcategory', 'price',
        'finish', 'color', 'size', 'material', 'variants.finish',
        'variants.color', 'variants.size', 'ratings', 'stock', 'createdAt',
    ]);

    const collectPaths = (node, out = new Set()) => {
        for (const [key, value] of Object.entries(node)) {
            if (key === '$or' || key === '$and') {
                value.forEach((sub) => collectPaths(sub, out));
            } else {
                out.add(key);
            }
        }
        return out;
    };

    const everyFilterOption = await buildProductFilter({
        keyword: 'tiles', category: 'tiles', subcategory: 'floor-tiles',
        tags: 'popular', roomType: 'kitchen', finish: 'Matte', color: 'Beige',
        size: '600x600', material: 'Ceramic', price: { gte: '10', lte: '99' },
    });

    for (const path of collectPaths(everyFilterOption)) {
        assert.ok(
            SCHEMA_PATHS.has(path),
            `filter emits "${path}", which is not a known Product schema path — ` +
            `strictQuery would drop it and the query would match everything`
        );
    }

    // Range operators are whitelisted and coerced to numbers.
    const price = await buildProductFilter({ price: { gte: '100', lte: '500', $where: 'evil' } });
    assert.deepStrictEqual(price.price, { $gte: 100, $lte: 500 });

    // Non-numeric range values are dropped rather than passed through.
    assert.deepStrictEqual(await buildProductFilter({ price: { gte: 'abc' } }), {});

    // finish/color/size match the product field OR any variant's.
    const finish = await buildProductFilter({ finish: 'Matte,Glossy' });
    assert.deepStrictEqual(finish.$and[0].$or, [
        { finish: { $in: ['Matte', 'Glossy'] } },
        { 'variants.finish': { $in: ['Matte', 'Glossy'] } },
    ]);

    // Category and attribute filters coexist instead of overwriting each other.
    const combo = await buildProductFilter({ category: 'tiles', finish: 'Matte', color: 'Beige' });
    assert.strictEqual(combo.$and.length, 3);

    // roomType is stored in tags, so both params feed the same field.
    const tagged = await buildProductFilter({ tags: 'popular', roomType: 'kitchen' });
    assert.strictEqual(tagged.tags.$in.length, 2);
    assert.ok(tagged.tags.$in[0].test('POPULAR'), 'tag match is case-insensitive');

    // Control params never leak into the filter as document fields.
    assert.deepStrictEqual(await buildProductFilter({ page: '2', limit: '12', sort: 'price-asc' }), {});

    // Sort falls back to newest for an unknown or absent key.
    assert.deepStrictEqual(buildSort('price-asc'), { price: 1 });
    assert.deepStrictEqual(buildSort('garbage'), { createdAt: -1 });
    assert.deepStrictEqual(buildSort(undefined), { createdAt: -1 });

    assert.deepStrictEqual(toArray('a, b ,,c'), ['a', 'b', 'c']);
    assert.deepStrictEqual(toArray(undefined), []);
    assert.strictEqual(escapeRegex('(a+)+$'), '\\(a\\+\\)\\+\\$');

    console.log('searchFeatures: all checks passed');
})();
