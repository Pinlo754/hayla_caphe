'use client';

import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  rating?: number;
}

const getStarColor = (index: number, currentRating: number) => {
  if (index < currentRating) {
    switch (index) {
      case 0: return '#F45D78';
      case 1: return '#F45D78';
      case 2: return '#FA7089';
      case 3: return '#FB7F97';
      default: return '#F45D78';
    }
  } else {
    return '#FFC7D3';
  }
};

const RatingModal: React.FC<RatingModalProps> = ({ visible, onClose, rating = 4 }) => {
  const [currentRating, setCurrentRating] = useState(rating);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-4/5 max-w-sm bg-[#FFFDF6] rounded-3xl p-5 pt-12 items-center shadow-lg h-auto"
          >
            {/* Header */}
            <div className="absolute -top-7 bg-white px-6 rounded-2xl border border-gray-200">
              <span
                className="text-[#FF8FA3] block"
                style={{ fontFamily: 'bungee', fontSize: 24, lineHeight: 40 }}
              >
                ĐÁNH GIÁ
              </span>
            </div>

            {/* Star Rating Row */}
            <div className="flex justify-center gap-2 mb-8 mt-12">
              {[0, 1, 2, 3, 4].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRating(index + 1)}
                  className="hover:scale-110 transition-transform"
                >
                  <Star
                    size={40}
                    fill={getStarColor(index, currentRating)}
                    color={getStarColor(index, currentRating)}
                    strokeWidth={1}
                  />
                </button>
              ))}
            </div>

            {/* Body Text */}
            <div className="w-full px-4 mb-10 mt-4">
              <p className="text-[#333333] text-center text-sm leading-5">
                Hãy cho chúng tôi xin một chút đánh giá từ trải nghiệm của bạn đến với Mộc Ngữ nhé.
                <br />
                Cảm ơn bạn vì đã ghé thăm.
              </p>
            </div>

            {/* Close Button */}
            <button
              className="absolute -bottom-6 bg-[#66CCAA] w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#5ab88a] transition-colors"
              onClick={onClose}
            >
              <X color="white" size={24} strokeWidth={3} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RatingModal;
