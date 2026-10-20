"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";

export const Footer = () => {
  const linkStyles = "text-sm text-white transition duration-150 ease hover:text-orange-400";
  const liStyles = "text-white my-2";

  return (
    <footer className="text-white mt-20 bg-gradient-to-r from-slate-900 via-slate-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            {/* Logo */}
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="SLN Tiles Showroom Logo"
                width={128}
                height={128}
                className="rounded-lg shadow-lg"
              />
            </div>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">SLN TILES SHOWROOM</h3>
            <p className="text-white text-sm mb-4">
              Your trusted partner for premium quality interior products in Bengaluru. Transforming spaces with innovative designs and exceptional service.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <FaFacebook />
              </a>
              <a
                href="https://www.instagram.com/slntilesshowroom/"
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <FaTwitter />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/10 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin />
              </a>
            </div>
          </div>


          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Quick Links</h3>
            <ul>
              <li className={liStyles}>
                <Link href="/" className={linkStyles}>
                  Home
                </Link>
              </li>
              <li className={liStyles}>
                <Link href="/search" className={linkStyles}>
                  Search Products
                </Link>
              </li>
              <li className={liStyles}>
                <Link href="/cart" className={linkStyles}>
                  Shopping Cart
                </Link>
              </li>
              <li className={liStyles}>
                <Link href="/wishlist" className={linkStyles}>
                  Wishlist
                </Link>
              </li>
              <li className={liStyles}>
                <Link href="/orders" className={linkStyles}>
                  My Orders
                </Link>
              </li>

            </ul>
          </div>

          {/* Branch 1 - Horamavu */}
          <div>
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Branch 1 - Horamavu</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-400 text-sm">
                <FaMapMarkerAlt className="mt-1 text-red-500 flex-shrink-0 text-xs" />
                <span>
                  321/1, 80 ft road, K Channasandra Main Rd,<br />
                  near canara bank, horamavu post,<br />
                  Kalkere, Bengaluru, Karnataka 560043
                </span>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <FaPhone className="text-red-500 flex-shrink-0 text-xs" />
                <a href="tel:+919738522119" className={linkStyles}>
                  +91 97385 22119
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <FaEnvelope className="text-red-500 flex-shrink-0 text-xs" />
                <a href="mailto:slntraders.kalkere@gmail.com" className={linkStyles}>
                  slntraders.kalkere@gmail.com
                </a>
              </li>
            </ul>
            {/* Map */}
            <div className="mt-4 rounded-lg overflow-hidden border border-slate-700 shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.9690678227907!2d77.676273!3d13.0376409!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae114a42f5a7bd%3A0xc3132e4f76fbb40a!2sSRI%20LAKSHMI%20NARASIMHA%20TRADERS%20(BEST%20SHOWROOM%20FOR%20TILES%20AND%20SANITARYWARE%20IN%20BANGALORE)!5e0!3m2!1sen!2sin!4v1773831318469!5m2!1sen!2sin"
                width="100%"
                height="180"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Branch 1 Location"
              />
            </div>
          </div>

          {/* Branch 2 - Second Location */}
          <div>
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Branch 2 - Yarapanahalli</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-400 text-sm">
                <FaMapMarkerAlt className="mt-1 text-red-500 flex-shrink-0 text-xs" />
                <span>
                  42/13, Yerappanahalli Main Rd,<br />
                  Karnataka D Group Employees Layout,<br />
                  Doddenahalli, Yerappanahalli,<br />
                  Bengaluru, Karnataka 562149
                </span>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <FaPhone className="text-red-500 flex-shrink-0 text-xs" />
                <a href="tel:+919738522119" className={linkStyles}>
                  +91 97385 22119
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <FaEnvelope className="text-red-500 flex-shrink-0 text-xs" />
                <a href="mailto:slntraders.yarapanahalli@gmail.com" className={linkStyles}>
                  slntraders.yarapanahalli@gmail.com
                </a>
              </li>
            </ul>
            {/* Map */}
            <div className="mt-4 rounded-lg overflow-hidden border border-slate-700 shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.2674453238083!2d77.68620489999999!3d13.0822293!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1b6e681ae261%3A0x584ec49e6f0b6a61!2sSRI%20LAKSHMI%20NARASIMHA%20TRADERS-YERAPPANAHALLI!5e0!3m2!1sen!2sin!4v1773831372858!5m2!1sen!2sin"
                width="100%"
                height="180"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Branch 2 Location"
              />
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} SLN TILES SHOWROOM. All rights reserved. | Developed by{" "}
              <a
                href="https://digistrivemedia.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                Digistrive Media
              </a>
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <Link href="/legal/privacy" className={linkStyles}>
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className={linkStyles}>
                Terms & Conditions
              </Link>
              <Link href="/legal/shipping" className={linkStyles}>
                Shipping Policy
              </Link>
              <Link href="/legal/returns" className={linkStyles}>
                Returns & Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
