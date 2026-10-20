const Category = require('../models/categoryModel');

// Mongo operators we let through from the query string, e.g. price[gte]=100.
const ALLOWED_OPERATORS = ['gt', 'gte', 'lt', 'lte'];

// Fields that are never part of the document filter.
const CONTROL_PARAMS = [
    'keyword', 'page', 'limit', 'sort', 'fields', 'random',
    'category', 'subcategory', 'subsubcategory', 'tags', 'roomType',
    'finish', 'color', 'size', 'material',
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toArray = (v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : String(v).split(','))
    .map((s) => String(s).trim())
    .filter(Boolean);

// Resolve a category slug to itself plus every descendant slug, so filtering by
// a parent category also returns products filed under its children.
// ponytail: walks the tree with one query per level (≤5 round trips per
// filtered request). Fine for a 3-level tree on a co-located DB; cache the
// category tree in module scope with a TTL if category pages get hot.
const descendantIds = async (slugs) => {
    if (slugs.length === 0) return [];

    const roots = await Category.find({ slug: { $in: slugs } }).select('_id').lean();
    let frontier = roots.map((c) => c._id);
    const all = [...frontier];

    // Category trees here are 3 levels deep; the cap just stops a cycle in bad
    // data from looping forever.
    for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
        const children = await Category.find({ parent: { $in: frontier } }).select('_id').lean();
        frontier = children.map((c) => c._id);
        all.push(...frontier);
    }

    return all;
};

/**
 * Turn a request query string into a single Mongo filter object.
 * Returning a plain object (rather than a live Query) lets the caller reuse the
 * exact same filter for countDocuments without running the find twice.
 */
async function buildProductFilter(queryString = {}) {
    const filter = {};

    // Keyword. Input is escaped: an unescaped user string is both a crash and a
    // ReDoS risk. Matches name/description/tags plus category and subcategory
    // names, so searching "sanitaryware" still finds that category's products
    // the way the old client-side filter's categoryName check did.
    //
    // Deliberately does NOT match brand: productModel defines no `brand` field,
    // so Mongoose's strictQuery silently DROPS a `brand.name` condition, and a
    // dropped branch inside $or makes the whole query match every document.
    if (queryString.keyword && String(queryString.keyword).trim()) {
        const rx = new RegExp(escapeRegex(String(queryString.keyword).trim()), 'i');

        const matchedCategories = await Category.find({ $or: [{ name: rx }, { slug: rx }] })
            .select('_id')
            .lean();
        const matchedIds = matchedCategories.map((c) => c._id);

        filter.$or = [
            { name: rx },
            { description: rx },
            { tags: rx },
            ...(matchedIds.length > 0
                ? [{ category: { $in: matchedIds } }, { subcategory: { $in: matchedIds } }]
                : []),
        ];
    }

    // Category / subcategory / sub-subcategory. The UI sends whichever level was
    // clicked, so treat them as one set and match against either product field.
    const categorySlugs = [
        ...toArray(queryString.category),
        ...toArray(queryString.subcategory),
        ...toArray(queryString.subsubcategory),
    ];

    if (categorySlugs.length > 0) {
        const ids = await descendantIds(categorySlugs);

        // An unresolvable slug yields an empty id list, which matches nothing.
        // That is intentional: the old client-side filter had a brand-name
        // fallback for this case, but productModel has no `brand` field (0 of
        // 1571 documents carry one), so that fallback never matched anything.
        // Push, never assign: every $and contributor below appends, and an
        // assignment here would silently drop anything added before it.
        (filter.$and ||= []).push({
            $or: [
                { category: { $in: ids } },
                { subcategory: { $in: ids } },
            ],
        });
    }

    // Multi-value attribute filters. finish/color/size also live on variants, so
    // match either the product-level field or any variant's.
    const tags = [...toArray(queryString.tags), ...toArray(queryString.roomType)];
    if (tags.length > 0) {
        filter.tags = { $in: tags.map((t) => new RegExp(`^${escapeRegex(t)}$`, 'i')) };
    }

    for (const field of ['finish', 'color', 'size']) {
        const values = toArray(queryString[field]);
        if (values.length === 0) continue;
        (filter.$and ||= []).push({
            $or: [
                { [field]: { $in: values } },
                { [`variants.${field}`]: { $in: values } },
            ],
        });
    }

    const materials = toArray(queryString.material);
    if (materials.length > 0) filter.material = { $in: materials };

    // Range filters: price[gte]=100 → { price: { $gte: 100 } }
    for (const [key, value] of Object.entries(queryString)) {
        if (CONTROL_PARAMS.includes(key)) continue;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const range = {};
            for (const [op, raw] of Object.entries(value)) {
                if (!ALLOWED_OPERATORS.includes(op)) continue;
                const num = Number(raw);
                if (!Number.isNaN(num)) range[`$${op}`] = num;
            }
            if (Object.keys(range).length > 0) filter[key] = range;
        }
    }

    return filter;
}

const SORT_MAP = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    rating: { ratings: -1 },
    name: { name: 1 },
};

const buildSort = (sort) => SORT_MAP[sort] || SORT_MAP.newest;

module.exports = { buildProductFilter, buildSort, escapeRegex, toArray };
