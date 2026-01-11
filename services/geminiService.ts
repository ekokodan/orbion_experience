import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, base64ToArrayBuffer, decodeAudioData } from '../utils/audioUtils';

// Tool to mark progress in the linear journey
const markCheckpointCompleteDeclaration: FunctionDeclaration = {
  name: 'markCheckpointComplete',
  description: 'Call this function when the student successfully completes a specific objective in the scenario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      checkpointId: {
        type: Type.STRING,
        description: 'The ID of the checkpoint completed (e.g., "greet", "order_drink", "ask_bill", "farewell").',
      },
    },
    required: ['checkpointId'],
  },
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  
  // Callbacks
  public onVolumeUpdate: (vol: number) => void = () => {};
  public onStateChange: (isSpeaking: boolean) => void = () => {};
  public onCheckpointComplete: (id: string) => void = () => {};
  public onTranscriptUpdate: (role: 'user' | 'assistant', text: string, isFinal: boolean) => void = () => {};
  public onError: (error: Error) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onclose: () => console.log('Session closed'),
        onerror: (err) => {
            console.error('Session error', err);
            this.onError(new Error(err.message || "Session connection error"));
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        // Enable transcription for the transcript UI
        inputAudioTranscription: {}, 
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: [markCheckpointCompleteDeclaration] }],
        systemInstruction: `
          You are Orbion, a glowing AI tutor for French conversation.
          
          SCENARIO: Ordering at a Café in Paris.
          
          OBJECTIVES (Track these in order):
          1. "greet": The user must greet you (the waiter).
          2. "order_drink": The user must order a coffee or drink.
          3. "ask_bill": The user must ask for the check/bill.
          4. "farewell": The user must say goodbye.

          BEHAVIOR:
          - Primary Role: Friendly Parisian waiter.
          - Secondary Role: Supportive Tutor.
          
          ADAPTIVITY IS KEY:
          - If the user is doing well: Stay in character as the waiter, speak mostly French, and challenge them slightly.
          - If the user struggles/stumbles: Break character gently to become the Tutor. Explain the concept in English, break down the pronunciation, or offer the specific French phrase they need. Then, prompt them to try saying it again.
          
          CONVERSATIONAL STYLE:
          - Be natural, not rigid. Allow for small talk (weather, mood) if the user initiates it.
          - Do not force the user to "pass a test". Make it feel like a chat.
          - If they veer off topic, engage briefly, then gently steer them back to the scenario (e.g., "That is interesting! But back to your coffee—what would you like?").
          
          PROGRESS:
          - When the user satisfies the CURRENT objective naturally, call 'markCheckpointComplete(checkpointId)'.
          - Do not acknowledge future objectives until the current one is done.
        `,
      },
    });
  }

  private handleOpen() {
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeUpdate(rms * 5);

      const pcmBlob = createPcmBlob(inputData);
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      this.onStateChange(true);
      const audioData = new Uint8Array(base64ToArrayBuffer(base64Audio));
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

      const audioBuffer = await decodeAudioData(audioData, this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      
      source.addEventListener('ended', () => {
        this.sources.delete(source);
        if (this.sources.size === 0) this.onStateChange(false);
      });

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

    // 2. Handle Transcription
    const outputTranscript = message.serverContent?.outputTranscription;
    if (outputTranscript?.text) {
        this.onTranscriptUpdate('assistant', outputTranscript.text, true); // Output is usually final chunks
    }
    
    const inputTranscript = message.serverContent?.inputTranscription;
    if (inputTranscript?.text) {
        // Input comes in streams, we might want to debounce or handle partials in a real app,
        // but for now we just stream it. 
        // Note: Live API usually sends partials then a turnComplete. 
        // We'll treat all updates as potentially final for the UI log until the next turn.
        this.onTranscriptUpdate('user', inputTranscript.text, false);
    }

    if (message.serverContent?.turnComplete) {
         // Could mark the last user message as final here if we were tracking partials strictly
    }

    // 3. Handle Tool Calls (Checkpoints)
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'markCheckpointComplete') {
            const id = (fc.args as any).checkpointId;
            this.onCheckpointComplete(id);
            
            this.sessionPromise?.then(session => {
                session.sendToolResponse({
                    functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Checkpoint marked." }
                    }
                });
            });
        }
      }
    }
  }

  async disconnect() {
    if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
    }
    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.outputAudioContext) await this.outputAudioContext.close();
  }
}