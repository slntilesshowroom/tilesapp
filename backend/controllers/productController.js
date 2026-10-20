const mongoose = require('mongoose');
const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const { buildProductFilter, buildSort, toArray } = require('../utils/searchFeatures');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary');
const { extractProductsFromText, extractProductsFromImages } = require('../utils/geminiProductExtractor');

// Heavy fields that no product *list* or card ever renders. `reviews` is an
// unbounded array and `description` is long-form prose — together they were the
// bulk of the multi-megabyte list responses. Excluding (rather than selecting)
// means new schema fields keep flowing through to the client by default.
const LIST_FIELDS = '-reviews -description -specifications -careInstructions -highlights -bulkPricing -user -__v';

// Hard ceiling so a hand-edited ?limit= can't ask for the whole collection again.
const MAX_PAGE_SIZE = 100;

// Separate, roomier ceiling for id lookups: a cart or wishlist legitimately
// holds more items than a page of search results shows.
const MAX_IDS_PER_LOOKUP = 250;

const clampLimit = (raw, fallback) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.floor(n), MAX_PAGE_SIZE);
};

// $sample bypasses .select(), so drop the heavy fields by hand on that path.
const stripListFields = (doc) => {
    for (const field of LIST_FIELDS.split(' ')) delete doc[field.slice(1)];
    return doc;
};

// Max products accepted per bulk-create call. Each product can carry several
// images (and variants with their own images), each requiring a Cloudinary
// round-trip, so this is kept low to stay well under Vercel's execution time
// limit — the frontend chunks larger PDF-extracted batches into calls of
// this size or smaller.
const MAX_BULK_PRODUCTS_PER_REQUEST = 20;

// Get All Products — the paginated browse/search endpoint
exports.getAllProducts = asyncErrorHandler(async (req, res, next) => {

    const resultPerPage = clampLimit(req.query.limit, 12);
    const currentPage = Math.max(1, Number(req.query.page) || 1);

    const filter = await buildProductFilter(req.query);

    // One count and one page of documents. The previous version ran the full
    // filtered find (populated, unpaginated) purely to read .length off it, then
    // ran it a second time for the page — two full scans per request.
    // An unfiltered browse is the most-hit case; estimatedDocumentCount reads
    // collection metadata instead of scanning. countDocuments is still used
    // whenever a filter narrows the set, where an exact number matters.
    const isUnfiltered = Object.keys(filter).length === 0;

    const [filteredProductsCount, products] = await Promise.all([
        isUnfiltered ? Product.estimatedDocumentCount() : Product.countDocuments(filter),
        Product.find(filter)
            .select(LIST_FIELDS)
            .sort(buildSort(req.query.sort))
            .skip(resultPerPage * (currentPage - 1))
            .limit(resultPerPage)
            .populate('category subcategory', 'name slug')
            .lean(),
    ]);

    res.status(200).json({
        success: true,
        products,
        // Kept as the count matching the active filter — the old value was an
        // unfiltered countDocuments(), so page counts were wrong whenever a
        // filter was applied.
        productsCount: filteredProductsCount,
        resultPerPage,
        filteredProductsCount,
        currentPage,
        totalPages: Math.ceil(filteredProductsCount / resultPerPage),
    });
});

// Get Products for home sliders / tag sections.
// Supports ?tags=popular&limit=8&random=true so the caller asks for the 8 rows
// it renders instead of downloading the catalog and filtering in JS.
exports.getProducts = asyncErrorHandler(async (req, res, next) => {
    const limit = clampLimit(req.query.limit, MAX_PAGE_SIZE);
    const filter = await buildProductFilter(req.query);

    // $sample picks server-side; shuffling a full catalog client-side was the
    // reason these responses could never be cached.
    if (req.query.random === 'true') {
        const products = await Product.aggregate([
            { $match: filter },
            { $sample: { size: limit } },
        ]);

        await Product.populate(products, { path: 'category subcategory', select: 'name slug' });

        return res.status(200).json({
            success: true,
            products: products.map(stripListFields),
        });
    }

    const products = await Product.find(filter)
        .select(LIST_FIELDS)
        .sort(buildSort(req.query.sort))
        .limit(limit)
        .populate('category subcategory', 'name slug')
        .lean();

    res.status(200).json({
        success: true,
        products,
    });
});

// Fetch a specific set of products by id — cart, wishlist and checkout each
// need a handful of known products, not the catalog.
exports.getProductsByIds = asyncErrorHandler(async (req, res, next) => {
    const requested = toArray(req.query.ids ?? req.body?.ids);

    // Reject rather than truncate. Checkout prices its line items from this
    // response, and a silently dropped id becomes a ₹0 "Unknown Product" line
    // in the order total — so failing loudly is the safe direction.
    if (requested.length > MAX_IDS_PER_LOOKUP) {
        return next(new ErrorHandler(
            `Too many product ids in one request (max ${MAX_IDS_PER_LOOKUP}).`,
            400
        ));
    }

    const ids = requested.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (ids.length === 0) {
        return res.status(200).json({ success: true, products: [] });
    }

    const products = await Product.find({ _id: { $in: ids } })
        .select(LIST_FIELDS)
        .populate('category subcategory', 'name slug')
        .lean();

    res.status(200).json({
        success: true,
        products,
    });
});

// Filter facet counts for the search sidebar.
// Computed by Mongo in one round trip; the sidebar used to derive these in the
// browser from a full copy of the catalog shipped down in the RSC payload.
exports.getProductFacets = asyncErrorHandler(async (req, res, next) => {
    // Facets describe the whole catalog, not the active filter, so the counts
    // stay stable as the user ticks boxes.
    // ponytail: full collection scan, unindexed. ~1.5s at 1.5k products and the
    // frontend caches it for 5 minutes, so it is paid once per window. If the
    // catalog reaches tens of thousands, precompute facets on product write
    // into a small summary collection instead.
    const [result] = await Product.aggregate([
        {
            $facet: {
                categories: [
                    { $match: { category: { $ne: null } } },
                    { $group: { _id: '$category', count: { $sum: 1 } } },
                ],
                subcategories: [
                    { $match: { subcategory: { $ne: null } } },
                    { $group: { _id: '$subcategory', count: { $sum: 1 } } },
                ],
                tags: [
                    { $unwind: '$tags' },
                    { $group: { _id: { $toLower: '$tags' }, count: { $sum: 1 } } },
                ],
                finishes: [
                    { $project: { v: { $setUnion: [{ $cond: [{ $ifNull: ['$finish', false] }, ['$finish'], []] }, { $ifNull: ['$variants.finish', []] }] } } },
                    { $unwind: '$v' },
                    { $group: { _id: '$v', count: { $sum: 1 } } },
                ],
                colors: [
                    { $project: { v: { $setUnion: [{ $cond: [{ $ifNull: ['$color', false] }, ['$color'], []] }, { $ifNull: ['$variants.color', []] }] } } },
                    { $unwind: '$v' },
                    { $group: { _id: '$v', count: { $sum: 1 } } },
                ],
                sizes: [
                    { $project: { v: { $setUnion: [{ $cond: [{ $ifNull: ['$size', false] }, ['$size'], []] }, { $ifNull: ['$variants.size', []] }] } } },
                    { $unwind: '$v' },
                    { $group: { _id: '$v', count: { $sum: 1 } } },
                ],
                priceRange: [
                    { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
                ],
                total: [{ $count: 'count' }],
            },
        },
    ]);

    // Category facets group by ObjectId; resolve them to the slugs the UI filters on.
    const categoryIds = [...result.categories, ...result.subcategories].map((c) => c._id);
    const categoryDocs = await mongoose.model('Category')
        .find({ _id: { $in: categoryIds } })
        .select('slug')
        .lean();
    const slugById = new Map(categoryDocs.map((c) => [String(c._id), c.slug]));

    const toPairs = (rows) => rows
        .filter((r) => r._id !== null && r._id !== '')
        .map((r) => ({ value: String(r._id), count: r.count }))
        .sort((a, b) => b.count - a.count);

    const categoryCounts = {};
    for (const row of [...result.categories, ...result.subcategories]) {
        const slug = slugById.get(String(row._id));
        if (slug) categoryCounts[slug] = (categoryCounts[slug] || 0) + row.count;
    }

    res.status(200).json({
        success: true,
        facets: {
            categories: Object.entries(categoryCounts)
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count),
            tags: toPairs(result.tags),
            finishes: toPairs(result.finishes),
            colors: toPairs(result.colors),
            sizes: toPairs(result.sizes),
            priceRange: result.priceRange[0]
                ? { min: result.priceRange[0].min, max: result.priceRange[0].max }
                : { min: 0, max: 0 },
            total: result.total[0]?.count || 0,
        },
    });
});

// Get Product Details
exports.getProductDetails = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id).populate('category subcategory', 'name slug');

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        product,
    });
});

// Get All Products ---ADMIN
// Paginated. The admin table used to pull every product and paginate in the
// browser; ?all=true is kept for the CSV export, which genuinely needs the lot.
exports.getAdminProducts = asyncErrorHandler(async (req, res, next) => {
    const filter = await buildProductFilter(req.query);

    if (req.query.all === 'true') {
        const products = await Product.find(filter)
            .select(LIST_FIELDS)
            .sort({ createdAt: -1 })
            .populate('category subcategory', 'name slug')
            .lean();

        return res.status(200).json({ success: true, products, productsCount: products.length });
    }

    const resultPerPage = clampLimit(req.query.limit, 12);
    const currentPage = Math.max(1, Number(req.query.page) || 1);

    const [productsCount, products] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
            .select(LIST_FIELDS)
            .sort({ createdAt: -1 })
            .skip(resultPerPage * (currentPage - 1))
            .limit(resultPerPage)
            .populate('category subcategory', 'name slug')
            .lean(),
    ]);

    res.status(200).json({
        success: true,
        products,
        productsCount,
        resultPerPage,
        currentPage,
        totalPages: Math.ceil(productsCount / resultPerPage),
    });
});

// Create Product ---ADMIN
exports.createProduct = asyncErrorHandler(async (req, res, next) => {

    let images = [];
    if (typeof req.body.images === "string") {
        images.push(req.body.images);
    } else {
        images = req.body.images;
    }

    const imagesLink = [];

    for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.v2.uploader.upload(images[i], {
            folder: "products",
        });

        imagesLink.push({
            public_id: result.public_id,
            url: result.secure_url,
            isFeatured: i === 0 ? true : false, // First image is featured by default
        });
    }

    req.body.images = imagesLink;
    req.body.user = req.user.id;

    let specs = [];
    req.body.specifications.forEach((s) => {
        specs.push(JSON.parse(s))
    });
    req.body.specifications = specs;

    // Handle care instructions
    if (req.body.careInstructions && Array.isArray(req.body.careInstructions)) {
        req.body.careInstructions = req.body.careInstructions.map(c =>
            typeof c === 'string' ? JSON.parse(c) : c
        );
    }

    // Handle tags (if it's a string, convert to array)
    if (req.body.tags && typeof req.body.tags === 'string') {
        req.body.tags = JSON.parse(req.body.tags);
    }

    // Handle variants with images
    if (req.body.variants && typeof req.body.variants === 'string') {
        const variants = JSON.parse(req.body.variants);

        // Process variant images
        const processedVariants = [];
        for (const variant of variants) {
            const variantData = { ...variant };

            // Upload variant images if they exist
            if (variant.images && Array.isArray(variant.images) && variant.images.length > 0) {
                const variantImagesLink = [];

                for (let i = 0; i < variant.images.length; i++) {
                    const result = await cloudinary.v2.uploader.upload(variant.images[i], {
                        folder: "products/variants",
                    });

                    variantImagesLink.push({
                        public_id: result.public_id,
                        url: result.secure_url,
                        isFeatured: i === (variant.featuredImageIndex || 0)
                    });
                }

                variantData.images = variantImagesLink;
                delete variantData.featuredImageIndex; // Remove this as we use isFeatured instead
            }

            processedVariants.push(variantData);
        }

        req.body.variants = processedVariants;
    }

    // Handle tiles-specific fields
    if (req.body.dimensions) {
        req.body.dimensions = JSON.parse(req.body.dimensions);
    }

    if (req.body.roomType && typeof req.body.roomType === 'string') {
        req.body.roomType = JSON.parse(req.body.roomType);
    }

    if (req.body.bulkPricing && typeof req.body.bulkPricing === 'string') {
        req.body.bulkPricing = JSON.parse(req.body.bulkPricing);
    }

    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        product
    });
});

// Extract product rows from a chunk of PDF text ---ADMIN
// Text is extracted client-side (from the PDF the admin uploaded) and sent
// here in page-sized chunks so a single Gemini call never risks a serverless
// timeout on large catalogs.
exports.extractProductsFromPdfText = asyncErrorHandler(async (req, res, next) => {
    const { text, pageRangeLabel } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
        return next(new ErrorHandler('No text was provided to extract products from.', 400));
    }

    const { products } = await extractProductsFromText(text, { pageRangeLabel });

    res.status(200).json({
        success: true,
        products,
    });
});

// Extract product rows from rendered page images ---ADMIN
// Fallback for PDFs with no text layer (scans / image-only catalogs) —
// pages are rendered to images client-side and sent here in small,
// byte-budgeted chunks for Gemini's vision to read directly.
exports.extractProductsFromPdfImages = asyncErrorHandler(async (req, res, next) => {
    const { images, pageRangeLabel } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
        return next(new ErrorHandler('No page images were provided to extract products from.', 400));
    }

    const { products } = await extractProductsFromImages(images, { pageRangeLabel });

    res.status(200).json({
        success: true,
        products,
    });
});

// Bulk create products ---ADMIN
// Used by the PDF-import review screen to save many extracted products
// (each already carrying its own base64 images/variant images, filled in by
// the admin in the per-product editor) in one request.
exports.bulkCreateProducts = asyncErrorHandler(async (req, res, next) => {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
        return next(new ErrorHandler('No products were provided to create.', 400));
    }

    if (products.length > MAX_BULK_PRODUCTS_PER_REQUEST) {
        return next(new ErrorHandler(
            `Too many products in one request (max ${MAX_BULK_PRODUCTS_PER_REQUEST}). Please upload in smaller batches.`,
            400
        ));
    }

    const results = [];

    for (let i = 0; i < products.length; i++) {
        const input = products[i];
        try {
            const doc = { ...input, user: req.user.id };

            // Upload main product images
            const rawImages = Array.isArray(input.images) ? input.images : [];
            const imagesLink = [];
            for (let imgIdx = 0; imgIdx < rawImages.length; imgIdx++) {
                const result = await cloudinary.v2.uploader.upload(rawImages[imgIdx], { folder: "products" });
                imagesLink.push({
                    public_id: result.public_id,
                    url: result.secure_url,
                    isFeatured: imgIdx === (input.featuredImageIndex || 0),
                });
            }
            doc.images = imagesLink;
            delete doc.featuredImageIndex;

            // Upload variant images
            if (Array.isArray(input.variants) && input.variants.length > 0) {
                const processedVariants = [];
                for (const variant of input.variants) {
                    const variantData = { ...variant };
                    const rawVariantImages = Array.isArray(variant.images) ? variant.images : [];
                    if (rawVariantImages.length > 0) {
                        const variantImagesLink = [];
                        for (let imgIdx = 0; imgIdx < rawVariantImages.length; imgIdx++) {
                            const result = await cloudinary.v2.uploader.upload(rawVariantImages[imgIdx], { folder: "products/variants" });
                            variantImagesLink.push({
                                public_id: result.public_id,
                                url: result.secure_url,
                                isFeatured: imgIdx === (variant.featuredImageIndex || 0),
                            });
                        }
                        variantData.images = variantImagesLink;
                    } else {
                        variantData.images = [];
                    }
                    delete variantData.featuredImageIndex;
                    processedVariants.push(variantData);
                }
                doc.variants = processedVariants;
            }

            const product = await Product.create(doc);
            results.push({ index: i, success: true, id: product._id, name: product.name });
        } catch (err) {
            let message = err.message || 'Failed to create product.';
            if (err.code === 11000) {
                const field = Object.keys(err.keyValue || {})[0] || 'field';
                message = `Duplicate ${field}: "${err.keyValue?.[field]}" already exists.`;
            } else if (err.name === 'ValidationError') {
                message = Object.values(err.errors).map(e => e.message).join('; ');
            }
            results.push({ index: i, success: false, name: input?.name, error: message });
        }
    }

    const successCount = results.filter(r => r.success).length;

    res.status(200).json({
        success: true,
        results,
        successCount,
        failCount: results.length - successCount,
    });
});

// Update Product ---ADMIN
exports.updateProduct = asyncErrorHandler(async (req, res, next) => {

    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    if (req.body.images !== undefined) {
        let images = [];
        if (typeof req.body.images === "string") {
            images.push(req.body.images);
        } else if (Array.isArray(req.body.images)) {
            images = req.body.images;
        }

        if (images && images.length > 0) {
            // Keep existing images and append new ones
            const imagesLink = [...(product.images || [])];

            for (let i = 0; i < images.length; i++) {
                const result = await cloudinary.v2.uploader.upload(images[i], {
                    folder: "products",
                });

                imagesLink.push({
                    public_id: result.public_id,
                    url: result.secure_url,
                    isFeatured: false,
                });
            }
            req.body.images = imagesLink;
        }
    }

    // FIX: Handle featured image index update (when user changes featured image without uploading new ones)
    if (req.body.featuredImageIndex !== undefined && product.images && product.images.length > 0) {
        const featuredIndex = parseInt(req.body.featuredImageIndex);
        if (featuredIndex >= 0 && featuredIndex < product.images.length) {
            // Update all images to set only the selected one as featured
            product.images.forEach((img, index) => {
                img.isFeatured = index === featuredIndex;
            });
            // Mark the images field as modified so Mongoose saves it
            product.markModified('images');
            await product.save();
        }
        // Remove featuredImageIndex from req.body so it doesn't get saved as a field
        delete req.body.featuredImageIndex;
    }

    // Handle brand logo update
    if (req.body.logo && req.body.logo.length > 0) {
        // Delete old logo if exists
        if (product.brand && product.brand.logo && product.brand.logo.public_id) {
            await cloudinary.v2.uploader.destroy(product.brand.logo.public_id);
        }

        const result = await cloudinary.v2.uploader.upload(req.body.logo, {
            folder: "brands",
        });
        const brandLogo = {
            public_id: result.public_id,
            url: result.secure_url,
        };

        req.body.brand = {
            name: req.body.brandname,
            logo: brandLogo
        };
    } else if (req.body.brandname) {
        // Update brand name only if logo not provided
        req.body.brand = {
            name: req.body.brandname,
            logo: product.brand?.logo // Keep existing logo
        };
    }

    if (req.body.specifications && Array.isArray(req.body.specifications) && req.body.specifications.length > 0) {
        let specs = [];
        req.body.specifications.forEach((s) => {
            if (typeof s === 'string') {
                specs.push(JSON.parse(s));
            } else {
                specs.push(s);
            }
        });
        req.body.specifications = specs;
    }

    // Handle care instructions
    if (req.body.careInstructions && Array.isArray(req.body.careInstructions)) {
        req.body.careInstructions = req.body.careInstructions.map(c =>
            typeof c === 'string' ? JSON.parse(c) : c
        );
    }

    // Handle tiles-specific fields
    if (req.body.dimensions && typeof req.body.dimensions === 'string') {
        req.body.dimensions = JSON.parse(req.body.dimensions);
    }

    if (req.body.roomType && typeof req.body.roomType === 'string') {
        req.body.roomType = JSON.parse(req.body.roomType);
    }

    if (req.body.bulkPricing && typeof req.body.bulkPricing === 'string') {
        req.body.bulkPricing = JSON.parse(req.body.bulkPricing);
    }

    // Handle tags (if it's a string, convert to array)
    if (req.body.tags && typeof req.body.tags === 'string') {
        req.body.tags = JSON.parse(req.body.tags);
    }

    // Handle variants with images
    if (req.body.variants && typeof req.body.variants === 'string') {
        const variants = JSON.parse(req.body.variants);

        // Process variant images
        const processedVariants = [];
        for (const variant of variants) {
            const variantData = { ...variant };

            // Upload variant images if they exist and are base64 strings (new uploads)
            if (variant.images && Array.isArray(variant.images) && variant.images.length > 0) {
                const variantImagesLink = [];

                for (let i = 0; i < variant.images.length; i++) {
                    const image = variant.images[i];

                    // Check if this is a new base64 image upload or an existing URL
                    if (typeof image === 'string' && image.startsWith('data:')) {
                        // New image - upload to Cloudinary
                        const result = await cloudinary.v2.uploader.upload(image, {
                            folder: "products/variants",
                        });

                        variantImagesLink.push({
                            public_id: result.public_id,
                            url: result.secure_url,
                            isFeatured: i === (variant.featuredImageIndex || 0)
                        });
                    } else if (typeof image === 'string' && image.startsWith('http')) {
                        // Existing image URL - keep as is
                        // Find the existing image from the product to preserve public_id
                        const existingVariant = product.variants?.find(v =>
                            v.productId === variant.productId ||
                            (v.color === variant.color && v.size === variant.size)
                        );
                        const existingImage = existingVariant?.images?.find(img => img.url === image);

                        if (existingImage) {
                            variantImagesLink.push({
                                public_id: existingImage.public_id,
                                url: existingImage.url,
                                isFeatured: i === (variant.featuredImageIndex || 0)
                            });
                        }
                    }
                }

                variantData.images = variantImagesLink;
                delete variantData.featuredImageIndex; // Remove this as we use isFeatured instead
            }

            processedVariants.push(variantData);
        }

        req.body.variants = processedVariants;
    }

    req.body.user = req.user.id;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(201).json({
        success: true,
        product
    });
});

// Delete Product ---ADMIN
exports.deleteProduct = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    for (let i = 0; i < product.images.length; i++) {
        await cloudinary.v2.uploader.destroy(product.images[i].public_id);
    }

    await product.remove();

    res.status(201).json({
        success: true
    });
});

// Create OR Update Reviews
exports.createProductReview = asyncErrorHandler(async (req, res, next) => {

    const { rating, comment, productId } = req.body;

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    }

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const isReviewed = product.reviews.find(review => review.user.toString() === req.user._id.toString());

    if (isReviewed) {

        product.reviews.forEach((rev) => {
            if (rev.user.toString() === req.user._id.toString())
                (rev.rating = rating, rev.comment = comment);
        });
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
        avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true
    });
});

// Get All Reviews of Product
exports.getProductReviews = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        reviews: product.reviews
    });
});

// Delete Reveiws
exports.deleteReview = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const reviews = product.reviews.filter((rev) => rev._id.toString() !== req.query.id.toString());

    let avg = 0;

    reviews.forEach((rev) => {
        avg += rev.rating;
    });

    let ratings = 0;

    if (reviews.length === 0) {
        ratings = 0;
    } else {
        ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(req.query.productId, {
        reviews,
        ratings: Number(ratings),
        numOfReviews,
    }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});