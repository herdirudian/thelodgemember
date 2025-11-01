"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface KnowledgeBase {
  [key: string]: string[];
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Halo! Saya adalah asisten AI The Lodge Family. Saya siap membantu Anda dengan pertanyaan seputar membership, fasilitas, promo, dan layanan kami. Ada yang bisa saya bantu?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Knowledge Base tentang The Lodge Family
  const knowledgeBase: KnowledgeBase = {
    membership: [
      "The Lodge Family memiliki sistem membership eksklusif dengan berbagai benefit menarik.",
      "Member mendapatkan poin setiap kali melakukan aktivitas atau pembelian.",
      "Poin dapat ditukar dengan voucher diskon, merchandise, atau upgrade layanan.",
      "Terdapat level membership: Bronze, Silver, Gold, dan Platinum dengan benefit yang berbeda."
    ],
    fasilitas: [
      "The Lodge Maribaya menyediakan berbagai fasilitas premium seperti restaurant, spa, dan area rekreasi.",
      "Tersedia paket wisata lengkap dengan pemandangan alam yang menakjubkan.",
      "Fasilitas meeting room dan event space untuk keperluan bisnis atau acara khusus.",
      "Area glamping dan cottage untuk pengalaman menginap yang unik."
    ],
    promo: [
      "Kami rutin mengadakan promo spesial untuk member dengan diskon hingga 50%.",
      "Promo early bird untuk booking di hari weekday dengan harga khusus.",
      "Paket family package dengan harga hemat untuk keluarga.",
      "Birthday special untuk member yang berulang tahun dengan benefit eksklusif."
    ],
    booking: [
      "Booking dapat dilakukan melalui website atau aplikasi mobile kami.",
      "Member mendapat prioritas booking dan dapat melakukan reservasi lebih awal.",
      "Tersedia sistem pembayalan fleksibel dengan berbagai metode payment.",
      "Konfirmasi booking akan dikirim melalui email dan WhatsApp."
    ],
    poin: [
      "Poin didapat dari setiap transaksi dengan rasio 1:1 (Rp 1000 = 1 poin).",
      "Poin dapat ditukar dengan voucher F&B, merchandise, atau upgrade room.",
      "Poin memiliki masa berlaku 12 bulan sejak terakhir kali mendapat poin.",
      "Member dapat mengecek saldo poin melalui dashboard member."
    ],
    lokasi: [
      "The Lodge Maribaya berlokasi di Jl. Maribaya No. 149/99, Lembang, Bandung Barat.",
      "Mudah diakses dari pusat kota Bandung dengan waktu tempuh sekitar 45 menit.",
      "Tersedia area parkir yang luas dan aman untuk kendaraan pribadi.",
      "Dekat dengan berbagai destinasi wisata populer di kawasan Lembang."
    ],
    kontak: [
      "Customer service kami tersedia 24/7 melalui WhatsApp di +62 812-3456-7890.",
      "Email: info@thelodgemaribaya.com untuk pertanyaan umum.",
      "Telepon: (022) 278-9012 untuk reservasi dan informasi.",
      "Follow Instagram @thelodgemaribaya untuk update terbaru."
    ]
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findBestResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Kata kunci untuk setiap kategori
    const keywords = {
      membership: ["member", "membership", "bergabung", "daftar", "level", "benefit"],
      fasilitas: ["fasilitas", "layanan", "restaurant", "spa", "cottage", "glamping", "meeting"],
      promo: ["promo", "diskon", "penawaran", "special", "murah", "hemat"],
      booking: ["booking", "reservasi", "pesan", "book", "jadwal"],
      poin: ["poin", "point", "tukar", "redeem", "saldo"],
      lokasi: ["lokasi", "alamat", "dimana", "tempat", "akses", "parkir"],
      kontak: ["kontak", "hubungi", "telepon", "whatsapp", "email", "customer service"]
    };

    // Cari kategori yang paling cocok
    let bestMatch = "";
    let maxMatches = 0;

    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      const matches = categoryKeywords.filter(keyword => input.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = category;
      }
    }

    // Jika ada match, return random response dari kategori tersebut
    if (bestMatch && knowledgeBase[bestMatch]) {
      const responses = knowledgeBase[bestMatch];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Default responses jika tidak ada match
    const defaultResponses = [
      "Maaf, saya belum memahami pertanyaan Anda. Bisa tolong dijelaskan lebih detail?",
      "Saya dapat membantu Anda dengan informasi tentang membership, fasilitas, promo, booking, poin, lokasi, dan kontak. Ada yang ingin ditanyakan?",
      "Untuk informasi lebih lengkap, Anda juga bisa menghubungi customer service kami di WhatsApp +62 812-3456-7890.",
      "Apakah Anda ingin mengetahui tentang membership benefits, fasilitas yang tersedia, atau promo terbaru kami?"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: findBestResponse(inputText),
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-[#0F4D39] hover:bg-[#0a3d2b] text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 animate-pulse"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}

        {/* Chat Window */}
        {isOpen && (
          <div className="bg-white rounded-lg shadow-2xl w-80 h-96 flex flex-col border border-gray-200">
            {/* Header */}
            <div className="bg-[#0F4D39] text-white p-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#0F4D39] font-bold text-sm">AI</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Lodge Family Assistant</h3>
                  <p className="text-xs opacity-90">Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.isUser
                        ? "bg-[#0F4D39] text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className={`text-xs mt-1 ${message.isUser ? "text-green-100" : "text-gray-500"}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-3 py-2 text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pertanyaan Anda..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className="bg-[#0F4D39] hover:bg-[#0a3d2b] disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}