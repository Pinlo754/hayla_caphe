'use client';

import Link from 'next/link';

export default function StartScreen() {
  return (
    <div
      className="w-full h-screen flex justify-center"
      style={{
        backgroundImage: 'url(/assets/homepage.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div>
        <Link 
          href="/hey"
          className="flex justify-center items-center mt-150 w-50 h-12.5 px-6 py-3 bg-white bg-opacity-80 text-xl font-semibold rounded-[26px] text-[#F38096] cursor-pointer active:scale-95 transition-transform select-none"
        >
          Bắt đầu
        </Link>
      </div>
    </div>
  );
}
