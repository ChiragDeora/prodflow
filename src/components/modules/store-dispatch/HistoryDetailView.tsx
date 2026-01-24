'use client';

import React, { useRef, useState } from 'react';
import { X, Printer, Download, FileText, Package, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface HistoryDetailViewProps {
  title: string;
  date: string;
  onClose: () => void;
  documentInfo: Array<{ label: string; value: string | number | null | undefined }>;
  items: Array<Record<string, any>>;
  itemColumns: Array<{ key: string; label: string; format?: (value: any) => string }>;
  loading?: boolean;
  // Stock posting props
  documentId?: string;
  documentType?: 'grn' | 'jw-grn' | 'job-work-challan' | 'fg-transfer-note' | 'mis';
  stockStatus?: string;
  onStockPost?: () => void;
}

const HistoryDetailView: React.FC<HistoryDetailViewProps> = ({
  title,
  date,
  onClose,
  documentInfo,
  items,
  itemColumns,
  loading = false,
  documentId,
  documentType,
  stockStatus,
  onStockPost
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string } | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // Extract values from documentInfo for print header
  const getDocumentValue = (label: string): string | null => {
    const info = documentInfo.find(item => 
      item.label.toLowerCase().includes(label.toLowerCase())
    );
    return info?.value ? String(info.value) : null;
  };

  // Get factory address - check for "Factory Address" or "Address (Factory Address)"
  // Falls back to default factory address if not found in documentInfo
  const factoryAddress = getDocumentValue('Factory Address') || 
                         getDocumentValue('Address (Factory Address)') ||
                         'Plot no 32 & 33 Silver Industrial Estate, Village Bhimpore, Nani Daman - 396 210';
  
  // Get document number and date (for all document types)
  const docNo = getDocumentValue('Document Number') || 
                getDocumentValue('Doc No') || 
                getDocumentValue('Doc. No') ||
                getDocumentValue('PO Number') ||
                getDocumentValue('Indent No') ||
                getDocumentValue('Indent Number');
  
  const docDate = getDocumentValue('Date') || formatDate(date);
  
  // Get Indent No. and Indent Date (for Material Indent Slip)
  const indentNo = getDocumentValue('Indent No') || getDocumentValue('Indent Number');
  const indentDate = getDocumentValue('Indent Date');
  
  // Extract clean title (remove doc no. and date if present)
  // Handles formats like "Material Indent Slip - 10025260001" or "Material Indent Slip - N/A"
  const cleanTitle = title.replace(/\s*-\s*[\d\w\s]+$/, '').trim() || title;

  const handlePostToStock = async () => {
    if (!documentId || !documentType) return;
    
    setIsPosting(true);
    setPostResult(null);
    
    try {
      let endpoint = '';
      if (documentType === 'jw-grn') {
        endpoint = `/api/stock/post/jw-grn/${documentId}`;
      } else if (documentType === 'job-work-challan') {
        endpoint = `/api/stock/post/job-work-challan/${documentId}`;
      } else if (documentType === 'fg-transfer-note') {
        endpoint = `/api/production/fg-transfer-note/${documentId}/post`;
      } else if (documentType === 'mis') {
        endpoint = `/api/stock/post/mis/${documentId}`;
      } else {
        endpoint = `/api/stock/post/grn/${documentId}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posted_by: 'user' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        let message = `Stock posted successfully! (${result.entries_created || 0} entries created)`;
        if (result.warnings && result.warnings.length > 0) {
          message += `\nWarnings: ${result.warnings.join(', ')}`;
        }
        setPostResult({ success: true, message });
        onStockPost?.();
      } else {
        setPostResult({ 
          success: false, 
          message: result.error?.message || 'Failed to post to stock. Items must exist in Stock Items master.' 
        });
      }
    } catch (error) {
      console.error('Error posting to stock:', error);
      setPostResult({ success: false, message: 'Error posting to stock. Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use PrintHeader structure
    const letterheadContent = generatePrintHeaderHTML({
      indentNo,
      indentDate,
      docNo,
      docDate,
      documentTitle: cleanTitle,
      factoryAddress
    });
    
    // Get party details HTML
    const partyDetailsHTML = buildPartyDetailsHTML();
    
    // Get items table from printRef
    const printContent = printRef.current.innerHTML;
    
    // Extract items table from content - get the full table including thead and tbody
    const itemsTableMatch = printContent.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    let itemsTable = itemsTableMatch ? itemsTableMatch[0] : '';
    
    // Ensure table has proper structure with headers if missing
    if (itemsTable && !itemsTable.includes('<thead')) {
      // If table doesn't have thead, we need to add it
      // But since the component already has thead, this shouldn't be needed
      // Just ensure the table is properly formatted
    }
    
    // Footer disclaimer
    const footerContent = `
      <div class="print-footer">
        <p>This is computer generated document this does not require signature</p>
      </div>
    `;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cleanTitle}</title>
          <style>
            @media print {
              @page { margin: 15mm; size: A4; }
              body { font-family: Arial, sans-serif; }
              .no-print { display: none; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            
            /* Party Details Two-Column Layout */
            .party-details-section { margin-bottom: 20px; }
            .party-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .party-details-left, .party-details-right { display: flex; flex-direction: column; gap: 12px; }
            .party-detail-item { display: flex; flex-direction: column; }
            .party-label { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 4px; }
            .party-value { font-size: 14px; color: #1e293b; }
            
            /* Items Table */
            .items-section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
            table thead { display: table-header-group; }
            table th { background: #f1f5f9; padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #1e293b; border: 1px solid #000; display: table-cell; }
            table td { padding: 8px; text-align: left; font-size: 12px; color: #1e293b; border: 1px solid #000; }
            table thead tr { background: #f1f5f9; }
            
            /* Footer */
            .print-footer { text-align: center; margin-top: 40px; padding-top: 20px; }
            .print-footer p { font-size: 11px; color: #6b7280; margin: 0; }
            
            /* Hide document info section in print */
            .bg-gray-50 { display: none; }
          </style>
        </head>
        <body>
          ${letterheadContent}
          ${partyDetailsHTML}
          ${itemsTable ? `<div class="items-section">${itemsTable}</div>` : ''}
          ${footerContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    if (!printRef.current) return;
    
    // Use PrintHeader structure
    const letterheadContent = generatePrintHeaderHTML({
      indentNo,
      indentDate,
      docNo,
      docDate,
      documentTitle: cleanTitle,
      factoryAddress
    });
    
    // Get party details HTML
    const partyDetailsHTML = buildPartyDetailsHTML();
    
    // Get items table from printRef
    const content = printRef.current.innerHTML;
    const itemsTableMatch = content.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    const itemsTable = itemsTableMatch ? itemsTableMatch[0] : '';
    
    // Footer disclaimer
    const footerContent = `
      <div class="print-footer">
        <p>This is computer generated document this does not require signature</p>
      </div>
    `;
    
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cleanTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            
            /* Party Details Two-Column Layout */
            .party-details-section { margin-bottom: 20px; }
            .party-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .party-details-left, .party-details-right { display: flex; flex-direction: column; gap: 12px; }
            .party-detail-item { display: flex; flex-direction: column; }
            .party-label { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 4px; }
            .party-value { font-size: 14px; color: #1e293b; }
            
            /* Items Table */
            .items-section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
            table thead { display: table-header-group; }
            table th { background: #f1f5f9; padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #1e293b; border: 1px solid #000; display: table-cell; }
            table td { padding: 8px; text-align: left; font-size: 12px; color: #1e293b; border: 1px solid #000; }
            table thead tr { background: #f1f5f9; }
            
            /* Footer */
            .print-footer { text-align: center; margin-top: 40px; padding-top: 20px; }
            .print-footer p { font-size: 11px; color: #6b7280; margin: 0; }
            
            /* Hide document info section */
            .bg-gray-50 { display: none; }
          </style>
        </head>
        <body>
          ${letterheadContent}
          ${partyDetailsHTML}
          ${itemsTable ? `<div class="items-section">${itemsTable}</div>` : ''}
          ${footerContent}
        </body>
      </html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle.replace(/\s+/g, '_')}_${date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to generate PrintHeader HTML (matching PrintHeader component structure)
  const generatePrintHeaderHTML = (options: {
    indentNo?: string | null;
    indentDate?: string | null;
    docNo?: string | null;
    docDate?: string | null;
    documentTitle?: string;
    factoryAddress: string;
  }) => {
    const { indentNo, indentDate, docNo, docDate, documentTitle, factoryAddress } = options;
    
    // Format indent date if needed
    const formatIndentDate = (date: string | null | undefined) => {
      if (!date) return '';
      if (typeof date === 'string' && date.includes('T')) {
        return new Date(date).toLocaleDateString('en-GB');
      }
      return date;
    };

    // Determine what to show - prefer indentNo/indentDate, fallback to docNo/docDate
    const showIdentNo = indentNo || (!indentNo && docNo);
    const showIdentDate = indentDate || (!indentDate && docDate);
    const displayIdentNo = indentNo || docNo;
    const displayIdentDate = formatIndentDate(indentDate || docDate);

    return `
      <div class="print-header-wrapper" style="border-bottom: 2px solid #000; margin-bottom: 16px; padding-bottom: 12px;">
        <div style="display: flex;">
          <!-- Left Section - Logo -->
          <div style="width: 33.333%; border-right: 2px solid #000; padding: 12px; display: flex; align-items: center; justify-content: center; background: white;">
            <img src="/dppl_comapct_logo.jpeg" alt="DEORA POLYPLAST LLP Logo" style="width: 240px; height: 120px; object-fit: contain;" onerror="this.style.display='none'" />
          </div>
          
          <!-- Right Section - Company Information -->
          <div style="width: 66.667%; padding: 12px; background: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; color: #1e293b;">Deora Polyplast LLP</h1>
            <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">
              <span>Factory Address - </span>
              <span style="font-weight: normal;">${factoryAddress}</span>
            </div>
            <div style="font-size: 14px; color: #374151;">
              <span style="font-weight: 600;">PAN No.</span> AATFD0618A | <span style="font-weight: 600;">GST No. :-</span> 26AATFD0618AZS
            </div>
          </div>
        </div>
      </div>
      ${documentTitle ? `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 28px; font-weight: bold; color: #1e293b;">${documentTitle.toUpperCase()}</h2>
        </div>
      ` : ''}
    `;
  };
  
  // Get party details for two-column layout
  const partyName = getDocumentValue('Party Name');
  const partyAddress = getDocumentValue('Address');
  const state = getDocumentValue('State');
  const gstNo = getDocumentValue('GST Number') || getDocumentValue('GST No');
  
  // Build party details HTML - customer details on one line on left, Indent No on right
  const buildPartyDetailsHTML = () => {
    if (!partyName && !partyAddress && !state && !gstNo && !indentNo && !indentDate) return '';
    
    // Build customer details on one line
    const customerDetails = [];
    if (partyName) customerDetails.push(`Party Name: ${partyName}`);
    if (partyAddress) customerDetails.push(`Address: ${partyAddress}`);
    if (state) customerDetails.push(`State: ${state}`);
    if (gstNo) customerDetails.push(`GST No: ${gstNo}`);
    const customerDetailsText = customerDetails.join(' | ');
    
    // Format indent date if needed
    const formatIndentDate = (date: string | null | undefined) => {
      if (!date) return '';
      if (typeof date === 'string' && date.includes('T')) {
        return new Date(date).toLocaleDateString('en-GB');
      }
      return date;
    };
    const displayIndentDate = formatIndentDate(indentDate);
    
    return `
      <div class="party-details-section" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="flex: 1; font-size: 14px; color: #1e293b;">
          ${customerDetailsText || ''}
        </div>
        ${(indentNo || indentDate) ? `
          <div style="text-align: right; font-size: 14px;">
            ${indentNo ? `
              <div style="margin-bottom: 4px;">
                <span style="font-weight: 600;">Ident No:</span> <span>${indentNo}</span>
              </div>
            ` : ''}
            ${indentDate ? `
              <div>
                <span style="font-weight: 600;">Indent Date:</span> <span>${displayIndentDate}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="text-slate-200 mt-1">{formatDate(date)}</p>
          </div>
          <div className="flex gap-2">
            {/* Post to Stock button - only show if not already posted */}
            {documentId && documentType && stockStatus !== 'POSTED' && (
              <button 
                onClick={handlePostToStock}
                disabled={isPosting}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Post to Stock"
              >
                {isPosting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isPosting ? 'Posting...' : 'Post to Stock'}
              </button>
            )}
            {stockStatus === 'POSTED' && (
              <span className="px-3 py-2 bg-emerald-600 rounded-lg flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Posted
              </span>
            )}
            <button 
              onClick={handlePrint}
              className="p-2 bg-slate-500 hover:bg-slate-400 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button 
              onClick={handleDownload}
              className="p-2 bg-slate-500 hover:bg-slate-400 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-500 hover:bg-slate-400 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Post Result Message */}
      {postResult && (
        <div className={`mx-6 mt-4 p-4 rounded-lg flex items-start gap-3 ${
          postResult.success 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {postResult.success ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="whitespace-pre-wrap text-sm">{postResult.message}</div>
        </div>
      )}

      {/* Content */}
      <div className="p-6" ref={printRef}>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Document Information */}
            {documentInfo.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  Document Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentInfo.map((info, index) => (
                    info.value && (
                      <div key={index}>
                        <label className="text-sm font-medium text-gray-600">{info.label}</label>
                        <p className="text-gray-900 font-semibold mt-1">
                          {info.value}
                        </p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Items Table */}
            {items.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-600" />
                    Items ({items.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {itemColumns.map((col) => (
                          <th key={col.key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-gray-50">
                          {itemColumns.map((col) => (
                            <td key={col.key} className="px-4 py-2 text-sm text-gray-900">
                              {col.format ? col.format(item[col.key]) : (item[col.key] ?? 'N/A')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryDetailView;

