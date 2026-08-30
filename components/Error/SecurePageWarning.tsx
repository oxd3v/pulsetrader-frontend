'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiShield, FiLogIn, FiExternalLink, FiHome } from 'react-icons/fi';
import { toast } from 'react-hot-toast';


export default function SecurePageWarning() {
  const router = useRouter();


  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FiShield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Restricted Access</h1>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This page is restricted. To continue, please connect your wallet
            with Pulse Trader and ensure your account is authenticated.
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>Connect your wallet securely and verify your identity.</li>
              <li>Access is granted once you are authenticated.</li>
              <li>Your data remains protected under our security policy.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">

            <Link
              href="/connect"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center justify-center gap-2"
            >
              <FiExternalLink className="w-5 h-5" />
              <span>Connect</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center justify-center gap-2"
            >
              <FiHome className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}