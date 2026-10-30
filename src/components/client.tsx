import React from 'react';
import { clients } from '../lib/clients';

export default function OurClients() {
  if (clients.length === 0) return null;

  const duplicatedClients = [...clients, ...clients, ...clients];

  return (
    <section className="w-full bg-gradient-to-b from-white to-gray-50 py-4 sm:py-8 md:py-8 overflow-hidden">

      {/* ✅ FIXED: mobile padding only */}
      <div className="max-w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 pl-4 sm:pl-20 pr-0">

        {/* LEFT TITLE */}
        <div className="shrink-0 w-full sm:w-auto flex items-center justify-center sm:justify-between sm:block sm:pr-6 md:pr-10 sm:mr-6 md:mr-10 sm:border-r border-gray-200">
          <h2 className="text-xs sm:text-sm md:text-lg font-semibold tracking-[0.2em] text-gray-800 uppercase whitespace-nowrap">
            Our Clients
          </h2>
        </div>

        {/* SLIDER */}
        <div className="relative w-full flex-1 overflow-hidden">

          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 h-full w-10 sm:w-16 md:w-24 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
          <div className="absolute right-0 top-0 h-full w-10 sm:w-16 md:w-24 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />

          {/* TRACK */}
          <div className="flex w-max items-center gap-4 sm:gap-10 md:gap-15 lg:gap-10 animate-marquee hover:[animation-play-state:paused] will-change-transform">

            {duplicatedClients.map((client, index) => (
              <div
                key={`${client.name}-${index}`}
                className="
                  w-auto flex-shrink-0 rounded-3xl 
                  p-3 sm:p-4
                  h-16 sm:h-20 md:h-24
                  hover:bg-white 
                  flex items-center justify-center
                "
              >
                {client.logo ? (
                  <img
                    src={client.logo}
                    alt={client.name}
                    className="
                      h-10 sm:h-14 md:h-20
                      object-contain
                      mx-auto
                      transition duration-300
                      hover:scale-110
                      drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)]
                    "
                  />
                ) : (
                  <span className="text-sm sm:text-base font-semibold tracking-wider text-gray-700 whitespace-nowrap px-2">{client.name}</span>
                )}
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }

        .animate-marquee {
          animation: marquee 35s linear infinite;
        }

        @media (max-width: 1024px) {
          .animate-marquee {
            animation: marquee 25s linear infinite;
          }
        }

        /* ✅ FIXED: mobile smoother */
        @media (max-width: 640px) {
          .animate-marquee {
            animation: marquee 22s linear infinite;
          }
        }
      `}</style>
    </section>
  );
}