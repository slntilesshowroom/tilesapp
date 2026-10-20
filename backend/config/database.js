const mongoose = require('mongoose');

// Pinned explicitly rather than left to the default, which Mongoose 7 flips.
// With `true`, a query path that is not in the schema is silently REMOVED from
// the filter — and a removed branch inside an $or makes the whole query match
// every document (this is what a `brand.name` condition did: productModel has
// no brand field, so a category filter returned the entire catalog). Keep this
// in mind before querying any path you have not confirmed is in the schema.
mongoose.set('strictQuery', true);

// On Vercel each warm lambda reuses this module, so cache the *promise* rather
// than firing a new connect() per invocation. Caching only after it resolves
// would let concurrent cold requests each open their own connection.
let connectionPromise = null;

const connectDatabase = () => {
    if (mongoose.connection.readyState === 1) {
        return Promise.resolve(mongoose.connection);
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(process.env.MONGO_URI, {
                // Fail fast instead of letting a request hang for the 30s default
                // when the primary is unreachable.
                serverSelectionTimeoutMS: 8000,
                // Lambdas are single-request; a big pool just wastes Atlas connections.
                maxPoolSize: 10,
            })
            .then((m) => {
                console.log('Mongoose Connected');
                return m.connection;
            })
            .catch((err) => {
                console.error('DB connection error:', err.message);
                connectionPromise = null; // allow a retry on the next request
                throw err;
            });
    }

    return connectionPromise;
};

module.exports = connectDatabase;
