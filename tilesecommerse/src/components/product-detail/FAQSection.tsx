"use client";

import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do you ensure the quality of your products?",
      answer: "At SLN Tiles Showroom, every product is sourced directly from trusted manufacturers and undergoes thorough quality checks before reaching our shelves. We partner with leading brands known for precision engineering, durability, and consistent finishes — so you get nothing but the best for your home or project.",
    },
    {
      question: "Do you offer delivery and installation support?",
      answer: "Yes! We provide doorstep delivery across Bengaluru and surrounding areas. While we don&apos;t offer in-house installation, our team can recommend trusted, experienced installers from our professional network who are familiar with our products and can ensure a flawless finish.",
    },
    {
      question: "What is your return and exchange policy?",
      answer: "We accept returns or exchanges within 7 days of purchase for unused, unopened products in original packaging. In case of any manufacturing defects, we work directly with the brand to ensure a swift replacement. Please contact our team with your purchase details and we'll sort it out promptly.",
    },
    {
      question: "Can your team help me choose the right products for my project?",
      answer: "Absolutely! Our in-store design consultants are available at both our Bengaluru branches to guide you through material selection, finish combinations, sizing, and more. Whether you're renovating a bathroom, kitchen, or an entire home, we'll help you find the perfect fit for your style and budget.",
    },
    {
      question: "Can I visit your showroom to see products in person?",
      answer: "We strongly encourage a showroom visit — seeing and touching the products in person makes all the difference! Visit us at our Horamavu branch (321/1, 80ft Road, K Channasandra Main Rd) any day of the week. Our friendly staff will walk you through our full range of tiles, sanitary ware, fittings, and more.",
    },
  ];

  return (
    <div className="bg-slate-900 text-white rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">FAQ&apos;s</h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={index} className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex justify-between items-center p-4 hover:bg-slate-800 transition-colors text-left"
            >
              <span className="font-semibold pr-4">{faq.question}</span>
              {openIndex === index ? (
                <FaChevronUp className="flex-shrink-0 text-orange-500" />
              ) : (
                <FaChevronDown className="flex-shrink-0 text-slate-400" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4 text-slate-300 bg-slate-800">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
