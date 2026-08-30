// navbar.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiActivity, FiX } from "react-icons/fi";
// Make sure to import your NavbarRight component
import NavbarRight from "./navbarRightPanel";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBanner, setShowBanner] = useState(true);


  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <header className=" w-full z-50 flex flex-col">
      {/* Top Announcement Banner (Matches the reference image) */}
      {/* {showBanner && (
        <div className="relative w-full bg-violet-600 text-white px-4 py-2 flex items-center justify-center shadow-md">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-center pr-8 sm:pr-0">
            PULSETRADER 🌟 DEMO IS LIVE! — Test and trade with virtual money.
          </p>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors sm:left-auto sm:right-4"
            aria-label="Close"
          >
            <FiX className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
      )} */}

      {/* Main Navbar */}
      <nav
        className={`w-full transition-all duration-300 ${isScrolled
          ? "backdrop-blur-lg shadow-lg bg-black/80"
          : `bg-transparent backdrop-blur-sm`
          }`}
      >
        <div className="w-full mx-auto px-4 py-3 lg:py-4">
          <div className="w-full flex justify-between items-center">

            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 group-hover:opacity-30 blur transition-opacity duration-300" />
                <FiActivity
                  className={`w-8 h-8 text-black dark:text-white `}
                  strokeWidth={2.5}
                />
              </div>
              <h1
                className={`hidden sm:block text-2xl font-black tracking-tighter text-black dark:text-white`}
              >
                PULSE<span className="text-blue-500">TRADER</span>
              </h1>
              {/* <img src="/pulse.png" alt="logo" className="w-20 h-10" /> */}

            </Link>

            <NavbarRight pathname={pathname} />
          </div>
        </div>
      </nav>
    </header>
  );
}