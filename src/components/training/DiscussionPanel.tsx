"use client";

import { MessageSquare, Send } from "lucide-react";

export function DiscussionPanel() {
    const posts = [
        { author: "Teacher Sarah", time: "10 min ago", text: "Will the phonics cards be shared after this session?", initial: "S", color: "bg-orange-500" },
        { author: "Ozeki Trainer", time: "5 min ago", text: "Yes, they will be available in the Resources tab above as soon as we conclude.", initial: "O", color: "bg-[#00155F]", isStaff: true },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Session Discussion
                </h3>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/30">
                {posts.map((post, i) => (
          <div key={i} className="flex space-x-3">
            <div className={`w-8 h-8 rounded-full \${post.color} flex items-center justify-center text-white font-bold text-xs shrink-0 mt-1`}>
              {post.initial}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <span className={`text-sm font-bold \${post.isStaff ? "text-[#00155F]" : "text-gray-900"}`}>
                  {post.author}
                </span>
                {post.isStaff && (
                  <span className="text-[10px] uppercase font-bold text-white bg-[#FF4D00] px-1.5 py-0.5 rounded">Staff</span>
                )}
                <span className="text-xs text-gray-400">{post.time}</span>
              </div>
              <div className={`text-sm mt-1 p-3 rounded-2xl rounded-tl-none \${post.isStaff ? "bg-blue-50 text-blue-900" : "bg-white border border-gray-100 text-gray-700 shadow-sm"}`}>
                {post.text}
            </div>
        </div>
          </div >
        ))
}
      </div >

    {/* Input Area */ }
    < div className = "p-4 border-t border-gray-100 bg-white" >
        <div className="relative flex items-center">
            <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-full focus:ring-[#00155F] focus:border-[#00155F] block pl-4 pr-12 py-3 transition-colors"
                placeholder="Ask your question..."
            />
            <button className="absolute right-1.5 p-2 bg-[#00155F] text-white rounded-full hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F]">
                <Send className="w-4 h-4" />
            </button>
        </div>
      </div >
    </div >
  );
}
