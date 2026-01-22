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
  documentType?: 'grn' | 'jw-grn' | 'job-work-challan' | 'fg-transfer-note';
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

    const headerContent = `
      <div class="header">
        <h2>${title}</h2>
        <p>${formatDate(date)}</p>
      </div>
    `;
    const printContent = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
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
            .header { background: linear-gradient(to right, #475569, #64748b); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h2 { margin: 0 0 8px 0; font-size: 24px; }
            .header p { margin: 0; opacity: 0.9; }
            .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .section h3 { margin: 0 0 16px 0; font-size: 18px; color: #1e293b; display: flex; align-items: center; gap: 8px; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .info-item label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
            .info-item p { margin: 0; font-size: 14px; font-weight: 600; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            table th { background: #f1f5f9; padding: 8px 4px; text-align: left; font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            table td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; }
            table tr:hover { background: #f8fafc; }
          </style>
        </head>
        <body>
          ${headerContent}
          ${printContent}
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
    
    const headerContent = `
      <div class="header">
        <h2>${title}</h2>
        <p>${formatDate(date)}</p>
      </div>
    `;
    const content = printRef.current.innerHTML;
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .header { background: linear-gradient(to right, #475569, #64748b); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h2 { margin: 0 0 8px 0; font-size: 24px; }
            .header p { margin: 0; opacity: 0.9; }
            .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .section h3 { margin: 0 0 16px 0; font-size: 18px; color: #1e293b; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .info-item label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
            .info-item p { margin: 0; font-size: 14px; font-weight: 600; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            table th { background: #f1f5f9; padding: 8px 4px; text-align: left; font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            table td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; }
          </style>
        </head>
        <body>
          ${headerContent}
          ${content}
        </body>
      </html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
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

