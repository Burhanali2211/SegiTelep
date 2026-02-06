import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceInputState, VoiceCommand, DEFAULT_VOICE_COMMANDS } from './types';
import { useTeleprompterStore } from '@/store/teleprompterStore';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onCommand?: (command: VoiceCommand) => void;
  enableCommands?: boolean;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { onTranscript, onCommand, enableCommands = true } = options;
  
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    language: 'en-US',
    continuous: true,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Playback controls from store
  const play = useTeleprompterStore((s) => s.play);
  const pause = useTeleprompterStore((s) => s.pause);
  const stop = useTeleprompterStore((s) => s.stop);
  const nextSegment = useTeleprompterStore((s) => s.nextSegment);
  const prevSegment = useTeleprompterStore((s) => s.prevSegment);
  const setSpeed = useTeleprompterStore((s) => s.setSpeed);
  const playback = useTeleprompterStore((s) => s.playback);

  // Check for support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setState(prev => ({ ...prev, isSupported: !!SpeechRecognition }));
  }, []);

  // Handle voice command
  const handleCommand = useCallback((command: VoiceCommand) => {
    if (onCommand) {
      onCommand(command);
      return;
    }

    switch (command) {
      case 'play':
        play();
        break;
      case 'pause':
        pause();
        break;
      case 'stop':
        stop();
        break;
      case 'next':
        nextSegment();
        break;
      case 'previous':
        prevSegment();
        break;
      case 'faster':
        setSpeed(Math.min(playback.speed + 25, 500));
        break;
      case 'slower':
        setSpeed(Math.max(playback.speed - 25, 25));
        break;
    }
  }, [onCommand, play, pause, stop, nextSegment, prevSegment, setSpeed, playback.speed]);

  // Check transcript for commands
  const checkForCommand = useCallback((text: string) => {
    if (!enableCommands) return;
    
    const lowerText = text.toLowerCase().trim();
    
    for (const config of DEFAULT_VOICE_COMMANDS) {
      for (const trigger of config.triggers) {
        if (lowerText.includes(trigger)) {
          handleCommand(config.command);
          return true;
        }
      }
    }
    return false;
  }, [enableCommands, handleCommand]);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = state.continuous;
    recognition.interimResults = true;
    recognition.lang = state.language;

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
          
          // Check for voice commands
          checkForCommand(transcript);
          
          // Callback
          if (onTranscript) {
            onTranscript(transcript, true);
          }
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: prev.transcript + finalTranscript,
        interimTranscript,
      }));

      if (interimTranscript && onTranscript) {
        onTranscript(interimTranscript, false);
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied';
          break;
        case 'network':
          errorMessage = 'Network error';
          break;
      }
      
      setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      
      // Restart if continuous mode
      if (state.continuous && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started or stopped
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [state.continuous, state.language, checkForCommand, onTranscript]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', interimTranscript: '' }));
  }, []);

  // Set language
  const setLanguage = useCallback((language: string) => {
    setState(prev => ({ ...prev, language }));
  }, []);

  // Set continuous mode
  const setContinuous = useCallback((continuous: boolean) => {
    setState(prev => ({ ...prev, continuous }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    setLanguage,
    setContinuous,
  };
}
