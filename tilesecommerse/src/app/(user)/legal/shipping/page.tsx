export default function ShippingPolicy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Shipping & Delivery Policy</h1>
                    <p className="text-sm text-slate-500 mb-8">Last updated: January 31, 2026</p>

                    <div className="prose prose-slate max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Shipping Overview</h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                At SLN Tiles Showroom, we are committed to delivering your tiles and fittings safely and on time.
                                We understand that tiles are fragile and heavy products that require special handling and care during shipping.
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                                This policy outlines our shipping procedures, delivery timelines, and important information about receiving your order.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Shipping Coverage</h2>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">2.1 Delivery Locations</h3>
                            <p className="text-slate-600 leading-relaxed mb-3">
                                We currently deliver to:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>All major cities across India</li>
                                <li>Most tier-2 and tier-3 cities</li>
                                <li>Select rural areas (subject to courier serviceability)</li>
                            </ul>
                            <p className="text-slate-600 leading-relaxed">
                                Please enter your PIN code at checkout to verify delivery availability in your area.
                            </p>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">2.2 Non-Serviceable Areas</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Some remote locations may not be serviceable. We will notify you within 24 hours if we cannot deliver to your address
                                and offer alternative solutions or a full refund.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Delivery Timeline</h2>

                            <p className="text-slate-600 leading-relaxed mb-4">
                                At SLN Tiles Showroom, we understand that timely delivery is crucial for your project planning.
                                To provide you with the most accurate delivery schedule based on your location, order size, and product availability,
                                our team will coordinate the exact timeline with you.
                            </p>

                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-6 rounded-r-lg mb-6">
                                <p className="text-slate-800 font-semibold mb-2 text-lg">📋 Delivery Schedule Confirmation</p>
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    Delivery timelines will be <strong>confirmed by our store incharge</strong> at the time of order confirmation.
                                    This ensures we provide you with realistic delivery dates based on:
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-1.5 ml-4 text-sm">
                                    <li>Current product availability and stock levels</li>
                                    <li>Your delivery location and distance from our store</li>
                                    <li>Order quantity and special requirements</li>
                                    <li>Current logistics and delivery partner schedules</li>
                                </ul>
                            </div>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">3.1 How to Get Your Delivery Timeline</h3>
                            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-4">
                                <ol className="list-decimal list-inside text-slate-600 space-y-3">
                                    <li className="leading-relaxed">
                                        <strong>Place Your Order:</strong> Complete your order through our website or visit our store
                                    </li>
                                    <li className="leading-relaxed">
                                        <strong>Order Review:</strong> Our store incharge will review your order details
                                    </li>
                                    <li className="leading-relaxed">
                                        <strong>Timeline Confirmation:</strong> You will receive a call/email with confirmed delivery date and time slot
                                    </li>
                                    <li className="leading-relaxed">
                                        <strong>Tracking Updates:</strong> Stay updated with real-time notifications about your delivery
                                    </li>
                                </ol>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-900 font-medium mb-1 text-sm">💡 Need Urgent Delivery?</p>
                                <p className="text-slate-700 text-sm leading-relaxed">
                                    If you have specific project deadlines, please inform our store incharge during order confirmation.
                                    We'll do our best to accommodate urgent delivery requests based on availability.
                                </p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Shipping Charges</h2>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">4.1 Standard Shipping</h3>

                            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                                <p className="text-green-800 font-semibold mb-1">✓ Free Shipping Offer</p>
                                <p className="text-slate-700 text-sm">
                                    Enjoy <strong>FREE SHIPPING up to 10 km</strong> from our store locations on all orders above <strong>₹50,000</strong>
                                </p>
                            </div>

                            <p className="text-slate-600 leading-relaxed mb-3 text-sm">
                                Standard shipping charges for other orders:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li><strong>Orders above ₹50,000:</strong> FREE shipping within 10 km radius</li>
                                <li><strong>Orders ₹25,000 - ₹49,999:</strong> ₹500 shipping fee (within city limits)</li>
                                <li><strong>Orders below ₹25,000:</strong> ₹800 shipping fee (within city limits)</li>
                                <li><strong>Beyond 10 km:</strong> Additional charges based on distance and weight</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">4.2 Express Shipping</h3>
                            <p className="text-slate-600 leading-relaxed mb-3">
                                Express delivery available in select cities:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Delivery within 24-48 hours</li>
                                <li>Additional charge: ₹1,500 - ₹3,000 (based on location and weight)</li>
                                <li>Available for in-stock items only</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">4.3 Bulk Order Shipping</h3>
                            <p className="text-slate-600 leading-relaxed">
                                For bulk orders (above ₹1,00,000), we offer customized shipping solutions. Contact our sales team for a quote.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Packaging and Handling</h2>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">5.1 Secure Packaging</h3>
                            <p className="text-slate-600 leading-relaxed mb-3">
                                We take extra care in packaging tiles to prevent damage:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Original manufacturer packaging retained</li>
                                <li>Additional bubble wrap and corner protection</li>
                                <li>Sturdy corrugated boxes for outer packaging</li>
                                <li>Palletized shipping for bulk orders</li>
                                <li>Fragile and "Handle with Care" labels</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">5.2 Weight Considerations</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Tiles are heavy products. A typical box can weigh 20-30 kg. Please ensure someone is available to receive
                                and handle the delivery. Unloading assistance may be required.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Order Tracking</h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                Stay updated on your order status:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Order confirmation email with order number</li>
                                <li>Shipping confirmation with tracking number</li>
                                <li>Real-time tracking via courier partner website</li>
                                <li>SMS and email updates at each delivery milestone</li>
                                <li>Track order status in your account dashboard</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Delivery Process</h2>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">7.1 Before Delivery</h3>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Delivery partner will call 1-2 hours before arrival</li>
                                <li>Ensure someone is available to receive the delivery</li>
                                <li>Prepare a suitable space for unloading heavy boxes</li>
                                <li>Keep your order number and ID proof ready</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">7.2 During Delivery</h3>
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-4">
                                <p className="text-slate-700 font-medium mb-2">⚠️ Important: Inspect Before Accepting</p>
                                <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                                    <li>Check the number of boxes against the invoice</li>
                                    <li>Inspect outer packaging for visible damage</li>
                                    <li>Open boxes and check for broken or damaged tiles</li>
                                    <li><strong>Report immediately</strong> only if it is delivered by our delivery partners and damage exceeds more than 2-3%</li>
                                    <li>Take photos if damage is found</li>
                                    <li>Do not accept delivery if major damage is visible</li>
                                </ul>
                            </div>

                            <div className="bg-red-50 border-l-4 border-red-400 p-6">
                                <p className="text-slate-700 font-medium mb-2">⚠️ Sanitaryware &amp; Other Products</p>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    For sanitaryware and all other non-tile products, customers must inspect and verify items <strong>immediately at the time of delivery</strong>.
                                    Once delivery is accepted without raising a concern, it will be considered the customer&apos;s responsibility thereafter.
                                </p>
                            </div>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">7.3 After Delivery</h3>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                                <li>Store tiles in a dry, flat area</li>
                                <li>Keep boxes sealed until installation</li>
                                <li>Report any hidden damage within 48 hours</li>
                                <li>Retain all packaging materials until installation is complete</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Delivery Attempts</h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                Our delivery partners will make up to 3 delivery attempts:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li><strong>1st Attempt:</strong> Scheduled delivery date</li>
                                <li><strong>2nd Attempt:</strong> Next business day</li>
                                <li><strong>3rd Attempt:</strong> Within 2 business days</li>
                            </ul>
                            <p className="text-slate-600 leading-relaxed">
                                If all attempts fail, the order will be returned to our warehouse. You may be charged return shipping fees
                                for re-delivery.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Delivery Issues</h2>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">9.1 Damaged Delivery</h3>
                            <p className="text-slate-600 leading-relaxed mb-3">
                                If tiles arrive damaged:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Note damage on delivery receipt</li>
                                <li>Take clear photos of damaged items and packaging</li>
                                <li>Contact us immediately at slntraders.kalkere@gmail.com or slntraders.yarapanahalli@gmail.com</li>
                                <li>We will arrange replacement or refund within 48 hours</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">9.2 Missing Items</h3>
                            <p className="text-slate-600 leading-relaxed mb-3">
                                If you receive fewer boxes than ordered:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Check the delivery receipt for quantity</li>
                                <li>Contact us within 24 hours</li>
                                <li>Provide order number and delivery receipt</li>
                                <li>We will ship missing items at no extra cost</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">9.3 Delayed Delivery</h3>
                            <p className="text-slate-600 leading-relaxed">
                                If your order is delayed beyond the estimated delivery date, please contact our customer service.
                                We will track your shipment and provide updates.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Special Delivery Services</h2>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">10.1 White Glove Delivery</h3>
                            <p className="text-slate-600 leading-relaxed mb-3">
                                Premium delivery service available for an additional fee:
                            </p>
                            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mb-4">
                                <li>Scheduled delivery at your preferred time</li>
                                <li>Delivery to room of choice (ground floor only)</li>
                                <li>Unpacking and debris removal</li>
                                <li>Additional charge: ₹2,000 - ₹5,000</li>
                            </ul>

                            <h3 className="text-xl font-medium text-slate-700 mb-3 mt-6">10.2 Installation Coordination</h3>
                            <p className="text-slate-600 leading-relaxed">
                                We can coordinate delivery with your contractor or installer. Contact us to schedule delivery timing
                                that aligns with your installation schedule.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">11. International Shipping</h2>
                            <p className="text-slate-600 leading-relaxed">
                                Currently, we only ship within India. International shipping is not available at this time.
                                Please contact us for bulk export inquiries.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-800 mb-4">12. Contact Shipping Support</h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                For shipping and delivery inquiries:
                            </p>
                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                <p className="text-slate-700 font-medium mb-3">SLN Tiles Showroom - Shipping Department</p>

                                <div className="mb-4">
                                    <p className="text-slate-700 font-medium text-sm mb-1">Branch 1 - Horamavu</p>
                                    <p className="text-slate-600 text-sm">321/1, 80 ft road, K Channasandra Main Rd,</p>
                                    <p className="text-slate-600 text-sm">near canara bank, horamavu post,</p>
                                    <p className="text-slate-600 text-sm">Kalkere, Bengaluru, Karnataka 560043</p>
                                    <p className="text-slate-600 text-sm mt-1"><strong>Email:</strong> slntraders.kalkere@gmail.com</p>
                                </div>

                                <div className="mb-3">
                                    <p className="text-slate-700 font-medium text-sm mb-1">Branch 2 - Yarapanahalli</p>
                                    <p className="text-slate-600 text-sm">42/13, Yerappanahalli Main Rd,</p>
                                    <p className="text-slate-600 text-sm">Karnataka D Group Employees Layout,</p>
                                    <p className="text-slate-600 text-sm">Doddenahalli, Yerappanahalli,</p>
                                    <p className="text-slate-600 text-sm">Bengaluru, Karnataka 562149</p>
                                    <p className="text-slate-600 text-sm mt-1"><strong>Email:</strong> slntraders.yarapanahalli@gmail.com</p>
                                </div>

                                <p className="text-slate-600 text-sm mb-1"><strong>Phone:</strong> +91 97385 22119</p>
                                <p className="text-slate-600 text-sm mb-1"><strong>WhatsApp:</strong> +91 97385 22119</p>
                                <p className="text-slate-600 text-sm"><strong>Hours:</strong> Monday - Saturday, 9:00 AM - 6:00 PM</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
