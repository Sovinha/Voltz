'use client';

import React, { useState, useRef } from 'react';
import { X, Send, Camera, Mic, Square, Play, Image as ImageIcon, CheckCheck, UserCheck } from 'lucide-react';
import { ChatMessage, Entregador } from '@/lib/supabase';

interface MotoboyChatModalProps {
  isOpen: boolean;
  entregador: Entregador | null;
  pedidoIdExterno?: string;
  onClose: () => void;
}

export const MotoboyChatModal: React.FC<MotoboyChatModalProps> = ({
  isOpen,
  entregador,
  pedidoIdExterno,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'motoboy',
      text: `Cheguei para a coleta do pedido ${pedidoIdExterno || '#0106'}!`,
      timestamp: '19:42',
    },
    {
      id: '2',
      sender: 'loja',
      text: 'O pedido já está embalado na bancada de expedição com a comanda.',
      timestamp: '19:43',
    },
  ]);

  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !entregador) return null;

  // Envio de texto
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'loja',
      text: textInput.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setTextInput('');
  };

  // Envio de Foto / Imagem
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'loja',
          imageUrl: imageUrl,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, newMsg]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Gravação de Áudio com MediaRecorder API
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'loja',
          audioUrl: audioUrl,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, newMsg]);
        // Para todas as faixas do microfone
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.warn('Microfone indisponível ou permissão negada. Criando mensagem de áudio simulada.');
      // Fallback para áudio de demonstração se microfone não estiver acessível
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'loja',
        text: '🎤 [Mensagem de Áudio da Loja enviado ao Entregador]',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md h-[550px] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Cabeçalho do Chat */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold font-mono text-sm">
              {entregador.nome.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                Chat com {entregador.nome}
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {pedidoIdExterno ? `Pedido ${pedidoIdExterno}` : 'Comunicação Direta de Expedição'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens do Chat */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
          {messages.map((msg) => {
            const isMe = msg.sender === 'loja';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs space-y-1 ${
                    isMe
                      ? 'bg-sky-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none shadow'
                  }`}
                >
                  {/* Texto */}
                  {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                  {/* Foto enviada */}
                  {msg.imageUrl && (
                    <div className="rounded-xl overflow-hidden my-1 border border-white/20 max-w-[200px]">
                      <img src={msg.imageUrl} alt="Foto enviada" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {/* Player de Áudio */}
                  {msg.audioUrl && (
                    <div className="my-1">
                      <audio controls src={msg.audioUrl} className="w-48 h-8 rounded-lg" />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 font-mono pt-0.5">
                    <span>{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-sky-200" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input e Ações de Envio (Texto, Câmera/Foto, Gravador de Áudio) */}
        <form onSubmit={handleSendText} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          {/* Input invisível para upload de imagem */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Botão Enviar Foto */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Enviar Foto"
          >
            <Camera className="w-4 h-4 text-sky-400" />
          </button>

          {/* Botão Gravador de Áudio */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-xl border transition-colors ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={isRecording ? 'Clique para Enviar Áudio' : 'Gravar Áudio'}
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Campo de Texto */}
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isRecording ? 'Gravando áudio...' : 'Digite sua mensagem...'}
            disabled={isRecording}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
          />

          {/* Botão Enviar */}
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
