import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { asset } from '../lib/content';
import content from '../content/pages/footer.json';

const { brand, columns, newsletter, bottomBar } = content;
export const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError(newsletter.emailRequiredMessage);
      return;
    }

    const emailRegex =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
      setError(newsletter.invalidEmailMessage);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/lead",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "newsletter",
            email,
            sourcePage: window.location.pathname,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage(newsletter.successMessage);
        setEmail("");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(newsletter.connectionErrorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <footer className="bg-brand-charcoal text-white pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Brand & Social */}


          <div className="lg:col-span-4">
            <Link to="/" className="flex flex-col items-start mb-8 group w-fit">

              {/* LOGO */}
              <img
                src={asset(brand.logo)}
                alt={brand.logoAlt}
                width={257}
                height={240}
                loading="lazy"
                className="h-28 sm:h-32 w-auto object-contain group-hover:scale-105 transition"
              />

            </Link>

            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
              {brand.description}
            </p>

            <div className="flex gap-4">
              {brand.socials.map((social) => (
                <a
                  key={social.name}
                  href={social.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-white transition-colors"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-2 gap-8">
            {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="font-bold mb-6 uppercase tracking-widest text-[11px] text-[#a9bd72]">{column.heading}</h3>
              <ul className="space-y-4 text-sm text-gray-400">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.path.startsWith('/')
                      ? <Link to={link.path} className="hover:text-white transition-colors">{link.label}</Link>
                      : <a href={link.path} className="hover:text-white transition-colors">{link.label}</a>}
                  </li>
                ))}
              </ul>
            </div>
            ))}
            {/* <div>
              <h3 className="font-bold mb-6 uppercase tracking-widest text-[11px] text-[#a9bd72]">Support</h3>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><Link to="/consult" className="hover:text-white transition-colors">Contact</Link></li>
                <li><a href="/privacy-policy" className="hover:text-white transition-colors">Policy</a></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>

              </ul>
            </div> */}
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="font-bold mb-6 uppercase tracking-widest text-[11px] text-[#a9bd72]">{newsletter.heading}</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">{newsletter.text}</p>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col gap-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={newsletter.placeholder}
                className={`bg-white/5 border rounded-sm px-4 py-3 text-sm
                focus:outline-none transition-colors text-white
                placeholder:text-gray-500
                ${error
                    ? "border-red-500"
                    : "border-white/10 focus:border-brand-olive"
                  }`}
              />
              {error && (
                <p className="text-red-400 text-xs">
                  {error}
                </p>
              )}

              {message && (
                <p className="text-green-400 text-xs">
                  {message}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-olive hover:bg-brand-dark-olive
                text-white font-bold py-3 rounded-sm
                text-sm uppercase tracking-widest
                disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? newsletter.buttonLoading : newsletter.button}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400 flex flex-wrap justify-center gap-x-6 gap-y-1">
          <span className="inline-block py-2 normal-case tracking-[0.12em]">{bottomBar.copyright}</span>
          {bottomBar.legalLinks.map((link) => (
            <Link key={link.path} to={link.path} className="inline-block py-2 hover:text-white transition-colors">{link.label}</Link>
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400 text-center">
          {bottomBar.tagline}
        </div>
      </div>
    </footer>
  );
};