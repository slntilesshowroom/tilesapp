import { FaStar, FaQuoteLeft } from "react-icons/fa";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Mumbai",
    rating: 5,
    comment: "Excellent quality tiles! The bathroom tiles we purchased are stunning and the installation was smooth. Highly recommend for anyone renovating their home.",
    date: "2 weeks ago",
    avatar: "PS",
  },
  {
    name: "Rajesh Kumar",
    location: "Delhi",
    rating: 5,
    comment: "Great collection and very competitive prices. The team helped us choose the perfect tiles for our kitchen. The marble finish tiles look absolutely premium!",
    date: "1 month ago",
    avatar: "RK",
  },
  {
    name: "Anita Desai",
    location: "Bangalore",
    rating: 5,
    comment: "Beautiful designs and durable quality. We used their tiles for our entire home renovation. The customer service was exceptional and delivery was on time.",
    date: "3 weeks ago",
    avatar: "AD",
  },
  {
    name: "Vikram Patel",
    location: "Pune",
    rating: 4,
    comment: "Very satisfied with the outdoor tiles. They have withstood the monsoon season perfectly. The anti-skid feature works great. Would definitely buy again!",
    date: "1 week ago",
    avatar: "VP",
  },
];

export const Testimonials = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-900 rounded-3xl my-16 shadow-2xl">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          What Our Customers Say
        </h2>
        <p className="text-gray-300 text-lg">
          Real reviews from real customers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl relative"
          >
            {/* Quote Icon */}
            <div className="absolute top-4 right-4 text-yellow-500/20">
              <FaQuoteLeft className="w-8 h-8" />
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg">
                {testimonial.avatar}
              </div>
              <div>
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-gray-400 text-sm">{testimonial.location}</p>
              </div>
            </div>

            {/* Rating Stars - Larger */}
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={`w-5 h-5 ${i < testimonial.rating
                      ? "text-yellow-400"
                      : "text-gray-600"
                    }`}
                />
              ))}
            </div>

            {/* Comment */}
            <p className="text-gray-200 text-sm mb-4 line-clamp-4">
              "{testimonial.comment}"
            </p>

            {/* Date with verified badge */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <p className="text-gray-500 text-xs">{testimonial.date}</p>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                ✓ Verified
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
