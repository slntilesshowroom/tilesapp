"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface EnquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        _id?: string;
        id?: string;
        name: string;
        price?: number;
        images?: any[];
        img?: string;
        unit?: string;
        coverage?: number;
        tilesPerBox?: number;
    };
    // Pre-filled from the product page calculator
    prefillSqft?: number;     // the sq.ft the user already entered
    prefillBoxes?: number;    // the calculated boxes (used when entering by boxes)
}

export const EnquiryModal = ({ isOpen, onClose, product, prefillSqft, prefillBoxes }: EnquiryModalProps) => {
    const [step, setStep] = useState(1);
    const [quantity, setQuantity] = useState(1);
    // Pre-fill sq.ft from product page calculator if available
    const [sqftInput, setSqftInput] = useState(prefillSqft ? String(prefillSqft) : '');
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        city: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const productImage = product.images?.find((i: any) => i.isFeatured)?.url || product.images?.[0]?.url || product.img || "/placeholder.jpg";
    const productPrice = product.price || 0;

    // Sq.ft calculator
    const coveragePerBox = product.coverage || 0;
    const isSqftProduct = product.unit === 'Sq.ft' && coveragePerBox > 0;
    const sqftNum = parseFloat(sqftInput) || 0;
    // Boxes = ceiling of sqft / coverage (no wastage factor)
    const boxesNeeded = sqftNum > 0
        ? Math.max(1, Math.ceil(sqftNum / coveragePerBox))
        : (prefillBoxes ?? 1);
    const actualCoverage = boxesNeeded * coveragePerBox;

    // For sq.ft products quantity = boxes; for others = manual input
    const effectiveQuantity = isSqftProduct ? boxesNeeded : quantity;
    const total = productPrice * effectiveQuantity;

    // Sync prefill values from the product page into modal state whenever it opens.
    // useState initializer only runs once, so we need this effect for subsequent opens.
    useEffect(() => {
        if (isOpen) {
            setSqftInput(prefillSqft ? String(prefillSqft) : '');
            setStep(1); // always start at step 1
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleNextStep = () => {
        if (step === 1) {
            // For sq.ft products: valid if we have either sqft input OR prefilled boxes
            const hasSqftValue = sqftNum > 0 || (prefillBoxes !== undefined && prefillBoxes >= 1);
            if (isSqftProduct && !hasSqftValue) {
                toast.error("Please enter the Sq.ft you need");
                return;
            }
            if (!isSqftProduct && quantity < 1) {
                toast.error("Please select at least 1 quantity");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            // Validate contact info
            if (!formData.name || !formData.phone || !formData.city) {
                toast.error("Please fill all required fields");
                return;
            }
            if (formData.phone.length < 10) {
                toast.error("Please enter a valid phone number");
                return;
            }
            setStep(3);
        }
    };

    const handlePrevStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
      
      const productId = product._id || product.id;
      if (!productId) {
        toast.error("Product ID is missing");
        setIsSubmitting(false);
        return;
      }

      const enquiryData: any = {
        productId,
        productName: product.name,
        quantity: effectiveQuantity,
        totalPrice: total,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerCity: formData.city,
        message: formData.message
      };
      if (isSqftProduct && sqftNum > 0) {
        enquiryData.sqft = sqftNum;
        enquiryData.boxes = boxesNeeded;
        enquiryData.totalCoverage = actualCoverage;
      }

      const response = await fetch(`${API_BASE_URL}/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiryData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit enquiry');
      }

      toast.success("Enquiry submitted successfully! We'll contact you soon.");
      
      // Reset and close
      setStep(1);
      setQuantity(1);
      setSqftInput(prefillSqft ? String(prefillSqft) : '');
      setFormData({ name: "", phone: "", city: "", message: "" });
      onClose();
    } catch (error: any) {
      console.error('Enquiry submission error:', error);
      toast.error(error.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-slate-900">Product Enquiry</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                    {[
                        { num: 1, label: "Products selection" },
                        { num: 2, label: "Contact information" },
                        { num: 3, label: "Review information" },
                    ].map((s) => (
                        <div key={s.num} className="flex items-center flex-1">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s.num
                                        ? "bg-slate-900 text-white"
                                        : "bg-gray-200 text-gray-500"
                                        }`}
                                >
                                    {s.num}
                                </div>
                                <span
                                    className={`text-sm font-medium hidden md:block ${step >= s.num ? "text-slate-900" : "text-gray-500"
                                        }`}
                                >
                                    {s.label}
                                </span>
                            </div>
                            {s.num < 3 && (
                                <div className="flex-1 h-0.5 bg-gray-200 mx-2">
                                    <div
                                        className={`h-full transition-all duration-300 ${step > s.num ? "bg-slate-900 w-full" : "bg-gray-200 w-0"
                                            }`}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Product Selection */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4 text-sm font-medium text-gray-700">
                                    <span>Product</span>
                                    <span>Quantity</span>
                                    <span>Total</span>
                                </div>

                                <div className="flex items-center gap-4 bg-white rounded-lg p-4 shadow-sm">
                                    {/* Product Image */}
                                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                        <Image
                                            src={productImage}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 line-clamp-2">
                                            {product.name}
                                        </h3>
                                        {productPrice > 0 && (
                                            <p className="text-sm text-gray-600 mt-1">₹{productPrice.toFixed(2)}</p>
                                        )}
                                    </div>

                                    {/* Quantity — sq.ft calculator or simple +/- */}
                                    {isSqftProduct ? (
                                        <div className="flex-1 space-y-2">
                                            {/* Sq.ft row */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-600 w-12">Sq.ft</span>
                                                <input type="number" min="0" step="0.01" placeholder="e.g. 150"
                                                    value={sqftInput} onChange={(e) => setSqftInput(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 border-2 border-orange-400 rounded-lg text-center font-bold text-slate-800 focus:outline-none focus:border-orange-500 bg-orange-50 text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-400 justify-center">── OR ──</div>
                                            {/* Boxes row */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-600 w-12">Boxes</span>
                                                <input type="number" min="1" placeholder="1"
                                                    value={sqftNum > 0 ? boxesNeeded : ''}
                                                    onChange={(e) => { const b = Math.max(1, parseInt(e.target.value) || 1); setSqftInput(String((b * coveragePerBox).toFixed(2))); }}
                                                    className="flex-1 px-3 py-1.5 border-2 border-slate-300 rounded-lg text-center font-bold text-slate-800 focus:outline-none focus:border-orange-400 bg-white text-sm"
                                                />
                                            </div>
                                            {sqftNum > 0 && (
                                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                    {boxesNeeded} box{boxesNeeded > 1 ? 'es' : ''} · covers {actualCoverage.toFixed(2)} Sq.ft
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">-</button>
                                            <input type="number" value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-16 text-center border border-gray-300 rounded-lg py-1" min="1" />
                                            <button onClick={() => setQuantity(quantity + 1)}
                                                className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">+</button>
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="text-right min-w-[80px]">
                                        {productPrice > 0 ? (
                                            <p className="font-bold text-slate-900">₹{total.toFixed(2)}</p>
                                        ) : (
                                            <p className="text-sm text-blue-600 font-medium">Price on Request</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Our team will connect for Freight charges details.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact Information */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    placeholder="Enter your city"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message (Optional)
                                </label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    placeholder="Any specific requirements or questions?"
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review Information */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Product Summary */}
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Product Details</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Product:</span>
                                        <span className="font-medium text-slate-900">{product.name}</span>
                                    </div>
                                    {isSqftProduct && sqftNum > 0 ? (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Sq.ft required:</span>
                                                <span className="font-medium text-slate-900">{sqftNum} Sq.ft</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Boxes ordered:</span>
                                                <span className="font-medium text-slate-900">{boxesNeeded} Box{boxesNeeded > 1 ? 'es' : ''}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Total coverage:</span>
                                                <span className="font-medium text-slate-900">{actualCoverage.toFixed(2)} Sq.ft</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Quantity:</span>
                                            <span className="font-medium text-slate-900">{effectiveQuantity} Box{effectiveQuantity > 1 ? 'es' : ''}</span>
                                        </div>
                                    )}
                                    {productPrice > 0 && (
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                                            <span className="text-gray-600">Total:</span>
                                            <span className="font-bold text-slate-900">₹{total.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Summary */}
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Contact Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Name:</span>
                                        <span className="font-medium text-slate-900">{formData.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Phone:</span>
                                        <span className="font-medium text-slate-900">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">City:</span>
                                        <span className="font-medium text-slate-900">{formData.city}</span>
                                    </div>
                                    {formData.message && (
                                        <div className="pt-2 border-t border-gray-200">
                                            <span className="text-gray-600 text-sm">Message:</span>
                                            <p className="text-sm text-slate-900 mt-1">{formData.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">
                                    ✓ Please review your information before submitting. Our team will contact you shortly!
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    {step > 1 && (
                        <button
                            onClick={handlePrevStep}
                            className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                            Previous
                        </button>
                    )}

                    {step === 1 && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                            Continue Shopping
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={handleNextStep}
                            className="flex-1 py-3 px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting...
                                </>
                            ) : (
                                "Submit Enquiry"
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
