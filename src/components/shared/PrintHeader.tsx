import React from 'react';

interface PrintHeaderProps {
  docNo?: string;
  date?: string;
  hideLogo?: boolean;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ docNo, date, hideLogo = false }) => {
  return (
    <div className="hidden print:block border-b-2 border-black mb-4 bg-white print:mb-3">
      <div className="flex">
        {!hideLogo && (
          /* Left Section - Logo (cut-to-cut) */
          <div className="w-1/3 border-r-2 border-black p-3 flex items-center justify-center bg-white print:p-2 print:w-1/4">
            <img
              src="/dppl_comapct_logo.jpeg"
              alt="DEORA POLYPLAST LLP Logo"
              width={180}
              height={90}
              className="object-contain print:w-24 print:h-12"
              onError={(e) => {
                console.error('Failed to load logo:', e);
              }}
            />
          </div>
        )}
        
        {/* Right Section - Company Information */}
        <div className={hideLogo ? "w-full p-3 bg-white print:p-2" : "w-2/3 p-3 bg-white print:p-2 print:w-3/4"}>
          <div className="flex justify-between items-start mb-2 print:mb-1">
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl print:font-bold">Deora Polyplast LLP</h1>
            {(docNo || date) && (
              <div className="text-right text-sm print:text-xs">
                {docNo && (
                  <div className="mb-1 print:mb-0.5">
                    <span className="font-semibold">Doc. No. :</span> <span>{docNo}</span>
                  </div>
                )}
                {date && (
                  <div>
                    <span className="font-semibold">Date :</span> <span>{new Date(date).toLocaleDateString('en-GB')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-sm font-semibold text-gray-700 mb-1.5 print:text-xs print:mb-1 print:whitespace-nowrap">
            <span>Factory Address :- </span>
            <span className="font-normal">Plot no 32 & 33 Silver Industrial Estate, Village Bhimpore, Nani Daman - 396 210</span>
          </div>
          <div className="text-sm text-gray-700 mb-1.5 print:text-xs print:mb-1">
            <span className="font-semibold">PAN No.</span> AATFD0618A | <span className="font-semibold">GST No. :-</span> 26AATFD0618AZS
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;

