const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter product name"],
        trim: true,
        maxlength: [200, "Product name cannot exceed 200 characters"]
    },
    description: {
        type: String,
        required: [true, "Please enter product description"]
    },
    shortDescription: {
        type: String,
        required: false
    },
    highlights: [
        {
            type: String,
            required: false,
            trim: true
        }
    ],
    careInstructions: [
        {
            title: {
                type: String,
                required: false,
                trim: true
            },
            description: {
                type: String,
                required: false,
                trim: true
            }
        }
    ],
    specifications: [
        {
            title: {
                type: String,
                required: false,
                trim: true
            },
            description: {
                type: String,
                required: false,
                trim: true
            }
        }
    ],
    price: {
        type: Number,
        required: [true, "Please enter product price"],
        min: [0, "Price cannot be negative"]
    },
    cuttedPrice: {
        type: Number,
        required: false,
        min: [0, "Cutted price cannot be negative"]
    },
    images: [
        {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            },
            isFeatured: {
                type: Boolean,
                default: false
            }
        }
    ],
    category: {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
        required: [true, "Please select product category"]
    },
    subcategory: {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
        required: false
    },

    // Product ID (SKU or custom identifier)
    productId: {
        type: String,
        required: false,
        trim: true,
        sparse: true, // Allow multiple null values but unique non-null values
        index: true
    },

    // FIX: Removed dimensions object - using 'size' field instead for consistency with frontend
    // The frontend sends size as a simple string like "24x24" or "1200x600mm"
    size: {
        type: String,
        required: false,
        trim: true
    },

    unit: {
        type: String,
        required: false,
        trim: true
    },

    material: {
        type: String,
        required: false,
        trim: true
    },

    finish: {
        type: String,
        required: false,
        trim: true
    },

    color: {
        type: String,
        required: false,
        trim: true
    },

    thickness: {
        type: Number, // in mm
        required: false,
        min: [0, "Thickness cannot be negative"]
    },

    coverage: {
        type: Number, // sq ft per box
        required: false,
        min: [0, "Coverage cannot be negative"]
    },

    tilesPerBox: {
        type: Number,
        required: false,
        min: [0, "Tiles per box cannot be negative"]
    },

    pricePerSqft: {
        type: Number,
        required: false,
        min: [0, "Price per sq.ft cannot be negative"]
    },

    weight: {
        type: Number, // kg per box
        required: false,
        min: [0, "Weight cannot be negative"]
    },

    waterAbsorption: {
        type: String, // e.g., '<0.5%', '0.5-3%', '>10%'
        required: false,
        trim: true
    },

    slipResistance: {
        type: String, // e.g., 'R9', 'R10', 'R11', 'R12', 'R13'
        enum: ['R9', 'R10', 'R11', 'R12', 'R13', 'Not Rated', ''],
        required: false
    },

    bulkPricing: [{
        minQty: {
            type: Number,
            required: true,
            min: [1, "Minimum quantity must be at least 1"]
        },
        price: {
            type: Number,
            required: true,
            min: [0, "Price cannot be negative"]
        }
    }],

    // FIX: Tags array to store both quality tags and room type tags from frontend
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // Product Variants
    hasVariants: {
        type: Boolean,
        default: false
    },
    variants: [{
        productId: {
            type: String,
            required: false,
            trim: true
        },
        color: {
            type: String,
            required: false,
            trim: true
        },
        size: {
            type: String,
            required: false,
            trim: true
        },
        finish: {
            type: String,
            required: false,
            trim: true
        },
        material: {
            type: String,
            required: false,
            trim: true
        },
        unit: {
            type: String,
            required: false,
            trim: true
        },
        price: {
            type: Number,
            required: false,
            min: [0, "Variant price cannot be negative"]
        },
        cuttedPrice: {
            type: Number,
            required: false,
            min: [0, "Variant cutted price cannot be negative"]
        },
        stock: {
            type: Number,
            required: false,
            min: [0, "Variant stock cannot be negative"],
            default: 0
        },
        images: [
            {
                public_id: {
                    type: String,
                    required: false
                },
                url: {
                    type: String,
                    required: false
                },
                isFeatured: {
                    type: Boolean,
                    default: false
                }
            }
        ]
    }],

    stock: {
        type: Number,
        required: [true, "Please enter product stock"],
        min: [0, "Stock cannot be negative"],
        default: 1
    },
    ratings: {
        type: Number,
        default: 0,
        min: [0, "Rating cannot be negative"],
        max: [5, "Rating cannot exceed 5"]
    },
    numOfReviews: {
        type: Number,
        default: 0,
        min: [0, "Number of reviews cannot be negative"]
    },
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: "User",
                required: true
            },
            name: {
                type: String,
                required: true,
                trim: true
            },
            rating: {
                type: Number,
                required: true,
                min: [1, "Rating must be at least 1"],
                max: [5, "Rating cannot exceed 5"]
            },
            comment: {
                type: String,
                required: true,
                trim: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],

    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Automatically manages createdAt and updatedAt
});

// Indexes for better query performance
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ tags: 1 });
productSchema.index({ material: 1 });
productSchema.index({ finish: 1 });

// The search sidebar filters on these; without indexes each one is a collection
// scan. `size`/`color` and their variant-level counterparts are all reachable
// from a single filter, so index both levels.
productSchema.index({ color: 1 });
productSchema.index({ size: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ 'variants.finish': 1 });
productSchema.index({ 'variants.color': 1 });
productSchema.index({ 'variants.size': 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
    if (this.cuttedPrice && this.cuttedPrice > this.price) {
        return Math.round(((this.cuttedPrice - this.price) / this.cuttedPrice) * 100);
    }
    return 0;
});

// Pre-save middleware to update updatedAt
productSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save middleware to ensure only one featured image
productSchema.pre('save', function (next) {
    if (this.images && this.images.length > 0) {
        let featuredCount = 0;
        let firstFeaturedIndex = -1;

        this.images.forEach((img, index) => {
            if (img.isFeatured) {
                featuredCount++;
                if (firstFeaturedIndex === -1) {
                    firstFeaturedIndex = index;
                }
            }
        });

        // If no featured image, make first one featured
        if (featuredCount === 0) {
            this.images[0].isFeatured = true;
        }
        // If multiple featured images, keep only the first one
        else if (featuredCount > 1) {
            this.images.forEach((img, index) => {
                img.isFeatured = index === firstFeaturedIndex;
            });
        }
    }
    next();
});

// Method to calculate average rating
productSchema.methods.calculateAverageRating = function () {
    if (this.reviews.length === 0) {
        this.ratings = 0;
        this.numOfReviews = 0;
    } else {
        const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        this.ratings = (totalRating / this.reviews.length).toFixed(1);
        this.numOfReviews = this.reviews.length;
    }
};

// Static method to get products by category
productSchema.statics.findByCategory = function (categoryId) {
    return this.find({ category: categoryId }).populate('category subcategory');
};

// Static method to get featured products
productSchema.statics.findFeatured = function (limit = 10) {
    return this.find({ 'images.isFeatured': true })
        .sort({ ratings: -1, createdAt: -1 })
        .limit(limit)
        .populate('category subcategory');
};

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
