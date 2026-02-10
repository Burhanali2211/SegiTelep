import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Trash2, Download, ChevronDown, ChevronUp, Bug, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  source?: string;
  stack?: string;
}

interface DeveloperConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_ICONS = {
  log: <Info className="w-4 h-4 text-blue-400" />,
  warn: <AlertCircle className="w-4 h-4 text-yellow-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
  info: <CheckCircle className="w-4 h-4 text-green-400" />,
  debug: <Bug className="w-4 h-4 text-purple-400" />
};

const LEVEL_COLORS = {
  log: 'text-blue-400 border-blue-400/20',
  warn: 'text-yellow-400 border-yellow-400/20',
  error: 'text-red-400 border-red-400/20',
  info: 'text-green-400 border-green-400/20',
  debug: 'text-purple-400 border-purple-400/20'
};

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Capture console logs
  useEffect(() => {
    if (!isOpen) return;

    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    const createLogEntry = (level: LogEntry['level'], ...args: any[]): LogEntry => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      return {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level,
        message,
        source: args[0]?.stack?.split('\n')[1]?.trim() || 'unknown',
        stack: args[0]?.stack
      };
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      setLogs(prev => [...prev, createLogEntry('log', ...args)]);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      setLogs(prev => [...prev, createLogEntry('warn', ...args)]);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      setLogs(prev => [...prev, createLogEntry('error', ...args)]);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      setLogs(prev => [...prev, createLogEntry('info', ...args)]);
    };

    console.debug = (...args) => {
      originalConsole.debug(...args);
      setLogs(prev => [...prev, createLogEntry('debug', ...args)]);
    };

    // Add initial log
    setLogs([createLogEntry('info', '🔧 Developer Console initialized')]);

    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Copy logs to clipboard
  const copyLogs = async () => {
    const logText = logs
      .filter(log => levelFilter === 'all' || log.level === levelFilter)
      .filter(log => !filter || log.message.toLowerCase().includes(filter.toLowerCase()))
      .map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(logText);
      // Show success feedback
      const button = document.getElementById('copy-logs-btn');
      if (button) {
        button.textContent = '✓ Copied!';
        setTimeout(() => {
          button.textContent = 'Copy Logs';
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Download logs as file
  const downloadLogs = () => {
    const logText = logs
      .map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${log.stack ? '\n' + log.stack : ''}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logs
  const filteredLogs = logs
    .filter(log => levelFilter === 'all' || log.level === levelFilter)
    .filter(log => !filter || log.message.toLowerCase().includes(filter.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div 
      ref={consoleRef}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col"
      onClick={(e) => {
        if (e.target === consoleRef.current) {
          onClose();
        }
      }}
    >
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Developer Console</h2>
            <span className="text-xs text-gray-400">
              {filteredLogs.length} / {logs.length} logs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
              title="Close (Ctrl+`)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
          
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="log">Logs</option>
            <option value="debug">Debug</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>

          <div className="flex gap-2 ml-auto">
            <button
              id="copy-logs-btn"
              onClick={copyLogs}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy Logs
            </button>
            <button
              onClick={downloadLogs}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs Container */}
      <div className={`flex-1 overflow-hidden ${isExpanded ? 'flex' : 'hidden'}`}>
        <div className="h-full overflow-y-auto p-4 font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {logs.length === 0 ? 'No logs captured yet' : 'No logs match current filters'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border-l-2 pl-3 py-2 ${LEVEL_COLORS[log.level]} hover:bg-gray-800/50 transition-colors`}
                >
                  <div className="flex items-start gap-2">
                    {LEVEL_ICONS[log.level]}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-xs font-semibold uppercase">
                          {log.level}
                        </span>
                      </div>
                      <div className="text-white break-words">
                        {log.message}
                      </div>
                      {log.stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                            Stack Trace
                          </summary>
                          <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-700 p-2 text-center">
        <p className="text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-800 rounded">`</kbd> to toggle • 
          Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
};