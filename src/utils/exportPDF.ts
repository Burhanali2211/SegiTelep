// PDF Export Utility for Teleprompter Scripts
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { useVisualEditorState } from '@/components/Teleprompter/VisualEditor/useVisualEditorState';

export interface ExportPDFOptions {
  title?: string;
  includeTimings?: boolean;
  includeThumbnails?: boolean;
  fontSize?: number;
  pageSize?: 'letter' | 'a4';
}

export function exportToPDF(options: ExportPDFOptions = {}) {
  const {
    title = 'Teleprompter Script',
    includeTimings = true,
    includeThumbnails = false,
    fontSize = 14,
  } = options;
  
  // Get state from stores
  const project = useTeleprompterStore.getState().project;
  const visualPages = useVisualEditorState.getState().pages;
  const visualProjectName = useVisualEditorState.getState().projectName;
  
  // Create print-friendly HTML content
  const printContent = generatePrintContent({
    projectName: project?.name || visualProjectName || title,
    textSegments: project?.segments.filter(s => s.type === 'text') || [],
    visualPages,
    includeTimings,
    includeThumbnails,
    fontSize,
  });
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups for this site.');
  }
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}

interface PrintContentOptions {
  projectName: string;
  textSegments: Array<{ id: string; content?: string; title?: string }>;
  visualPages: Array<{ id: string; data: string; segments: Array<{ label: string; startTime: number; endTime: number }> }>;
  includeTimings: boolean;
  includeThumbnails: boolean;
  fontSize: number;
}

function generatePrintContent(options: PrintContentOptions): string {
  const { projectName, textSegments, visualPages, includeTimings, includeThumbnails, fontSize } = options;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Generate text segment content
  const textContent = textSegments.map((segment, index) => `
    <div class="segment">
      <div class="segment-header">
        <span class="segment-number">${index + 1}</span>
        <span class="segment-title">${segment.title || `Segment ${index + 1}`}</span>
      </div>
      <div class="segment-content">${(segment.content || '').replace(/\n/g, '<br>')}</div>
    </div>
  `).join('');
  
  // Generate visual segment content
  const visualContent = visualPages.flatMap((page, pageIndex) => 
    page.segments.map((segment, segIndex) => `
      <div class="segment visual-segment">
        <div class="segment-header">
          <span class="segment-number">${pageIndex + 1}.${segIndex + 1}</span>
          <span class="segment-title">${segment.label}</span>
          ${includeTimings ? `<span class="segment-timing">${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}</span>` : ''}
        </div>
        ${includeThumbnails ? `<img src="${page.data}" class="page-thumbnail" alt="Page ${pageIndex + 1}" />` : ''}
      </div>
    `)
  ).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${projectName} - Script Export</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${fontSize}px;
          line-height: 1.6;
          color: #1a1a1a;
          padding: 20mm;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .header .subtitle {
          font-size: 12px;
          color: #666;
        }
        
        .segment {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .segment-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .segment-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #f0f0f0;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
        }
        
        .segment-title {
          font-weight: 600;
          flex: 1;
        }
        
        .segment-timing {
          font-size: 11px;
          color: #666;
          background: #f5f5f5;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .segment-content {
          padding-left: 38px;
          white-space: pre-wrap;
        }
        
        .page-thumbnail {
          max-width: 200px;
          max-height: 150px;
          margin-top: 10px;
          margin-left: 38px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin: 30px 0 15px;
          color: #333;
        }
        
        @media print {
          body {
            padding: 15mm;
          }
          
          .segment {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${projectName}</h1>
        <p class="subtitle">Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      
      ${textSegments.length > 0 ? `
        <h2 class="section-title">Text Segments</h2>
        ${textContent}
      ` : ''}
      
      ${visualPages.length > 0 && visualPages.some(p => p.segments.length > 0) ? `
        <h2 class="section-title">Visual Segments</h2>
        ${visualContent}
      ` : ''}
      
      ${textSegments.length === 0 && visualPages.every(p => p.segments.length === 0) ? `
        <p style="text-align: center; color: #666; margin-top: 50px;">No segments to export.</p>
      ` : ''}
    </body>
    </html>
  `;
}

export default exportToPDF;
