import React from 'react';

interface PrintHeaderProps {
  docNo?: string;
  date?: string;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ docNo, date }) => {
  return (
    <div className="hidden print:block border border-black mb-6 bg-white">
      <div className="flex">
        {/* Left Section - Logo and DPPL (1/3 width) */}
        <div className="w-1/3 border-r border-black p-4 flex flex-col items-start justify-center bg-white">
          <img
            src="/dppl_comapct_logo.jpeg"
            alt="DEORA POLYPLAST LLP Logo"
            width={180}
            height={90}
            className="object-contain mb-3"
            onError={(e) => {
              console.error('Failed to load logo:', e);
            }}
          />
          <div className="text-3xl font-bold tracking-tight">
            <span className="text-black">DPP</span>
            <span className="text-green-600">L</span>
          </div>
        </div>
        
        {/* Right Section - Company Information (2/3 width) */}
        <div className="w-2/3 p-4 bg-white">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Deora Polyplast LLP</h1>
          <div className="text-sm font-semibold text-gray-700 mb-2">
            <div className="mb-1">Factory Address :-</div>
            <div className="font-normal">Plot no 32 & 33 Silver Industrial Estate, Village Bhimpore, Nani Daman - 396 210</div>
          </div>
          <div className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">PAN No.</span> AATFD0618A | <span className="font-semibold">GST No. :-</span> 26AATFD0618AZS
          </div>
          {(docNo || date) && (
            <div className="text-sm text-gray-700 mt-3">
              {docNo && (
                <div className="mb-1">
                  <span className="font-semibold">Doc. No. :</span> {docNo}
                </div>
              )}
              {date && (
                <div>
                  <span className="font-semibold">Date :</span> {date}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;

