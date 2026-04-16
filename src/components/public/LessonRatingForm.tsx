"use client";

import { useState } from "react";
import { Star, MessageSquare } from "lucide-react";

export function LessonRatingForm({ lessonId }: { lessonId: number }) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
       setErrorMsg("Please select a star rating before submitting.");
       return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/telemetry/lesson-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          overallRating: rating,
          mostUsefulFeedback: feedback
        })
      });

      if (!res.ok) {
         if (res.status === 401) {
            throw new Error("You must be logged in to leave a review.");
         }
         throw new Error("Failed to submit rating.");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
     return (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-8 text-center mt-12">
           <h3 className="text-xl font-bold text-brand-primary mb-2">Thank you for your feedback!</h3>
           <p className="text-gray-600">Your review helps us improve the quality of our OzekiRead instruction library.</p>
        </div>
     );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 mt-12">
      <h3 className="text-2xl font-bold text-[#0a2a34] mb-2 flex items-center">
         <Star className="w-5 h-5 mr-2 text-yellow-400 fill-current" />
         Rate this Session
      </h3>
      <p className="text-gray-500 text-sm mb-6 pb-6 border-b border-gray-100">Leave a review to help other teachers and learners discover great content!</p>

      {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-sm rounded mb-4">{errorMsg}</div>}

      <div className="flex flex-col gap-6">
         {/* Star Selector */}
         <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Quality</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   type="button"
                   onClick={() => setRating(star)}
                   onMouseEnter={() => setHoveredRating(star)}
                   onMouseLeave={() => setHoveredRating(0)}
                   className="focus:outline-none transition-transform hover:scale-110"
                 >
                   <Star 
                     className={`w-8 h-8 ${
                        (hoveredRating || rating) >= star 
                          ? "text-yellow-400 fill-yellow-400" 
                          : "text-gray-300"
                     } transition-colors`} 
                   />
                 </button>
              ))}
            </div>
         </div>

         {/* Feedback Area */}
         <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
               <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
               Additional Comments (Optional)
            </label>
            <textarea 
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               placeholder="What did you find most useful? Was the pace too fast?"
               className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none resize-y min-h-[100px]"
            />
         </div>

         <div className="pt-2">
           <button 
             type="submit" 
             disabled={isSubmitting || rating === 0}
             className="bg-[#0a2a34] hover:bg-[#113a48] text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
           >
              {isSubmitting ? "Submitting..." : "Submit Review"}
           </button>
         </div>
      </div>
    </form>
  );
}
